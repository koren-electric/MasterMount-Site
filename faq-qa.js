/**
 * faq-qa.js
 * תיבת "שאלות נפוצות" (FAQ) גנרית - חלק משלב 4 (SEO תוכן/מילות-מפתח, 25.9.2026).
 * שותפת-CSS מכוונת עם installation-exclusions.js (אותם class-ים .qa-box/.qa-item/.qa-q/.qa-a
 * ואותו style-injection guard id="qaBoxStyle" - שתי התיבות נראות עקביות באותו עמוד ולא-
 * מזריקות את אותו style פעמיים), אבל **לא נוגעת ב-installation-exclusions.js** - זה קובץ
 * נפרד לגמרי, כי המשמעות שם ("מה כלול/לא כלול") שונה-מהותית מ"שאלות נפוצות" כלליות.
 * כל עמוד מעביר את שאלות-התשובות שלו ישירות (items), אין מקור-נתונים-משותף מרכזי - כל עמוד
 * שולט בתוכן-ה-FAQ שלו בעצמו, כדי שיישאר תמיד תואם-במדויק ל-FAQPage schema שנכתב ידנית באותו
 * עמוד (הכוונה: התוכן-הנראה-לעין וה-schema חייבים-להיות-זהים-מילה-במילה לפי דרישת גוגל).
 */
(function () {
  "use strict";

  function escHtml(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  window.renderFaqQa = function (containerId, title, items) {
    var box = document.getElementById(containerId);
    if (!box || !items || !items.length) return;
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
        ".qa-a{font-size:.88rem;color:#55606b;line-height:1.65;padding-inline-start:28px;}";
      document.head.appendChild(st);
    }
    box.innerHTML = "<h3>" + escHtml(title || "שאלות נפוצות") + "</h3>" + items.map(function (it) {
      return '<div class="qa-item"><div class="qa-q">' + escHtml(it.q) + '</div><div class="qa-a">' + escHtml(it.a) + "</div></div>";
    }).join("");
  };
})();
