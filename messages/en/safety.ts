import type { Messages } from "..";

const m: Messages["safety"] = {
  complianceSub: "Every visa, insurance policy and heights certificate, with its expiry date. Alerts start 60 days before expiry. A worker with an expired document is hidden from contractors, so they can't be placed by mistake. Site safety briefings are signed separately at each contractor's site.",
  order: {
    valid: "Site safety briefing valid until {date}",
    needed: "Needs a site safety briefing on arrival",
    note: "A site safety briefing is signed separately at each site and is usually valid for one year. Record it on the site check-in screen.",
  },
  site: {
    step: "Site safety briefing",
    valid: "Signed briefing for this site, valid until {date}",
    needed: "No signed briefing for this site yet. Give the briefing, then record it here once the form is signed.",
    photo: "Photo of the signed form (optional)",
    submit: "Safety briefing signed",
    uploadError: "We couldn't save the file. Try again, or record the briefing without a photo.",
  },
  worker: {
    title: "Site safety briefings",
    hint: "Each briefing counts only at the site where it was signed.",
    none: "No site briefings signed yet.",
    validUntil: "Valid until {date}",
    expired: "Expired on {date}",
    form: "Signed form",
  },
};
export default m;
