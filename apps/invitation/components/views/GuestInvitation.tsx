import {
  fillCopy,
  getInvitationGuest,
  getInvitationShell,
  guestVoice,
  type InvitationGuestCopy,
  type InvitationGuestVoice,
} from "@managevent/i18n";
import type { InvitationThemeId } from "@managevent/types";
import type { GuestInvitationView } from "@managevent/validators";
import { Gate } from "@/components/gate/Gate";
import { CardMotifSvg } from "@/components/public/OccasionCardArtwork";
import { RsvpPanel } from "@/components/rsvp/RsvpPanel";
import { WishForm } from "@/components/rsvp/WishForm";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatLocalDate, formatLocalTime, formatScheduleTime } from "@/lib/dates";
import {
  getCardDemoContent,
  inferCardDesignForInvitation,
  type OccasionCardDesign,
  OCCASION_CARD_DESIGNS,
} from "@/lib/public/card-designs";
import { createInvitationHref } from "@/lib/public/links";
import {
  type GuestLink,
  guestCalendarPath,
  guestOpenedPath,
  guestPassPath,
  sameLocalDay,
  timeZoneCity,
  venueMapsUrl,
} from "@/lib/guest/paths";
import { safeExternalHttpsUrl } from "@/lib/safe-url";
import { absoluteUrl, routes, wwwLinks } from "@/lib/urls";
import { Countdown } from "./Countdown";
import { GuestShell } from "./GuestShell";
import { MusicControl } from "./MusicControl";
import { CornerBranch, Emblem, SectionMark, StarField } from "./Ornaments";

export interface GuestInvitationProps {
  /** The slug and token from the guest's link. Used to build links and to send the reply. */
  link: GuestLink;
  /** The guest-safe view from `guestSite.getView`: this party only. */
  view: GuestInvitationView;
  /** True when the URL carries `?opened=1`: the gate has been opened before, so it is skipped. */
  opened: boolean;
  /** Optional 52-card design override from the public catalogue (`?card=`). */
  cardId?: string | undefined;
}

const CONTENT_ID = "invitation";
/** Headlines longer than this are set a size smaller so they do not fill the screen. */
const LONG_HEADLINE = 24;

function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function SectionHead({
  themeId,
  title,
  lead,
  id,
}: {
  themeId: InvitationThemeId;
  title: string;
  lead?: string | undefined;
  id?: string;
}) {
  return (
    <div className="inv-section-head">
      <SectionMark themeId={themeId} />
      <h2 id={id}>{title}</h2>
      {lead ? <p>{lead}</p> : null}
    </div>
  );
}

/**
 * The invitation a guest sees: one server-rendered page in the invitation's own theme.
 *
 * Who, when and where, the wording, the schedule, the questions and the links to reply and to
 * add the event to a calendar are plain HTML, so they work with JavaScript off. The gate, the
 * countdown, the music and the two forms are client islands layered on top.
 *
 * Memorial events render calm: no arch, no ornament, no countdown, a plain "Open", gentler
 * words. Nothing here is specific to `/i/...`: legacy links render the same component once the
 * API has resolved them to a slug and token.
 */
