// Site safety briefings: a form the worker signs at one contractor's site, usually valid for a year (lib/queries.ts siteBriefings).
export default {
  // Compliance page subtitle (worker documents only; briefings belong to sites).
  complianceSub: "כל אשרה, ביטוח ואישור עבודה בגובה, עם תאריך התוקף. 60 יום לפני הפקיעה מתחילות התראות. עובד עם מסמך שפג לא מוצג לקבלנים, כך שלא ישובץ בטעות. הדרכת בטיחות נחתמת בכל אתר בנפרד, אצל הקבלן.",
  // Contractor booking page, per worker.
  order: {
    valid: "הדרכת בטיחות לאתר בתוקף עד {date}",
    needed: "צריך הדרכת בטיחות בהגעה",
    note: "הדרכת בטיחות נחתמת בכל אתר בנפרד ותקפה בדרך כלל שנה. את ההדרכה רושמים במסך הצ׳ק־אין באתר.",
  },
  // On-site check-in page, a step separate from identity and skill.
  site: {
    step: "הדרכת בטיחות באתר",
    valid: "יש הדרכה חתומה לאתר הזה, בתוקף עד {date}",
    needed: "עדיין אין הדרכה חתומה לאתר הזה. העבירו את ההדרכה ואשרו כאן אחרי שהטופס נחתם.",
    photo: "צילום של הטופס החתום (לא חובה)",
    submit: "הדרכת בטיחות נחתמה",
    uploadError: "שמירת הקובץ נכשלה. נסו שוב, או רשמו את ההדרכה בלי צילום.",
  },
  // Agency worker profile.
  worker: {
    title: "הדרכות בטיחות באתרים",
    hint: "כל הדרכה תקפה רק באתר שבו נחתמה.",
    none: "עדיין לא נחתמה הדרכה באף אתר.",
    validUntil: "בתוקף עד {date}",
    expired: "פגה ב-{date}",
    form: "טופס חתום",
  },
};
