import { plural } from "@/lib/i18n/core";

// Month calendars (agency overview, contractor bookings) and worker availability.
export default {
  nav: "מעבר בין חודשים",
  prev: "החודש הקודם",
  next: "החודש הבא",
  today: "היום",
  week: "שבוע {from} – {to}",
  view: { label: "תצוגה", calendar: "לוח שנה", list: "רשימה" },

  agency: {
    title: "לוח זמנים",
    eyebrow: "תמונת מצב חודשית",
    sub: "כמה עובדים משובצים וכמה פנויים בכל יום עבודה. בחרו יום כדי לראות מי עובד איפה.",
    allTrades: "כל המקצועות",
    assigned: plural({ one: "משובץ אחד", other: "{n} משובצים" }),
    free: plural({ one: "פנוי אחד", other: "{n} פנויים" }),
    ofTotal: "מתוך {n}",
    cellAria: "{date}: {assigned} משובצים, {free} פנויים",
    legendAssigned: "משובצים",
    legendFree: "פנויים",
    assignedTitle: "משובצים",
    freeTitle: "פנויים",
    workers: plural({ one: "עובד אחד", other: "{n} עובדים" }),
    noneAssigned: "אף עובד לא משובץ ביום הזה.",
    noneFree: "כל העובדים משובצים ביום הזה.",
    weekend: "שישי ושבת אינם ימי עבודה.",
    market: "לשיווק הימים הפנויים",
    noWorkers: "עוד אין עובדים פעילים. הוסיפו עובדים כדי לראות זמינות.",
    open: "לפרטי ההזמנה",
  },

  contractor: {
    empty: "אין הזמנות בחודש הזה.",
    emptyLink: "להזמנה חדשה",
  },

  availability: {
    label: plural({ zero: "אין ימים פנויים · {pct}%", one: "יום פנוי אחד · {pct}%", other: "{n} ימים פנויים · {pct}%" }),
    title: "השבועיים הקרובים",
    free: "פנוי",
    busy: "משובץ",
    aria: "{free} מתוך {total} ימי עבודה פנויים, {pct}%",
  },
};
