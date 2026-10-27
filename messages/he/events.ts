import { plural } from "@/lib/i18n/core";

// Activity-feed sentences (lib/events.ts). {trade} = one worker of the trade, {trades} = the plural.
export default {
  request: plural({ one: "בקשה חדשה מ{company}: {trade} אחד ל-{date} ב{city}", other: "בקשה חדשה מ{company}: {n} {trades} ל-{date} ב{city}" }),
  requestDays: plural({ one: "בקשה חדשה מ{company}: {trade} אחד ל-{days} ימים מ-{date} ב{city}", other: "בקשה חדשה מ{company}: {n} {trades} ל-{days} ימים מ-{date} ב{city}" }),
  approved: plural({ one: "אישרתם את הזמנה #{id} ל-{date} עם עובד אחד", other: "אישרתם את הזמנה #{id} ל-{date} עם {n} עובדים" }),
  rejected: "דחיתם את הזמנה #{id}: {reason}",
  agencyCancel: "ביטלתם את הזמנה #{id} אחרי שאושרה. הביטול נספר בציון האמינות.",
  swap: "החלפתם עובד בהזמנה #{id}",
  cancel: "הקבלן ביטל את הזמנה #{id} ל-{date}",
  noshow: "עובד לא הגיע לאתר (הזמנה #{id})",
  nofitIdentity: "הקבלן סימן שהגיע אדם אחר מזה שהוזמן (הזמנה #{id}). היום הזה לא יחויב.",
  nofitSkill: "הקבלן סימן שהעובד לא מכיר את המקצוע (הזמנה #{id}). היום הזה לא יחויב.",
  hours: "הקבלן אישר את שעות העבודה בהזמנה #{id}",
  campaign: "הצעה ל{trades} נשלחה ל-{n} קבלנים. {opened} צפו, {booked} הזמינו.",
  setup: "החשבון הוקם עם נתוני הדגמה",
};
