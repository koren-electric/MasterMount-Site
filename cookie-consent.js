/**
 * cookie-consent.js
 * ניהול-הסכמה לעוגיות לא-חיוניות (אנליטיקס/פיקסלים) + באנר-הסכמה בתחתית המסך.
 * תשתית מוכנה-לעתיד - נכון להיום אין שום סקריפט-אנליטיקס/פיקסל באתר בפועל, אז אין עדיין
 * מה לחסום. מציג באנר בכל זאת כי זו דרישת-שקיפות (אם/כש-אנליטיקס יתווסף, הוא כבר יכבד
 * את ההסכמה הקיימת, בלי צורך לבנות את המנגנון מחדש).
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mm_cookie_consent";
  var listeners = [];

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

  function buildBannerHtml() {
    return (
      '<div id="mmCookieBanner" style="position:fixed;bottom:0;right:0;left:0;z-index:9999;background:#20272e;color:#fff;padding:16px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:space-between;font-size:.85rem;box-shadow:0 -4px 16px rgba(0,0,0,.2);">' +
      '<span style="flex:1 1 280px;line-height:1.5;">אנו משתמשים בעוגיות לא-חיוניות (כגון אנליטיקס) רק לאחר קבלת הסכמתכם. ' +
      '<a href="./privacy-policy.html" style="color:#fff;text-decoration:underline;">מדיניות פרטיות</a></span>' +
      '<span style="display:flex;gap:10px;flex:0 0 auto;">' +
      '<button type="button" id="mmCookieDecline" style="padding:9px 18px;border-radius:8px;border:1px solid #fff;background:transparent;color:#fff;font-size:.85rem;cursor:pointer;">דחייה</button>' +
      '<button type="button" id="mmCookieAccept" style="padding:9px 18px;border-radius:8px;border:1px solid #fff;background:#fff;color:#20272e;font-size:.85rem;cursor:pointer;">אישור</button>' +
      "</span></div>"
    );
  }

  function showBanner() {
    hideBanner();
    var div = document.createElement("div");
    div.innerHTML = buildBannerHtml();
    document.body.appendChild(div.firstChild);
    document.getElementById("mmCookieAccept").addEventListener("click", function () {
      set(true);
      hideBanner();
    });
    document.getElementById("mmCookieDecline").addEventListener("click", function () {
      set(false);
      hideBanner();
    });
  }

  function hideBanner() {
    var el = document.getElementById("mmCookieBanner");
    if (el) el.parentNode.removeChild(el);
  }

  function initBannerIfNeeded() {
    if (get() === null) showBanner();
  }

  function openSettings() {
    showBanner();
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
