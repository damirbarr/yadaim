import type { Messages } from "..";
import { plural } from "@/lib/i18n/core";

const m: Messages["events"] = {
  request: plural({ one: "طلب جديد من {company}: {trade} واحد ليوم {date} في {city}", other: "طلب جديد من {company}: {n} {trades} ليوم {date} في {city}" }),
  requestDays: plural({ one: "طلب جديد من {company}: {trade} واحد لمدة {days} أيام ابتداءً من {date} في {city}", other: "طلب جديد من {company}: {n} {trades} لمدة {days} أيام ابتداءً من {date} في {city}" }),
  approved: plural({ one: "وافقتم على الحجز رقم {id} ليوم {date} مع عامل واحد", two: "وافقتم على الحجز رقم {id} ليوم {date} مع عاملَين", few: "وافقتم على الحجز رقم {id} ليوم {date} مع {n} عمّال", many: "وافقتم على الحجز رقم {id} ليوم {date} مع {n} عاملًا", other: "وافقتم على الحجز رقم {id} ليوم {date} مع {n} عامل" }),
  rejected: "رفضتم الحجز رقم {id}: {reason}",
  agencyCancel: "ألغيتم الحجز رقم {id} بعد الموافقة عليه. يُحتسب الإلغاء في تقييم الموثوقية.",
  swap: "استبدلتم عاملًا في الحجز رقم {id}",
  cancel: "ألغى المقاول الحجز رقم {id} ليوم {date}",
  noshow: "عامل لم يصل إلى الموقع (الحجز رقم {id})",
  nofitIdentity: "أفاد المقاول بأن شخصًا آخر وصل بدل العامل المحجوز (الحجز رقم {id}). لن يُحتسب هذا اليوم.",
  nofitSkill: "أفاد المقاول بأن العامل لا يتقن المهنة (الحجز رقم {id}). لن يُحتسب هذا اليوم.",
  hours: "صادق المقاول على ساعات العمل في الحجز رقم {id}",
  campaign: "أُرسل عرض {trades} إلى {n} مقاولين. شاهده {opened}، وحجز {booked}.",
  setup: "أُنشئ الحساب مع بيانات تجريبية",
};
export default m;
