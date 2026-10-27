import { plural } from "@/lib/i18n/core";

// Shared across the whole app: brand, navigation, layouts, shared components.
export default {
  brand: "ידיים",
  tagline: "עובדי בניין מתאגידים מורשים",
  language: "שפה",
  logout: "יציאה",
  back: "חזרה",
  save: "שמירה",
  cancel: "ביטול",
  close: "סגירה",
  change: "שינוי",
  nav: {
    agency: {
      today: "היום",
      requests: "בקשות ושיבוץ",
      compliance: "אישורים ותוקף",
      workers: "העובדים שלי",
      contractors: "מאגר הקבלנים",
      campaigns: "שיווק לקבלנים",
      billing: "חשבון ודוחות",
      team: "צוות והרשאות",
      settings: "הגדרות",
    },
    // Short labels for the phone bar at the bottom of the screen.
    agencyShort: { today: "היום", requests: "בקשות", compliance: "אישורים", workers: "עובדים", campaigns: "שיווק", contractors: "קבלנים", billing: "חשבון", team: "צוות", settings: "הגדרות" },
    contractor: { search: "הזמנה חדשה", orders: "ההזמנות שלי", crews: "צוותים שמורים", team: "צוות" },
    admin: { orgs: "ארגונים", users: "משתמשים והרשאות", audit: "יומן פעולות", badge: "אדמין" },
  },
  publicPage: "הדף הציבורי שלי",
  agencyPending: "התאגיד ממתין לאימות ההיתר ({license}) מול רשות האוכלוסין. בינתיים אפשר להעלות עובדים ולבנות את מאגר הקבלנים. הפרופיל יופיע בחיפוש של קבלנים אחרי האימות.",
  agencySuspended: "הפרופיל הוסתר מהחיפוש. פנו אלינו כדי לברר.",
  contractorPending: "החשבון ממתין לאימות מספר הרישום ברשם הקבלנים ({registry}). אפשר כבר לחפש עובדים ולראות מחירים. שליחת הזמנות תיפתח אחרי האימות, בדרך כלל תוך יום עסקים.",
  impersonating: "<b>{admin}</b> צופה במערכת בתור <b>{user}</b> לצורכי תמיכה. כל פעולה נרשמת ביומן.",
  backToAdmin: "חזרה לאדמין",
  newWorker: "חדש במערכת",
  jobs: plural({ one: "עבודה אחת", other: "{n} עבודות" }),
  score: "ציון {n}",
};
