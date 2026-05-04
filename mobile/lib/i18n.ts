/**
 * Mobile i18n — same key namespace as the web app's lib/i18n.ts so both
 * platforms speak the same dictionary. We intentionally duplicate the
 * dictionary here (instead of importing across project boundaries) to keep
 * Metro builds self-contained; if this ever drifts, just diff the two files.
 *
 * User-entered data (names, ticket bodies, comments, ledger descriptions,
 * seller names) is NEVER translated — only static UI strings.
 */

export type Locale = "en" | "ar";
export const LOCALES: readonly Locale[] = ["en", "ar"] as const;
export const DEFAULT_LOCALE: Locale = "en";

type Dict = Record<string, string>;

const en: Dict = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.refresh": "Refresh",
  "common.refreshing": "Refreshing…",
  "common.loading": "Loading…",
  "common.signOut": "Sign out",
  "common.send": "Send",
  "common.sending": "Sending…",
  "common.submit": "Submit",
  "common.retry": "Retry",
  "common.error": "Something went wrong",
  "common.networkError": "Network error — try again.",
  "common.empty": "Nothing here yet.",

  "tabs.home": "Home",
  "tabs.tickets": "Tickets",
  "tabs.leaderboard": "Leaderboard",
  "tabs.profile": "Profile",

  "login.title": "Sign in to Shipeh",
  "login.subtitle": "Use your work email and password.",
  "login.email": "Email",
  "login.emailPlaceholder": "you@shipeh.com",
  "login.password": "Password",
  "login.submit": "Sign In",
  "login.signingIn": "Signing in…",
  "login.invalid": "Invalid email or password.",
  "login.bioPrompt": "Sign in to Shipeh",
  "login.bioCta": "Use Face ID / fingerprint",

  "home.welcome": "Welcome back",
  "home.openTickets": "Open tickets",
  "home.activeTickets": "Active tickets",
  "home.urgentTickets": "Urgent",
  "home.viewAll": "View all",
  "home.quickAccess": "Quick access",
  "home.tickets": "Tickets",
  "home.leaderboard": "Leaderboard",

  "tickets.title": "Tickets",
  "tickets.queue": "Queue",
  "tickets.empty": "No tickets here yet.",
  "tickets.search": "Search tickets",
  "tickets.filters.all": "All",
  "tickets.filters.open": "Open",
  "tickets.filters.inProgress": "In progress",
  "tickets.filters.waiting": "Waiting",
  "tickets.filters.resolved": "Resolved",
  "tickets.detail.commentsTitle": "Comments",
  "tickets.detail.addComment": "Write a comment…",
  "tickets.detail.changeStatus": "Update status",
  "tickets.detail.statusUpdated": "Status updated.",
  "tickets.detail.commentAdded": "Comment added.",
  "tickets.detail.seller": "Seller",
  "tickets.detail.assignee": "Assigned to",
  "tickets.detail.created": "Created",

  "status.OPEN": "Open",
  "status.IN_PROGRESS": "In progress",
  "status.WAITING": "Waiting",
  "status.RESOLVED": "Resolved",
  "status.ARCHIVED": "Archived",

  "priority.LOW": "Low",
  "priority.NORMAL": "Normal",
  "priority.HIGH": "High",
  "priority.URGENT": "Urgent",

  "leaderboard.title": "Leaderboard",
  "leaderboard.subtitle": "Current month rankings",
  "leaderboard.points": "points",
  "leaderboard.delivered": "Delivered",
  "leaderboard.stock": "Stock",
  "leaderboard.score": "Score",
  "leaderboard.empty": "No rankings yet for this month.",
  "leaderboard.1st": "1st",
  "leaderboard.2nd": "2nd",
  "leaderboard.3rd": "3rd",

  "profile.title": "Profile",
  "profile.theme": "Appearance",
  "profile.theme.dark": "Dark",
  "profile.theme.light": "Light",
  "profile.language": "Language",
  "profile.notifications": "Push notifications",
  "profile.notifications.enable": "Enable notifications",
  "profile.notifications.enabled": "Enabled",
  "profile.about": "About",
  "profile.version": "Version",
  "profile.signOut": "Sign out",
  "profile.signOutConfirm": "Are you sure you want to sign out?",
  "profile.restartHint":
    "Switching language requires restarting the app to flip the layout direction.",
};

