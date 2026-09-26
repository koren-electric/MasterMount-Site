/**
 * legal-page-common.js
 * לוגיקה משותפת לדפי המשפט (תנאים, פרטיות, ביטולים, נגישות, החזרת ציוד חשמלי):
 * מגירת הניווט הנייד (פתיחה/סגירה, פוקוס, Esc, מלכודת Tab), תאריך עדכון,
 * קישורי פוטר (מייל + "התקשרו" - הטלפון מוצג כקישור רק כשהדגל CONTACT_ACTIONS_ENABLED פעיל),
 * ושורת "יצירת קשר". נטען אחרי business-config.js. אין כאן שום ערך עסקי קשיח.
 *
 * הדגל: כל עוד window.CONTACT_ACTIONS_ENABLED !== true (החלטה עסקית זמנית של הבעלים) -
 * אין קישורי tel:, והטלפון מוצג כטקסט בלבד.
 */
(function () {
  "use strict";

  var biz = window.BUSINESS_CONFIG || {};

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function actionsEnabled() {
    return window.CONTACT_ACTIONS_ENABLED === true;
  }

  function telHref(phone) {
    return "tel:" + (biz.formatPhoneForTel ? biz.formatPhoneForTel(phone) : String(phone).replace(/[^\d+]/g, ""));
  }

  /** טלפון: בידוד LTR (כדי שה-"+" יוצג בצד הנכון בעברית); קישור tel: רק כשהפעולות פעילות */
  function phoneHtml(phone) {
    if (!phone) return "";
    var inner = '<bdi dir="ltr">' + esc(phone) + "</bdi>";
    return actionsEnabled() ? '<a href="' + esc(telHref(phone)) + '">' + inner + "</a>" : inner;
  }

  function emailHtml(email) {
    if (!email) return "";
    return '<a href="mailto:' + esc(email) + '"><bdi dir="ltr">' + esc(email) + "</bdi></a>";
  }

  /** מחזיר [phoneHtml, emailHtml] הלא-ריקים בלבד, מחוברים ב-" · " */
  function contactPartsHtml(phone, email) {
    var parts = [];
    if (phone) parts.push(phoneHtml(phone));
    if (email) parts.push(emailHtml(email));
    return parts.join(" · ");
  }

  window.MMLegalPage = {
    esc: esc,
    actionsEnabled: actionsEnabled,
    phoneHtml: phoneHtml,
    emailHtml: emailHtml,
    contactPartsHtml: contactPartsHtml
  };

  /* ===== מגירת ניווט ===== */
  function wireDrawer() {
    var btn = document.getElementById("mobileMenuToggleBtn");
    var backdrop = document.getElementById("mobileNavBackdrop");
    var nav = document.getElementById("mobileDrawerNav");
    var closeBtn = document.getElementById("mobileDrawerClose");
    if (!btn || !backdrop || !nav) return;

    function isOpen() {
      return document.body.classList.contains("mobile-nav-open");
    }

    function setOpen(open, restoreFocus) {
      document.body.classList.toggle("mobile-nav-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
      if (open) {
        (closeBtn || nav).focus();
      } else if (restoreFocus) {
        btn.focus();
      }
    }

    btn.addEventListener("click", function () {
      setOpen(!isOpen(), true);
    });
    backdrop.addEventListener("click", function () {
      setOpen(false, true);
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        setOpen(false, true);
      });
    }
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setOpen(false, false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      if (e.key === "Escape") {
        setOpen(false, true);
        return;
      }
      if (e.key === "Tab") {
        var items = [].slice.call(nav.querySelectorAll("button, a[href]"));
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        var active = document.activeElement;
        if (e.shiftKey && (active === first || active === nav)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (!nav.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    if (window.matchMedia) {
      var mq = window.matchMedia("(any-pointer: fine) and (any-hover: hover)");
      var onChange = function () {
        if (mq.matches && isOpen()) setOpen(false, false);
      };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ===== תאריך עדכון, פוטר, יצירת קשר ===== */
  function wirePageBits() {
    var updated = document.getElementById("legalLastUpdated");
    if (updated) updated.textContent = biz.lastUpdated || "";

    var emailLink = document.getElementById("footEmailLink");
    if (emailLink && biz.email) {
      emailLink.href = "mailto:" + biz.email;
      emailLink.innerHTML = '<bdi dir="ltr">' + esc(biz.email) + "</bdi>";
      emailLink.hidden = false;
    }

    var callLink = document.getElementById("footCallLink");
    if (callLink) {
      if (actionsEnabled() && biz.phone) {
        callLink.href = telHref(biz.phone);
        callLink.hidden = false;
      } else {
        callLink.hidden = true;
      }
    }

    var contactEl = document.getElementById("legalContactLine");
    if (contactEl) {
      var html = contactPartsHtml(biz.phone, biz.email);
      var prefix = contactEl.getAttribute("data-prefix") || "";
      contactEl.innerHTML = html ? esc(prefix) + html : "";
    }
  }

  wireDrawer();
  wirePageBits();
})();
