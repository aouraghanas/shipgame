/**
 * Lightweight i18n for Shipeh.
 *
 * - English (default) and Arabic.
 * - User-entered data (names, ticket bodies, ledger descriptions, comments,
 *   emails, etc.) is NEVER translated — only static UI strings.
 * - Arabic switches the document to dir="rtl" + lang="ar".
 */

export type Locale = "en" | "ar";
export const LOCALES: readonly Locale[] = ["en", "ar"] as const;
export const DEFAULT_LOCALE: Locale = "en";

type Dict = Record<string, string>;

const en: Dict = {
  // common
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "common.refresh": "Refresh",
  "common.refreshing": "Refreshing…",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.loading": "Loading…",
  "common.signOut": "Sign out",
  "common.search": "Search",
  "common.from": "From",
  "common.to": "To",
  "common.back": "Back",
  "common.submit": "Submit",
  "common.create": "Create",
  "common.update": "Update",
  "common.optional": "(optional)",
  "common.yes": "Yes",
  "common.no": "No",
  "common.all": "All",
  "common.none": "None",

  // theme + language switches
  "theme.toLight": "Switch to light mode",
  "theme.toDark": "Switch to dark mode",
  "lang.toggleTo": "العربية",

  // navbar
  "nav.dashboard": "Dashboard",
  "nav.tickets": "Tickets",
  "nav.users": "Users",
  "nav.rewards": "Rewards",
  "nav.activity": "Activity",
  "nav.reports": "Reports",
  "nav.accounting": "Accounting",
  "nav.accounting.lyd": "Accounting (LYD)",
  "nav.performance": "Performance",
  "nav.recommendations": "Recommendations",
  "nav.leaderboard": "Leaderboard",
  "nav.notifications": "Notifications",
  "nav.profile": "Profile",
  "nav.activityIntel": "Activity intel",

  // login
  "login.title": "Shipeh Leaderboard",
  "login.subtitle": "Sign in to your account",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Sign In",
  "login.signingIn": "Signing in...",
  "login.invalid": "Invalid email or password.",
  "login.emailPlaceholder": "you@shipeh.com",

  // status (ticket / generic)
  "status.OPEN": "Open",
  "status.IN_PROGRESS": "In progress",
  "status.WAITING": "Waiting",
  "status.RESOLVED": "Resolved",
  "status.ARCHIVED": "Archived",

  // priority
  "priority.LOW": "Low",
  "priority.NORMAL": "Normal",
  "priority.HIGH": "High",
  "priority.URGENT": "Urgent",

  // accounting
  "accounting.title": "Shipeh accounting",
  "accounting.subtitle":
    "Manual ledger for Libya operations: expenses (−), revenue (+), per-city delivery spreads, COD %, lead fees, FX rates, and AI-assisted period reviews. Numbers you enter here are the source of truth until Shipeh APIs sync.",
  "accounting.tabs.overview": "Overview",
  "accounting.tabs.ledger": "Ledger",
  "accounting.tabs.tools": "Quick calculators",
  "accounting.tabs.ai": "AI report",
  "accounting.tabs.admin": "Fees & FX (admin)",
  "accounting.preset.all": "All time",
  "accounting.preset.month": "This month",
  "accounting.preset.30d": "Last 30 days",
  "accounting.preset.year": "This year",
  "accounting.preset.custom": "Custom",
  "accounting.netPeriod": "{cur} net (period)",
  "accounting.byCategory": "By category",
  "accounting.tableCategory": "Category",
  "accounting.tableDir": "Dir",
  "accounting.tableCcy": "CCY",
  "accounting.tableTotal": "Total",
  "accounting.newLine": "New ledger line",
  "accounting.recentLines": "Recent lines (period)",
  "accounting.noLines": "No lines in this range.",
  "accounting.direction": "Direction",
  "accounting.direction.expense": "Expense (−)",
  "accounting.direction.revenue": "Revenue (+)",
  "accounting.category": "Category",
  "accounting.amount": "Amount",
  "accounting.currency": "Currency",
  "accounting.date": "Date",
  "accounting.description": "Description",
  "accounting.descriptionPlaceholder": "What this line represents",
  "accounting.saveLine": "Save to ledger",

  // tickets
  "tickets.title": "Support tickets",
  "tickets.subtitle":
    "Queue first — filter by dates, status, priority, or creator. Urgent rows are highlighted in red so they stand out. Archive resolved items to keep the list calm.",
  "tickets.queue": "Queue",
  "tickets.filters": "Filters",
  "tickets.filters.status": "Status",
  "tickets.filters.priority": "Priority",
  "tickets.filters.creator": "Created by",
  "tickets.filters.dateFrom": "From date",
  "tickets.filters.dateTo": "To date",
  "tickets.filters.allStatuses": "All statuses",
  "tickets.filters.allPriorities": "All priorities",
  "tickets.filters.anyone": "Anyone",
  "tickets.filters.includeArchived": "Include archived",
  "tickets.filters.clear": "Clear filters",
  "tickets.filters.scopedHint": "Your tickets and items assigned to you.",
  "tickets.stats.active": "Active",
  "tickets.stats.activeHint": "open + progress + waiting",
  "tickets.stats.open": "Open",
  "tickets.stats.inProgress": "In progress",
  "tickets.stats.waiting": "Waiting",
  "tickets.stats.resolved": "Resolved",
  "tickets.stats.archived": "Archived",
  "tickets.stats.total": "Total",
  "tickets.stats.totalHint": "in current scope",
  "tickets.new": "New ticket",
  "tickets.empty": "No tickets in this view.",
  "tickets.emptyCanCreate": "Adjust filters or create a ticket below.",
  "tickets.emptyReadOnly": "Adjust filters or ask an account manager to open a ticket.",

  // leaderboard
  "leaderboard.title": "Leaderboard",
  "leaderboard.subtitle": "Current month rankings",
  "leaderboard.competing": "{n} managers competing",
  "leaderboard.points": "points",
  "leaderboard.delivered": "Delivered",
  "leaderboard.stock": "Stock",
  "leaderboard.score": "Score",
  "leaderboard.stockQty": "Stock qty",
  "leaderboard.empty": "No rankings yet for this month.",
  "leaderboard.1st": "1st",
  "leaderboard.2nd": "2nd",
  "leaderboard.3rd": "3rd",

  // users
  "users.title": "Users",
  "users.subtitle": "Manage all accounts",
  "users.new": "New User",
  "users.role.ACTIVE": "ACTIVE",
  "users.role.INACTIVE": "INACTIVE",
};

