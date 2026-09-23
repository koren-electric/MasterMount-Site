/**
 * lead-capture.js
 * תיבת פרטי לקוח בעגלת הקניות (index.html + installation.html) - שמירת פרטים למעקב פנימי (CRM)
 * ולתיאום הזמנה מול נציג. משותף לשני העמודים.
 *
 * שדות: שם פרטי, שם משפחה, טלפון (חובה), טלפון נוסף, ת.ז / ח.פ / ע.מ, כתובת (רחוב ומספר בית, קומה, דירה),
 * עיר, דוא"ל. חובה: שם פרטי, שם משפחה וטלפון. שאר השדות רשות.
 *
 * מה קורה כשהלקוח לוחץ על אחד קישורי יצירת הקשר בעגלה (וואטסאפ / מייל):
 *   1. בדיקת שדות (אם חסר משהו חובה - הקישור לא נפתח, ומוצגת הודעה ליד השדה).
 *   2. הפרטים נכנסים לגוף ההודעה בתבנית קבועה ("פרטי הלקוח:" + שורות "תווית: ערך"), כך שאפשר לייבא אותם
 *      אחר כך ללידים בדשבורד הניהול בהדבקה אחת.
 *   3. הפרטים נשמרים בדפדפן של הלקוח להשלמה אוטומטית בפעם הבאה (בלי מספר הזהות).
 *   4. אם מוגדר BUSINESS_CONFIG.leadEndpoint (כתובת קליטה חיצונית) - הליד נשלח אליה גם כן (ומתוזמר לניסיון
 *      חוזר אם נכשל). כל עוד השדה ריק - אין שום שליחת רשת, וההעברה נעשית דרך ההודעה בלבד.
 *
 * אין כאן ערכים עסקיים קשיחים. נטען אחרי business-config.js.
 */