export function GuestInvitation({ link, view, opened, cardId }: GuestInvitationProps) {
  const copy = getInvitationGuest("en");
  const shell = getInvitationShell("en");
  const { event, invitation, party, rsvp } = view;
  const { content } = invitation;
  const memorial = event.experienceMode === "MEMORIAL";
  const voice = guestVoice(copy, event.experienceMode);
  const cardDesign = inferCardDesignForInvitation({
    cardId,
    ceremonySlug: event.ceremonySlug,
    templateSlug: invitation.templateSlug,
    themeId: invitation.themeId,
    title: event.title,
    headline: content.headline,
    subheadline: content.subheadline,
    memorial,
  });
  const demoCardContent = view.demo && cardDesign ? getCardDemoContent(cardDesign) : null;
  const activeThemeId = demoCardContent ? cardDesign!.themeId : invitation.themeId;
  const activeGateStyle = memorial
    ? "plain-fade"
    : demoCardContent
      ? cardDesign!.gateStyle
      : invitation.gateStyle;
  const baseOpenHref = guestOpenedPath(link);
  const openHref = cardId ? `${baseOpenHref}&card=${encodeURIComponent(cardId)}` : baseOpenHref;

  const calendarHref = guestCalendarPath(link);
  const dateLong = formatLocalDate(event.startsAtLocal, { weekday: true });
  const startTime = formatLocalTime(event.startsAtLocal);
  const endTime =
    event.endsAtLocal && sameLocalDay(event.startsAtLocal, event.endsAtLocal)
      ? formatLocalTime(event.endsAtLocal)
      : null;
  const zone = fillCopy(copy.details.timeZone, { city: timeZoneCity(event.timeZone) });
  const hosts = demoCardContent ? demoCardContent.hosts : content.hosts;
  const headline = demoCardContent ? demoCardContent.headline : content.headline;
  const subheadline = demoCardContent ? demoCardContent.subheadline : content.subheadline;
  const venue: GuestInvitationView["invitation"]["content"]["venue"] = demoCardContent
    ? demoCardContent.venue
    : content.venue;
  const dressCode = demoCardContent ? demoCardContent.dressCode : content.dressCode;
  const wording = paragraphs(demoCardContent ? demoCardContent.wording : content.wording);
  const story = (demoCardContent ? demoCardContent.story : content.story).flatMap(paragraphs);
  const schedule = demoCardContent ? demoCardContent.schedule : content.schedule;
  const hasCover = Boolean(content.coverImageUrl);
  const readOnly = rsvp.state === "READ_ONLY" ? (view.demo ? "demo" : "preview") : null;
  const canReply = rsvp.state !== "CLOSED" || rsvp.hasResponded;
  const well = invitation.well;
  const showWell = view.features.wishesEnabled && well !== null && well.mode !== "NONE";
  const wellMessage = demoCardContent ? demoCardContent.wellMessage : well?.message;
  const music = content.music.enabled && content.music.url ? content.music : null;

  return (
    <GuestShell
      themeId={activeThemeId}
      experienceMode={event.experienceMode}
      palette={demoCardContent ? cardDesign!.palette : undefined}
    >
      <Banner view={view} copy={copy} cardDesign={demoCardContent ? cardDesign : undefined} />

      {opened ? null : (
        <Gate
          gateStyle={activeGateStyle}
          memorial={memorial}
          name={party.displayName}
          openHref={openHref}
          contentId={CONTENT_ID}
          copy={copy.gate}
        />
      )}

      <div id={CONTENT_ID} className="inv-page" tabIndex={-1}>
        <a className="skip" href="#rsvp">
          {copy.nav.skipToReply}
        </a>
        <main id="main">
          <header className="inv-hero" data-cover={hasCover}>
            {activeThemeId === "midnight-celestial" ? <StarField /> : null}
            {activeThemeId === "emerald-botanic" ? (
              <>
                <CornerBranch corner="start" />
                <CornerBranch corner="end" />
              </>
            ) : null}

            {content.coverImageUrl ? (
              <figure className="inv-cover">
                <img
                  src={content.coverImageUrl}
                  alt={copy.details.coverAlt}
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </figure>
            ) : null}

            <div className="inv-frame" data-card-shape={cardDesign?.cardShape}>
              <Emblem themeId={activeThemeId} />
              {!memorial && cardDesign ? (
                <div className="inv-card-motif-wrap">
                  <span className="inv-card-badge">{cardDesign.badgeText}</span>
                  <CardMotifSvg motif={cardDesign.motif} className="inv-card-motif" />
                </div>
              ) : null}
              <p className="inv-greeting">
                {fillCopy(voice.greeting, { name: party.displayName })}
              </p>
              <p className="inv-hosts">{hosts}</p>
              <h1
                className="inv-headline"
                data-length={headline.length > LONG_HEADLINE ? "long" : "short"}
              >
                {headline}
              </h1>
              {subheadline ? <p className="inv-subheadline">{subheadline}</p> : null}
              <hr className="inv-hero-rule" />
              <p className="inv-hero-date">{dateLong}</p>
              <p className="inv-hero-meta">
                {startTime}, {zone}
                {venue ? (
                  <>
                    <br />
                    {venue.name}
                  </>
                ) : null}
              </p>
              <div className="inv-hero-actions">
                {/* Replies have closed and this household never answered: there is nothing to
                    open, so the calendar becomes the main action. */}
                {canReply ? (
                  <a className="button" href="#rsvp">
                    {rsvp.hasResponded ? copy.nav.changeReply : copy.nav.reply}
                  </a>
                ) : null}
                <a
                  className={canReply ? "button button-secondary" : "button"}
                  href={calendarHref}
                  download
                  rel="nofollow"
                >
                  {copy.nav.addToCalendar}
                </a>
              </div>
            </div>
          </header>

          {wording.length > 0 ? (
            <section className="inv-section inv-wording">
              <div className="inv-inner">
                {wording.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ) : null}

          {event.phase === "PAST" ? (
            <section className="inv-section" data-band="true">
              <p className="inv-past">{voice.past}</p>
            </section>
          ) : memorial ? null : (
            <section
              className="inv-section inv-js-only"
              data-band="true"
              aria-label={voice.countdownTitle}
            >
              <div className="inv-inner">
                <Countdown
                  startsAt={event.startsAt}
                  copy={{ label: voice.countdownLabel, ...copy.countdown }}
                />
              </div>
            </section>
          )}

          <section className="inv-section" aria-label={`${voice.whenTitle}, ${voice.whereTitle}`}>
            <div className="inv-inner inv-details" data-wide="true">
              <div className="inv-detail">
                <h2>{voice.whenTitle}</h2>
                <p className="inv-detail-main">{dateLong}</p>
                <p>
                  {startTime}
                  {endTime ? ` ${fillCopy(copy.details.until, { time: endTime })}` : ""}
                </p>
                <p className="muted">{zone}</p>
                <a
                  className="button button-secondary button-small"
                  href={calendarHref}
                  download
                  rel="nofollow"
                >
                  {copy.nav.addToCalendar}
                </a>
              </div>

              {venue ? (
                <div className="inv-detail">
                  <h2>{voice.whereTitle}</h2>
                  <p className="inv-detail-main">{venue.name}</p>
                  {venue.address ? <address>{venue.address}</address> : null}
                  <a
                    className="button button-secondary button-small"
                    href={venueMapsUrl(venue)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy.nav.openInMaps}
                  </a>
                  {venue.parking ? (
                    <p className="inv-detail-note">
                      <strong>{voice.parkingTitle}</strong>
                      {venue.parking}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {dressCode ? (
                <div className="inv-detail" data-span="full">
                  <h2>{voice.dressCodeTitle}</h2>
                  <p>{dressCode}</p>
                </div>
              ) : null}
            </div>
          </section>

          {story.length > 0 ? (
            <section className="inv-section" data-band="true" aria-labelledby="story-title">
              <div className="inv-inner inv-story">
                <SectionHead themeId={activeThemeId} title={voice.storyTitle} id="story-title" />
                {story.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ) : null}

          {schedule.length > 0 ? (
            <section className="inv-section" aria-labelledby="schedule-title">
              <div className="inv-inner">
                <SectionHead
                  themeId={activeThemeId}
                  title={voice.scheduleTitle}
                  id="schedule-title"
                />
                <ol className="inv-timeline">
                  {schedule.map((item) => (
                    <li key={item.id}>
                      <span className="inv-timeline-time num">{formatScheduleTime(item.time)}</span>
                      <div className="inv-timeline-body">
                        <h3 className="inv-timeline-title">{item.title}</h3>
                        {item.description ? <p>{item.description}</p> : null}
                        {item.location ? (
                          <p className="inv-timeline-place">{item.location}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          ) : null}

          {content.galleryImageUrls.length > 0 ? (
            <section className="inv-section" aria-labelledby="gallery-title">
              <div className="inv-inner" data-wide="true">
                <SectionHead
                  themeId={activeThemeId}
                  title={voice.galleryTitle}
                  id="gallery-title"
                />
                <ul className="inv-gallery">
                  {content.galleryImageUrls.map((url, index) => (
                    <li key={url}>
                      <img
                        src={url}
                        alt={fillCopy(copy.details.galleryAlt, {
                          index: index + 1,
                          total: content.galleryImageUrls.length,
                        })}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {content.faq.length > 0 ? (
            <section className="inv-section" data-band="true" aria-labelledby="faq-title">
              <div className="inv-inner">
                <SectionHead themeId={activeThemeId} title={voice.faqTitle} id="faq-title" />
                {content.faq.map((item, index) => (
                  <details key={index} className="inv-faq">
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <section id="rsvp" className="inv-section" aria-labelledby="rsvp-title">
            <SectionHead
              themeId={activeThemeId}
              title={voice.rsvpTitle}
              id="rsvp-title"
              lead={
                rsvp.state === "CLOSED"
                  ? undefined
                  : invitation.rsvpDeadlineLocal
                    ? `${voice.rsvpLead} ${fillCopy(voice.rsvpDeadline, {
                        date: formatLocalDate(invitation.rsvpDeadlineLocal, { weekday: true }),
                      })}`
                    : voice.rsvpLead
              }
            />
            <div className="inv-sheet">
              {rsvp.state === "CLOSED" ? null : (
                <noscript>
                  <p className="alert inv-noscript">{copy.rsvp.noscript}</p>
                </noscript>
              )}
              <RsvpPanel
                link={link}
                party={party}
                rsvp={rsvp}
                config={invitation.rsvpConfig}
                readOnly={readOnly}
                passEnabled={view.features.passEnabled}
                passHref={guestPassPath(link)}
                calendarHref={calendarHref}
                privacyHref={wwwLinks.privacy}
                voice={voice}
                copy={copy.rsvp}
                labels={{
                  addToCalendar: copy.nav.addToCalendar,
                  viewPasses: copy.nav.viewPasses,
                  tableLabel: copy.details.tableLabel,
                  optional: shell.ui.optional,
                }}
              />
            </div>
          </section>

          {showWell && well ? (
            <section className="inv-section" data-band="true" aria-labelledby="well-title">
              <div className="inv-inner inv-well">
                <div>
                  <SectionHead themeId={activeThemeId} title={voice.wellTitle} id="well-title" />
                  {wellMessage ? <p className="inv-well-message">{wellMessage}</p> : null}
                </div>
                <GiftDetails well={well} memorial={memorial} copy={copy.well} />
                {well.tributePrompt ? (
                  <p className="inv-well-prompt">{well.tributePrompt}</p>
                ) : null}
                <div className="inv-sheet inv-js-only">
                  <WishForm
                    link={link}
                    readOnly={readOnly !== null}
                    defaultName={party.displayName}
                    voice={voice}
                    copy={copy.well}
                    nameRequired={copy.rsvp.errors.wishName}
                    messageRequired={copy.rsvp.errors.wishMessage}
                  />
                </div>
                <Wishes view={view} voice={voice} copy={copy.well} />
              </div>
            </section>
          ) : null}
        </main>

        <footer className="inv-footer">
          {invitation.allowForwarding ? null : <p>{copy.details.personal}</p>}
          <p>
            {copy.footer.privacyNote}{" "}
            <a href={wwwLinks.privacy} rel="noopener">
              {copy.footer.privacy}
            </a>
          </p>
          {invitation.showBranding ? (
            <p>
              <a href={absoluteUrl(routes.home)}>{shell.footer.guestCredit}</a>
            </p>
          ) : null}
        </footer>

        {(() => {
          const musicUrl = music ? safeExternalHttpsUrl(music.url) : null;
          return music && musicUrl ? (
            <MusicControl
              src={musicUrl}
              title={music.title}
              startWithGate={!memorial && !opened}
              copy={copy.music}
            />
          ) : null;
        })()}
      </div>
    </GuestShell>
  );
}

function Banner({
  view,
  copy,
  cardDesign,
}: {
  view: GuestInvitationView;
  copy: InvitationGuestCopy;
  cardDesign?: OccasionCardDesign | undefined;
}) {
  if (view.demo) {
    if (cardDesign) {
      return (
        <aside className="inv-banner" aria-label={copy.banner.demoTitle}>
          <p>
            <strong>
              {cardDesign.name} ({cardDesign.categoryLabel})
            </strong>{" "}
            — Live card preview.{" "}
            <a href={createInvitationHref(false, cardDesign.templateSlug, cardDesign.id)}>
              Customize this card
            </a>{" "}
            ·{" "}
            <a href={`${routes.templates}#occasion-cards`}>
              Browse all {OCCASION_CARD_DESIGNS.length} cards
            </a>
          </p>
        </aside>
      );
    }
    return (
      <aside className="inv-banner" aria-label={copy.banner.demoTitle}>
        <p>
          <strong>{copy.banner.demoTitle}.</strong> {copy.banner.demoBody}{" "}
          <a href={routes.templates}>{copy.banner.demoAction}</a>
        </p>
      </aside>
    );
  }
  if (view.preview) {
    return (
      <aside className="inv-banner" aria-label={copy.banner.previewTitle}>
        <p>
          <strong>{copy.banner.previewTitle}.</strong> {copy.banner.previewBody}
        </p>
      </aside>
    );
  }
  return null;
}

type Well = NonNullable<GuestInvitationView["invitation"]["well"]>;

/**
 * The hosts' own gift details. No money moves through Managevent: these are the hosts' PayID,
 * account or registry, shown as text and links. The API only returns bank details for
 * celebration events; a memorial can carry a donation link at most.
 */
function GiftDetails({
  well,
  memorial,
  copy,
}: {
  well: Well;
  memorial: boolean;
  copy: InvitationGuestCopy["well"];
}) {
  const registryUrl = safeExternalHttpsUrl(well.registryUrl);
  const donationUrl = safeExternalHttpsUrl(well.donationUrl);
  const rows: { label: string; value: string }[] = [
    ...(well.payId ? [{ label: copy.payId, value: well.payId }] : []),
    ...(well.accountName ? [{ label: copy.accountName, value: well.accountName }] : []),
    ...(well.bsb ? [{ label: copy.bsb, value: well.bsb }] : []),
    ...(well.accountNumber ? [{ label: copy.accountNumber, value: well.accountNumber }] : []),
  ];
  if (rows.length === 0 && !registryUrl && !donationUrl) return null;

  return (
    <div className="inv-gift">
      {memorial ? null : <h3>{copy.giftTitle}</h3>}
      {rows.length > 0 ? (
        <dl className="inv-gift-rows">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                <span className="num">{row.value}</span>
                <span className="inv-js-only">
                  <CopyButton
                    value={row.value}
                    label={copy.copy}
                    copiedLabel={copy.copied}
                    variant="ghost"
                  />
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {registryUrl || donationUrl ? (
        <div className="inv-gift-links">
          {registryUrl ? (
            <a
              className="button button-secondary"
              href={registryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.registry}
            </a>
          ) : null}
          {donationUrl ? (
            <a
              className="button button-secondary"
              href={donationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {memorial ? copy.donation : copy.donationCelebration}
            </a>
          ) : null}
        </div>
      ) : null}
      {rows.length > 0 ? <p className="small">{copy.noMoneyNote}</p> : null}
    </div>
  );
}

/** Messages the hosts have approved for other guests to read. */
function Wishes({
  view,
  voice,
  copy,
}: {
  view: GuestInvitationView;
  voice: InvitationGuestVoice;
  copy: InvitationGuestCopy["well"];
}) {
  if (view.wishes.length === 0) return null;
  return (
    <div>
      <h3 className="inv-wishes-title">{voice.wishesTitle}</h3>
      <ul className="inv-wishes">
        {view.wishes.map((wish) => (
          <li key={wish.id}>
            <blockquote>{wish.message}</blockquote>
            <cite>{fillCopy(copy.wishFrom, { name: wish.authorName })}</cite>
          </li>
        ))}
      </ul>
    </div>
  );
}
