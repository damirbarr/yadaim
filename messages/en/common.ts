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
      contractors: "Contractor list",
      campaigns: "Offers to contractors",
      billing: "Billing and reports",
      team: "Team and permissions",
      settings: "Settings",
    },
    agencyShort: { today: "Today", calendar: "Calendar", crews: "Crews", requests: "Requests", compliance: "Documents", workers: "Workers", campaigns: "Offers", contractors: "Contractors", billing: "Billing", team: "Team", settings: "Settings" },
    contractor: { search: "New booking", orders: "My bookings", crews: "Saved crews", team: "Team" },
    admin: { orgs: "Organizations", users: "Users and permissions", audit: "Activity log", badge: "Admin" },
  },
  publicPage: "My public page",
  agencyPending: "Your agency license ({license}) is being verified with the Population Authority. Meanwhile, you can upload workers and build your contractor list. Contractors will find your agency in search after it is verified.",
  agencySuspended: "Your agency is hidden from contractor search. Contact Yadaim support to find out why.",
  contractorPending: "Your contractor registry number ({registry}) is being verified. You can already search for workers and see prices. You can send bookings after verification, which usually takes up to one business day.",
  impersonating: "<b>{admin}</b> is viewing the app as <b>{user}</b> for support. Every action is recorded in the activity log.",
  backToAdmin: "Back to admin",
  newWorker: "New",
  jobs: plural({ one: "1 job", other: "{n} jobs" }),
  score: "Score {n}",
};
export default m;
