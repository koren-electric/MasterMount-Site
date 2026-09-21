/* ============================================================================
   compare-schema.js - סכמת ההשוואה בין טלוויזיות (מקור-אמת יחיד לתוויות/רשימות/כיוון-עדיפות)
   ----------------------------------------------------------------------------
   * מפתחות השדות (key) הם מזהים טכניים באותיות לטיניות; כל מה שמוצג בעברית.
   * משמש את עמוד ההשוואה (compare.html). עותק זהה בדיוק מוטמע בתוך admin-crm/admin.html
     בין סימוני-הפתיחה והסגירה של בלוק-הסכמה ("שכפול לא שיתוף" - האדמין הוא
     Artifact עצמאי). הסקריפט scripts/check-compare-schema.ps1 בודק שהשניים זהים.
   * כל שדה אופציונלי. ערך ריק מוצג "לא זמין" ואף פעם לא מוכרז כמנצח.
   * להוספת מאפיין בעתיד: מוסיפים אובייקט אחד למערך fields (ואם צריך - קבוצה ל-groups), מעדכנים
     גם את עותק האדמין ומריצים את סקריפט-הבדיקה. אין צורך לשנות שום קוד אחר.

   סוגי שדות (type):
     tech     - טכנולוגיית פאנל (טקסט; באדמין נבחר מרשימת techTags)
     enum     - בחירה אחת מרשימה סגורה (options). ordinal:true = הסדר ברשימה הוא סדר איכות (נמוך→גבוה)
     multi    - בחירה מרובה מרשימה סגורה
     number   - מספר (unit = יחידה מוצגת)
     text     - טקסט קצר
     derived  - נגזר מהקטלוג (לא נשמר בעורך ההשוואה)
   prefer: "high" = ערך גבוה עדיף | "low" = ערך נמוך עדיף | null = בלי מנצח, רק סימון הבדל
   ============================================================================ */
/* COMPARE-SCHEMA:BEGIN */
var MM_COMPARE_SCHEMA = {
  version: 1,
  emptyLabel: "לא זמין",
  groups: [
    { key: "picture", label: "תמונה" },
    { key: "smart", label: "חוויה חכמה" },
    { key: "gaming", label: "גיימינג וחיבורים" },
    { key: "sound", label: "סאונד" },
    { key: "fit", label: "התאמה" },
    { key: "commercial", label: "מסחרי" }
  ],
  fields: [
    { key: "panelTech", group: "picture", label: "טכנולוגיית פאנל", type: "tech", prefer: null },
    { key: "resolution", group: "picture", label: "רזולוציה", type: "enum", options: ["HD", "Full HD", "4K", "8K"], ordinal: true, prefer: "high" },
    { key: "refreshRate", group: "picture", label: "קצב רענון", type: "number", unit: "Hz", prefer: "high" },
    { key: "peakBrightness", group: "picture", label: "בהירות שיא", type: "number", unit: "ניט", prefer: "high" },
    { key: "localDimming", group: "picture", label: "עמעום מקומי", type: "enum", options: ["אין", "Edge", "Direct", "Mini LED", "פיקסל בודד"], prefer: null },
    { key: "hdrFormats", group: "picture", label: "פורמטי HDR", type: "multi", options: ["HDR10", "HDR10+", "HLG", "Dolby Vision"], prefer: null },
    { key: "imageProcessor", group: "picture", label: "מעבד תמונה", type: "text", prefer: null },
    { key: "antiReflective", group: "picture", label: "ציפוי אנטי-השתקפות", type: "enum", options: ["אין", "ציפוי מקטין השתקפויות", "מסך מט"], prefer: null },
    { key: "screenThicknessCm", group: "picture", label: "העובי הכולל של המסך", type: "number", unit: "ס\"מ", prefer: "low" },
    { key: "viewingAngle", group: "picture", label: "זווית צפיה", type: "number", unit: "º", prefer: "high" },

    { key: "os", group: "smart", label: "מערכת הפעלה", type: "enum", options: ["Tizen", "webOS", "Google TV"], prefer: null },
    { key: "osUpdateYears", group: "smart", label: "שנות עדכוני תוכנה", type: "number", unit: "שנים", prefer: "high" },
    { key: "israeliApps", group: "smart", label: "אפליקציות ישראליות המובילות", type: "multi", options: ["yes+", "פרטנר TV", "הוט", "סלקום TV", "NEXT TV"], prefer: null },
    { key: "builtInSmartSystem", group: "smart", label: "כולל מערכת חכמה מובנית", type: "enum", options: ["לא", "כן"], ordinal: true, prefer: "high" },
    { key: "remoteRechargeable", group: "smart", label: "שלט רחוק נטען", type: "enum", options: ["לא", "כן"], ordinal: true, prefer: "high" },

    { key: "hdmi21Ports", group: "gaming", label: "כניסות HDMI 2.1", type: "number", unit: "כניסות", prefer: "high" },
    { key: "gamingFeatures", group: "gaming", label: "תכונות גיימינג", type: "multi", options: ["VRR", "ALLM", "FreeSync", "G-Sync", "144Hz", "165Hz"], prefer: null },

    { key: "audioPowerW", group: "sound", label: "הספק שמע", type: "number", unit: "W", prefer: "high" },
    { key: "soundTech", group: "sound", label: "טכנולוגיות סאונד", type: "multi", options: ["Dolby Atmos", "Dolby Digital Plus", "Dolby Digital", "Dolby Audio", "DTS:X", "DTS Virtual:X"], prefer: null },
    { key: "hdmiArcEarc", group: "sound", label: "HDMI ARC / eARC", type: "enum", options: ["לא", "כן"], ordinal: true, prefer: "high" },

    { key: "bestFor", group: "fit", label: "מתאים במיוחד ל...", type: "multi", options: ["קולנוע בחדר חשוך", "חדר מואר", "גיימינג", "ספורט", "סטרימינג ותוכן כללי", "תקציב חסכוני"], prefer: null },

    { key: "modelYear", group: "commercial", label: "שנת דגם", type: "number", unit: "", prefer: "high", min: 2020, max: 2040, noGrouping: true },
    { key: "powerConsumptionW", group: "commercial", label: "צריכת חשמל בעת פעולה", type: "number", unit: "W", prefer: "low" },
    { key: "priceILS", group: "commercial", label: "מחיר", type: "derived", unit: "₪", prefer: "low" }
  ]
};
/* COMPARE-SCHEMA:END */
if (typeof window !== "undefined") window.MM_COMPARE_SCHEMA = MM_COMPARE_SCHEMA;
