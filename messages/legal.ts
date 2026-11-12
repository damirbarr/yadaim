import type { Locale } from "@/lib/i18n/locales";

// Long-form legal text for /privacy and /terms, one version per language. A separate file rather than a
// namespace in messages/<locale>/ because it is prose with lists. Draft wording: have a lawyer review it.
export type LegalDoc = { title: string; eyebrow: string; updated: string; intro: string; sections: { h: string; p?: string; li?: string[] }[] };

const UPDATED = "12.11.2026";

export const privacy: Record<Locale, LegalDoc> = {
  he: {
    title: "מדיניות פרטיות", eyebrow: "מסמך משפטי", updated: "עודכן לאחרונה", intro: "ידיים היא מערכת שמחברת בין תאגידי כוח אדם בבנייה לבין קבלנים רשומים. המסמך הזה מסביר איזה מידע נאסף במערכת, למה, ומי רואה אותו.",
    sections: [
      { h: "איזה מידע נאסף", li: ["פרטי התחברות: כשנכנסים עם חשבון גוגל מתקבלים רק שם, כתובת אימייל ותמונת פרופיל. אין גישה לסיסמה או לתוכן החשבון.", "פרטי הארגון: שם החברה או התאגיד, מספר רישום, עיר וטלפון שהוזנו.", "פרטי עובדים: התאגיד מזין את פרטי העובדים שלו (שם, מקצוע, ותק, ארץ מוצא, תוקף אשרות ואישורים וסריקות של מסמכים). התאגיד אחראי על המידע הזה ועל קבלת הסכמת העובדים.", "פעילות במערכת: הזמנות, שיבוצים, נוכחות באתר, שעות עבודה ודירוגים, וכן יומן פעולות לצורכי אבטחה."] },
      { h: "למה המידע משמש", li: ["כדי לאפשר לקבלן להזמין עובדים ולתאגיד לנהל ולשבץ אותם.", "כדי לחשב מחירים, שעות עבודה, ציון אמינות ודוחות הצבה.", "כדי לאבטח את המערכת ולמנוע שימוש לרעה."], p: "המידע לא נמכר ולא משמש לפרסום." },
      { h: "מי רואה את המידע", li: ["כל ארגון רואה את המידע שלו בלבד, לפי ההרשאות שבעלי החשבון נתנו לכל משתמש.", "קבלן רואה את הפרופיל המקצועי של עובד שמוצע לו (שם פרטי, מקצוע, ותק, דירוג ותוקף אישורים). מספר הדרכון מוצג מוסתר.", "מנהלי המערכת רואים מידע לצורכי תמיכה ואימות ארגונים, וכל כניסה שלהם נרשמת ביומן."] },
      { h: "איפה המידע נשמר", p: "המידע והקבצים נשמרים אצל ספקי ענן מוכרים, בשרתים באיחוד האירופי, בחיבור מוצפן. קבצים נשמרים באחסון פרטי ונגישים רק דרך המערכת אחרי בדיקת הרשאה." },
      { h: "הזכויות שלכם", p: "אפשר לבקש לעיין במידע, לתקן אותו או למחוק את החשבון. בעלי חשבון ארגוני יכולים לעדכן ולמחוק את פרטי העובדים בעצמם בכל עת." },
      { h: "שינויים במדיניות", p: "אם המדיניות תשתנה, התאריך בראש העמוד יתעדכן ותישלח הודעה למשתמשים במערכת." },
    ],
  },
  en: {
    title: "Privacy policy", eyebrow: "Legal", updated: "Last updated", intro: "Yadaim connects construction manpower agencies with registered contractors. This page explains what information the system collects, why, and who can see it.",
    sections: [
      { h: "What is collected", li: ["Sign-in details: signing in with Google shares only your name, email address and profile picture. There is no access to your password or account content.", "Organization details: the company or agency name, registration number, city and phone you entered.", "Worker details: the agency enters its workers' details (name, trade, experience, country of origin, visa and permit validity, document scans). The agency is responsible for this information and for its workers' consent.", "Activity: bookings, assignments, site attendance, work hours and ratings, plus an action log for security."] },
      { h: "How it is used", li: ["To let contractors book workers and agencies manage and assign them.", "To calculate prices, work hours, the reliability score and placement reports.", "To secure the system and prevent misuse."], p: "Information is never sold or used for advertising." },
      { h: "Who can see it", li: ["Each organization sees only its own information, according to the permissions its account owner gave each user.", "A contractor sees the professional profile of a worker offered to them (first name, trade, experience, rating and permit validity). Passport numbers are masked.", "System administrators see information for support and organization verification, and every access is logged."] },
      { h: "Where it is stored", p: "Information and files are stored with established cloud providers on servers in the European Union, over encrypted connections. Files are kept in private storage and are reachable only through the system after a permission check." },
      { h: "Your rights", p: "You can ask to see, correct or delete your information and account. Organization owners can update or delete their workers' details themselves at any time." },
      { h: "Changes", p: "If this policy changes, the date at the top is updated and users are notified in the system." },
    ],
  },
  ar: {
    title: "سياسة الخصوصية", eyebrow: "وثيقة قانونية", updated: "آخر تحديث", intro: "«يادايم» نظام يربط بين شركات القوى العاملة في البناء والمقاولين المسجّلين. توضّح هذه الصفحة ما هي المعلومات التي يجمعها النظام، ولماذا، ومن يمكنه رؤيتها.",
    sections: [
      { h: "ما الذي يُجمع", li: ["بيانات الدخول: عند الدخول بحساب جوجل يصلنا الاسم والبريد الإلكتروني وصورة الملف الشخصي فقط، دون أي وصول إلى كلمة المرور أو محتوى الحساب.", "بيانات المؤسسة: اسم الشركة، رقم التسجيل، المدينة والهاتف التي أُدخلت.", "بيانات العمّال: تُدخل شركة القوى العاملة بيانات عمّالها (الاسم، المهنة، الخبرة، بلد المنشأ، صلاحية التأشيرات والتصاريح ونسخ الوثائق)، وهي المسؤولة عن هذه المعلومات وعن موافقة العمّال.", "النشاط في النظام: الحجوزات، التعيينات، الحضور في الموقع، ساعات العمل والتقييمات، وسجلّ عمليات لأغراض الأمان."] },
      { h: "كيف تُستخدم المعلومات", li: ["لتمكين المقاول من حجز العمّال، وشركة القوى العاملة من إدارتهم وتعيينهم.", "لحساب الأسعار وساعات العمل ومؤشّر الموثوقية وتقارير التشغيل.", "لتأمين النظام ومنع إساءة الاستخدام."], p: "لا تُباع المعلومات ولا تُستخدم للإعلانات." },
      { h: "من يرى المعلومات", li: ["كل مؤسسة ترى معلوماتها فقط، حسب الصلاحيات التي منحها صاحب الحساب لكل مستخدم.", "يرى المقاول الملف المهني للعامل المعروض عليه (الاسم الأول، المهنة، الخبرة، التقييم وصلاحية التصاريح). رقم جواز السفر يظهر مخفيًا.", "يرى مديرو النظام المعلومات لأغراض الدعم والتحقّق من المؤسسات، ويُسجَّل كل دخول لهم."] },
      { h: "أين تُحفظ المعلومات", p: "تُحفظ المعلومات والملفات لدى مزوّدي سحابة معروفين على خوادم في الاتحاد الأوروبي، عبر اتصال مشفّر. تُحفظ الملفات في تخزين خاص ولا يمكن الوصول إليها إلا عبر النظام بعد التحقّق من الصلاحية." },
      { h: "حقوقكم", p: "يمكنكم طلب الاطلاع على المعلومات أو تصحيحها أو حذف الحساب. ويمكن لأصحاب حسابات المؤسسات تحديث بيانات عمّالهم أو حذفها بأنفسهم في أي وقت." },
      { h: "التغييرات", p: "إذا تغيّرت هذه السياسة يُحدَّث التاريخ أعلى الصفحة ويُرسل إشعار للمستخدمين في النظام." },
    ],
  },
};

