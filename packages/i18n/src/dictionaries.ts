/**
 * Typed bilingual dictionaries (`en` and `fa`) across all 11 namespaces specified in `docs/design/I18N_RTL.md`.
 *
 * // TODO(fa-review): Have a native Persian cultural reviewer sign off on all `fa` strings before public launch.
 */

export const I18N_NAMESPACES = [
  "common",
  "marketing",
  "invitation",
  "portal",
  "vendors",
  "admin",
  "mobile",
  "desktop",
  "ceremonies",
  "legal",
  "emails",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const enDictionary = {
  common: {
    brandName: "Managevent",
    byAppilico: "A product by Appilico",
    planMyCeremony: "Plan my ceremony",
    talkToUs: "Talk to us",
    signIn: "Sign in",
    signOut: "Sign out",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading…",
    errorGeneric: "Something went wrong. Please try again.",
    inclGst: "incl. GST",
    perthWa: "Perth, Western Australia",
    languageSwitchFa: "فارسی",
    languageSwitchEn: "English",
    farsiAvailableBanner: "This page is also available in Persian.",
  },
  marketing: {
    heroTitle: "From 0 to 100.",
    heroSubtitle: "Every ceremony in Perth, planned and delivered end to end with calm precision.",
    seePackages: "See packages",
    bookConsultation: "Book a consultation",
    saveMyEstimate: "Save my estimate",
    shareWithPartner: "Share with partner",
    builderDisclaimer: "Indicative only. A final quote follows a consultation.",
    memorialSupportPromise: "We will take care of the details so your family can be together.",
    comingSoonWaitlist: "Coming soon to your city. Join the waitlist.",
  },
  invitation: {
    tapToOpen: "Tap to open",
    openMemorial: "Open",
    dearGuest: "Dear {guestName}",
    daysToGo: "{days} days to go",
    thankYouCelebration: "Thank you for celebrating with us.",
    thankYouMemorial: "Thank you for being with us.",
    rsvpHeading: "RSVP",
    rsvpAttendingYes: "Joyfully attending",
    rsvpAttendingNo: "Unable to attend",
    rsvpAttendingMaybe: "Maybe",
    rsvpMemorialRemembering: "You are warmly invited to join us in remembering {honoureeName}.",
    rsvpMemorialSongPrompt: "A song that reminds you of them",
    wishingWellHeading: "Wishing well",
    tributeBookHeading: "Tribute book",
    addToCalendar: "Add to calendar",
    viewMyPass: "View entry pass",
  },
  portal: {
    dashboardTitle: "Your ceremony dashboard",
    liveRsvpHeading: "Live RSVPs and headcount",
    applyRecommendation: "Apply catering & seating update",
    paymentScheduleHeading: "Payment schedule",
    seatingChartHeading: "Seating chart",
    plannerChatHeading: "Planner chat",
  },
  vendors: {
    onboardingTitle: "Become a Managevent partner vendor",
    verifyAbnPrompt: "Verify your Australian Business Number (ABN)",
    complianceDocumentsHeading: "Compliance & insurance certificates",
    bookingsInboxHeading: "Quotes and bookings",
    payoutsHeading: "Stripe Connect payouts",
  },
  admin: {
    leadInboxTitle: "Lead inbox",
    eventCommandCentreTitle: "Event command centre",
    vendorVerificationQueueTitle: "Vendor verification queue",
    inventoryTitle: "Warehouse & hire stock",
    financeGstTitle: "Margin, GST & BAS exports",
    auditLogTitle: "Audit log",
  },
  mobile: {
    customerHomeTitle: "My event",
    crewModeTitle: "On-the-day crew mode",
    scanQrPass: "Scan guest QR pass",
    duplicateScanWarning: "Already checked in",
    offlinePackReady: "Offline event pack downloaded",
  },
  desktop: {
    kioskTitle: "Managevent check-in kiosk",
    floorplanEditorTitle: "2D floorplan and seating editor",
    batchPrintingTitle: "Batch print place cards & welcome boards",
    liveDisplayControllerTitle: "Live display controller",
  },
  ceremonies: {
    wedding: "Weddings",
    sofrehAghd: "Sofreh Aghd (Persian wedding ceremony)",
    balehBoroon: "Baleh Boroon",
    nowruz: "Nowruz celebration",
    shabEYalda: "Shab-e Yalda night",
    mehmooni: "Persian gathering (Mehmooni)",
    birthdayMilestone: "Milestone birthdays",
    birthdayKids: "Kids' birthdays",
    galaDinner: "Corporate gala dinners",
    celebrationOfLife: "Celebration of life",
    memorialService: "Memorial service",
    wake: "Wake & gathering",
    funeralCoordination: "Funeral gathering coordination",
  },
  legal: {
    privacyNoticeShort:
      "Your details are stored in Sydney, Australia and used only to coordinate your ceremony.",
    healthDataConsentText:
      "I consent to Managevent storing my dietary and allergy requirements in Australia solely to brief the event caterers.",
    marketingConsentText:
      "Send me occasional ceremony inspiration and offers from Managevent. Unsubscribe anytime.",
    taxInvoiceHeading: "Tax invoice",
    acknowledgementOfCountry:
      "Managevent acknowledges the Whadjuk Nyoongar people as the Traditional Custodians of the lands on which we gather across Perth.",
  },
  emails: {
    leadAutoReplySubject: "We have received your enquiry — Managevent Perth",
    leadAutoReplyBody:
      "Dear {name}, thank you for getting in touch with Managevent. A Perth coordinator will respond within 1 business hour.",
    leadPlannerAlertSubject: "New Managevent lead: {name} ({source})",
    invitationSubject: "You are invited to {eventTitle}",
    unsubscribeFooter: "Managevent (Appilico) · Perth WA · Unsubscribe: {unsubscribeUrl}",
  },
} as const;

export type DictionaryShape = {
  [NS in I18nNamespace]: {
    [K in keyof (typeof enDictionary)[NS]]: string;
  };
};

// TODO(fa-review): Cultural and linguistic review of all Persian strings below.
export const faDictionary: DictionaryShape = {
  common: {
    brandName: "منج‌ایونت (Managevent)",
    byAppilico: "محصولی از اپیلیکو (Appilico)",
    planMyCeremony: "طراحی مراسم من",
    talkToUs: "گفت‌وگو با ما",
    signIn: "ورود به حساب",
    signOut: "خروج از حساب",
    save: "ذخیره",
    cancel: "انصراف",
    loading: "در حال بارگذاری…",
    errorGeneric: "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
    inclGst: "با احتساب مالیات (GST)",
    perthWa: "پرث، استرالیای غربی",
    languageSwitchFa: "فارسی",
    languageSwitchEn: "انگلیسی (English)",
    farsiAvailableBanner: "این صفحه به فارسی هم هست.",
  },
  marketing: {
    heroTitle: "از صفر تا صد مراسم شما.",
    heroSubtitle: "برنامه‌ریزی و اجرای کامل هرگونه مراسم در پرث با آرامش و دقت.",
    seePackages: "مشاهده پکیج‌ها",
    bookConsultation: "رزرو وقت مشاوره",
    saveMyEstimate: "ذخیره برآورد هزینه",
    shareWithPartner: "اشتراک‌گذاری با همراه",
    builderDisclaimer: "این مبلغ حدودی است. پیش‌فاکتور نهایی پس از مشاوره ارائه می‌شود.",
    memorialSupportPromise:
      "ما به تمام جزئیات رسیدگی می‌کنیم تا خانواده شما در آرامش کنار هم باشند.",
    comingSoonWaitlist: "به‌زودی در شهر شما. در فهرست انتظار ثبت‌نام کنید.",
  },
  invitation: {
    tapToOpen: "برای باز کردن لمس کنید",
    openMemorial: "باز کردن",
    dearGuest: "{guestName} عزیز",
    daysToGo: "{days} روز تا مراسم",
    thankYouCelebration: "سپاس که در شادی ما شریک شدید.",
    thankYouMemorial: "سپاس که در کنار ما بودید.",
    rsvpHeading: "تأیید حضور",
    rsvpAttendingYes: "با کمال میل حضور دارم",
    rsvpAttendingNo: "متأسفانه امکان حضور ندارم",
    rsvpAttendingMaybe: "هنوز مطمئن نیستم",
    rsvpMemorialRemembering:
      "با احترام از شما دعوت می‌کنیم در مراسم گرامیداشت یاد {honoureeName} همراه ما باشید.",
    rsvpMemorialSongPrompt: "قطعه موسیقی که یادآور ایشان است",
    wishingWellHeading: "صندوق هدیه و شادباش",
    tributeBookHeading: "دفتر یادبود",
    addToCalendar: "افزودن به تقویم",
    viewMyPass: "مشاهده کارت ورود",
  },
  portal: {
    dashboardTitle: "داشبورد مراسم شما",
    liveRsvpHeading: "وضعیت زنده پاسخ مهمانان و تعداد نفرات",
    applyRecommendation: "اعمال پیشنهاد پذیرایی و چیدمان",
    paymentScheduleHeading: "برنامه پرداخت‌ها",
    seatingChartHeading: "نقشه چیدمان میزها",
    plannerChatHeading: "گفت‌وگو با هماهنگ‌کننده",
  },
  vendors: {
    onboardingTitle: "همکاری به عنوان تأمین‌کننده منج‌ایونت",
    verifyAbnPrompt: "تأیید شماره ثبت کسب‌وکار استرالیا (ABN)",
    complianceDocumentsHeading: "مدارک قانونی و گواهی بیمه",
    bookingsInboxHeading: "صندوق پیش‌فاکتورها و رزروها",
    payoutsHeading: "تسویه‌حساب‌ها از طریق استرایپ",
  },
  admin: {
    leadInboxTitle: "صندوق درخواست‌های مشتریان",
    eventCommandCentreTitle: "مرکز مدیریت مراسم",
    vendorVerificationQueueTitle: "صف بررسی تأمین‌کنندگان",
    inventoryTitle: "موجودی انبار و تجهیزات کرایه‌ای",
    financeGstTitle: "گزارش مالی، مالیات و خروجی حسابداری",
    auditLogTitle: "گزارش رخدادهای سیستم",
  },
  mobile: {
    customerHomeTitle: "مراسم من",
    crewModeTitle: "حالت تیم اجرایی روز مراسم",
    scanQrPass: "اسکن بارکد کارت ورود مهمان",
    duplicateScanWarning: "قبلاً پذیرش شده است",
    offlinePackReady: "بسته اطلاعات آفلاین مراسم دریافت شد",
  },
  desktop: {
    kioskTitle: "کیوسک پذیرش مهمانان منج‌ایونت",
    floorplanEditorTitle: "طراحی دوبعدی سالن و چیدمان صندلی‌ها",
    batchPrintingTitle: "چاپ گروهی کارت میز و تابلو خوش‌آمدگویی",
    liveDisplayControllerTitle: "کنترل نمایشگر زنده سالن",
  },
  ceremonies: {
    wedding: "عروسی",
    sofrehAghd: "سفره عقد",
    balehBoroon: "بله‌برون",
    nowruz: "جشن نوروز",
    shabEYalda: "شب یلدا",
    mehmooni: "مهمانی ایرانی",
    birthdayMilestone: "جشن تولد ویژه",
    birthdayKids: "جشن تولد کودک",
    galaDinner: "شام رسمی و شرکتی",
    celebrationOfLife: "مراسم گرامیداشت زندگی",
    memorialService: "مراسم یادبود",
    wake: "مراسم ترحیم و گردهمایی",
    funeralCoordination: "هماهنگی مراسم سوگواری",
  },
  legal: {
    privacyNoticeShort:
      "اطلاعات شما در سرورهای سیدنی استرالیا نگهداری شده و تنها برای هماهنگی مراسم شما استفاده می‌شود.",
    healthDataConsentText:
      "موافقت می‌کنم اطلاعات رژیم غذایی و حساسیت‌های من در استرالیا صرفاً جهت اطلاع تیم پذیرایی مراسم ذخیره شود.",
    marketingConsentText:
      "ارسال ایده‌ها و پیشنهادهای ویژه مراسم از سوی منج‌ایونت. امکان لغو عضویت در هر زمان وجود دارد.",
    taxInvoiceHeading: "صورت‌حساب مالیاتی (Tax invoice)",
    acknowledgementOfCountry:
      "منج‌ایونت به مردم واجوک نونگار، متولیان سنتی سرزمین‌های پرث، ادای احترام می‌کند.",
  },
  emails: {
    leadAutoReplySubject: "درخواست شما دریافت شد — منج‌ایونت پرث",
    leadAutoReplyBody:
      "{name} عزیز، از تماس شما با منج‌ایونت سپاسگزاریم. یکی از هماهنگ‌کنندگان ما در پرث ظرف ۱ ساعت کاری پاسخگوی شما خواهد بود.",
    leadPlannerAlertSubject: "درخواست جدید در منج‌ایونت: {name} ({source})",
    invitationSubject: "دعوت‌نامه مراسم {eventTitle}",
    unsubscribeFooter: "منج‌ایونت · پرث استرالیا · لغو عضویت: {unsubscribeUrl}",
  },
};

export const dictionaries = {
  en: enDictionary,
  fa: faDictionary,
} as const;

export type TranslationKey = {
  [NS in I18nNamespace]: `${NS}.${Extract<keyof (typeof enDictionary)[NS], string>}`;
}[I18nNamespace];
