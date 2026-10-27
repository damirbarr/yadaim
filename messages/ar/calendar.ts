import { plural } from "@/lib/i18n/core";
import type { Messages } from "..";

const m: Messages["calendar"] = {
  nav: "التنقّل بين الأشهر",
  prev: "الشهر السابق",
  next: "الشهر التالي",
  today: "اليوم",
  week: "أسبوع {from} – {to}",
  view: { label: "طريقة العرض", calendar: "تقويم", list: "قائمة" },

  agency: {
    title: "التقويم",
    eyebrow: "نظرة على الشهر",
    sub: "كم عاملًا مُعيَّن وكم عاملًا متاح في كل يوم عمل. اختاروا يومًا لتروا من يعمل وأين.",
    allTrades: "كل المهن",
    assigned: plural({ one: "مُعيَّن واحد", two: "مُعيَّنان", few: "{n} مُعيَّنين", many: "{n} مُعيَّنًا", other: "{n} مُعيَّن" }),
    free: plural({ one: "متاح واحد", two: "متاحان", few: "{n} متاحين", many: "{n} متاحًا", other: "{n} متاح" }),
    ofTotal: "من {n}",
    cellAria: "{date}: {assigned} مُعيَّنون، {free} متاحون",
    legendAssigned: "مُعيَّنون",
    legendFree: "متاحون",
    assignedTitle: "مُعيَّنون",
    freeTitle: "متاحون",
    workers: plural({ one: "عامل واحد", two: "عاملان", few: "{n} عمّال", many: "{n} عاملًا", other: "{n} عامل" }),
    noneAssigned: "لا يوجد عامل مُعيَّن في هذا اليوم.",
    noneFree: "كل العمّال مُعيَّنون في هذا اليوم.",
    weekend: "الجمعة والسبت ليسا يومَي عمل.",
    market: "لتسويق الأيام المتاحة",
    noWorkers: "لا يوجد عمّال نشطون بعد. أضيفوا عمّالًا لرؤية التوفّر.",
    open: "تفاصيل الطلب",
  },

  contractor: {
    empty: "لا توجد طلبات في هذا الشهر.",
    emptyLink: "لطلب جديد",
  },

  availability: {
    label: plural({ zero: "لا أيام متاحة · {pct}%", one: "يوم متاح واحد · {pct}%", two: "يومان متاحان · {pct}%", few: "{n} أيام متاحة · {pct}%", many: "{n} يومًا متاحًا · {pct}%", other: "{n} يوم متاح · {pct}%" }),
    title: "الأسبوعان القادمان",
    free: "متاح",
    busy: "مُعيَّن",
    aria: "{free} من {total} أيام عمل متاحة، {pct}%",
  },
};
export default m;
