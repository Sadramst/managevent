import { t } from "@managevent/i18n";

export default function NotFound() {
  return (
    <main id="main" className="wrap section legal">
      <h1>{t("en", "marketing.launchNotFound")}</h1>
      <p>{t("en", "marketing.launchNotFoundBody")}</p>
      <a href="/">{t("en", "marketing.launchHome")}</a>
    </main>
  );
}
