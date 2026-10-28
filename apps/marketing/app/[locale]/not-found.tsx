import { t } from "@managevent/i18n";

export default function NotFound() {
  return (
    <main id="main" className="wrap section legal">
      <h1>{t("en", "marketing.launchNotFound")}</h1>
      <p>{t("en", "marketing.launchNotFoundBody")}</p>
      <p lang="fa" dir="rtl">
        {t("fa", "marketing.launchNotFoundBody")}
      </p>
      <a href="/">{t("en", "marketing.launchHome")}</a> ·{" "}
      <a href="/fa">{t("fa", "marketing.launchHome")}</a>
    </main>
  );
}
