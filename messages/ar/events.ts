import type { Messages } from "..";
import { plural } from "@/lib/i18n/core";

const m: Messages["events"] = {
  request: plural({ one: "طلب جديد من {company}: {trade} واحد ليوم {date} في {city}", two: "طلب جديد من {company}: عاملان ({trades}) ليوم {date} في {city}", few: "طلب جديد من {company}: {n} عمّال ({trades}) ليوم {date} في {city}", many: "طلب جديد من {company}: {n} عاملًا ({trades}) ليوم {date} في {city}", other: "طلب جديد من {company}: {n} عامل ({trades}) ليوم {date} في {city}" }),
  requestDays: plural({ one: "طلب جديد من {company}: {trade} واحد ابتداءً من {date} في {city} (عدد الأيام: {days})", two: "طلب جديد من {company}: عاملان ({trades}) ابتداءً من {date} في {city} (عدد الأيام: {days})", few: "طلب جديد من {company}: {n} عمّال ({trades}) ابتداءً من {date} في {city} (عدد الأيام: {days})", many: "طلب جديد من {company}: {n} عاملًا ({trades}) ابتداءً من {date} في {city} (عدد الأيام: {days})", other: "طلب جديد من {company}: {n} عامل ({trades}) ابتداءً من {date} في {city} (عدد الأيام: {days})" }),
  approved: plural({ one: "وافقتم على الحجز رقم {id} ليوم {date} مع عامل واحد", two: "وافقتم على الحجز رقم {id} ليوم {date} مع عاملَين", few: "وافقتم على الحجز رقم {id} ليوم {date} مع {n} عمّال", many: "وافقتم على الحجز رقم {id} ليوم {date} مع {n} عاملًا", other: "وافقتم على الحجز رقم {id} ليوم {date} مع {n} عامل" }),
  rejected: "رفضتم الحجز رقم {id}: {reason}",
  agencyCancel: "ألغيتم الحجز رقم {id} بعد الموافقة عليه. يُحتسب الإلغاء في تقييم الموثوقية.",
  swap: "استبدلتم عاملًا في الحجز رقم {id}",
  cancel: "ألغى المقاول الحجز رقم {id} ليوم {date}",
  noshow: "لم يصل أحد العمّال إلى الموقع (الحجز رقم {id})",
  nofitIdentity: "أفاد المقاول بأن شخصًا آخر وصل بدل العامل المحجوز (الحجز رقم {id}). لن يُحاسَب المقاول على هذا العامل في هذا الحجز.",
  nofitSkill: "أفاد المقاول بأن العامل لا يتقن المهنة (الحجز رقم {id}). لن يُحاسَب المقاول على هذا العامل في هذا الحجز.",
  hours: "أكّد المقاول ساعات العمل في الحجز رقم {id}",
  campaign: "أُرسل عرض ({trades}) إلى {n} من المقاولين. شاهده {opened}، وأرسل {booked} منهم حجوزات.",
  setup: "أُنشئ الحساب مع بيانات تجريبية",
};
export default m;
