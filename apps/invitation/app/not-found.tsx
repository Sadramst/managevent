import { getInvitationPublic } from "@managevent/i18n";
import { Card, Container, Eyebrow } from "@managevent/ui/brand";
import { SiteChrome } from "@/components/site/SiteChrome";
import { buttonClass } from "@/components/ui";
import { routes } from "@/lib/urls";

/**
 * The branded 404 for every unknown URL and every `notFound()`, including unknown guest links
 * and old links that no longer resolve. It is deliberately the same page for all of them: it
 * never hints whether an invitation link once existed.
 *
 * It renders under the root layout only, so it brings the site chrome itself. It is static: no
 * API calls, so it still works when the API is down (the header shows the signed-out actions).
 */
export default function NotFound() {
  const copy = getInvitationPublic("en").notFound;
  return (
    <SiteChrome signedIn={false}>
      <main id="main" tabIndex={-1}>
        <title>{copy.metaTitle}</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <Container size="narrow" className="pub-quiet">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1>{copy.title}</h1>
          <p className="lead">{copy.body}</p>
          <div className="grid grid-2 pub-quiet-cards">
            <Card variant="accent">
              <h2 className="card-title">{copy.guestTitle}</h2>
              <p className="card-body">{copy.guestBody}</p>
            </Card>
            <Card>
              <h2 className="card-title">{copy.hostTitle}</h2>
              <p className="card-body">{copy.hostBody}</p>
              <p>
                <a
                  className={buttonClass({ variant: "secondary", size: "small" })}
                  href={routes.signIn}
                >
                  {copy.signIn}
                </a>
              </p>
            </Card>
          </div>
          <div className="page-hero-actions">
            <a className={buttonClass()} href={routes.home}>
              {copy.home}
            </a>
            <a className={buttonClass({ variant: "secondary" })} href={routes.templates}>
              {copy.templates}
            </a>
          </div>
        </Container>
      </main>
    </SiteChrome>
  );
}