const ar: Dict = {
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.refresh": "تحديث",
  "common.refreshing": "جارٍ التحديث…",
  "common.loading": "جارٍ التحميل…",
  "common.signOut": "تسجيل الخروج",
  "common.send": "إرسال",
  "common.sending": "جارٍ الإرسال…",
  "common.submit": "إرسال",
  "common.retry": "إعادة المحاولة",
  "common.error": "حدث خطأ ما",
  "common.networkError": "خطأ في الشبكة — أعد المحاولة.",
  "common.empty": "لا يوجد شيء هنا بعد.",

  "tabs.home": "الرئيسية",
  "tabs.tickets": "التذاكر",
  "tabs.leaderboard": "المتصدرون",
  "tabs.profile": "الملف",

  "login.title": "تسجيل الدخول إلى Shipeh",
  "login.subtitle": "استخدم بريد العمل وكلمة المرور.",
  "login.email": "البريد الإلكتروني",
  "login.emailPlaceholder": "you@shipeh.com",
  "login.password": "كلمة المرور",
  "login.submit": "تسجيل الدخول",
  "login.signingIn": "جارٍ تسجيل الدخول…",
  "login.invalid": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "login.bioPrompt": "تسجيل الدخول إلى Shipeh",
  "login.bioCta": "استخدم Face ID / البصمة",

  "home.welcome": "مرحبًا بعودتك",
  "home.openTickets": "التذاكر المفتوحة",
  "home.activeTickets": "التذاكر النشطة",
  "home.urgentTickets": "عاجل",
  "home.viewAll": "عرض الكل",
  "home.quickAccess": "وصول سريع",
  "home.tickets": "التذاكر",
  "home.leaderboard": "المتصدرون",

  "tickets.title": "التذاكر",
  "tickets.queue": "قائمة الانتظار",
  "tickets.empty": "لا توجد تذاكر هنا بعد.",
  "tickets.search": "ابحث في التذاكر",
  "tickets.filters.all": "الكل",
  "tickets.filters.open": "مفتوحة",
  "tickets.filters.inProgress": "قيد التنفيذ",
  "tickets.filters.waiting": "بانتظار",
  "tickets.filters.resolved": "تم الحل",
  "tickets.detail.commentsTitle": "التعليقات",
  "tickets.detail.addComment": "اكتب تعليقًا…",
  "tickets.detail.changeStatus": "تحديث الحالة",
  "tickets.detail.statusUpdated": "تم تحديث الحالة.",
  "tickets.detail.commentAdded": "تمت إضافة التعليق.",
  "tickets.detail.seller": "البائع",
  "tickets.detail.assignee": "مُسنَدة إلى",
  "tickets.detail.created": "أُنشئت",

  "status.OPEN": "مفتوحة",
  "status.IN_PROGRESS": "قيد التنفيذ",
  "status.WAITING": "بانتظار",
  "status.RESOLVED": "تم الحل",
  "status.ARCHIVED": "مؤرشفة",

  "priority.LOW": "منخفضة",
  "priority.NORMAL": "عادية",
  "priority.HIGH": "عالية",
  "priority.URGENT": "عاجلة",

  "leaderboard.title": "لوحة المتصدّرين",
  "leaderboard.subtitle": "تصنيفات الشهر الحالي",
  "leaderboard.points": "نقاط",
  "leaderboard.delivered": "المسلَّم",
  "leaderboard.stock": "المخزون",
  "leaderboard.score": "النتيجة",
  "leaderboard.empty": "لا توجد تصنيفات لهذا الشهر بعد.",
  "leaderboard.1st": "الأول",
  "leaderboard.2nd": "الثاني",
  "leaderboard.3rd": "الثالث",

  "profile.title": "الملف الشخصي",
  "profile.theme": "المظهر",
  "profile.theme.dark": "داكن",
  "profile.theme.light": "فاتح",
  "profile.language": "اللغة",
  "profile.notifications": "الإشعارات",
  "profile.notifications.enable": "تفعيل الإشعارات",
  "profile.notifications.enabled": "مُفعَّلة",
  "profile.about": "عن التطبيق",
  "profile.version": "الإصدار",
  "profile.signOut": "تسجيل الخروج",
  "profile.signOutConfirm": "هل أنت متأكد أنك تريد تسجيل الخروج؟",
  "profile.restartHint":
    "تغيير اللغة يتطلّب إعادة تشغيل التطبيق لتطبيق اتجاه التخطيط.",
};

export const dictionaries: Record<Locale, Dict> = { en, ar };

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  let v = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (vars) {
    for (const [k, val] of Object.entries(vars)) {
      v = v.replace(new RegExp(`\\{${k}\\}`, "g"), String(val));
    }
  }
  return v;
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}
