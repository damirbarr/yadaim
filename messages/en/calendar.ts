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
    sub: "The number of assigned and available workers on each work day. Choose a day to see who works where.",
    allTrades: "All trades",
    assigned: plural({ one: "1 assigned", other: "{n} assigned" }),
    free: plural({ one: "1 available", other: "{n} available" }),
    ofTotal: "of {n}",
    cellAria: "{date}: {assigned} assigned, {free} available",
    legendAssigned: "Assigned",
    legendFree: "Available",
    assignedTitle: "Assigned",
    freeTitle: "Available",
    workers: plural({ one: "1 worker", other: "{n} workers" }),
    noneAssigned: "No workers are assigned on this day.",
    noneFree: "Every worker is assigned on this day.",
    weekend: "Saturday is not a work day.",
    offerSale: "Offer a sale price to contractors",
    offerSaleFor: "Offer a sale price to contractors: {trades}",
    noWorkers: "No active workers yet. Add workers to see availability.",
    open: "View booking",
  },

  contractor: {
    empty: "No bookings this month.",
    emptyLink: "Book workers",
  },

  availability: {
    label: plural({ zero: "No free days · {pct}%", one: "1 free day · {pct}%", other: "{n} free days · {pct}%" }),
    title: "Next two weeks",
    free: "Available",
    busy: "Assigned",
    aria: "{free} of {total} work days free, {pct}%",
  },
};
export default m;
