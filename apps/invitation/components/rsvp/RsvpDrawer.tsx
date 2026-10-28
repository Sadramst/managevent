"use client";

import React, { useState } from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";
import type { DietaryTag, RsvpStatus } from "@managevent/types";
import type { EventModel, GuestParty, RsvpSubmissionPayload } from "@/lib/types";
import { Check, X, ShieldAlert, Heart, CalendarCheck, QrCode } from "lucide-react";

interface RsvpDrawerProps {
  event: EventModel;
  party: GuestParty;
  theme: InvitationThemeTokens;
  locale: "en" | "fa";
}

const DIETARY_OPTIONS: Array<{ value: DietaryTag; labelEn: string; labelFa: string }> = [
  { value: "NONE", labelEn: "No Restrictions", labelFa: "بدون محدودیت" },
  { value: "HALAL", labelEn: "Halal", labelFa: "حلال" },
  { value: "VEGETARIAN", labelEn: "Vegetarian", labelFa: "گیاه‌خواری" },
  { value: "VEGAN", labelEn: "Vegan", labelFa: "وگان" },
  { value: "GLUTEN_FREE", labelEn: "Gluten-Free (Coeliac Safe)", labelFa: "بدون گلوتن" },
  { value: "NUT_ALLERGY", labelEn: "Nut Allergy", labelFa: "حساسیت به آجیل" },
  { value: "DAIRY_FREE", labelEn: "Dairy-Free", labelFa: "بدون لبنیات" },
  {
    value: "SHELLFISH_ALLERGY",
    labelEn: "Seafood / Shellfish Allergy",
    labelFa: "حساسیت به غذاهای دریایی",
  },
];

