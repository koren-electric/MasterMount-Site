/**
 * cookie-consent.js
 * ניהול-הסכמה לעוגיות לא-חיוניות (אנליטיקס/פיקסלים) + באנר-הסכמה בתחתית המסך.
 * תשתית מוכנה-לעתיד - נכון להיום אין שום סקריפט-אנליטיקס/פיקסל באתר בפועל, אז אין עדיין
 * מה לחסום. מציג באנר בכל זאת כי זו דרישת-שקיפות (אם/כש-אנליטיקס יתווסף, הוא כבר יכבד
 * את ההסכמה הקיימת, בלי צורך לבנות את המנגנון מחדש).
 *
 * הבאנר קומפקטי (כ-70px במובייל), לא חוסם גלילה, ובזמן שהוא מוצג מתווסף רווח בתחתית הדף
 * (אלמנט #mmCookieSpacer ומשתנה CSS ‎--mm-cookie-h‎ על ה-html) כדי שקישורי הפוטר לא ייסתרו.
 * z-index (150) נמוך ממגירת התפריט (200) ומהרקע שלה (190), וגבוה מהתוכן הרגיל (הסרגל העליון 30).
 * לוגיקת שמירת ההסכמה (get/set/isAccepted/isDeclined/onChange) לא שונתה.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mm_cookie_consent";
  var listeners = [];
  var resizeObserver = null;
  var lastFocus = null;

  function get() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function set(accepted) {
    var record = { accepted: !!accepted, at: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (e) {}
    listeners.forEach(function (fn) {
      try { fn(record); } catch (e) {}
    });
    return record;
  }

  function isAccepted() {
    var r = get();
    return !!(r && r.accepted === true);
  }

  function isDeclined() {
    var r = get();
    return !!(r && r.accepted === false);
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  function ensureStyle() {
    if (document.getElementById("mmCookieStyle")) return;
    var st = document.createElement("style");
    st.id = "mmCookieStyle";
    /* 23.9.2026 (מודל-פלטפורמה, שלב 7): "אישור"/"דחייה" חייבים משקל-שווה - הוסרה דריסת-מילוי
       שהייתה-רק-על .mm-cc-accept (רקע-בהיר-מלא מול outline-שקוף על .mm-cc-decline) - שני-הכפתורים
       משתמשים-עכשיו-רק-בכלל-הבסיסי-המשותף (.mm-cc-btn), זהים-לחלוטין (גודל/צבע/גבול/מילוי). */
    st.textContent =
      "#mmCookieBanner{position:fixed;left:0;right:0;bottom:0;z-index:150;display:flex;align-items:center;gap:8px;" +
      "padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;direction:rtl;" +
      "background:var(--brand-ink,#20272e);color:var(--on-dark,#f3f4f6);font-family:inherit;" +
      "box-shadow:0 -4px 16px rgba(0,0,0,.2)}" +
      "#mmCookieBanner:focus{outline:none}" +
      "#mmCookieBanner .mm-cc-text{flex:1 1 auto;margin:0;font-size:13px;line-height:1.4;color:inherit}" +
      "#mmCookieBanner .mm-cc-text a{color:inherit;text-decoration:underline;white-space:nowrap}" +
      "#mmCookieBanner .mm-cc-actions{display:flex;flex:0 0 auto;gap:6px}" +
      "#mmCookieBanner .mm-cc-btn{box-sizing:border-box;min-width:44px;min-height:44px;padding:0 12px;margin:0;" +
      "border-radius:8px;border:1px solid var(--on-dark,#f3f4f6);background:transparent;color:var(--on-dark,#f3f4f6);" +
      "font-family:inherit;font-size:13px;font-weight:600;line-height:1.2;cursor:pointer}" +
      "#mmCookieBanner .mm-cc-btn:focus-visible,#mmCookieBanner .mm-cc-text a:focus-visible{" +
      "outline:3px solid var(--brand-orange-2,#ff8a52);outline-offset:2px}" +
      "@media (min-width:640px){#mmCookieBanner{gap:16px;padding:12px 24px calc(12px + env(safe-area-inset-bottom,0px))}" +
      "#mmCookieBanner .mm-cc-text{font-size:14px}#mmCookieBanner .mm-cc-btn{font-size:14px;padding:0 20px}}";
    document.head.appendChild(st);
  }

  function buildBannerHtml() {
    return (
      '<div id="mmCookieBanner" role="dialog" aria-modal="false" aria-label="הגדרות עוגיות" aria-describedby="mmCookieText" tabindex="-1">' +
      '<p class="mm-cc-text" id="mmCookieText">אנו משתמשים בעוגיות <span style="white-space:nowrap">לא-חיוניות</span> רק לאחר הסכמתכם. ' +
      '<a href="./privacy-policy.html">מדיניות פרטיות</a></p>' +
      '<div class="mm-cc-actions">' +
      '<button type="button" class="mm-cc-btn mm-cc-decline" id="mmCookieDecline">דחייה</button>' +
      '<button type="button" class="mm-cc-btn mm-cc-accept" id="mmCookieAccept">אישור</button>' +
      "</div></div>"
    );
  }

  /** שומר על רווח תחתון שווה לגובה הבאנר, כדי שהפוטר לא ייסתר בגלילה לסוף הדף */
  function syncSpacer() {
    var banner = document.getElementById("mmCookieBanner");
    var spacer = document.getElementById("mmCookieSpacer");
    if (!banner || !spacer) return;
    var h = Math.ceil(banner.getBoundingClientRect().height);
    spacer.style.height = h + "px";
    document.documentElement.style.setProperty("--mm-cookie-h", h + "px");
  }

  function showBanner(userInitiated) {
    hideBanner(false);
    ensureStyle();
    lastFocus = userInitiated ? document.activeElement : null;
    var div = document.createElement("div");
    div.innerHTML = buildBannerHtml();
    var banner = div.firstChild;
    var spacer = document.createElement("div");
    spacer.id = "mmCookieSpacer";
    spacer.setAttribute("aria-hidden", "true");
    document.body.appendChild(spacer);
    document.body.appendChild(banner);
    syncSpacer();

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(syncSpacer);
      resizeObserver.observe(banner);
    } else {
      window.addEventListener("resize", syncSpacer);
    }

    document.getElementById("mmCookieAccept").addEventListener("click", function () {
      set(true);
      hideBanner(true);
    });
    document.getElementById("mmCookieDecline").addEventListener("click", function () {
      set(false);
      hideBanner(true);
    });
    banner.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hideBanner(true);
    });

    // פתיחה יזומה מתוך "הגדרות עוגיות": מעבירים פוקוס לבאנר (לא חוסם גלילה). בפתיחה אוטומטית לא גונבים פוקוס.
    if (userInitiated) banner.focus();
  }

  function hideBanner(restoreFocus) {
    var el = document.getElementById("mmCookieBanner");
    if (resizeObserver) {
      try { resizeObserver.disconnect(); } catch (e) {}
      resizeObserver = null;
    }
    window.removeEventListener("resize", syncSpacer);
    if (el) el.parentNode.removeChild(el);
    var spacer = document.getElementById("mmCookieSpacer");
    if (spacer) spacer.parentNode.removeChild(spacer);
    document.documentElement.style.removeProperty("--mm-cookie-h");
    if (restoreFocus && lastFocus && document.contains(lastFocus) && typeof lastFocus.focus === "function") {
      try { lastFocus.focus(); } catch (e) {}
    }
    if (restoreFocus) lastFocus = null;
  }

  function initBannerIfNeeded() {
    if (get() === null) showBanner(false);
  }

  function openSettings() {
    showBanner(true);
  }

  window.CookieConsent = {
    get: get,
    set: set,
    isAccepted: isAccepted,
    isDeclined: isDeclined,
    onChange: onChange,
    openSettings: openSettings
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBannerIfNeeded);
  } else {
    initBannerIfNeeded();
  }

  // חיבור-אוטומטי לכל קישור עם id="cookieSettingsLink" (נמצא בפוטר של כל העמודים)
  document.addEventListener("click", function (e) {
    var link = e.target.closest("#cookieSettingsLink");
    if (link) {
      e.preventDefault();
      openSettings();
    }
  });
})();
