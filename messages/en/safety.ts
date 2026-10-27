import type { Messages } from "..";

const m: Messages["safety"] = {
  complianceSub: "Every work visa, health insurance policy and working at heights certificate, with its expiry date. Alerts start 60 days before a document expires. Contractors do not see a worker with an expired document, so that worker cannot be placed by mistake. Site safety briefings are signed separately at each contractor's site.",
  order: {
    valid: "Site safety briefing valid until {date}",
    needed: "Needs a site safety briefing on arrival",
    note: "A site safety briefing is signed separately at each site and is usually valid for one year. Record it on the site check-in screen.",
  },
  site: {
    step: "Site safety briefing",
    valid: "Signed site safety briefing for this site, valid until {date}",
    needed: "No signed site safety briefing for this site yet. Give the briefing, and record it here after the form is signed.",
    photo: "Photo of the signed form (optional)",
    submit: "Record signed briefing",
    uploadError: "The file could not be saved. Try again, or record the briefing without a photo of the form.",
  },
  worker: {
    title: "Site safety briefings",
    hint: "Each briefing counts only at the site where it was signed.",
    none: "No site safety briefings signed yet.",
    validUntil: "Valid until {date}",
    expired: "Expired on {date}",
    form: "Signed form",
  },
};
export default m;
