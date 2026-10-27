import type { Messages } from "..";
import { plural } from "@/lib/i18n/core";

const m: Messages["common"] = {
  brand: "يادايم",
  tagline: "عمّال بناء من شركات قوى عاملة مرخّصة",
  language: "اللغة",
  logout: "خروج",
  back: "رجوع",
  save: "حفظ",
  cancel: "إلغاء",
  close: "إغلاق",
  more: "المزيد",
  change: "تغيير",
  nav: {
    agency: {
      today: "اليوم",
      calendar: "التقويم",
      requests: "الطلبات والتوزيع",
      compliance: "التصاريح والصلاحية",
      workers: "عمّالي",
      crews: "الطواقم",
      contractors: "قائمة المقاولين",
      campaigns: "تسويق للمقاولين",
      billing: "الحساب والتقارير",
      team: "الفريق والصلاحيات",
      settings: "الإعدادات",
    },
    agencyShort: { today: "اليوم", calendar: "التقويم", crews: "الطواقم", requests: "الطلبات", compliance: "التصاريح", workers: "العمّال", campaigns: "التسويق", contractors: "المقاولون", billing: "الحساب", team: "الفريق", settings: "الإعدادات" },
    contractor: { search: "حجز جديد", orders: "حجوزاتي", crews: "طواقم محفوظة", team: "الفريق" },
    admin: { orgs: "المؤسسات", users: "المستخدمون والصلاحيات", audit: "سجل النشاط", badge: "مسؤول" },
  },
  publicPage: "صفحتي العامة",
  agencyPending: "تنتظر شركتكم التحقق من ترخيصها ({license}) لدى سلطة السكان والهجرة. في هذه الأثناء يمكنكم إضافة العمّال وبناء قائمة المقاولين. سيظهر ملف الشركة في بحث المقاولين بعد التحقق.",
  agencySuspended: "تم إخفاء ملف الشركة من نتائج البحث. لمعرفة السبب، تواصلوا مع فريق الدعم في يادايم.",
  contractorPending: "ينتظر حسابكم التحقق من رقم التسجيل في سجل المقاولين ({registry}). يمكنكم من الآن البحث عن عمّال ومشاهدة الأسعار. سيُتاح إرسال الحجوزات بعد التحقق، عادةً خلال يوم عمل واحد.",
  impersonating: "<b>{admin}</b> يتصفّح النظام بصفة <b>{user}</b> لأغراض الدعم. يُسجَّل كل إجراء في سجل النشاط.",
  backToAdmin: "العودة إلى لوحة المسؤول",
  newWorker: "جديد في النظام",
  jobs: plural({ zero: "لا أعمال", one: "عمل واحد", two: "عملان", few: "{n} أعمال", many: "{n} عملًا", other: "{n} عمل" }),
  score: "التقييم {n}",
};
export default m;
