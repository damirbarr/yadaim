import type { Messages } from "..";
import { plural } from "@/lib/i18n/core";

const m: Messages["events"] = {
  request: plural({ one: "New request from {company}: 1 {trade} for {date} in {city}", other: "New request from {company}: {n} {trades} for {date} in {city}" }),
  requestDays: plural({ one: "New request from {company}: 1 {trade} for {days} days from {date} in {city}", other: "New request from {company}: {n} {trades} for {days} days from {date} in {city}" }),
  approved: plural({ one: "You approved booking #{id} for {date} with 1 worker", other: "You approved booking #{id} for {date} with {n} workers" }),
  rejected: "You declined booking #{id}: {reason}",
  agencyCancel: "You cancelled booking #{id} after approving it. This counts against your reliability score.",
  swap: "You replaced a worker in booking #{id}",
  cancel: "The contractor cancelled booking #{id} for {date}",
  noshow: "A worker didn't arrive on site (booking #{id})",
  nofitIdentity: "The contractor reported that a different person arrived (booking #{id}). This day won't be billed.",
  nofitSkill: "The contractor reported that the worker doesn't know the trade (booking #{id}). This day won't be billed.",
  hours: "The contractor approved the work hours for booking #{id}",
  campaign: "Offer for {trades} sent to {n} contractors. {opened} viewed it, {booked} booked.",
  setup: "Account created with demo data",
};
export default m;