export const RsvpDrawer: React.FC<RsvpDrawerProps> = ({ event, party, theme, locale }) => {
  const { colors } = theme;
  const isFa = locale === "fa";
  const isMemorial = event.experienceMode === "MEMORIAL";

  // Form State
  const [overallStatus, setOverallStatus] = useState<RsvpStatus>(
    party.status === "PENDING" ? "YES" : party.status,
  );

  const [membersState, setMembersState] = useState(
    party.members.map((m) => ({
      id: m.id,
      name: m.name,
      isChild: m.isChild || false,
      status: (m.status === "PENDING" ? "YES" : m.status) as RsvpStatus,
      dietary: m.dietary && m.dietary.length > 0 ? m.dietary : (["NONE"] as DietaryTag[]),
      allergyNotes: m.allergyNotes || "",
      healthDataConsentGranted: true,
    })),
  );

  const [songRequest, setSongRequest] = useState("");
  const [messageToHost, setMessageToHost] = useState(party.notes || "");
  const [contactInfo, setContactInfo] = useState("");
  const [healthConsent, setHealthConsent] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(party.status !== "PENDING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMemberStatusChange = (index: number, newStatus: RsvpStatus) => {
    setMembersState((prev) => {
      const updated = [...prev];
      const target = updated[index];
      if (target) {
        updated[index] = { ...target, status: newStatus };
      }
      return updated;
    });
  };

  const handleDietaryToggle = (memberIndex: number, tag: DietaryTag) => {
    setMembersState((prev) => {
      const updated = [...prev];
      const target = updated[memberIndex];
      if (!target) return prev;

      let currentTags = [...target.dietary];

      if (tag === "NONE") {
        currentTags = ["NONE"];
      } else {
        currentTags = currentTags.filter((t) => t !== "NONE");
        if (currentTags.includes(tag)) {
          currentTags = currentTags.filter((t) => t !== tag);
          if (currentTags.length === 0) currentTags = ["NONE"];
        } else {
          currentTags.push(tag);
        }
      }

      updated[memberIndex] = { ...target, dietary: currentTags };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Any guest with non-NONE dietary requires health data consent under Australian Privacy Principles
    const hasDietaryNeeds = membersState.some(
      (m) => m.status === "YES" && m.dietary.some((d) => d !== "NONE"),
    );

    if (hasDietaryNeeds && !healthConsent) {
      setErrorMessage(
        isFa
          ? "لطفاً جهت ثبت نیازمندی‌های رژیمی و آلرژی، رضایت‌نامه حفظ حریم سلامت را تأیید فرمایید."
          : "Please check the health privacy consent to submit dietary and allergy requirements.",
      );
      setIsSubmitting(false);
      return;
    }

    const payload: RsvpSubmissionPayload = {
      guestToken: party.token,
      eventSlug: event.slug,
      status: overallStatus,
      guests: membersState.map((m) => ({
        id: m.id,
        name: m.name,
        status: overallStatus === "NO" ? "NO" : m.status,
        dietary: m.dietary,
        allergyNotes: m.allergyNotes,
        healthDataConsentGranted: healthConsent,
      })),
      songRequests: songRequest.trim() ? [songRequest.trim()] : [],
      messageToHost: messageToHost.trim() || undefined,
      contactForUpdates: contactInfo.trim() || undefined,
      locale,
    };

    try {
      const idempotencyKey = `rsvp_${party.token}_${Date.now()}`;
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit RSVP response");
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error submitting RSVP";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="rsvp-section" className="relative px-4 py-8 sm:px-8 sm:py-12">
      <div
        className="mx-auto max-w-2xl rounded-card border p-6 sm:p-10 shadow-lg backdrop-blur-sm"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.rule,
        }}
      >
        {/* Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.accent}15` }}
          >
            <CalendarCheck className="h-5 w-5" style={{ color: colors.accent }} />
          </div>
          <h2
            className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: colors.accentInk }}
          >
            {isFa ? "اعلام حضور (RSVP)" : "Will You Attend?"}
          </h2>
          <p className="mt-1 font-serif text-sm italic" style={{ color: colors.inkMuted }}>
            {isFa
              ? `دعوت‌نامه اختصاصی برای ${party.displayName}`
              : `Personal invitation for ${party.displayName}`}
          </p>
          <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: colors.accent }} />
        </div>

        {isSubmitted ? (
          /* Confirmation State */
          <div className="text-center py-6 space-y-4">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${colors.accent}20` }}
            >
              <Check className="h-8 w-8" style={{ color: colors.accent }} />
            </div>
            <h3 className="font-display text-xl font-bold" style={{ color: colors.accentInk }}>
              {isFa ? "پاسخ شما با موفقیت ثبت شد!" : "Thank You! Your RSVP is Confirmed."}
            </h3>
            <p
              className="font-serif text-sm sm:text-base max-w-md mx-auto"
              style={{ color: colors.ink }}
            >
              {overallStatus === "YES"
                ? isFa
                  ? "مشتاقانه در انتظار دیدار گرم شما هستیم."
                  : "We cannot wait to celebrate this special day together."
                : isFa
                  ? "از اینکه ما را مطلع ساختید سپاسگزاریم. جای شما بسیار خالی خواهد بود."
                  : "We will miss having you there, but thank you warmly for letting us know."}
            </p>

            {overallStatus === "YES" && (
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <a
                  href={`/i/${event.slug}/${party.token}/pass`}
                  className="inline-flex items-center gap-2 rounded-button border px-4 py-2 text-xs font-semibold shadow-xs"
                  style={{
                    backgroundColor: colors.bgWarm,
                    borderColor: colors.rule,
                    color: colors.accentInk,
                  }}
                >
                  <QrCode className="h-4 w-4" style={{ color: colors.accent }} />
                  <span>{isFa ? "مشاهده کارت ورود دیجیتال" : "View Entry Pass"}</span>
                </a>

                <a
                  href={`/i/${event.slug}/${party.token}/calendar.ics`}
                  download={`${event.slug}.ics`}
                  className="inline-flex items-center gap-2 rounded-button border px-4 py-2 text-xs font-semibold shadow-xs"
                  style={{
                    backgroundColor: colors.bgWarm,
                    borderColor: colors.rule,
                    color: colors.accentInk,
                  }}
                >
                  <CalendarCheck className="h-4 w-4" style={{ color: colors.accent }} />
                  <span>{isFa ? "ذخیره در تقویم" : "Save to Calendar"}</span>
                </a>
              </div>
            )}

            <div className="pt-6">
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="text-xs font-medium underline underline-offset-4"
                style={{ color: colors.inkMuted }}
              >
                {isFa ? "ویرایش پاسخ قبلی" : "Need to change your response?"}
              </button>
            </div>
          </div>
        ) : (
          /* RSVP Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="rounded-button border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                {errorMessage}
              </div>
            )}

            {/* Attendance Choice */}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setOverallStatus("YES")}
                className={`flex-1 rounded-button border p-3 sm:p-4 text-center transition-all ${
                  overallStatus === "YES" ? "ring-2" : "opacity-80 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: overallStatus === "YES" ? `${colors.accent}15` : colors.bgWarm,
                  borderColor: overallStatus === "YES" ? colors.accent : colors.rule,
                  // @ts-expect-error custom ring
                  "--tw-ring-color": colors.accent,
                }}
              >
                <div
                  className="flex items-center justify-center gap-2 font-display text-sm sm:text-base font-bold"
                  style={{ color: colors.accentInk }}
                >
                  <Check className="h-4 w-4" style={{ color: colors.accent }} />
                  <span>{isFa ? "با کمال میل حضور می‌یابیم" : "Joyfully Accepts"}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOverallStatus("NO")}
                className={`flex-1 rounded-button border p-3 sm:p-4 text-center transition-all ${
                  overallStatus === "NO" ? "ring-2" : "opacity-80 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: overallStatus === "NO" ? `${colors.accent}15` : colors.bgWarm,
                  borderColor: overallStatus === "NO" ? colors.accent : colors.rule,
                  // @ts-expect-error custom ring
                  "--tw-ring-color": colors.accent,
                }}
              >
                <div
                  className="flex items-center justify-center gap-2 font-display text-sm sm:text-base font-bold"
                  style={{ color: colors.accentInk }}
                >
                  <X className="h-4 w-4" style={{ color: colors.inkMuted }} />
                  <span>{isFa ? "متأسفانه امکان حضور نداریم" : "Regretfully Declines"}</span>
                </div>
              </button>
            </div>

            {/* Party Members Breakdown (when attending) */}
            {overallStatus === "YES" && (
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: colors.rule }}>
                <h4 className="font-serif text-sm font-bold" style={{ color: colors.accentInk }}>
                  {isFa ? "اعضای مهمان در این دعوت‌نامه" : "Party Members & Dietary Requirements"}
                </h4>

                {membersState.map((member, idx) => (
                  <div
                    key={member.id}
                    className="rounded-card border p-4 space-y-3"
                    style={{
                      backgroundColor: colors.bgWarm,
                      borderColor: colors.rule,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="font-serif text-sm font-semibold"
                        style={{ color: colors.accentInk }}
                      >
                        {member.name} {member.isChild ? (isFa ? "(کودک)" : "(Child)") : ""}
                      </div>

                      {/* Attend toggle per guest */}
                      <div
                        className="inline-flex rounded-full border p-0.5"
                        style={{ borderColor: colors.rule }}
                      >
                        <button
                          type="button"
                          onClick={() => handleMemberStatusChange(idx, "YES")}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                            member.status === "YES" ? "shadow-xs" : "opacity-60"
                          }`}
                          style={{
                            backgroundColor:
                              member.status === "YES" ? colors.accent : "transparent",
                            color: member.status === "YES" ? "#FFFFFF" : colors.ink,
                          }}
                        >
                          {isFa ? "می‌آید" : "Attending"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMemberStatusChange(idx, "NO")}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                            member.status === "NO" ? "shadow-xs" : "opacity-60"
                          }`}
                          style={{
                            backgroundColor:
                              member.status === "NO" ? colors.inkMuted : "transparent",
                            color: member.status === "NO" ? "#FFFFFF" : colors.ink,
                          }}
                        >
                          {isFa ? "نمی‌آید" : "Declines"}
                        </button>
                      </div>
                    </div>

                    {/* Dietary tags if attending */}
                    {member.status === "YES" && (
                      <div className="pt-2">
                        <label
                          className="block text-xs font-medium mb-1.5"
                          style={{ color: colors.inkMuted }}
                        >
                          {isFa ? "رژیم غذایی و حساسیت‌ها:" : "Dietary Needs & Allergies:"}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {DIETARY_OPTIONS.map((opt) => {
                            const isSelected = member.dietary.includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleDietaryToggle(idx, opt.value)}
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                                  isSelected ? "ring-1" : "opacity-75 hover:opacity-100"
                                }`}
                                style={{
                                  backgroundColor: isSelected
                                    ? `${colors.accent}20`
                                    : colors.surface,
                                  borderColor: isSelected ? colors.accent : colors.rule,
                                  color: isSelected ? colors.accentInk : colors.ink,
                                  // @ts-expect-error custom ring
                                  "--tw-ring-color": colors.accent,
                                }}
                              >
                                {isFa ? opt.labelFa : opt.labelEn}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Australian Privacy Act Health Data Consent */}
                <div
                  className="rounded-button border p-3 flex items-start gap-2.5 text-xs"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.rule,
                  }}
                >
                  <input
                    type="checkbox"
                    id="health-consent"
                    checked={healthConsent}
                    onChange={(e) => setHealthConsent(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label
                    htmlFor="health-consent"
                    className="leading-snug"
                    style={{ color: colors.inkMuted }}
                  >
                    <ShieldAlert
                      className="inline h-3.5 w-3.5 me-1"
                      style={{ color: colors.accent }}
                    />
                    {isFa
                      ? "رضایت می‌دهم اطلاعات رژیمی و آلرژی صرفاً جهت پذیرایی مناسب در این مراسم به کار گرفته و طبق مقررات حریم خصوصی استرالیا (APPs) نگهداری شود."
                      : "I consent to dietary & allergy information being processed solely for catering purposes for this event under Australian Privacy Principles (APPs)."}
                  </label>
                </div>

                {/* Song Request (or Memorial Tribute Song) */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-1"
                    style={{ color: colors.accentInk }}
                  >
                    {isMemorial
                      ? isFa
                        ? "آهنگی که یادآور ایشان است (اختیاری)"
                        : "A song that reminds you of them (optional)"
                      : isFa
                        ? "پیشنهاد آهنگ به دی‌جی برای رقص و شادی (اختیاری)"
                        : "Song Request for the Dance Floor (optional)"}
                  </label>
                  <input
                    type="text"
                    value={songRequest}
                    onChange={(e) => setSongRequest(e.target.value)}
                    placeholder={isFa ? "نام اثر یا خواننده..." : "Artist or song title..."}
                    className="w-full rounded-button border px-3 py-2 text-xs sm:text-sm font-sans focus:outline-none focus:ring-1"
                    style={{
                      backgroundColor: colors.bgWarm,
                      borderColor: colors.rule,
                      color: colors.ink,
                      // @ts-expect-error custom ring
                      "--tw-ring-color": colors.accent,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Note / Message to Host */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: colors.accentInk }}
              >
                {isMemorial
                  ? isFa
                    ? "پیام تسلیت و همدردی به خانواده (اختیاری)"
                    : "Message of Condolence to Family (optional)"
                  : isFa
                    ? "پیام مهرآمیز شما به میزبانان (اختیاری)"
                    : "Warm message to the hosts (optional)"}
              </label>
              <textarea
                rows={2}
                value={messageToHost}
                onChange={(e) => setMessageToHost(e.target.value)}
                placeholder={isFa ? "پیام شما..." : "Write a note..."}
                className="w-full rounded-button border px-3 py-2 text-xs sm:text-sm font-sans focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: colors.bgWarm,
                  borderColor: colors.rule,
                  color: colors.ink,
                  // @ts-expect-error custom ring
                  "--tw-ring-color": colors.accent,
                }}
              />
            </div>

            {/* Contact for updates */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: colors.accentInk }}
              >
                {isFa
                  ? "شماره موبایل یا ایمیل جهت اطلاعیه‌های رویداد"
                  : "Mobile / Email for Event Updates"}
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder={isFa ? "0412 345 678 یا ایمیل..." : "0412 345 678 or name@example.com"}
                className="w-full rounded-button border px-3 py-2 text-xs sm:text-sm font-sans focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: colors.bgWarm,
                  borderColor: colors.rule,
                  color: colors.ink,
                  // @ts-expect-error custom ring
                  "--tw-ring-color": colors.accent,
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-button py-3 text-sm font-bold shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50"
              style={{
                backgroundColor: colors.accent,
                color: "#FFFFFF",
              }}
            >
              {isSubmitting
                ? isFa
                  ? "در حال ثبت..."
                  : "Submitting..."
                : isFa
                  ? "ارسال و تأیید نهایی پاسخ"
                  : "Submit RSVP Response"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
