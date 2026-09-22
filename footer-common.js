/**
 * footer-common.js
 * שורת-זהות-מפעיל אחידה בפוטר, בכל-11-דפי האתר (מודל-פלטפורמה, שלב 5, 23.9.2026): "Master Mount
 * — {operatorName}" (+", ע.מ. {operatorBusinessId}" רק כשיתמלא - כרגע ריק, אז לא-מוצג). data-driven
 * מ-business-config.js, לא-טקסט-קשיח. נטען בכל עמוד מיד אחרי business-config.js, בסוף ה-body -
 * ה-<footer> כבר קיים ב-DOM בשלב הזה (סדר-הסקריפטים תמיד אחרי הסימון בקוד המקור).
 * ממלא placeholder יחיד: <p id="footOperatorLine"></p> - אם הוא לא-קיים בעמוד, לא-עושה כלום.
 */
(function () {
  "use strict";

  function hasVal(v) {
    return v !== null && v !== undefined && String(v).trim() !== "";
  }

  var el = document.getElementById("footOperatorLine");
  if (!el) return;

  var biz = window.BUSINESS_CONFIG || {};
  var line = "Master Mount" + (hasVal(biz.operatorName) ? " — " + biz.operatorName : "");
  if (hasVal(biz.operatorBusinessId)) line += ", ע.מ. " + biz.operatorBusinessId;
  el.textContent = line;
})();
