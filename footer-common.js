/**
 * footer-common.js
 * שורת-זהות-מפעיל אחידה בפוטר, בכל-13-דפי האתר (מודל-פלטפורמה, שלב 5, 23.9.2026): "Master Mount
 * — {operatorName}" (+", ע.מ. {operatorBusinessId}" רק כשיתמלא - כרגע ריק, אז לא-מוצג). data-driven
 * מ-business-config.js, לא-טקסט-קשיח. נטען בכל עמוד מיד אחרי business-config.js, בסוף ה-body -
 * ה-<footer> כבר קיים ב-DOM בשלב הזה (סדר-הסקריפטים תמיד אחרי הסימון בקוד המקור).
 * ממלא 2 placeholder-ים, כל אחד עצמאי - אם אחד מהם לא-קיים בעמוד, פשוט מדלג עליו:
 * <p id="footOperatorLine"></p> - זהות-מפעיל (כמתואר למעלה).
 * <p id="footServiceAreasLine"></p> - אזורי-שירות (25.9.2026) - גרסה מקוצרת (3 ערים ראשונות
 * מ-serviceAreas + "ועוד N"), כדי לא-להעמיס-על-הפוטר; הרשימה המלאה יושבת ב-Service schema
 * (installation.html/moving-day.html, areaServed) לצורכי גוגל, לא-רק-בפוטר-הקצר-לגולש.
 */
(function () {
  "use strict";

  function hasVal(v) {
    return v !== null && v !== undefined && String(v).trim() !== "";
  }

  var biz = window.BUSINESS_CONFIG || {};

  var opEl = document.getElementById("footOperatorLine");
  if (opEl) {
    var line = "Master Mount" + (hasVal(biz.operatorName) ? " — " + biz.operatorName : "");
    if (hasVal(biz.operatorBusinessId)) line += ", ע.מ. " + biz.operatorBusinessId;
    opEl.textContent = line;
  }

  var areasEl = document.getElementById("footServiceAreasLine");
  if (areasEl) {
    var areas = Array.isArray(biz.serviceAreas) ? biz.serviceAreas : [];
    if (areas.length) {
      var shown = areas.slice(0, 3).join(", ");
      var rest = areas.length - 3;
      areasEl.textContent = "אזורי שירות: " + shown + (rest > 0 ? " ועוד " + rest + " יישובים במרכז והשרון" : "");
    }
  }
})();