(function () {
  "use strict";

  var STORE_KEY = "mm_lead_v1";
  var OUTBOX_KEY = "mm_lead_outbox_v1";
  var biz = window.BUSINESS_CONFIG || {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(id) { return document.getElementById(id); }
  function digits(v) { return String(v || "").replace(/\D/g, ""); }

  /* ---------- בדיקות תקינות ---------- */
  function phoneOk(v) { var d = digits(v); return d.length >= 9 && d.length <= 15; }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim()); }
  /* ת.ז / ח.פ / ע.מ ישראליים: 9 ספרות (מותר להשמיט אפסים מובילים) עם ספרת ביקורת. שדה ריק תקין (רשות). */
  function idOk(v) {
    var d = digits(v);
    if (!d) return true;
    if (d.length < 5 || d.length > 9) return false;
    d = ("000000000" + d).slice(-9);
    var sum = 0;
    for (var i = 0; i < 9; i++) {
      var n = Number(d.charAt(i)) * (i % 2 === 0 ? 1 : 2);
      if (n > 9) n -= 9;
      sum += n;
    }
    return sum % 10 === 0;
  }

  /* ---------- הגדרת שדות ---------- */
  var FIELDS = {
    first:  { id: "cartLeadFirst",  err: "cartLeadFirstError",  label: "שם פרטי", required: true, auto: "given-name",  type: "text" },
    last:   { id: "cartLeadLast",   err: "cartLeadLastError",   label: "שם משפחה", required: true, auto: "family-name", type: "text" },
    phone:  { id: "cartLeadPhone",  err: "cartLeadPhoneError",  label: "טלפון", required: true, static: true },
    phone2: { id: "cartLeadPhone2", err: "cartLeadPhone2Error", label: "טלפון נוסף (רשות)", auto: "tel", type: "tel", ltr: true },
    idnum:  { id: "cartLeadIdNum",  err: "cartLeadIdNumError",  label: "ת.ז / ח.פ / ע.מ (רשות)", type: "text", ltr: true, inputmode: "numeric", auto: "off" },
    street: { id: "cartLeadStreet", err: "cartLeadStreetError", label: "כתובת: רחוב ומספר בית, קומה, דירה (רשות)", auto: "street-address", type: "text", full: true },
    city:   { id: "cartLeadCity",   err: "cartLeadCityError",   label: "עיר (רשות)", auto: "address-level2", type: "text" },
    email:  { id: "cartLeadEmail",  err: "cartLeadEmailError",  label: 'דוא"ל (רשות)', auto: "email", type: "email", ltr: true, full: true }
  };

  var ERR = {
    first: "נא להזין שם פרטי.",
    last: "נא להזין שם משפחה.",
    phone: "נא להזין מספר טלפון תקין (לפחות 9 ספרות), כדי שנוכל לחזור אליכם.",
    phone2: "מספר הטלפון הנוסף אינו תקין. אפשר להשאיר את השדה ריק.",
    idnum: "המספר אינו תקין. בדקו שהוזנו כל הספרות, או השאירו את השדה ריק.",
    email: 'כתובת הדוא"ל אינה תקינה. אפשר להשאיר את השדה ריק.'
  };

  var CSS =
    ".lead-fields-note{font-size:.85rem;line-height:1.55;color:var(--text-secondary,#55606b);margin:0 0 2px}" +
    ".lead-fields-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}" +
    ".lead-field{display:flex;flex-direction:column;gap:4px;min-width:0}" +
    ".lead-field.full{grid-column:1/-1}" +
    ".lead-field input{width:100%;min-width:0;box-sizing:border-box}" +
    ".lead-field-label{font-size:.85rem;font-weight:700;color:var(--text-primary,#1c1712)}" +
    ".lead-field-label .req{color:var(--premium-text,#b3380d);margin-inline-start:3px}" +
    ".lead-field-error{color:var(--premium-text,#b3380d);font-size:.85rem;font-weight:700}" +
    ".lead-field-error[hidden]{display:none}" +
    ".lead-single-field{display:flex;flex-direction:column;gap:4px}" +
    ".lead-fields-bottom-gap{margin-top:2px}" +
    "@media (max-width:340px){.lead-fields-grid{grid-template-columns:1fr}}";

  function ensureStyle() {
    if (document.getElementById("mmLeadCaptureStyle")) return;
    var st = document.createElement("style");
    st.id = "mmLeadCaptureStyle";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function fieldHtml(key) {
    var f = FIELDS[key];
    return '<div class="lead-field' + (f.full ? " full" : "") + '">' +
      '<label class="lead-field-label" for="' + f.id + '">' + esc(f.label) + (f.required ? '<span class="req" aria-hidden="true">*</span>' : "") + "</label>" +
      '<input type="' + f.type + '" id="' + f.id + '" name="' + f.id + '" autocomplete="' + (f.auto || "off") + '"' +
      (f.inputmode ? ' inputmode="' + f.inputmode + '"' : "") +
      (f.ltr ? ' dir="ltr" style="text-align:right"' : "") +
      (f.required ? ' aria-required="true"' : "") +
      ' aria-describedby="' + f.err + '" maxlength="120" />' +
      '<div class="lead-field-error" id="' + f.err + '" role="alert" hidden></div>' +
      "</div>";
  }

  /* ---------- קריאה / כתיבה של ערכים ---------- */
  function val(key) {
    var n = el(FIELDS[key].id);
    return n ? String(n.value || "").trim() : "";
  }
  function setVal(key, v) {
    var n = el(FIELDS[key].id);
    if (n && !n.value && v) n.value = v;
  }
  function collect() {
    var d = {
      firstName: val("first"), lastName: val("last"), phone: val("phone"), phone2: val("phone2"),
      idNumber: val("idnum"), street: val("street"), city: val("city"), email: val("email")
    };
    d.fullName = (d.firstName + " " + d.lastName).trim();
    return d;
  }

  function syncHiddenName() {
    var h = el("cartLeadName");
    if (!h) return;
    var full = (val("first") + " " + val("last")).trim();
    if (h.value !== full) h.value = full;
  }

  var onUpdateFn = null;
  var cartProviderFn = null;

  function notifyUpdate() {
    syncHiddenName();
    /* הקוד הקיים בעמוד מאזין ל-input על cartLeadName ועל cartLeadPhone ומרענן את קישורי השליחה */
    var h = el("cartLeadName");
    if (h) h.dispatchEvent(new Event("input", { bubbles: true }));
    if (typeof onUpdateFn === "function") { try { onUpdateFn(); } catch (e) {} }
  }

  /* ---------- שגיאות ---------- */
  function showError(key, msg) {
    var f = FIELDS[key];
    var inp = el(f.id), err = el(f.err);
    if (inp) inp.setAttribute("aria-invalid", "true");
    if (err) { err.textContent = msg; err.hidden = false; }
  }
  function clearError(key) {
    var f = FIELDS[key];
    var inp = el(f.id), err = el(f.err);
    if (inp) inp.removeAttribute("aria-invalid");
    if (err) { err.hidden = true; err.textContent = ""; }
  }
  function checkField(key) {
    var v = val(key);
    var ok = true;
    if (key === "first" || key === "last") ok = v.length > 0;
    else if (key === "phone") ok = phoneOk(v);
    else if (key === "phone2") ok = !v || phoneOk(v);
    else if (key === "idnum") ok = idOk(v);
    else if (key === "email") ok = !v || emailOk(v);
    if (ok) clearError(key); else showError(key, ERR[key]);
    return ok;
  }
  var ORDER = ["first", "last", "phone", "phone2", "idnum", "street", "city", "email"];
  function validate() {
    var firstBad = null;
    ORDER.forEach(function (k) {
      if (!checkField(k) && !firstBad) firstBad = k;
    });
    if (firstBad) {
      var n = el(FIELDS[firstBad].id);
      if (n) n.focus();
      return false;
    }
    return true;
  }

  /* ---------- שורות להודעה (וואטסאפ / מייל) ----------
     תבנית קבועה: "פרטי הלקוח:" ואז שורות "תווית: ערך". הדשבורד מייבא לפי אותן תוויות. */
  function messageLines(nameFallback, phoneFallback) {
    var d = collect();
    var lines = [];
    var hasAny = d.fullName || d.phone || d.phone2 || d.idNumber || d.street || d.city || d.email;
    if (!hasAny) {
      if (nameFallback) lines.push("שם: " + nameFallback);
      if (phoneFallback) lines.push("טלפון: " + phoneFallback);
      return lines;
    }
    lines.push("", "פרטי הלקוח:");
    if (d.firstName) lines.push("שם פרטי: " + d.firstName);
    if (d.lastName) lines.push("שם משפחה: " + d.lastName);
    if (d.phone) lines.push("טלפון: " + d.phone);
    else if (phoneFallback) lines.push("טלפון: " + phoneFallback);
    if (d.phone2) lines.push("טלפון נוסף: " + d.phone2);
    if (d.idNumber) lines.push("ת.ז / ח.פ / ע.מ: " + d.idNumber);
    if (d.street) lines.push("כתובת: " + d.street);
    if (d.city) lines.push("עיר: " + d.city);
    if (d.email) lines.push('דוא"ל: ' + d.email);
    if (!d.fullName && nameFallback) lines.push("שם: " + nameFallback);
    return lines;
  }

  /* ---------- שמירה ושליחה ---------- */
  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJson(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  function buildRecord(channel) {
    var d = collect();
    var cart = null;
    if (typeof cartProviderFn === "function") { try { cart = cartProviderFn(); } catch (e) { cart = null; } }
    var consent = readJson("mm_marketing_consent", null);
    return {
      id: "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      source: "site-cart",
      channel: channel || "",
      page: (location.pathname || "").split("/").pop() || "index.html",
      firstName: d.firstName, lastName: d.lastName, fullName: d.fullName,
      phone: d.phone, phone2: d.phone2, idNumber: d.idNumber,
      street: d.street, city: d.city, email: d.email,
      marketingOptIn: !!(consent && consent.consented),
      cart: cart
    };
  }

  function sendRecord(rec) {
    var url = biz.leadEndpoint;
    if (!url) return false;
    try {
      /* text/plain + no-cors: פשוט ועובד מול שירותי קליטה חיצוניים (Apps Script / Formspree וכד') בלי preflight */
      fetch(url, {
        method: "POST", mode: "no-cors", keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(rec)
      }).then(function () { removeFromOutbox(rec.id); }, function () { addToOutbox(rec); });
      return true;
    } catch (e) { addToOutbox(rec); return false; }
  }
  function addToOutbox(rec) {
    var box = readJson(OUTBOX_KEY, []);
    if (!Array.isArray(box)) box = [];
    if (!box.some(function (r) { return r && r.id === rec.id; })) box.push(rec);
    writeJson(OUTBOX_KEY, box.slice(-20));
  }
  function removeFromOutbox(id) {
    var box = readJson(OUTBOX_KEY, []);
    if (!Array.isArray(box)) return;
    writeJson(OUTBOX_KEY, box.filter(function (r) { return r && r.id !== id; }));
  }
  function flushOutbox() {
    if (!biz.leadEndpoint) return;
    var box = readJson(OUTBOX_KEY, []);
    if (!Array.isArray(box)) return;
    box.forEach(function (rec) { if (rec && rec.id) sendRecord(rec); });
  }

  /* שומר את הפרטים להשלמה אוטומטית בפעם הבאה. מספר הזהות לא נשמר בדפדפן. */
  function persistDetails() {
    var d = collect();
    writeJson(STORE_KEY, {
      firstName: d.firstName, lastName: d.lastName, phone: d.phone, phone2: d.phone2,
      street: d.street, city: d.city, email: d.email, savedAt: new Date().toISOString()
    });
  }
  function prefill() {
    var s = readJson(STORE_KEY, null);
    if (!s) return;
    setVal("first", s.firstName); setVal("last", s.lastName); setVal("phone", s.phone);
    setVal("phone2", s.phone2); setVal("street", s.street); setVal("city", s.city); setVal("email", s.email);
    notifyUpdate();
  }

  /* נקרא כשהלקוח לוחץ על קישור יצירת קשר בעגלה ושהשדות תקינים */
  function save(channel) {
    persistDetails();
    var rec = buildRecord(channel);
    sendRecord(rec);
    return rec;
  }

  /* ---------- רינדור ---------- */
  var rendered = false;
  function render() {
    var top = el("cartLeadFieldsTop"), bottom = el("cartLeadFieldsBottom");
    if (!top && !bottom) return;
    if (rendered && el(FIELDS.first.id)) return;
    ensureStyle();
    if (top) {
      top.innerHTML =
        '<p class="lead-fields-note">הפרטים נשמרים אצלנו למעקב פנימי ולתיאום ההזמנה מול נציג. שדות עם * הם חובה.</p>' +
        '<div class="lead-fields-grid">' + fieldHtml("first") + fieldHtml("last") + "</div>";
    }
    if (bottom) {
      bottom.innerHTML =
        '<div class="lead-fields-grid lead-fields-bottom-gap">' + fieldHtml("phone2") + fieldHtml("idnum") + fieldHtml("street") + fieldHtml("city") + fieldHtml("email") + "</div>";
    }
    rendered = true;
    wire();
    prefill();
  }

  function wire() {
    ORDER.forEach(function (k) {
      var inp = el(FIELDS[k].id);
      if (!inp || inp.getAttribute("data-lead-wired") === "1") return;
      inp.setAttribute("data-lead-wired", "1");
      inp.addEventListener("input", function () {
        if (inp.getAttribute("aria-invalid") === "true") checkField(k);
        if (k !== "phone") notifyUpdate();
      });
      inp.addEventListener("blur", function () {
        /* בדיקה בעזיבת שדה רק אם הוזן משהו (לא מציקים בשדה שלא נגעו בו) */
        if (val(k)) checkField(k);
      });
    });
  }

  /* חסימת קישורי השליחה (וואטסאפ / מייל בעגלה) כל עוד חסר משהו, ושמירה כשהכל תקין.
     מאזין בשלב הלכידה, לפני המאזינים הקיימים בעמודים. */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#cartWhatsappBtn, #cartMailtoBtn") : null;
    if (!t || t.hidden) return;
    if (!el(FIELDS.first.id)) return;
    if (!validate()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    notifyUpdate();
    save(t.id === "cartWhatsappBtn" ? "whatsapp" : "email");
  }, true);

  window.MMLead = {
    render: render,
    validate: validate,
    collect: collect,
    messageLines: messageLines,
    save: save,
    idOk: idOk,
    phoneOk: phoneOk,
    emailOk: emailOk,
    onUpdate: function (fn) { onUpdateFn = fn; },
    setCartProvider: function (fn) { cartProviderFn = fn; }
  };

  function init() { render(); flushOutbox(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
