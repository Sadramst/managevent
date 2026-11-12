import { fillCopy, getInvitationGuest } from "@managevent/i18n";
import type { Metadata, Viewport } from "next";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/Badge";
import { GuestShell, GuestStatus } from "@/components/views/GuestShell";
import { SectionMark } from "@/components/views/Ornaments";
import { formatLocalDateTime } from "@/lib/dates";
import { loadGuestPasses } from "@/lib/guest/load";
import { guestOpenedPath } from "@/lib/guest/paths";
import { getGuestTheme } from "@/lib/guest/theme";
import { privateMetadata } from "@/lib/metadata";

/**
 * Door passes: one QR code for each person in the party who has replied yes.
 *
 * Each code is drawn on the server from the signed payload of the pass (`MV1.{passId}.{sig}`),
 * which holds no personal information and is not the guest link. The payload is also printed
 * under the code as text, for a door device that cannot scan. Nothing here needs JavaScript,
 * so a pass still shows at a venue with a poor connection once the page has loaded.
 */
export const dynamic = "force-dynamic";

const copy = getInvitationGuest("en");

export const metadata: Metadata = privateMetadata(copy.meta.passTitle);

interface PageProps {
  params: Promise<{ eventSlug: string; guestToken: string }>;
}

export async function generateViewport({ params }: PageProps): Promise<Viewport> {
  const { eventSlug, guestToken } = await params;
  const result = await loadGuestPasses(eventSlug, guestToken);
  if (result.kind !== "ok") return {};
  return {
    themeColor: getGuestTheme(result.data.themeId, result.data.experienceMode).themeColor,
  };
}

export default async function GuestPassPage({ params }: PageProps) {
  const link = await params;
  const result = await loadGuestPasses(link.eventSlug, link.guestToken);
  if (result.kind === "gone") return <GuestStatus title={copy.gone.title} body={copy.gone.body} />;
  if (result.kind === "busy") return <GuestStatus title={copy.busy.title} body={copy.busy.body} />;

  const view = result.data;
  const passes = await Promise.all(
    view.passes.map(async (pass) => ({
      ...pass,
      // Dark modules on a light ground with a quiet zone, whatever the theme of the invitation.
      image: await QRCode.toDataURL(pass.qr, { errorCorrectionLevel: "M", margin: 2, width: 480 }),
    })),
  );

  return (
    <GuestShell themeId={view.themeId} experienceMode={view.experienceMode}>
      <main id="main" className="inv-pass-page">
        <header className="inv-pass-head">
          <SectionMark themeId={view.themeId} />
          <h1>{copy.pass.title}</h1>
          <p className="inv-pass-event">{view.event.title}</p>
          <p>
            {formatLocalDateTime(view.event.startsAtLocal)}
            {view.event.venueName ? (
              <>
                <br />
                {view.event.venueName}
              </>
            ) : null}
          </p>
        </header>

        {!view.enabled ? (
          <div className="inv-status-card inv-pass-empty">
            <h2>{copy.pass.notEnabledTitle}</h2>
            <p>{copy.pass.notEnabledBody}</p>
          </div>
        ) : passes.length === 0 ? (
          <div className="inv-status-card inv-pass-empty">
            <h2>{copy.pass.emptyTitle}</h2>
            <p>{copy.pass.emptyBody}</p>
            <a className="button" href={guestOpenedPath(link, "rsvp")}>
              {copy.pass.emptyAction}
            </a>
          </div>
        ) : (
          <ul className="inv-pass-grid" aria-label={copy.pass.title}>
            {passes.map((pass) => (
              <li key={pass.passId} className="inv-pass">
                <div className="inv-pass-top">
                  <h2 className="inv-pass-name">{pass.guestName}</h2>
                  <div className="inv-pass-meta">
                    {pass.isChild ? <Badge tone="neutral">{copy.pass.child}</Badge> : null}
                    {view.party.tableLabel ? (
                      <Badge tone="neutral">{view.party.tableLabel}</Badge>
                    ) : null}
                    {pass.checkedInAt ? <Badge tone="success">{copy.pass.checkedIn}</Badge> : null}
                  </div>
                </div>
                <div className="inv-pass-qr">
                  {/* A data URI built on this server: nothing to optimise or fetch. */}
                  <img
                    src={pass.image}
                    width={240}
                    height={240}
                    alt={fillCopy(copy.pass.qrAlt, { name: pass.guestName })}
                  />
                </div>
                {/* The same payload as the QR code, as text: a door device that cannot scan
                    (or a cracked screen) can still check this guest in by entering it. */}
                <p className="inv-pass-code">
                  <span className="inv-pass-code-label">{copy.pass.codeLabel}</span>
                  <code translate="no">{pass.qr}</code>
                </p>
                <p className="inv-pass-foot">
                  {fillCopy(copy.pass.forParty, { name: view.party.displayName })}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="inv-pass-actions">
          {view.enabled && passes.length > 0 ? (
            <p>
              {copy.pass.lead} {copy.pass.brightness} {copy.pass.codeHint}
            </p>
          ) : null}
          <a className="button button-secondary" href={guestOpenedPath(link)}>
            {copy.nav.backToInvitation}
          </a>
        </div>
      </main>
    </GuestShell>
  );
}
