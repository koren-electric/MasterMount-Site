/* compare-bar.js - "להשוואה" בקטלוג עמוד הבית: תיבת סימון לכל כרטיס טלוויזיה + סרגל השוואה צף בתחתית.
   * מקסימום שני דגמים. סימון שלישי לא מחליף אוטומטית: מוצגת הודעה שצריך להסיר אחד קודם.
   * הסרגל מופיע מהסימון הראשון: תמונה ממוזערת + שם דגם + X לכל דגם, וכפתור "השווה" (פעיל רק כשנבחרו שניים).
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
  var TRACKS = ["productTrack", "bestSellersTrack"];

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
    "#mmCompareBar{position:fixed;inset-inline:0;bottom:var(--mm-cookie-h,0px);z-index:120;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:var(--surface,#fff);border-top:2px solid var(--orange,#ea5b24);box-shadow:0 -10px 30px -12px rgba(0,0,0,.35)}",
    "#mmCompareBar[hidden]{display:none}",
    "#mmCompareBar .cmp-bar-in{max-width:1000px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}",
    "#mmCompareBar .cmp-bar-items{display:flex;gap:10px;flex:1 1 320px;min-width:0}",
    "#mmCompareBar .cmp-bar-item{position:relative;display:flex;align-items:center;gap:8px;flex:1 1 0;min-width:0;padding:6px 8px;padding-inline-end:34px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface-2,#f1efe9)}",
    "#mmCompareBar .cmp-bar-item.is-empty{border-style:dashed;justify-content:center;color:var(--text-secondary);font-size:.8rem;padding:6px 8px}",
    "#mmCompareBar img{width:44px;height:36px;object-fit:contain;flex:none;background:#fff;border-radius:6px}",
    "#mmCompareBar .cmp-bar-name{min-width:0;font-size:.8rem;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#mmCompareBar .cmp-bar-name b{display:block;font-size:.85rem}",
    "#mmCompareBar .cmp-bar-x{position:absolute;inset-inline-end:4px;top:50%;transform:translateY(-50%);width:26px;height:26px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-size:.9rem;line-height:1;cursor:pointer}",
    "#mmCompareBar .cmp-bar-x:hover{border-color:var(--orange,#ea5b24)}",
    "#mmCompareBar .cmp-bar-go{flex:none;padding:11px 22px;border-radius:10px;border:none;background:var(--premium-oncolor,#cc4714);color:#fff;font-weight:700;font-size:.95rem;text-decoration:none;text-align:center}",
    "#mmCompareBar .cmp-bar-go[aria-disabled='true']{background:var(--surface-2,#eee);color:var(--text-tertiary,#606870);cursor:not-allowed;border:1px dashed var(--border)}",
    "#mmCompareBar .cmp-bar-msg{flex:1 0 100%;font-size:.82rem;font-weight:600;color:var(--premium-text,#ba4112);min-height:0}",
    "#mmCompareBar .cmp-bar-msg:empty{display:none}",
    "@media (max-width:640px){#mmCompareBar .cmp-bar-go{flex:1 0 100%}#mmCompareBar .cmp-bar-items{flex-basis:100%}}",
    "body.has-cmp-bar{padding-bottom:110px}"
  ].join("\n");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var bar = document.createElement("div");
  bar.id = "mmCompareBar"; bar.hidden = true;
  bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "סרגל השוואת טלוויזיות");
  bar.innerHTML = '<div class="cmp-bar-in"><div class="cmp-bar-items" id="mmCmpItems"></div><a class="cmp-bar-go" id="mmCmpGo" role="link" aria-disabled="true">השווה</a><div class="cmp-bar-msg" id="mmCmpMsg" role="status" aria-live="polite"></div></div>';
  document.body.appendChild(bar);
  var itemsEl = bar.querySelector("#mmCmpItems"), goEl = bar.querySelector("#mmCmpGo"), msgEl = bar.querySelector("#mmCmpMsg");
  var msgTimer = null;

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
    document.body.classList.toggle("has-cmp-bar", ids.length > 0);
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
    /* סנכרון כל תיבות הסימון בדף */
    Array.prototype.forEach.call(document.querySelectorAll(".cmp-pick input[data-id]"), function (cb) { cb.checked = ids.indexOf(cb.getAttribute("data-id")) !== -1; });
  }

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
        var x = bar.querySelector(".cmp-bar-x"); if (x) x.focus();
      } else say("");
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
