/**
 * business-config.js
 * קובץ קונפיג עסקי יחיד ומשותף לכל עמודי האתר (public-site).
 * כל עובדה עסקית (טלפון/מייל/אחריות/מע"מ/מדיניות ביטולים וכו') חייבת להישאב מכאן בלבד -
 * אסור hardcoded באף עמוד.
 *
 * שדות שאינם ידועים נשארים ריקים ("" / null) במכוון - אין להמציא נתונים עסקיים.
 * למילוי מלא ראו public-site/README-legal-readiness.md.
 */
(function () {
  "use strict";

  var BUSINESS_CONFIG = {
    // זהות עסקית - לא ידוע עדיין (העוסק טרם נפתח)
    legalName: "",
    businessId: "", // ע.מ. / ח.פ.
    businessType: "", // עוסק מורשה / חברה בע"מ וכו'

    // כתובת ופרטי קשר
    address: "",
    phone: "+972-52-660-9971",
    email: "mastermount@mastermount.co.il",
    whatsappNumber: "972526609971",
    supportHours: "",

    // אחריות (בחודשים) - לא ידוע עדיין
    warrantyMonths_installation: null,
    warrantyMonths_mount: null,

    // מדיניות ביטולים/החזרות (ברירות מחדל שברק ציין במפורש)
    returnWindowDays: 14,
    cancellationFeePercent: 5,
    cancellationFeeMaxIls: 100,

    // מע"מ
    vatRate: 0.18,

    // רכז נגישות - לא ידוע עדיין
    accessibilityCoordinator: {
      name: "",
      phone: "",
      email: ""
    },

    // מטא
    lastUpdated: "2026-09-18",

    // דגל מרכזי: האם העוסק כבר רשום ופעיל מסחרית
    isRegistered: false
  };

  function isDevEnvironment() {
    var host = (typeof location !== "undefined" && location.hostname) || "";
    return host !== "mastermount.co.il" && host !== "www.mastermount.co.il";
  }

  /**
   * מחזיר את ערך השדה אם קיים, אחרת:
   * - בסביבת פיתוח: placeholder גלוי "[טרם הוזן: <label>]"
   * - בפרודקשן: מחרוזת ריקה (לא שובר עיצוב ללקוח אמיתי)
   * מתריע ב-console.warn אם isRegistered===true אבל השדה עדיין ריק.
   */
  function bizField(key, label) {
    var val = BUSINESS_CONFIG[key];
    var isEmpty = val === undefined || val === null || val === "";

    if (BUSINESS_CONFIG.isRegistered === true && isEmpty) {
      try {
        console.warn("[BUSINESS_CONFIG] שדה חסר על אף isRegistered=true: " + key);
      } catch (e) {}
    }

    if (!isEmpty) return val;
    if (isDevEnvironment()) return "[טרם הוזן: " + label + "]";
    return "";
  }

  function formatPhoneForTel(phone) {
    if (!phone) return "";
    return String(phone).replace(/[^\d+]/g, "");
  }

  function vatNote(opts) {
    var includeShipping = opts && opts.includeShipping;
    return includeShipping
      ? "המחיר כולל מע\"מ והובלה עד הבית"
      : "המחיר כולל מע\"מ";
  }

  BUSINESS_CONFIG.isDevEnvironment = isDevEnvironment;
  BUSINESS_CONFIG.bizField = bizField;
  BUSINESS_CONFIG.formatPhoneForTel = formatPhoneForTel;
  BUSINESS_CONFIG.vatNote = vatNote;

  window.BUSINESS_CONFIG = BUSINESS_CONFIG;
})();