const ar: Dict = {
  // common
  "common.save": "حفظ",
  "common.saving": "جارٍ الحفظ...",
  "common.cancel": "إلغاء",
  "common.refresh": "تحديث",
  "common.refreshing": "جارٍ التحديث…",
  "common.delete": "حذف",
  "common.edit": "تعديل",
  "common.loading": "جارٍ التحميل…",
  "common.signOut": "تسجيل الخروج",
  "common.search": "بحث",
  "common.from": "من",
  "common.to": "إلى",
  "common.back": "رجوع",
  "common.submit": "إرسال",
  "common.create": "إنشاء",
  "common.update": "تحديث",
  "common.optional": "(اختياري)",
  "common.yes": "نعم",
  "common.no": "لا",
  "common.all": "الكل",
  "common.none": "لا شيء",

  "theme.toLight": "تبديل إلى الوضع الفاتح",
  "theme.toDark": "تبديل إلى الوضع الداكن",
  "lang.toggleTo": "English",

  "nav.dashboard": "لوحة التحكم",
  "nav.tickets": "التذاكر",
  "nav.users": "المستخدمون",
  "nav.rewards": "المكافآت",
  "nav.activity": "النشاط",
  "nav.reports": "التقارير",
  "nav.accounting": "المحاسبة",
  "nav.accounting.lyd": "المحاسبة (دينار ليبي)",
  "nav.performance": "الأداء",
  "nav.recommendations": "التوصيات",
  "nav.leaderboard": "لوحة المتصدرين",
  "nav.notifications": "الإشعارات",
  "nav.profile": "الملف الشخصي",
  "nav.activityIntel": "تحليل النشاط",

  "login.title": "لوحة Shipeh للمتصدرين",
  "login.subtitle": "سجّل الدخول إلى حسابك",
  "login.email": "البريد الإلكتروني",
  "login.password": "كلمة المرور",
  "login.submit": "تسجيل الدخول",
  "login.signingIn": "جارٍ تسجيل الدخول...",
  "login.invalid": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "login.emailPlaceholder": "you@shipeh.com",

  "status.OPEN": "مفتوحة",
  "status.IN_PROGRESS": "قيد التنفيذ",
  "status.WAITING": "بانتظار",
  "status.RESOLVED": "تم الحل",
  "status.ARCHIVED": "مؤرشفة",

  "priority.LOW": "منخفضة",
  "priority.NORMAL": "عادية",
  "priority.HIGH": "عالية",
  "priority.URGENT": "عاجلة",

  "accounting.title": "محاسبة Shipeh",
  "accounting.subtitle":
    "دفتر يدوي لعمليات ليبيا: المصروفات (−)، الإيرادات (+)، فروق التوصيل لكل مدينة، نسبة COD، رسوم الجلب، أسعار الصرف، ومراجعات دورية بمساعدة الذكاء الاصطناعي. الأرقام التي تُدخلها هنا هي المرجع حتى تتم مزامنة Shipeh APIs.",
  "accounting.tabs.overview": "نظرة عامة",
  "accounting.tabs.ledger": "الدفتر",
  "accounting.tabs.tools": "الحاسبات السريعة",
  "accounting.tabs.ai": "تقرير الذكاء الاصطناعي",
  "accounting.tabs.admin": "الرسوم وأسعار الصرف (المسؤول)",
  "accounting.preset.all": "كل الأوقات",
  "accounting.preset.month": "هذا الشهر",
  "accounting.preset.30d": "آخر 30 يومًا",
  "accounting.preset.year": "هذه السنة",
  "accounting.preset.custom": "مخصص",
  "accounting.netPeriod": "صافي {cur} (الفترة)",
  "accounting.byCategory": "حسب الفئة",
  "accounting.tableCategory": "الفئة",
  "accounting.tableDir": "الاتجاه",
  "accounting.tableCcy": "العملة",
  "accounting.tableTotal": "الإجمالي",
  "accounting.newLine": "بند دفتر جديد",
  "accounting.recentLines": "البنود الأخيرة (الفترة)",
  "accounting.noLines": "لا توجد بنود في هذا النطاق.",
  "accounting.direction": "الاتجاه",
  "accounting.direction.expense": "مصروف (−)",
  "accounting.direction.revenue": "إيراد (+)",
  "accounting.category": "الفئة",
  "accounting.amount": "المبلغ",
  "accounting.currency": "العملة",
  "accounting.date": "التاريخ",
  "accounting.description": "الوصف",
  "accounting.descriptionPlaceholder": "ما يمثّله هذا البند",
  "accounting.saveLine": "حفظ في الدفتر",

  "tickets.title": "تذاكر الدعم",
  "tickets.subtitle":
    "قائمة الانتظار أولاً — صفّ حسب التاريخ أو الحالة أو الأولوية أو المُنشئ. الصفوف العاجلة مظلّلة بالأحمر للفت الانتباه. أرشف العناصر المنتهية للحفاظ على نظافة القائمة.",
  "tickets.queue": "قائمة الانتظار",
  "tickets.filters": "الفلاتر",
  "tickets.filters.status": "الحالة",
  "tickets.filters.priority": "الأولوية",
  "tickets.filters.creator": "أنشئت بواسطة",
  "tickets.filters.dateFrom": "من تاريخ",
  "tickets.filters.dateTo": "إلى تاريخ",
  "tickets.filters.allStatuses": "كل الحالات",
  "tickets.filters.allPriorities": "كل الأولويات",
  "tickets.filters.anyone": "أي شخص",
  "tickets.filters.includeArchived": "تضمين المؤرشف",
  "tickets.filters.clear": "مسح الفلاتر",
  "tickets.filters.scopedHint": "تذاكرك والعناصر المسندة إليك.",
  "tickets.stats.active": "نشط",
  "tickets.stats.activeHint": "مفتوحة + قيد التنفيذ + بانتظار",
  "tickets.stats.open": "مفتوحة",
  "tickets.stats.inProgress": "قيد التنفيذ",
  "tickets.stats.waiting": "بانتظار",
  "tickets.stats.resolved": "تم الحل",
  "tickets.stats.archived": "مؤرشفة",
  "tickets.stats.total": "الإجمالي",
  "tickets.stats.totalHint": "ضمن النطاق الحالي",
  "tickets.new": "تذكرة جديدة",
  "tickets.empty": "لا توجد تذاكر في هذا العرض.",
  "tickets.emptyCanCreate": "عدّل الفلاتر أو أنشئ تذكرة أدناه.",
  "tickets.emptyReadOnly": "عدّل الفلاتر أو اطلب من مدير الحساب فتح تذكرة.",

  "leaderboard.title": "لوحة المتصدّرين",
  "leaderboard.subtitle": "تصنيفات الشهر الحالي",
  "leaderboard.competing": "{n} مديرًا يتنافسون",
  "leaderboard.points": "نقاط",
  "leaderboard.delivered": "المُسلَّم",
  "leaderboard.stock": "المخزون",
  "leaderboard.score": "النتيجة",
  "leaderboard.stockQty": "كمية المخزون",
  "leaderboard.empty": "لا توجد تصنيفات لهذا الشهر بعد.",
  "leaderboard.1st": "الأول",
  "leaderboard.2nd": "الثاني",
  "leaderboard.3rd": "الثالث",

  "users.title": "المستخدمون",
  "users.subtitle": "إدارة جميع الحسابات",
  "users.new": "مستخدم جديد",
  "users.role.ACTIVE": "نشط",
  "users.role.INACTIVE": "غير نشط",
};

export const dictionaries: Record<Locale, Dict> = { en, ar };

/**
 * Translate a key with optional `{var}` interpolation.
 * Falls back to English, then to the key string itself.
 */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
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

export function localeFromString(s: string | null | undefined): Locale {
  return s === "ar" ? "ar" : DEFAULT_LOCALE;
}
