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
  agencyPending: "شركتكم بانتظار التحقق من الترخيص ({license}) لدى سلطة السكان. في هذه الأثناء يمكنكم رفع العمّال وبناء قائمة المقاولين. سيظهر ملفكم في بحث المقاولين بعد التحقق.",
  agencySuspended: "ملفكم مخفيّ من البحث. تواصلوا معنا لمعرفة السبب.",
  contractorPending: "حسابكم بانتظار التحقق من رقم التسجيل في سجل المقاولين ({registry}). يمكنكم البحث عن عمّال ومشاهدة الأسعار من الآن. إرسال الحجوزات يُفتح بعد التحقق، عادةً خلال يوم عمل واحد.",
  impersonating: "<b>{admin}</b> يشاهد النظام بصفة <b>{user}</b> لأغراض الدعم. كل إجراء يُسجَّل.",
  backToAdmin: "العودة إلى لوحة المسؤول",
  newWorker: "جديد",
  jobs: plural({ zero: "لا أعمال", one: "عمل واحد", two: "عملان", few: "{n} أعمال", many: "{n} عملًا", other: "{n} عمل" }),
  score: "التقييم {n}",
};
export default m;
