/**
 * installation-exclusions.js
 * רשימת "מה כלול / מה לא כלול" בהתקנה - משותפת ל-installation.html ול-moving-day.html.
 *
 * כל פריט:
 *   id            - מזהה יציב
 *   label         - כותרת קצרה
 *   note          - הסבר קצר ללקוח
 *   alreadyPriced - true אם קיימת כבר אופציה נבחרת/מתומחרת במחשבון עבור המקרה הזה
 *   catalogHint   - טקסט-עזר לאן לפנות במחשבון כדי להוסיף את האופציה (כשalreadyPriced=true)
 */
(function () {
  "use strict";

  var INSTALLATION_EXCLUSIONS = [
    {
      id: "concrete_stone_wall",
      label: "קיר בטון / אבן קשה לעבודה",
      note: "קידוח בקיר בטון מזוין או אבן דורש ציוד וזמן עבודה נוספים.",
      alreadyPriced: false,
      catalogHint: ""
    },
    {
      id: "hidden_wall_channel",
      label: "הסתרת כבלים בתוך הקיר",
      note: "טיוח/פתיחת תעלה להסתרת הכבלים בתוך הקיר.",
      alreadyPriced: true,
      catalogHint: "ניתן לבחור בשלב הסתרת הכבלים במחשבון"
    },
    {
      id: "new_electrical_outlet",
      label: "התקנת נקודת חשמל חדשה",
      note: "הוספת שקע חשמל חדש מאחורי הטלוויזיה.",
      alreadyPriced: false,
      catalogHint: ""
    },
    {
      id: "old_bracket_removal",
      label: "פירוק והסרת מתקן קיים",
      note: "הסרת מתקן/מדף ישן שכבר מותקן בקיר.",
      alreadyPriced: true,
      catalogHint: "ניתן לבחור פירוק מתקן קיים במחשבון"
    },
    {
      id: "unusual_height",
      label: "התקנה בגובה חריג",
      note: "התקנה הדורשת פיגום/סולם מיוחד בשל גובה לא סטנדרטי.",
      alreadyPriced: false,
      catalogHint: ""
    }
  ];

  window.INSTALLATION_EXCLUSIONS = INSTALLATION_EXCLUSIONS;
})();
