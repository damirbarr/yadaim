import type { Messages } from "..";
import { plural } from "@/lib/i18n/core";

const m: Messages["events"] = {
  request: plural({ one: "New request from {company}: 1 worker ({trade}) for {date} in {city}", other: "New request from {company}: {n} workers ({trades}) for {date} in {city}" }),
  requestDays: plural({ one: "New request from {company}: 1 worker ({trade}) for {days} days from {date} in {city}", other: "New request from {company}: {n} workers ({trades}) for {days} days from {date} in {city}" }),
  approved: plural({ one: "You approved booking #{id} for {date} with 1 worker", other: "You approved booking #{id} for {date} with {n} workers" }),
  rejected: "You declined booking #{id}: {reason}",
  agencyCancel: "You cancelled booking #{id} after approving it. This lowers your reliability score.",
  swap: "You replaced a worker in booking #{id}",
  cancel: "The contractor cancelled booking #{id} for {date}",
  noshow: "A worker did not arrive on site (booking #{id})",
  nofitIdentity: "The contractor reported that a different person arrived (booking #{id}). This worker will not be billed on this booking.",
  nofitSkill: "The contractor reported that the worker does not know the trade (booking #{id}). This worker will not be billed on this booking.",
  hours: "The contractor approved the work hours for booking #{id}",
  campaign: "Offer to contractors ({trades}): sent to {n}, viewed by {opened}, booked by {booked}.",
  setup: "Account created with demo data",
};
export default m;
