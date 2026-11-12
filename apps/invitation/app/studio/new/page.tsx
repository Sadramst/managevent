import type { Metadata } from "next";
import { getInvitationShell, getInvitationStudio } from "@managevent/i18n";
import { Section } from "@managevent/ui/brand";
import { NewInvitationWizard } from "@/components/event-studio/NewInvitationWizard";
import { buildCatalog, DEFAULT_TIME_ZONE, freeGuestLimit } from "@/lib/event-studio/catalog";
import { privateMetadata } from "@/lib/metadata";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";

const copy = getInvitationStudio("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(copy.wizard.title);

/**
 * A sample invitation per template (`GET /v1/public/demos`), as `/i/{eventSlug}/{guestToken}`
 * paths. The wizard works without them, so a failure only hides the "View a sample" links.
 */
async function loadSamples(): Promise<Record<string, string>> {
  try {
    const api = await getServerApi();
    const { items } = await api.guestSite.listDemos();
    return Object.fromEntries(
      items.map((demo) => [
        demo.templateSlug,
        `/i/${encodeURIComponent(demo.eventSlug)}/${encodeURIComponent(demo.guestToken)}`,
      ]),
    );
  } catch {
    return {};
  }
}

/**
 * New invitation: a template-first wizard (occasion and template, the basics, first guests,
 * review). `?template=` preselects a template, which is how the public templates page links in.
 */
export default async function NewInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  await requireHost();
  const [{ template }, samples] = await Promise.all([searchParams, loadSamples()]);
  const catalog = buildCatalog(copy.catalog);
  const requested = typeof template === "string" ? template : null;

  return (
    <Section tight>
      <div className="page-header es-page-header">
        <div>
          <p className="eyebrow">{copy.wizard.eyebrow}</p>
          <h1 className="page-title">{copy.wizard.title}</h1>
          <p className="lead es-page-lead">{copy.wizard.lead}</p>
        </div>
      </div>
      <NewInvitationWizard
        occasions={catalog.occasions}
        templates={catalog.templates}
        timeZones={catalog.timeZones}
        requestedTemplate={
          catalog.templates.some((item) => item.slug === requested) ? requested : null
        }
        samples={samples}
        freeGuestLimit={freeGuestLimit()}
        defaultTimeZone={DEFAULT_TIME_ZONE}
        copy={{
          wizard: copy.wizard,
          preview: copy.preview,
          badges: { premium: copy.catalog.premium, free: copy.catalog.free },
          dateNames: copy.catalog.dateNames,
          unsaved: copy.unsaved,
          optional: shell.ui.optional,
          networkError: shell.errors.NETWORK_ERROR,
        }}
      />
    </Section>
  );
}
