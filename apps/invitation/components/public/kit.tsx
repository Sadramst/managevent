import type { ReactNode } from "react";
import { cx } from "@managevent/ui/brand";
import { serializeJsonLd, type JsonLdData } from "@/lib/public/json-ld";

/**
 * Small server components shared by the public pages. They mirror the page kit of
 * www.managevent.com.au (numbered steps, ruled features, check list, FAQ, closing band) so the
 * two sites compose their pages the same way. Styles: section 5 of `app/globals.css`.
 */

/** Inline structured data. A JSON data block, not executable script. */
export function JsonLd({ data }: { data: JsonLdData | readonly JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/** The brand arch drawn as a line mark. Decorative. */
export function ArchMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 50V22a18 18 0 0 1 36 0v28" />
      <path d="M12 50V24a10 10 0 0 1 20 0v26" />
      <path d="M1 50h42" />
    </svg>
  );
}

/** A typographic arch composition for the second column of a page hero. */
export function ArchCard({ title, lines }: { title: string; lines: readonly string[] }) {
  return (
    <div className="arch-frame pub-arch">
      <ArchMark className="pub-arch-mark" />
      <p className="pub-arch-title">{title}</p>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** A numbered sequence. `columns={4}` for the four-step "how it works". */
export function Steps({
  items,
  columns = 3,
}: {
  items: readonly { title: string; body: string }[];
  columns?: 3 | 4;
}) {
  return (
    <ol className={cx("pub-steps", columns === 4 && "pub-steps-4")}>
      {items.map((step) => (
        <li key={step.title}>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function FeatureList({ items }: { items: readonly { title: string; body: string }[] }) {
  return (
    <ul className="pub-features">
      {items.map((feature) => (
        <li key={feature.title}>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="pub-checks">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Questions and answers on native `<details>`: readable and operable without JavaScript. */
export function Faq({ items }: { items: readonly { question: string; answer: string }[] }) {
  return (
    <div className="pub-faq">
      {items.map((item) => (
        <details key={item.question}>
          <summary>
            <h3>{item.question}</h3>
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

/** The closing call to action: a burgundy band with one or two buttons. */
export function CtaBand({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-dark pub-dark pub-cta">
      <div className="wrap section">
        <h2>{title}</h2>
        <p className="section-lead">{body}</p>
        <div className="page-hero-actions">{children}</div>
      </div>
    </section>
  );
}
