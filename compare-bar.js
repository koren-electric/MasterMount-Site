/* compare-bar.js - "להשוואה" בקטלוג עמוד הבית: תיבת סימון לכל כרטיס טלוויזיה + פאנל השוואה צף.
   * מקסימום שני דגמים. סימון שלישי לא מחליף אוטומטית: מוצגת הודעה שצריך להסיר אחד קודם.
   * הפאנל (2.10.2026, בקשת ברק - בהשראת-צילום-מסך-ממתחרה שצורף: כרטיס-צף מעוגן-פינה, לא-
     סרגל-רוחב-מלא) מוצג מהסימון הראשון: כותרת-גרדיאנט-כתום לחיצה-לקיפול ("VS | רשימת השוואה"
     + ספירה + חץ), גוף עם שורת-תמונה-ממוזערת+שם+X לכל דגם, ותחתית עם כפתור "השווה" (פעיל רק
     כשנבחרו שניים) + כפתור-"+" עגול (גלילה-לקטלוג להוספת-דגם-נוסף, מוצג רק-כשיש-עוד-מקום).
   * הבחירה נשמרת ב-localStorage (compare-select.js) ולכן שורדת רענון וניווט.
   * לא נוגע בקוד הקרוסלה: כל כרטיס (.flat-card) עטוף ב-.flat-card-cell שמכיל גם את תיבת הסימון כאח של הכרטיס
     (ולא בתוכו - אלמנט אינטראקטיבי בתוך role="button" הוא כשל נגישות).
   דורש: compare-data.js + compare-select.js. */
