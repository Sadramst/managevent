import { randomInt } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  test as base,
  expect,
  type Page,
} from "@playwright/test";

/**
 * Shared set-up for the browser specs. Everything runs against the real stack: PostgreSQL,
 * `apps/api` and a production build of this app. Each spec creates its own hosts and events
 * with unique names, so nothing depends on an earlier run and nothing is cleaned up by force.
 *
 * Rate limits. The API limits sign-ups, guest pages and "not found" answers per visitor
 * address. A whole run from one address would exceed them, so every test presents its own
 * address in `x-forwarded-for`, the way a real visitor's address reaches this app from its
 * edge. The API believes that address only on a request that carries the shared secret
 * (`API_PROXY_SECRET`): this app adds it for page requests, and `apiHeaders()` adds it for the
 * direct set-up calls below. Run the API, the app and the tests with the same value.
 */

/** The API, for set-up calls only. Pages reach it through this app's server, never directly. */
export const API_URL = (
  process.env.E2E_API_URL ??
  process.env.API_URL ??
  "http://localhost:4000"
).replace(/\/+$/, "");

const PROXY_SECRET = process.env.API_PROXY_SECRET?.trim() ?? "";

export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
export const PASSWORD = "four quiet garden words";

/** A private-range address that no other test in this run (or a recent one) is using. */
export function uniqueVisitorIp(): string {
  return `10.${randomInt(1, 255)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

/** A short tag that makes names and email addresses unique per run. */
export function runTag(): string {
  return `${Date.now().toString(36)}${randomInt(0, 36 ** 3)
    .toString(36)
    .padStart(3, "0")}`;
}

/** Headers for a direct call to the API as the visitor at `ip`, from this app's origin. */
export function apiHeaders(origin: string, ip: string): Record<string, string> {
  return {
    origin,
    "content-type": "application/json",
    "x-forwarded-for": ip,
    ...(PROXY_SECRET ? { "x-managevent-proxy-secret": PROXY_SECRET } : {}),
  };
}

export const test = base.extend<{ visitorIp: string; appOrigin: string }>({
  // One address per test, shared by its pages and its `request` fixture.
  // Playwright reads the fixture names from this destructuring pattern, so it stays even when empty.
  visitorIp: async ({}, use) => {
    await use(uniqueVisitorIp());
  },
  appOrigin: async ({ baseURL }, use) => {
    await use(new URL(baseURL ?? "http://localhost:3001").origin);
  },
  extraHTTPHeaders: async ({ visitorIp }, use) => {
    await use({ "x-forwarded-for": visitorIp });
  },
});

export { expect };

/**
 * A browser context for someone else: a guest with no cookies, or a second host. It has its own
 * address, and none of the cookies of the test's main context.
 */
export async function newVisitorContext(
  browser: Browser,
  options: BrowserContextOptions = {},
): Promise<BrowserContext> {
  return browser.newContext({
    locale: "en-AU",
    timezoneId: "Australia/Perth",
    ...options,
    extraHTTPHeaders: { ...options.extraHTTPHeaders, "x-forwarded-for": uniqueVisitorIp() },
  });
}

// ---------------------------------------------------------------------------------------------
// Hosts
// ---------------------------------------------------------------------------------------------

export interface NewHost {
  name: string;
  email: string;
}

export function newHostIdentity(label: string): NewHost {
  return { name: `E2E ${label} Host`, email: `e2e-${label}-${runTag()}@example.org` };
}

/** Signs up through the sign-up page, as a person would, and lands in the studio. */
export async function signUpInBrowser(page: Page, host: NewHost): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill(host.name);
  await page.getByLabel("Email address").fill(host.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/studio(\/|$|\?)/);
}

type Method = "get" | "post" | "patch" | "put" | "delete";

export interface ApiHost {
  identity: NewHost;
  /** Calls the API as this host and returns the parsed JSON body. Fails the test on an error. */
  call<T>(method: Method, path: string, data?: unknown): Promise<T>;
  /** As `call`, but returns the status and body without asserting success. */
  raw(method: Method, path: string, data?: unknown): Promise<{ status: number; body: unknown }>;
  /** Signs a browser context in as this host. */
  signIn(context: BrowserContext): Promise<void>;
}

/**
 * Signs a host up without the browser, for specs whose subject is not the sign-up page. The
 * sign-up goes through this app's own `/api/auth` proxy, exactly as the sign-up form does.
 */
export async function signUpHost(
  request: APIRequestContext,
  origin: string,
  label: string,
): Promise<ApiHost> {
  const identity = newHostIdentity(label);
  const ip = uniqueVisitorIp();
  const headers = apiHeaders(origin, ip);
  const signUp = await request.post(`${origin}/api/auth/sign-up/email`, {
    headers,
    data: { name: identity.name, email: identity.email, password: PASSWORD },
  });
  expect(signUp.status(), `host sign-up (${await signUp.text()})`).toBe(200);
  const cookies = signUp
    .headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => {
      const pair = header.value.split(";")[0] ?? "";
      const index = pair.indexOf("=");
      return { name: pair.slice(0, index), value: pair.slice(index + 1) };
    });
  expect(cookies.length, "sign-up sets a session cookie").toBeGreaterThan(0);
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

  const raw: ApiHost["raw"] = async (method, path, data) => {
    const response = await request[method](`${API_URL}${path}`, {
      headers: { ...headers, cookie: cookieHeader },
      ...(data === undefined ? {} : { data }),
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // Not JSON (the CSV export): keep the text.
    }
    return { status: response.status(), body };
  };

  return {
    identity,
    raw,
    async call<T>(method: Method, path: string, data?: unknown) {
      const { status, body } = await raw(method, path, data);
      // The path may hold a guest link, so only its first segments go in the message.
      const label = `${method.toUpperCase()} ${path.split("/").slice(0, 4).join("/")}`;
      expect(status, `${label}: ${JSON.stringify(body).slice(0, 300)}`).toBeLessThan(300);
      return body as T;
    },
    async signIn(context) {
      await context.addCookies(
        cookies.map((cookie) => ({
          ...cookie,
          url: origin,
          httpOnly: true,
          sameSite: "Lax" as const,
        })),
      );
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Sample invitations (seeded by `pnpm --filter @managevent/api seed:demo`)
// ---------------------------------------------------------------------------------------------

export interface Demo {
  templateSlug: string;
  themeId: string;
  experienceMode: "CELEBRATION" | "MEMORIAL";
  title: string;
  hosts: string;
  headline: string;
  eventSlug: string;
  guestToken: string;
}

export const SAMPLE_PARTY = "Sample Guest Family";

export async function loadDemos(request: APIRequestContext, origin: string): Promise<Demo[]> {
  const response = await request.get(`${API_URL}/v1/public/demos`, {
    headers: apiHeaders(origin, uniqueVisitorIp()),
  });
  expect(response.ok(), "the sample invitations are seeded (api seed:demo)").toBe(true);
  return ((await response.json()) as { items: Demo[] }).items;
}

export const demoPath = (demo: Demo) => `/i/${demo.eventSlug}/${demo.guestToken}`;

// ---------------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------------

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD`, a number of days from today: the value of a date input. */
export function futureDate(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 86_400_000);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DDTHH:00`, the API's local wall-clock form. */
export function localDateTime(daysFromNow: number, hour: number): string {
  return `${futureDate(daysFromNow)}T${pad(hour)}:00`;
}

// ---------------------------------------------------------------------------------------------
// Page checks
// ---------------------------------------------------------------------------------------------

/**
 * Waits until the page has stopped scrolling. The brand shell scrolls smoothly
 * (`scroll-behavior: smooth`), including when a form moves the focus to its first invalid
 * field, and a page measured part-way through that glide is not a state anyone uses: controls
 * pass under the docked save bar on the way.
 */
export async function waitForScrollToSettle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const started = performance.now();
        let last = window.scrollY;
        let stillSince = started;
        const check = () => {
          const now = performance.now();
          if (window.scrollY !== last) {
            last = window.scrollY;
            stillSince = now;
          }
          if (now - stillSince >= 200 || now - started >= 3000) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
  );
}

/**
 * WCAG 2.2 AA scan of the whole page (or of `include`), once it has stopped scrolling.
 *
 * One finding is looked at twice. The studio keeps its header, tabs and save bar docked while
 * the page scrolls, so at some scroll positions a button is part-way under one of them, and
 * axe then reports `target-size` for the sliver that is left ("partially obscured"). That is the
 * scroll position, not the button: each control flagged that way is brought into the open and
 * measured again, and it counts only if it is still too small or too crowded there.
 */
export async function expectNoAxeViolations(
  page: Page,
  label: string,
  include?: string,
): Promise<void> {
  await waitForScrollToSettle(page);
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();

  const summary: string[] = [];
  for (const item of results.violations) {
    let targets = item.nodes.map((node) => node.target.join(" "));
    if (item.id === "target-size") {
      const confirmed: string[] = [];
      for (const target of targets) {
        if (await failsTargetSizeInTheOpen(page, target)) confirmed.push(target);
      }
      targets = confirmed;
    }
    if (targets.length > 0) summary.push(`${item.id}: ${targets.join(" | ")}`);
  }
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

/** Scrolls one control to the middle of the window and runs the target-size rule on it alone. */
async function failsTargetSizeInTheOpen(page: Page, selector: string): Promise<boolean> {
  const control = page.locator(selector);
  if ((await control.count()) !== 1) return true;
  await control.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }),
  );
  await waitForScrollToSettle(page);
  const again = await new AxeBuilder({ page })
    .withRules(["target-size"])
    .include(selector)
    .analyze();
  return again.violations.length > 0;
}

export async function expectNoSidewaysScroll(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `sideways scroll on ${label}`).toBeLessThanOrEqual(0);
}

/**
 * Collects what a page reports as broken while a test uses it: console errors, uncaught
 * exceptions and failed requests for this site's own files. Call `expectClean()` at the end.
 */
export function watchForPageErrors(page: Page) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.status() >= 500) problems.push(`${response.status()}: ${url.pathname}`);
  });
  return {
    problems,
    expectClean(label: string) {
      expect(problems, `errors reported by ${label}`).toEqual([]);
    },
  };
}

/** Opens the gate on a guest page (tap) and waits until the invitation behind it is usable. */
export async function openGate(page: Page): Promise<void> {
  await page.locator(".inv-gate-open").click();
  await expect(page.locator(".inv-gate")).toHaveCount(0);
}
