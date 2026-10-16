/**
 * site-status-banner.js
 * באנר-מצב-אתר עליון, קבוע בכל 19 דפי-האתר (16.10.2026, בקשת ברק): "האתר נמצא בשלב הרצה -
 * הזמנות המבוצעות הן לצורכי בדיקה בלבד". נוצר ע"י סקריפט (לא placeholder בדף) ומוכנס כאלמנט
 * הראשון ב-body, לפני ה-header - בזרימה רגילה (לא fixed/sticky) כדי לא-להתנגש עם ה-sticky-header
 * הקיים (z-index 30): גולל-יחד-עם-התוכן, וה-header נדבק-לראש-המסך כרגיל כשגוללים מתחתיו.
 * אין לו אלמנטים בני-פוקוס, אז סדר-ה-Tab לא משתנה (ה-skip-link נשאר העצירה-הראשונה).
 */
(function () {
  "use strict";

  var MESSAGE = "האתר נמצא בשלב הרצה. הזמנות המבוצעות הן לצורכי בדיקה בלבד.";

  function ensureStyle() {
    if (document.getElementById("mmStatusBannerStyle")) return;
    var st = document.createElement("style");
    st.id = "mmStatusBannerStyle";
    st.textContent =
      "#mmStatusBanner{display:block;width:100%;box-sizing:border-box;padding:10px 16px;" +
      "text-align:center;direction:rtl;font-family:inherit;font-size:13px;font-weight:600;" +
      "line-height:1.4;background:#dceaf2;color:#1f3a52;border-bottom:1px solid #b9d3e0}" +
      ":root[data-theme=\"dark\"] #mmStatusBanner{background:#1e3a4f;color:#cfe6f5;" +
      "border-bottom-color:#2d5570}" +
      "@media (min-width:640px){#mmStatusBanner{font-size:14px;padding:10px 24px}}";
    document.head.appendChild(st);
  }

  function insertBanner() {
    if (document.getElementById("mmStatusBanner") || !document.body) return;
    ensureStyle();
    var div = document.createElement("div");
    div.id = "mmStatusBanner";
    div.setAttribute("role", "note");
    div.textContent = MESSAGE;
    document.body.insertBefore(div, document.body.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertBanner);
  } else {
    insertBanner();
  }
})();
