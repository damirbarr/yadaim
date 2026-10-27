import type { Messages } from "..";

const m: Messages["domain"] = {
  today: "Today",
  tomorrow: "Tomorrow",
  yesterday: "Yesterday",
  trades: {
    formwork: { one: "Formwork carpenter", many: "Formwork carpenters" },
    rebar: { one: "Steel fixer", many: "Steel fixers" },
    plaster: { one: "Plasterer", many: "Plasterers" },
    tiling: { one: "Tiler", many: "Tilers" },
    masonry: { one: "Mason", many: "Masons" },
  },
  regions: { north: "North & Haifa", sharon: "Sharon", center: "Center", jerusalem: "Jerusalem", south: "South" },
  cities: {
    "חיפה": "Haifa", "קריות": "Haifa Bay (Krayot)", "נהריה": "Nahariya", "עכו": "Acre", "כרמיאל": "Karmiel", "עפולה": "Afula", "טבריה": "Tiberias", "נוף הגליל": "Nof HaGalil", "יקנעם": "Yokneam",
    "נתניה": "Netanya", "חדרה": "Hadera", "כפר סבא": "Kfar Saba", "רעננה": "Ra'anana", "הרצליה": "Herzliya", "הוד השרון": "Hod HaSharon", "כפר יונה": "Kfar Yona",
    "תל אביב": "Tel Aviv", "רמת גן": "Ramat Gan", "גבעתיים": "Givatayim", "פתח תקווה": "Petah Tikva", "ראשון לציון": "Rishon LeZion", "חולון": "Holon", "בת ים": "Bat Yam", "בני ברק": "Bnei Brak", "רחובות": "Rehovot", "נס ציונה": "Ness Ziona", "לוד": "Lod", "רמלה": "Ramla", "מודיעין": "Modi'in", "ראש העין": "Rosh HaAyin", "יבנה": "Yavne",
    "ירושלים": "Jerusalem", "בית שמש": "Beit Shemesh", "מבשרת ציון": "Mevaseret Zion", "מעלה אדומים": "Ma'ale Adumim",
    "אשדוד": "Ashdod", "אשקלון": "Ashkelon", "קריית גת": "Kiryat Gat", "באר שבע": "Be'er Sheva", "נתיבות": "Netivot", "שדרות": "Sderot", "אופקים": "Ofakim", "דימונה": "Dimona", "אילת": "Eilat",
  },
  countries: { IN: "India", LK: "Sri Lanka", MD: "Moldova", UZ: "Uzbekistan", CN: "China", BY: "Belarus", GE: "Georgia", RO: "Romania", TH: "Thailand", KE: "Kenya", MW: "Malawi" },
  docs: {
    visa: { name: "Work visa (B/1), construction", short: "Visa" },
    passport: { name: "Passport", short: "Passport" },
    insurance: { name: "Health insurance", short: "Insurance" },
    heights: { name: "Working at heights certificate", short: "Heights" },
  },
  phases: {
    requested: "Waiting for the agency",
    approved: "Approved",
    locked: "Crew locked",
    today: "On site today",
    awaiting_hours: "Waiting for hours approval",
    completed: "Completed",
    rejected: "Declined",
    cancelled: "Cancelled",
  },
  minDays: { "1": "One day", "5": "A work week (5 days)", "10": "Two weeks (10 days)", "22": "A month (22 days)" },
  workTags: { "עבודה נקייה": "Clean work", "דייק בזמנים": "On time", "עובד מהר": "Works fast", "מקצועי מאוד": "Highly skilled", "צריך הכוונה": "Needs guidance", "בעיית תקשורת": "Hard to communicate with" },
  reliability: { good: "Reliable agency", ok: "Good standing", warn: "Under review", bad: "Hidden from search" },
};
export default m;