(function () {
  "use strict";
  var DATA = window.MM_COMPARE_DATA, SEL = window.MM_COMPARE_SEL;
  if (!DATA || !SEL || !Array.isArray(DATA.models)) return;
  var byId = {};
  DATA.models.forEach(function (m) { byId[m.id] = m; });
  /* 28.9.2026: נוסף "tvCatalogGrid" - הגריד-הכללי בעמוד-הקטלוג-הנפרד (tv-catalog.html),
     גריד-CSS ולא קרוסלת-flex-track כמו שני-הראשונים, אבל אותה סמנטיקה בדיוק (":scope > .flat-
     card" ישירים) - ה-MutationObserver+enhance() לא-תלויים בסוג-הפריסה בכלל. */
  var TRACKS = ["productTrack", "bestSellersTrack", "tvCatalogGrid"];

  var css = [
    ".flat-card-cell{flex:none;display:flex;flex-direction:column;align-items:stretch;gap:6px;scroll-snap-align:start}",
    ".flat-card-cell>.flat-card{scroll-snap-align:none;flex:1 1 auto}",
    /* משבצת "להשוואה": בסגנון MASTER MOUNT - דיו כהה + כתום. בלי סימון: לבן עם מסגרת; מסומן: דיו כהה, מסגרת כתומה, וי כתום */
    ".cmp-pick{display:flex;align-items:center;justify-content:center;gap:9px;min-height:44px;padding:8px 14px;border:2px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text-primary);font-size:.86rem;font-weight:700;letter-spacing:.01em;cursor:pointer;user-select:none;transition:background .15s,border-color .15s,color .15s,box-shadow .15s}",
    ".cmp-pick:hover{border-color:var(--orange,#ea5b24);box-shadow:0 2px 10px -4px rgba(234,91,36,.55)}",
    ".cmp-pick .cmp-ico{width:18px;height:18px;flex:none;color:var(--orange,#ea5b24)}",
    ".cmp-pick input{appearance:none;-webkit-appearance:none;display:grid;place-content:center;flex:none;width:22px;height:22px;margin:0;border:2px solid #20272e;border-radius:6px;background:#fff;cursor:pointer;transition:background .15s,border-color .15s}",
    ".cmp-pick input::after{content:'';width:11px;height:6px;border-left:2.5px solid #fff;border-bottom:2.5px solid #fff;transform:rotate(-45deg) translateY(-1px) scale(0);transition:transform .12s}",
    ".cmp-pick input:checked{background:var(--orange,#ea5b24);border-color:var(--orange,#ea5b24)}",
    ".cmp-pick input:checked::after{transform:rotate(-45deg) translateY(-1px) scale(1)}",
    ".cmp-pick .cmp-on{display:none}",
    ".cmp-pick:has(input:checked){border-color:var(--orange,#ea5b24);background:#20272e;color:#faf9f6}",
    ".cmp-pick:has(input:checked) .cmp-on{display:inline}",
    ".cmp-pick:has(input:checked) .cmp-off{display:none}",
    ".cmp-pick:has(input:focus-visible){outline:3px solid var(--orange,#ea5b24);outline-offset:2px}",
    /* 2.10.2026 - כרטיס-צף מעוגן-פינה (לא-רוחב-מלא), בהשראת-עיצוב שברק-צירף: כותרת-גרדיאנט
       לחיצה-לקיפול, גוף-רשימה, תחתית-פעולה. right (לא inset-inline-end) בכוונה - ברק ביקש
       פינה-ימנית-פיזית-ספציפית, לא "תחילת-שורה" לוגי שבעמוד-RTL היה-הופך-לשמאל. */
    "#mmCompareBar{position:fixed;right:16px;bottom:calc(16px + var(--mm-cookie-h,0px) + env(safe-area-inset-bottom,0px));z-index:120;width:min(336px,calc(100vw - 32px));border-radius:18px;overflow:hidden;background:var(--surface,#fff);box-shadow:0 20px 44px -16px rgba(0,0,0,.4);transition:box-shadow .15s}",
    "#mmCompareBar[hidden]{display:none}",
    "#mmCompareBar .cmp-panel-head{display:flex;align-items:center;gap:10px;width:100%;padding:13px 16px;border:none;background:linear-gradient(90deg,var(--brand-orange,#ea5b24),var(--brand-orange-2,#ff8a52));color:#fff;font:inherit;cursor:pointer;text-align:start}",
    "#mmCompareBar .cmp-panel-vs{flex:none;font-size:.78rem;font-weight:900;letter-spacing:.04em;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.22)}",
    "#mmCompareBar .cmp-panel-title{flex:1 1 auto;min-width:0;font-weight:800;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#mmCompareBar .cmp-panel-count{flex:none;font-size:.78rem;font-weight:700;opacity:.9}",
    "#mmCompareBar .cmp-panel-chevron{flex:none;width:18px;height:18px;transition:transform .2s}",
    "#mmCompareBar.is-collapsed .cmp-panel-chevron{transform:rotate(-90deg)}",
    "#mmCompareBar.is-collapsed .cmp-panel-head{border-radius:18px}",
    "#mmCompareBar .cmp-panel-body{max-height:50vh;overflow-y:auto}",
    "#mmCompareBar.is-collapsed .cmp-panel-body,#mmCompareBar.is-collapsed .cmp-panel-foot{display:none}",
    "#mmCompareBar .cmp-bar-item{position:relative;display:flex;align-items:center;gap:10px;min-width:0;padding:10px 16px;padding-inline-end:40px;border-bottom:1px solid var(--border)}",
    "#mmCompareBar .cmp-bar-item.is-empty{color:var(--text-secondary);font-size:.82rem;justify-content:center;padding:14px 16px}",
    "#mmCompareBar img{width:46px;height:38px;object-fit:contain;flex:none;background:#fff;border:1px solid var(--border);border-radius:8px}",
    "#mmCompareBar .cmp-bar-name{min-width:0;font-size:.82rem;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#mmCompareBar .cmp-bar-name b{display:block;font-size:.87rem}",
    "#mmCompareBar .cmp-bar-x{position:absolute;inset-inline-end:10px;top:50%;transform:translateY(-50%);width:28px;height:28px;flex:none;border-radius:50%;border:none;background:transparent;color:var(--text-tertiary);font-size:1.05rem;line-height:1;cursor:pointer}",
    "#mmCompareBar .cmp-bar-x:hover{background:var(--surface-2,#f1efe9);color:var(--premium,#ea5b24)}",
    "#mmCompareBar .cmp-panel-foot{display:flex;align-items:center;gap:10px;padding:12px 14px}",
    "#mmCompareBar .cmp-bar-go{flex:1 1 auto;padding:12px 18px;border-radius:999px;border:none;background:var(--premium-oncolor,#cc4714);color:#fff;font-weight:800;font-size:.92rem;text-decoration:none;text-align:center}",
    "#mmCompareBar .cmp-bar-go[aria-disabled='true']{background:var(--surface-2,#eee);color:var(--text-tertiary,#606870)}",
    "#mmCompareBar .cmp-panel-add{flex:none;width:40px;height:40px;border-radius:50%;border:none;background:var(--brand-ink,#20272e);color:#fff;font-size:1.3rem;line-height:1;cursor:pointer}",
    "#mmCompareBar .cmp-bar-msg{padding:0 16px 10px;font-size:.78rem;font-weight:700;color:var(--premium-text,#ba4112)}",
    "#mmCompareBar .cmp-bar-msg:empty{display:none;padding:0}"
  ].join("\n");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var bar = document.createElement("div");
  bar.id = "mmCompareBar"; bar.hidden = true;
  bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "השוואת טלוויזיות");
  bar.innerHTML =
    '<button type="button" class="cmp-panel-head" id="mmCmpHead" aria-expanded="true">' +
      '<span class="cmp-panel-vs">VS</span>' +
      '<span class="cmp-panel-title">רשימת השוואה</span>' +
      '<span class="cmp-panel-count" id="mmCmpCount"></span>' +
      '<svg class="cmp-panel-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</button>' +
    '<div class="cmp-panel-body" id="mmCmpItems"></div>' +
    '<div class="cmp-bar-msg" id="mmCmpMsg" role="status" aria-live="polite"></div>' +
    '<div class="cmp-panel-foot">' +
      '<a class="cmp-bar-go" id="mmCmpGo" role="link" aria-disabled="true">השווה</a>' +
      '<button type="button" class="cmp-panel-add" id="mmCmpAdd" aria-label="הוספת דגם נוסף - גלילה לקטלוג" hidden>+</button>' +
    '</div>';
  document.body.appendChild(bar);
  var itemsEl = bar.querySelector("#mmCmpItems"), goEl = bar.querySelector("#mmCmpGo"), msgEl = bar.querySelector("#mmCmpMsg"),
    headEl = bar.querySelector("#mmCmpHead"), countEl = bar.querySelector("#mmCmpCount"), addEl = bar.querySelector("#mmCmpAdd");
  var msgTimer = null;
  var collapsed = false;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function say(text) {
    msgEl.textContent = text || "";
    clearTimeout(msgTimer);
    if (text) msgTimer = setTimeout(function () { msgEl.textContent = ""; }, 6000);
  }
  function compareHref(ids) {
    var a = byId[ids[0]], b = byId[ids[1]];
    if (!a || !b) return "";
    return "compare.html?a=" + encodeURIComponent(a.slug) + "&b=" + encodeURIComponent(b.slug);
  }

  function renderBar() {
    /* מסנן מזהים שאינם בקטלוג הנוכחי (דגם שהוסר) */
    var raw = SEL.get(), ids = raw.filter(function (id) { return !!byId[id]; });
    if (ids.length !== raw.length) { SEL.set(ids); return; }
    bar.hidden = ids.length === 0;
    bar.classList.toggle("is-collapsed", collapsed);
    headEl.setAttribute("aria-expanded", String(!collapsed));
    countEl.textContent = ids.length + "/" + SEL.MAX;
    var html = "";
    ids.forEach(function (id) {
      var m = byId[id];
      html += '<div class="cmp-bar-item"><img src="' + esc(m.image) + '" alt="" loading="lazy"><div class="cmp-bar-name"><b>' + esc(m.brand) + " " + esc(m.model) + '</b>' + esc(m.sizeInches) + '"</div>' +
        '<button type="button" class="cmp-bar-x" data-id="' + esc(id) + '" aria-label="הסרת ' + esc(m.brand + " " + m.model) + ' מההשוואה">✕</button></div>';
    });
    for (var i = ids.length; i < SEL.MAX; i++) html += '<div class="cmp-bar-item is-empty">בחרו דגם נוסף להשוואה</div>';
    itemsEl.innerHTML = html;
    var ready = ids.length === SEL.MAX;
    goEl.setAttribute("aria-disabled", ready ? "false" : "true");
    if (ready) { goEl.setAttribute("href", compareHref(ids)); goEl.removeAttribute("tabindex"); }
    else { goEl.removeAttribute("href"); goEl.setAttribute("tabindex", "-1"); }
    addEl.hidden = ids.length >= SEL.MAX;
    /* סנכרון כל תיבות הסימון בדף */
    Array.prototype.forEach.call(document.querySelectorAll(".cmp-pick input[data-id]"), function (cb) { cb.checked = ids.indexOf(cb.getAttribute("data-id")) !== -1; });
  }

  headEl.addEventListener("click", function () {
    collapsed = !collapsed;
    bar.classList.toggle("is-collapsed", collapsed);
    headEl.setAttribute("aria-expanded", String(!collapsed));
  });
  /* "+" - אין כאן זרימת-חיפוש-והוספה-מהפאנל (לא קיימת בפיצ'ר); גולל-אל-הקטלוג-הקרוב-ביותר
     בעמוד-הנוכחי כדי שהמשתמש יוכל לבחור-את-הדגם-הבא. מוצג רק-כשיש-עוד-מקום (ר' renderBar). */
  addEl.addEventListener("click", function () {
    var target = document.getElementById("tvCatalogGridSection") || document.getElementById("productTrack") || document.getElementById("bestSellersTrack");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  bar.addEventListener("click", function (e) {
    var x = e.target.closest(".cmp-bar-x");
    if (x) { SEL.remove(x.getAttribute("data-id")); say(""); }
  });
  goEl.addEventListener("click", function (e) {
    if (goEl.getAttribute("aria-disabled") === "true") { e.preventDefault(); say("בחרו עוד דגם אחד כדי להשוות."); }
  });

  /* ---- עטיפת כרטיסים + הזרקת תיבת סימון ---- */
  function cardId(card) {
    var oc = card.getAttribute("onclick") || "";
    var m = oc.match(/__openProductPage\('([^']+)'\)/);
    return m ? m[1] : null;
  }
  function enhance(track) {
    if (!track) return;
    Array.prototype.forEach.call(track.querySelectorAll(":scope > .flat-card"), function (card) {
      var id = cardId(card);
      if (!id || !byId[id]) return; /* למשל באנדלים - לא מושווים */
      var cell = document.createElement("div");
      cell.className = "flat-card-cell";
      cell.setAttribute("dir", "rtl");
      var m = byId[id];
      var label = document.createElement("label");
      label.className = "cmp-pick";
      label.innerHTML = '<input type="checkbox" data-id="' + esc(id) + '" aria-label="הוספה להשוואה: ' + esc(m.brand + " " + m.model) + '"><svg class="cmp-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14M4 9h8M12 15h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="cmp-off">להשוואה</span><span class="cmp-on">נבחר להשוואה</span>';
      track.replaceChild(cell, card);
      cell.appendChild(card);
      cell.appendChild(label);
      label.querySelector("input").checked = SEL.has(id);
    });
  }
  function enhanceAll() { TRACKS.forEach(function (t) { enhance(document.getElementById(t)); }); }

  document.addEventListener("change", function (e) {
    var cb = e.target;
    if (!cb || !cb.matches || !cb.matches(".cmp-pick input[data-id]")) return;
    var id = cb.getAttribute("data-id");
    if (cb.checked) {
      var r = SEL.add(id);
      if (!r.ok) {
        cb.checked = false;
        say("אפשר להשוות שני דגמים בלבד. יש להסיר אחד מהדגמים בסרגל לפני הוספת דגם נוסף.");
        bar.hidden = false;
        collapsed = false;
        var x = bar.querySelector(".cmp-bar-x"); if (x) x.focus();
      } else { collapsed = false; say(""); }
    } else { SEL.remove(id); say(""); }
  });

  window.addEventListener("mm-compare-change", renderBar);

  /* רינדור מחדש של הקרוסלה (סינון/מיון) מחליף את התוכן - עוטפים שוב */
  var obs = new MutationObserver(function (muts) {
    var need = false;
    muts.forEach(function (mu) { Array.prototype.forEach.call(mu.addedNodes || [], function (n) { if (n.nodeType === 1 && n.classList && n.classList.contains("flat-card")) need = true; }); });
    if (need) { enhanceAll(); }
  });
  function start() {
    enhanceAll();
    TRACKS.forEach(function (t) { var el = document.getElementById(t); if (el) obs.observe(el, { childList: true }); });
    renderBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
