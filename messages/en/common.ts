import type { Messages } from "..";
import { plural } from "@/lib/i18n/core";

const m: Messages["common"] = {
  brand: "Yadaim",
  tagline: "Construction workers from licensed agencies",
  language: "Language",
  logout: "Sign out",
  back: "Back",
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  more: "More",
  change: "Change",
  nav: {
    agency: {
      today: "Today",
      calendar: "Calendar",
      requests: "Requests",
      compliance: "Documents",
      workers: "My workers",
      crews: "Crews",
      contractors: "Contractors",
      campaigns: "Marketing",
      billing: "Billing & reports",
      team: "Team & permissions",
      settings: "Settings",
    },
    agencyShort: { today: "Today", calendar: "Calendar", crews: "Crews", requests: "Requests", compliance: "Docs", workers: "Workers", campaigns: "Marketing", contractors: "Contractors", billing: "Billing", team: "Team", settings: "Settings" },
    contractor: { search: "New booking", orders: "My bookings", crews: "Saved crews", team: "Team" },
    admin: { orgs: "Organizations", users: "Users & permissions", audit: "Activity log", badge: "Admin" },
  },
  publicPage: "My public page",
  agencyPending: "Your agency is waiting for license verification ({license}) with the Population Authority. Meanwhile you can upload workers and build your contractor list. Your profile will appear in contractor searches once verified.",
  agencySuspended: "Your profile is hidden from search. Contact us to find out why.",
  contractorPending: "Your account is waiting for verification of your contractor registry number ({registry}). You can already search for workers and see prices. Sending bookings opens after verification, usually within one business day.",
  impersonating: "<b>{admin}</b> is viewing the app as <b>{user}</b> for support. Every action is logged.",
  backToAdmin: "Back to admin",
  newWorker: "New",
  jobs: plural({ one: "1 job", other: "{n} jobs" }),
  score: "Score {n}",
};
export default m;