export const terms: Record<Locale, LegalDoc> = {
  he: {
    title: "תנאי שימוש", eyebrow: "מסמך משפטי", updated: "עודכן לאחרונה", intro: "השימוש במערכת ידיים כפוף לתנאים האלה. כניסה למערכת מהווה הסכמה להם.",
    sections: [
      { h: "מה המערכת עושה", p: "ידיים היא כלי טכנולוגי שמחבר בין תאגידי כוח אדם מורשים בענף הבנייה לבין קבלנים רשומים. התאגיד הוא המעסיק החוקי של העובד, והוא שמאשר כל הצבה. ידיים אינה מעסיקה עובדים ואינה צד להתקשרות בין הקבלן לתאגיד." },
      { h: "אחריות המשתמשים", li: ["התאגיד אחראי לכך שהוא מחזיק בהיתר בתוקף, שפרטי העובדים והאישורים שהזין נכונים, ושההצבה עומדת בכל דין ונוהל.", "הקבלן אחראי לכך שהוא רשום ברשם הקבלנים בסיווג המתאים, ושהוא מעסיק את העובדים בתנאי בטיחות כנדרש.", "כל משתמש אחראי לשמור על חשבונו ולא להעביר אותו לאחר."] },
      { h: "תשלומים", p: "הקבלן משלם לתאגיד ישירות, לפי השעות שאישר במערכת. התאגיד משלם לידיים תעריף קבוע לכל שעת עבודה מאושרת, לפי ההסכם שנחתם איתו. הכסף של העסקה לא עובר דרך ידיים." },
      { h: "הגבלת אחריות", p: "המערכת ניתנת כפי שהיא. ידיים אינה אחראית לאיכות העבודה, להגעת עובד או לנזק שנגרם באתר, ואינה אחראית למידע שמשתמשים הזינו." },
      { h: "השעיה וסגירה", p: "ידיים רשאית להשעות משתמש או ארגון שמפרים את התנאים, מזינים מידע כוזב או פוגעים במשתמשים אחרים." },
      { h: "דין וסמכות", p: "על התנאים חל הדין הישראלי, וסמכות השיפוט נתונה לבתי המשפט בישראל." },
    ],
  },
  en: {
    title: "Terms of use", eyebrow: "Legal", updated: "Last updated", intro: "Using Yadaim is subject to these terms. Signing in means you accept them.",
    sections: [
      { h: "What the system does", p: "Yadaim is a technology tool that connects licensed construction manpower agencies with registered contractors. The agency is the worker's legal employer and approves every placement. Yadaim does not employ workers and is not a party to the agreement between contractor and agency." },
      { h: "Users' responsibilities", li: ["The agency is responsible for holding a valid license, for the accuracy of the worker and permit details it enters, and for every placement complying with the law.", "The contractor is responsible for being listed in the contractors' registry under the right classification, and for employing workers under the required safety conditions.", "Every user is responsible for keeping their account secure and not sharing it."] },
      { h: "Payments", p: "The contractor pays the agency directly, for the hours approved in the system. The agency pays Yadaim a fixed rate per approved work hour, under its signed agreement. The money of the deal does not pass through Yadaim." },
      { h: "Limitation of liability", p: "The system is provided as is. Yadaim is not responsible for the quality of work, a worker's arrival or damage on site, nor for information users entered." },
      { h: "Suspension", p: "Yadaim may suspend a user or organization that breaches these terms, enters false information or harms other users." },
      { h: "Governing law", p: "These terms are governed by Israeli law, and the courts of Israel have jurisdiction." },
    ],
  },
  ar: {
    title: "شروط الاستخدام", eyebrow: "وثيقة قانونية", updated: "آخر تحديث", intro: "استخدام نظام «يادايم» خاضع لهذه الشروط، والدخول إلى النظام يعني الموافقة عليها.",
    sections: [
      { h: "ماذا يفعل النظام", p: "«يادايم» أداة تقنية تربط بين شركات القوى العاملة المرخّصة في البناء والمقاولين المسجّلين. شركة القوى العاملة هي صاحبة العمل القانونية للعامل وهي التي توافق على كل تشغيل. لا يشغّل «يادايم» عمّالًا وليس طرفًا في الاتفاق بين المقاول والشركة." },
      { h: "مسؤولية المستخدمين", li: ["شركة القوى العاملة مسؤولة عن حيازة ترخيص ساري المفعول، وعن صحة بيانات العمّال والتصاريح التي أدخلتها، وعن مطابقة كل تشغيل للقانون.", "المقاول مسؤول عن تسجيله في سجلّ المقاولين بالتصنيف المناسب، وعن تشغيل العمّال وفق شروط السلامة المطلوبة.", "كل مستخدم مسؤول عن الحفاظ على حسابه وعدم نقله لغيره."] },
      { h: "الدفع", p: "يدفع المقاول لشركة القوى العاملة مباشرةً حسب الساعات التي وافق عليها في النظام. وتدفع الشركة لـ«يادايم» تعرفة ثابتة عن كل ساعة عمل موافق عليها حسب الاتفاق الموقّع معها. لا تمرّ أموال الصفقة عبر «يادايم»." },
      { h: "تحديد المسؤولية", p: "يُقدَّم النظام كما هو. «يادايم» غير مسؤول عن جودة العمل أو وصول العامل أو أي ضرر في الموقع، ولا عن المعلومات التي أدخلها المستخدمون." },
      { h: "التعليق والإغلاق", p: "يحقّ لـ«يادايم» تعليق مستخدم أو مؤسسة يخالفان الشروط أو يُدخلان معلومات كاذبة أو يضرّان بمستخدمين آخرين." },
      { h: "القانون والاختصاص", p: "تخضع هذه الشروط للقانون الإسرائيلي، والاختصاص للمحاكم في إسرائيل." },
    ],
  },
};
export const LEGAL_UPDATED = UPDATED;
