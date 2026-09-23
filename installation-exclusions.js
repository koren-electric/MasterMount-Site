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

  /* תיבת "מה כלול ומה לא כלול" בפורמט שאלה-תשובה (20.9.2026) - משותפת לשני העמודים.
     הכל פתוח (בלי אקורדיון). שתי השאלות הראשונות כלליות; שאר השאלות נגזרות אוטומטית מהרשימה למעלה. */
  function escHtml(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  window.renderExclusionsQa = function (containerId, title) {
    var box = document.getElementById(containerId);
    if (!box || !window.INSTALLATION_EXCLUSIONS) return;
    if (!document.getElementById("qaBoxStyle")) {
      var st = document.createElement("style");
      st.id = "qaBoxStyle";
      st.textContent =
        ".qa-box{max-width:640px;margin:0 auto;padding:22px 24px;border:1px solid #e1ddd4;border-radius:14px;background:#faf9f6;text-align:right;}" +
        ".qa-box h3{font-size:1.1rem;font-weight:700;margin:0 0 14px;}" +
        ".qa-item{padding:12px 0;border-top:1px solid #e1ddd4;}" +
        ".qa-item:first-of-type{border-top:0;padding-top:0;}" +
        ".qa-q{font-weight:700;font-size:.95rem;color:#1c1712;margin-bottom:4px;}" +
        ".qa-q:before{content:'?';display:inline-block;width:20px;height:20px;line-height:20px;margin-inline-end:8px;border-radius:50%;background:#d4622a;color:#fff;font-size:.78rem;text-align:center;}" +
        ".qa-a{font-size:.88rem;color:#55606b;line-height:1.65;padding-inline-start:28px;}" +
        ".qa-a .qa-ok{color:var(--accent,#1a73e8);}";
      document.head.appendChild(st);
    }
    var items = [
      { q: "האם המחיר שמוצג סופי?", a: "כן. המחיר מתעדכן בזמן אמת לצד כל בחירה, וכולל את כל מה שבחרתם במחשבון - בלי הפתעות ובלי תוספות בשטח." },
      { q: "האם יש עבודות שלא כלולות במחיר?", a: "כן - עבודות חריגות מפורטות בהמשך. חלקן ניתנות להוספה במחשבון, וחלקן דורשות תיאום נפרד מראש." }
    ];
    window.INSTALLATION_EXCLUSIONS.forEach(function (ex) {
      var tail = ex.alreadyPriced
        ? ' <span class="qa-ok">' + escHtml((ex.catalogHint || "ניתן להוסיף במחשבון") + ".") + "</span>"
        : " דורש תיאום נפרד.";
      items.push({ q: ex.label + " - האם כלול במחיר?", a: "לא. " + escHtml(ex.note) + tail, raw: true });
    });
    box.innerHTML = "<h3>" + escHtml(title || "מה כלול ומה לא כלול") + "</h3>" + items.map(function (it) {
      return '<div class="qa-item"><div class="qa-q">' + escHtml(it.q) + '</div><div class="qa-a">' + (it.raw ? it.a : escHtml(it.a)) + "</div></div>";
    }).join("");
  };

  window.INSTALLATION_EXCLUSIONS = INSTALLATION_EXCLUSIONS;
})();
