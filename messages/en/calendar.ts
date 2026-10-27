import { plural } from "@/lib/i18n/core";
import type { Messages } from "..";

const m: Messages["calendar"] = {
  nav: "Change month",
  prev: "Previous month",
  next: "Next month",
  today: "Today",
  week: "Week {from} – {to}",
  view: { label: "View", calendar: "Calendar", list: "List" },

  agency: {
    title: "Calendar",
    eyebrow: "Month at a glance",
    sub: "How many workers are assigned and how many are free on each work day. Pick a day to see who works where.",
    allTrades: "All trades",
    assigned: plural({ one: "1 assigned", other: "{n} assigned" }),
    free: plural({ one: "1 free", other: "{n} free" }),
    ofTotal: "of {n}",
    cellAria: "{date}: {assigned} assigned, {free} free",
    legendAssigned: "Assigned",
    legendFree: "Free",
    assignedTitle: "Assigned",
    freeTitle: "Free",
    workers: plural({ one: "1 worker", other: "{n} workers" }),
    noneAssigned: "No one is assigned on this day.",
    noneFree: "Every worker is assigned on this day.",
    weekend: "Friday and Saturday are not work days.",
    market: "Market the free days",
    noWorkers: "No active workers yet. Add workers to see availability.",
    open: "Open booking",
  },

  contractor: {
    empty: "No bookings this month.",
    emptyLink: "Book workers",
  },

  availability: {
    label: plural({ zero: "No free days · {pct}%", one: "1 free day · {pct}%", other: "{n} free days · {pct}%" }),
    title: "Next two weeks",
    free: "Free",
    busy: "Assigned",
    aria: "{free} of {total} work days free, {pct}%",
  },
};
export default m;
