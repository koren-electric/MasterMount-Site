/**
 * accessibility-widget.js
 * תפריט-נגישות צף (כפתור+פאנל), נבנה עצמאית בקוד-האתר עצמו - אינו שירות/overlay חיצוני
 * של צד-שלישי. שכבת-נוחות משלימה בלבד: ההנגשה האמיתית (ARIA/landmarks/ניווט-מקלדת/ניגודיות)
 * כבר קיימת בקוד-המקור, ר' README-accessibility.md - הכלי הזה לא מחליף אותה.
 *
 * עצמאי-לגמרי (IIFE), בדיוק כמו cookie-consent.js/compare-bar.js: מזריק את ה-<style> וה-DOM
 * שלו לבד, לא דורש שום שינוי-markup בקבצי ה-HTML מלבד תג <script src> יחיד. משתמש ב-
 * --mm-cookie-h (אותו משתנה-CSS שכבר קובע cookie-consent.js) כדי לזוז אוטומטית מעל באנר-
 * העוגיות, ובטוקני-הצבע/מיתוג הקיימים של האתר בלבד.
 *
 * שני toggle-ים (קורא-טקסט, שליטה-קולית) תלויים ב-Web Speech API - נתמכים במלואם בכרום
 * בלבד; מזוהים אוטומטית (feature detection) ומוצגים כ"לא נתמך" בדפדפן אחר, לא נכשלים בשקט.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mm_a11y_widget";
  var FONT_STEP_PERCENT = ["100%", "118%", "135%"];
  var recognition = null;
  var voiceListening = false;
  var lastFocusBeforePanel = null;
  var lastFocusBeforeKeyboard = null;

  var KB_LAYOUTS = {
    he: [
      ["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"],
      ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף"],
      ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"]
    ],
    en: [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["z", "x", "c", "v", "b", "n", "m"]
    ],
    num: [
      ["1", "2", "3", "4", "5"],
      ["6", "7", "8", "9", "0"],
      [".", ",", "-", "@", "/"]
    ]
  };
  var kbLangOrder = ["he", "en", "num"];
  var kbLangIndex = 0;

  function defaultState() {
    return {
      screenReader: false,
      kbHighlight: false,
      grayscale: false,
      contrast: false,
      noMotion: false,
      underline: false,
      fontStep: 0
    };
  }

  function getState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      for (var k in base) {
        if (parsed.hasOwnProperty(k)) base[k] = parsed[k];
      }
      return base;
    } catch (e) {
      return defaultState();
    }
  }

  function setState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  var state = getState();

  /* ---------- עזרי-נגישות כלליים (focus-trap/announcer עצמאיים - לא ניתן לשתף עם
     openModalA11y/wireFocusTrap הפרטיים של index.html, ר' תיעוד-התכנון) ---------- */

  function getFocusableEls(container) {
    var sel =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), ' +
      'select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var all = container.querySelectorAll(sel);
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement) {
        out.push(el);
      }
    }
    return out;
  }

  function announce(text) {
    var live = document.getElementById("mmA11yAnnouncer");
    if (!live) return;
    live.textContent = "";
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  /* ---------- CSS ---------- */

  function ensureStyle() {
    if (document.getElementById("mmA11yStyle")) return;
    var st = document.createElement("style");
    st.id = "mmA11yStyle";
    st.textContent =
      "#mmA11yToggle{position:fixed;left:16px;bottom:calc(var(--mm-cookie-h,0px) + 16px);z-index:400;" +
      "width:52px;height:52px;border-radius:50%;border:2px solid var(--brand-orange-ink,#fff);" +
      "background:var(--brand-orange,#ea5b24);color:var(--brand-orange-ink,#fff);cursor:pointer;" +
      "display:flex;align-items:center;justify-content:center;padding:0;" +
      "box-shadow:var(--shadow,0 4px 16px rgba(0,0,0,.3));transition:transform .15s ease}" +
      "#mmA11yToggle:hover{transform:scale(1.06)}" +
      "#mmA11yToggle:focus-visible{outline:3px solid var(--brand-orange-2,#ff8a52);outline-offset:3px}" +
      "#mmA11yToggle svg{width:28px;height:28px}" +
      "#mmA11yOverlay{position:fixed;inset:0;z-index:410;background:rgba(0,0,0,.35);display:flex;" +
      "align-items:flex-end;justify-content:flex-start;padding:16px}" +
      "#mmA11yOverlay[hidden]{display:none}" +
      "#mmA11yPanel{width:min(360px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 32px));" +
      "overflow-y:auto;background:var(--surface,#fff);color:var(--text-primary,#20272e);" +
      "border:1px solid var(--border,#e1ddd4);border-radius:16px;box-shadow:var(--shadow,0 16px 40px rgba(0,0,0,.35));" +
      "padding:16px;box-sizing:border-box;direction:rtl;font-family:inherit;" +
      "margin-bottom:calc(52px + var(--mm-cookie-h,0px) + 24px)}" +
      "#mmA11yPanel:focus{outline:none}" +
      ".mm-a11y-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}" +
      ".mm-a11y-head h2{font-size:16px;font-weight:800;margin:0;color:var(--text-primary,#20272e)}" +
      ".mm-a11y-head-btns{display:flex;gap:4px}" +
      ".mm-a11y-icon-btn{width:32px;height:32px;min-width:32px;min-height:32px;border-radius:8px;border:1px solid var(--border,#e1ddd4);" +
      "background:var(--surface-2,#f1efe9);color:var(--text-primary,#20272e);cursor:pointer;font-size:14px;" +
      "display:flex;align-items:center;justify-content:center;padding:0;line-height:1}" +
      ".mm-a11y-icon-btn:hover{background:var(--border,#e1ddd4)}" +
      ".mm-a11y-icon-btn:focus-visible,.mm-a11y-item:focus-visible,.mm-a11y-font-btn:focus-visible,.mm-a11y-statement-link:focus-visible{" +
      "outline:3px solid var(--brand-orange,#ea5b24);outline-offset:2px}" +
      ".mm-a11y-help-box{background:var(--surface-2,#f1efe9);border:1px solid var(--border,#e1ddd4);border-radius:10px;" +
      "padding:10px 12px;font-size:12.5px;line-height:1.5;margin-bottom:12px;color:var(--text-secondary,#55606b)}" +
      ".mm-a11y-help-box[hidden]{display:none}" +
      ".mm-a11y-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}" +
      ".mm-a11y-item{box-sizing:border-box;min-height:64px;border-radius:10px;border:1px solid var(--border,#e1ddd4);" +
      "background:var(--surface-2,#f1efe9);color:var(--text-primary,#20272e);cursor:pointer;padding:8px 6px;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;" +
      "font-family:inherit;font-size:11.5px;font-weight:700;line-height:1.25}" +
      ".mm-a11y-item .mm-a11y-item-icon{width:22px;height:22px;display:flex;align-items:center;justify-content:center;" +
      "border-radius:50%;border:2px solid var(--text-primary,#20272e);font-size:13px}" +
      ".mm-a11y-item[aria-pressed=\"true\"]{background:var(--brand-orange,#ea5b24);border-color:var(--brand-orange,#ea5b24);" +
      "color:var(--brand-orange-ink,#fff)}" +
      ".mm-a11y-item[aria-pressed=\"true\"] .mm-a11y-item-icon{border-color:var(--brand-orange-ink,#fff)}" +
      ".mm-a11y-item:disabled{opacity:.5;cursor:not-allowed}" +
      ".mm-a11y-item small{display:block;font-size:9.5px;font-weight:600;color:inherit;opacity:.8}" +
      ".mm-a11y-font-row{display:flex;gap:8px;margin-bottom:10px}" +
      ".mm-a11y-font-btn{flex:1 1 0;min-height:44px;border-radius:10px;border:1px solid var(--border,#e1ddd4);" +
      "background:var(--surface-2,#f1efe9);color:var(--text-primary,#20272e);cursor:pointer;font-family:inherit;" +
      "font-weight:700}" +
      ".mm-a11y-font-btn[aria-pressed=\"true\"]{background:var(--brand-orange,#ea5b24);border-color:var(--brand-orange,#ea5b24);" +
      "color:var(--brand-orange-ink,#fff)}" +
      ".mm-a11y-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}" +
      ".mm-a11y-statement-link{display:block;text-align:center;min-height:44px;line-height:44px;border-radius:10px;" +
      "background:var(--brand-ink,#20272e);color:var(--on-dark,#f3f4f6);text-decoration:none;font-weight:800;font-size:13px}" +
      ".mm-a11y-statement-link:hover{opacity:.9}" +
      ".mm-a11y-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;" +
      "clip:rect(0,0,0,0);white-space:nowrap;border:0}" +
      ".mm-a11y-listening-badge{position:fixed;left:16px;bottom:calc(var(--mm-cookie-h,0px) + 76px);z-index:400;" +
      "background:#c62828;color:#fff;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:800;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.3);display:flex;align-items:center;gap:6px}" +
      "#mmA11yVkWrap{position:fixed;left:0;right:0;bottom:0;z-index:405;background:var(--brand-ink,#20272e);" +
      "color:var(--on-dark,#f3f4f6);padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px));" +
      "box-shadow:0 -6px 20px rgba(0,0,0,.3)}" +
      "#mmA11yVkWrap[hidden]{display:none}" +
      ".mm-a11y-vk-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;font-weight:700}" +
      ".mm-a11y-vk-row{display:flex;justify-content:center;gap:4px;margin-bottom:4px;flex-wrap:wrap}" +
      ".mm-a11y-vk-key{min-width:32px;min-height:40px;border-radius:6px;border:1px solid rgba(255,255,255,.3);" +
      "background:rgba(255,255,255,.12);color:inherit;font-family:inherit;font-size:14px;cursor:pointer;padding:0 8px}" +
      ".mm-a11y-vk-key:hover{background:rgba(255,255,255,.22)}" +
      ".mm-a11y-vk-key.wide{min-width:80px}" +
      /* --- ניגודיות-גבוהה (מוחל גלובלית, כולל הפאנל עצמו - עם override ל"נבחר" כדי שיישאר קריא) --- */
      "html.mm-a11y-contrast,html.mm-a11y-contrast body{background:#000!important;color:#fff!important}" +
      "html.mm-a11y-contrast body *{background-color:#000!important;color:#fff!important;border-color:#fff!important}" +
      "html.mm-a11y-contrast a,html.mm-a11y-contrast button{text-decoration:underline!important}" +
      "html.mm-a11y-contrast img,html.mm-a11y-contrast svg:not(.mm-a11y-keep-color){filter:grayscale(100%) contrast(120%)!important}" +
      "html.mm-a11y-contrast #mmA11yToggle{background:#000!important;color:#fff!important;border-color:#fff!important}" +
      "html.mm-a11y-contrast .mm-a11y-item[aria-pressed=\"true\"],html.mm-a11y-contrast .mm-a11y-font-btn[aria-pressed=\"true\"]{" +
      "background:#fff!important;color:#000!important;border-color:#fff!important}" +
      "html.mm-a11y-contrast .mm-a11y-statement-link{background:#fff!important;color:#000!important}" +
      /* --- שחור-לבן --- */
      "html.mm-a11y-grayscale{filter:grayscale(100%)}" +
      /* --- ללא-אנימציה (חוזר על מבנה prefers-reduced-motion הקיים באתר, בכפייה ידנית) --- */
      "html.mm-a11y-no-motion *{animation-duration:.01ms!important;animation-iteration-count:1!important;" +
      "transition-duration:.001ms!important;scroll-behavior:auto!important}" +
      /* --- קישורים מודגשים --- */
      "html.mm-a11y-underline a{text-decoration:underline!important}" +
      /* --- הדגשת-פוקוס לניווט-מקלדת --- */
      "html.mm-a11y-kb-highlight *:focus-visible{outline:4px solid #ffbf47!important;outline-offset:2px!important;" +
      "box-shadow:0 0 0 6px rgba(255,191,71,.35)!important}" +
      "@media (max-width:480px){#mmA11yToggle{width:46px;height:46px;left:12px;bottom:calc(var(--mm-cookie-h,0px) + 12px)}" +
      "#mmA11yToggle svg{width:24px;height:24px}#mmA11yOverlay{padding:8px}" +
      "#mmA11yPanel{margin-bottom:calc(46px + var(--mm-cookie-h,0px) + 20px)}}";
    document.head.appendChild(st);
  }

  /* ---------- אייקון-נגישות (SVG אוניברסלי, אדם בתוך עיגול) ---------- */

  var TOGGLE_ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M12 4a2 2 0 110 4 2 2 0 010-4zm7 6a1 1 0 010 2h-4.4l1.8 4.7v.02l1.6 4.1a1 1 0 01-1.86.74l-1.9-4.87h-2.48l-1.9 4.87a1 1 0 01-1.86-.74l1.6-4.1v-.02l1.8-4.7H5a1 1 0 010-2h14z"/>' +
    "</svg>";

  var ITEM_DEFS = [
    { action: "screenReader", icon: "🔊", label: "תמיכה בקוראי מסך" },
    { action: "kbHighlight", icon: "⌨", label: "תמיכה בניווט מקלדת" },
    { action: "tts", icon: "🗣", label: "קורא הטקסט", note: "הכי טוב ב-Chrome" },
    { action: "vk", icon: "▦", label: "מקלדת וירטואלית" },
    { action: "voice", icon: "🎙", label: "שליטה קולית", note: "הכי טוב ב-Chrome" },
    { action: "grayscale", icon: "◐", label: "שחור לבן" },
    { action: "contrast", icon: "◑", label: "ניגודיות" },
    { action: "noMotion", icon: "⏸", label: "ללא אנימציה" }
  ];

  function itemButtonHtml(def) {
    var noteHtml = def.note ? '<small>' + def.note + "</small>" : "";
    return (
      '<button type="button" class="mm-a11y-item" data-a11y-action="' +
      def.action +
      '" aria-pressed="false">' +
      '<span class="mm-a11y-item-icon" aria-hidden="true">' +
      def.icon +
      "</span><span>" +
      def.label +
      "</span>" +
      noteHtml +
      "</button>"
    );
  }

  function buildPanelHtml() {
    var itemsHtml = ITEM_DEFS.map(itemButtonHtml).join("");
    return (
      '<div id="mmA11yOverlay" hidden>' +
      '<div id="mmA11yPanel" role="dialog" aria-modal="true" aria-labelledby="mmA11yPanelTitle" tabindex="-1">' +
      '<div class="mm-a11y-head">' +
      '<h2 id="mmA11yPanelTitle">תפריט נגישות</h2>' +
      '<div class="mm-a11y-head-btns">' +
      '<button type="button" class="mm-a11y-icon-btn" id="mmA11yHelpBtn" aria-expanded="false" aria-controls="mmA11yHelpBox" aria-label="מידע על תפריט הנגישות">?</button>' +
      '<button type="button" class="mm-a11y-icon-btn" id="mmA11yCloseBtn" aria-label="סגירת תפריט נגישות">✕</button>' +
      "</div></div>" +
      '<div id="mmA11yHelpBox" class="mm-a11y-help-box" hidden>תפריט זה נבנה ישירות בקוד האתר (לא שירות חיצוני) ' +
      'ומאפשר להתאים אישית את התצוגה. הוא משלים - ואינו מחליף - את ההנגשה שכבר בוצעה בבסיס הקוד. ' +
      'לפרטים המלאים ראו את <a href="./accessibility-statement.html">הצהרת הנגישות</a>.</div>' +
      '<div id="mmA11yAnnouncer" class="mm-a11y-sr-only" aria-live="polite"></div>' +
      '<div class="mm-a11y-grid">' +
      itemsHtml +
      "</div>" +
      '<div class="mm-a11y-font-row" role="group" aria-label="גודל גופן">' +
      '<button type="button" class="mm-a11y-font-btn" data-a11y-font="0" aria-pressed="true">א קטן</button>' +
      '<button type="button" class="mm-a11y-font-btn" data-a11y-font="1" aria-pressed="false">א בינוני</button>' +
      '<button type="button" class="mm-a11y-font-btn" data-a11y-font="2" aria-pressed="false">א גדול</button>' +
      "</div>" +
      '<div class="mm-a11y-row2">' +
      '<button type="button" class="mm-a11y-item" data-a11y-action="underline" aria-pressed="false" style="min-height:44px">' +
      "קישורים מודגשים</button>" +
      '<button type="button" class="mm-a11y-item" id="mmA11yResetBtn" style="min-height:44px">נקה הגדרות נגישות</button>' +
      "</div>" +
      '<a class="mm-a11y-statement-link" href="./accessibility-statement.html">הצהרת נגישות</a>' +
      "</div></div>"
    );
  }

  function buildKeyboardHtml() {
    return (
      '<div id="mmA11yVkWrap" hidden>' +
      '<div class="mm-a11y-vk-head"><span id="mmA11yVkLabel">מקלדת וירטואלית</span>' +
      '<button type="button" class="mm-a11y-icon-btn" id="mmA11yVkCloseBtn" aria-label="סגירת מקלדת וירטואלית" style="background:transparent;border-color:rgba(255,255,255,.4);color:inherit">✕</button></div>' +
      '<div id="mmA11yVkRows"></div>' +
      '<div class="mm-a11y-vk-row">' +
      '<button type="button" class="mm-a11y-vk-key" data-vk="lang">🌐 שפה</button>' +
      '<button type="button" class="mm-a11y-vk-key wide" data-vk="space">רווח</button>' +
      '<button type="button" class="mm-a11y-vk-key wide" data-vk="backspace">⌫ מחיקה</button>' +
      '<button type="button" class="mm-a11y-vk-key wide" data-vk="enter">⏎ Enter</button>' +
      "</div></div>"
    );
  }

  /* ---------- בניית/הזרקת ה-DOM ---------- */

  function buildMarkup() {
    ensureStyle();
    var toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.id = "mmA11yToggle";
    toggleBtn.setAttribute("aria-haspopup", "dialog");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", "פתיחת תפריט נגישות");
    toggleBtn.innerHTML = TOGGLE_ICON_SVG;
    document.body.appendChild(toggleBtn);

    var wrap = document.createElement("div");
    wrap.innerHTML = buildPanelHtml();
    document.body.appendChild(wrap.firstChild);

    var kbWrap = document.createElement("div");
    kbWrap.innerHTML = buildKeyboardHtml();
    document.body.appendChild(kbWrap.firstChild);
  }

  /* ---------- פתיחה/סגירה של הפאנל + focus-trap ---------- */

  function openPanel() {
    var overlay = document.getElementById("mmA11yOverlay");
    var panel = document.getElementById("mmA11yPanel");
    var toggleBtn = document.getElementById("mmA11yToggle");
    lastFocusBeforePanel = document.activeElement;
    overlay.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
    window.setTimeout(function () {
      panel.focus();
    }, 0);
    document.addEventListener("keydown", onPanelKeydown, true);
  }

  function closePanel(returnFocus) {
    var overlay = document.getElementById("mmA11yOverlay");
    var toggleBtn = document.getElementById("mmA11yToggle");
    if (overlay.hidden) return;
    overlay.hidden = true;
    toggleBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onPanelKeydown, true);
    if (returnFocus !== false) {
      var target =
        lastFocusBeforePanel && document.contains(lastFocusBeforePanel)
          ? lastFocusBeforePanel
          : toggleBtn;
      try {
        target.focus();
      } catch (e) {}
    }
  }

  function onPanelKeydown(e) {
    var overlay = document.getElementById("mmA11yOverlay");
    if (overlay.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    var panel = document.getElementById("mmA11yPanel");
    var focusables = getFocusableEls(panel);
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- החלת מצב על ה-DOM ---------- */

  function applyState() {
    var html = document.documentElement;
    html.classList.toggle("mm-a11y-grayscale", !!state.grayscale);
    html.classList.toggle("mm-a11y-contrast", !!state.contrast);
    html.classList.toggle("mm-a11y-no-motion", !!state.noMotion);
    html.classList.toggle("mm-a11y-underline", !!state.underline);
    html.classList.toggle("mm-a11y-kb-highlight", !!state.kbHighlight);
    html.classList.remove("mm-a11y-font-1", "mm-a11y-font-2");
    if (state.fontStep === 1) html.classList.add("mm-a11y-font-1");
    if (state.fontStep === 2) html.classList.add("mm-a11y-font-2");
    html.style.fontSize = FONT_STEP_PERCENT[state.fontStep] === "100%" ? "" : FONT_STEP_PERCENT[state.fontStep];

    var map = {
      screenReader: state.screenReader,
      kbHighlight: state.kbHighlight,
      tts: ttsActiveNow(),
      voice: voiceListening,
      grayscale: state.grayscale,
      contrast: state.contrast,
      noMotion: state.noMotion,
      underline: state.underline
    };
    for (var action in map) {
      var btns = document.querySelectorAll('[data-a11y-action="' + action + '"]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].setAttribute("aria-pressed", map[action] ? "true" : "false");
      }
    }
    var fontBtns = document.querySelectorAll("[data-a11y-font]");
    for (var j = 0; j < fontBtns.length; j++) {
      var step = parseInt(fontBtns[j].getAttribute("data-a11y-font"), 10);
      fontBtns[j].setAttribute("aria-pressed", step === state.fontStep ? "true" : "false");
    }
  }

  function persist() {
    setState(state);
  }

  /* ---------- "תמיכה בקוראי מסך": מידע + תוספת aria-label בטוחה (לא-דורסת) ---------- */

  var srSweepDone = false;

  function runScreenReaderSweep() {
    if (srSweepDone) return;
    srSweepDone = true;
    var els = document.querySelectorAll("button, a");
    var added = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.id && el.id.indexOf("mmA11y") === 0) continue;
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) continue;
      var text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (text) continue;
      var fallback = el.getAttribute("title");
      if (!fallback) {
        var img = el.querySelector("img[alt]");
        if (img && img.getAttribute("alt")) fallback = img.getAttribute("alt");
      }
      if (!fallback) {
        fallback = el.tagName === "A" ? "קישור" : "כפתור";
      }
      el.setAttribute("aria-label", fallback);
      added++;
    }
    announce(
      "האתר כבר תואם לתוכנות קריאת מסך נפוצות (NVDA, JAWS, VoiceOver) - ניתן להשתמש בקיצורי הניווט הרגילים שלכן/ם." +
        (added ? " בנוסף, בוצע שיפור-תיוג אוטומטי לרכיבים ללא שם נגיש." : "")
    );
  }

  /* ---------- ללא-אנימציה: גם עוצר קרוסלות-JS קיימות (setInterval, לא CSS-בלבד) ---------- */

  function stopKnownCarousels() {
    ["heroCarouselPlayPause", "brandBannerPlayPause"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn && btn.getAttribute("aria-pressed") !== "true") {
        try {
          btn.click();
        } catch (e) {}
      }
    });
  }

  /* ---------- קורא-טקסט (TTS) ---------- */

  var ttsSupported = typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
  var ttsEnabled = false;

  function ttsActiveNow() {
    return ttsEnabled;
  }

  var TTS_SKIP_SELECTOR =
    'a,button,input,textarea,select,label,[role="radio"],[role="button"],[role="link"],[onclick],[tabindex]';

  function onDocumentClickForTts(e) {
    if (!ttsEnabled) return;
    if (e.target.closest("#mmA11yPanel, #mmA11yOverlay, #mmA11yToggle, #mmA11yVkWrap")) return;
    if (e.target.closest(TTS_SKIP_SELECTOR)) return;
    var text = (e.target.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    try {
      window.speechSynthesis.cancel();
      var utt = new SpeechSynthesisUtterance(text);
      utt.lang = "he-IL";
      window.speechSynthesis.speak(utt);
    } catch (err) {}
  }

  function toggleTts() {
    if (!ttsSupported) return;
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    applyState();
    announce(ttsEnabled ? "קורא הטקסט הופעל - לחצו על כל טקסט באתר כדי לשמוע אותו" : "קורא הטקסט כובה");
  }

  /* ---------- מקלדת וירטואלית ---------- */

  function renderKeyboardRows() {
    var rowsEl = document.getElementById("mmA11yVkRows");
    var lang = kbLangOrder[kbLangIndex];
    var rows = KB_LAYOUTS[lang];
    var html = "";
    for (var r = 0; r < rows.length; r++) {
      html += '<div class="mm-a11y-vk-row">';
      for (var c = 0; c < rows[r].length; c++) {
        html += '<button type="button" class="mm-a11y-vk-key" data-vk-char="' + rows[r][c] + '">' + rows[r][c] + "</button>";
      }
      html += "</div>";
    }
    rowsEl.innerHTML = html;
    var label = document.getElementById("mmA11yVkLabel");
    var langNames = { he: "עברית", en: "English", num: "מספרים" };
    label.textContent = "מקלדת וירטואלית - " + langNames[lang];
  }

  function isEditableElement(el) {
    if (!el) return false;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return !el.disabled && !el.readOnly;
    return !!el.isContentEditable;
  }

  function insertIntoActiveElement(text) {
    var el = document.activeElement;
    if (!isEditableElement(el)) return;
    var ok = false;
    try {
      ok = document.execCommand && document.execCommand("insertText", false, text);
    } catch (e) {
      ok = false;
    }
    if (ok) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      var start = el.selectionStart != null ? el.selectionStart : el.value.length;
      var end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
      el.value = el.value.slice(0, start) + text + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start + text.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function backspaceActiveElement() {
    var el = document.activeElement;
    if (!isEditableElement(el)) return;
    var ok = false;
    try {
      ok = document.execCommand && document.execCommand("delete", false, null);
    } catch (e) {
      ok = false;
    }
    if (ok) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      var start = el.selectionStart != null ? el.selectionStart : el.value.length;
      var end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
      if (start === end && start > 0) start -= 1;
      el.value = el.value.slice(0, start) + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function openVirtualKeyboard() {
    lastFocusBeforeKeyboard = document.activeElement;
    var wrap = document.getElementById("mmA11yVkWrap");
    renderKeyboardRows();
    wrap.hidden = false;
    announce("מקלדת וירטואלית נפתחה");
  }

  function closeVirtualKeyboard() {
    var wrap = document.getElementById("mmA11yVkWrap");
    wrap.hidden = true;
    if (lastFocusBeforeKeyboard && document.contains(lastFocusBeforeKeyboard) && isEditableElement(lastFocusBeforeKeyboard)) {
      try {
        lastFocusBeforeKeyboard.focus();
      } catch (e) {}
    }
  }

  /* ---------- שליטה קולית ---------- */

  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  var voiceSupported = typeof SpeechRecognitionCtor !== "undefined";

  function findVisibleLinkByText(query) {
    var candidates = document.querySelectorAll("a, button");
    var q = query.trim();
    if (!q) return null;
    var drawerOpen = document.body.classList.contains("mobile-nav-open");
    var best = null;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.closest("#mmA11yPanel, #mmA11yOverlay, #mmA11yToggle")) continue;
      var inDrawer = !!el.closest("#mobileDrawerNav, .mobile-drawer-nav");
      if (inDrawer && !drawerOpen) continue;
      if (el.offsetWidth <= 0 && el.offsetHeight <= 0) continue;
      var text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      if (text.indexOf(q) !== -1 || q.indexOf(text) !== -1) {
        best = el;
        break;
      }
    }
    return best;
  }

  function handleVoiceCommand(raw) {
    var t = raw.trim();
    if (/^גלול למעלה$|^גלילה למעלה$/.test(t)) {
      window.scrollBy({ top: -400, behavior: "smooth" });
      return;
    }
    if (/^גלול למטה$|^גלילה למטה$/.test(t)) {
      window.scrollBy({ top: 400, behavior: "smooth" });
      return;
    }
    if (/^(עבור ל)?תחילת העמוד$/.test(t)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (/^(עבור ל)?סוף העמוד$/.test(t)) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }
    if (/^פתח תפריט$/.test(t)) {
      var menuBtn = document.getElementById("mobileMenuToggleBtn");
      if (menuBtn) menuBtn.click();
      return;
    }
    if (/^סגור$/.test(t)) {
      var openMenuBtn = document.getElementById("mobileMenuToggleBtn");
      if (openMenuBtn && openMenuBtn.getAttribute("aria-expanded") === "true") openMenuBtn.click();
      closePanel(false);
      return;
    }
    var m = t.match(/^פתח (.+)$/);
    if (m) {
      var target = findVisibleLinkByText(m[1]);
      if (target) {
        announce('פותח: "' + (target.textContent || "").trim() + '"');
        target.click();
      } else {
        announce("לא נמצא קישור מתאים");
      }
      return;
    }
  }

  function toggleVoice() {
    if (!voiceSupported) return;
    if (voiceListening) {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
      return;
    }
    try {
      recognition = new SpeechRecognitionCtor();
    } catch (e) {
      return;
    }
    recognition.lang = "he-IL";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = function (event) {
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          handleVoiceCommand(event.results[i][0].transcript);
        }
      }
    };
    recognition.onerror = function () {
      voiceListening = false;
      applyState();
      showListeningBadge(false);
      announce("שליטה קולית נעצרה עקב שגיאה או שההרשאה למיקרופון נדחתה");
    };
    recognition.onend = function () {
      voiceListening = false;
      applyState();
      showListeningBadge(false);
    };
    try {
      recognition.start();
      voiceListening = true;
      applyState();
      showListeningBadge(true);
      announce("שליטה קולית הופעלה, מקשיב לפקודות");
    } catch (e) {
      voiceListening = false;
      applyState();
    }
  }

  function showListeningBadge(show) {
    var existing = document.getElementById("mmA11yListeningBadge");
    if (show) {
      if (existing) return;
      var badge = document.createElement("div");
      badge.id = "mmA11yListeningBadge";
      badge.className = "mm-a11y-listening-badge";
      badge.setAttribute("role", "status");
      badge.textContent = "🎤 מקשיב לפקודות קוליות...";
      document.body.appendChild(badge);
    } else if (existing) {
      existing.parentNode.removeChild(existing);
    }
  }

  /* ---------- איפוס ---------- */

  function resetAll() {
    state = defaultState();
    persist();
    applyState();
    announce("כל הגדרות הנגישות אופסו");
  }

  /* ---------- חיווט אירועים ---------- */

  function onToggleClick(action) {
    switch (action) {
      case "screenReader":
        state.screenReader = !state.screenReader;
        persist();
        applyState();
        if (state.screenReader) runScreenReaderSweep();
        else announce("מצב תאימות מוגברת לקוראי מסך כובה");
        break;
      case "kbHighlight":
        state.kbHighlight = !state.kbHighlight;
        persist();
        applyState();
        announce(state.kbHighlight ? "הדגשת מוקד-מקלדת הופעלה" : "הדגשת מוקד-מקלדת כובתה");
        break;
      case "grayscale":
        state.grayscale = !state.grayscale;
        persist();
        applyState();
        announce(state.grayscale ? "מצב שחור-לבן הופעל" : "מצב שחור-לבן כובה");
        break;
      case "contrast":
        state.contrast = !state.contrast;
        persist();
        applyState();
        announce(state.contrast ? "ניגודיות גבוהה הופעלה" : "ניגודיות גבוהה כובתה");
        break;
      case "noMotion":
        state.noMotion = !state.noMotion;
        persist();
        applyState();
        if (state.noMotion) stopKnownCarousels();
        announce(state.noMotion ? "הפחתת תנועה/אנימציה הופעלה" : "הפחתת תנועה/אנימציה כובתה");
        break;
      case "underline":
        state.underline = !state.underline;
        persist();
        applyState();
        announce(state.underline ? "הדגשת קישורים בקו תחתון הופעלה" : "הדגשת קישורים כובתה");
        break;
      case "tts":
        toggleTts();
        break;
      case "voice":
        toggleVoice();
        break;
      case "vk":
        var wrap = document.getElementById("mmA11yVkWrap");
        if (wrap.hidden) openVirtualKeyboard();
        else closeVirtualKeyboard();
        break;
    }
  }

  function wireEvents() {
    document.getElementById("mmA11yToggle").addEventListener("click", function () {
      openPanel();
    });
    document.getElementById("mmA11yCloseBtn").addEventListener("click", function () {
      closePanel();
    });
    document.getElementById("mmA11yOverlay").addEventListener("mousedown", function (e) {
      if (e.target.id === "mmA11yOverlay") closePanel();
    });
    document.getElementById("mmA11yHelpBtn").addEventListener("click", function () {
      var box = document.getElementById("mmA11yHelpBox");
      var btn = document.getElementById("mmA11yHelpBtn");
      var show = box.hidden;
      box.hidden = !show;
      btn.setAttribute("aria-expanded", show ? "true" : "false");
    });
    document.getElementById("mmA11yResetBtn").addEventListener("click", resetAll);

    document.getElementById("mmA11yPanel").addEventListener("click", function (e) {
      var itemBtn = e.target.closest("[data-a11y-action]");
      if (itemBtn && !itemBtn.disabled) {
        onToggleClick(itemBtn.getAttribute("data-a11y-action"));
        return;
      }
      var fontBtn = e.target.closest("[data-a11y-font]");
      if (fontBtn) {
        state.fontStep = parseInt(fontBtn.getAttribute("data-a11y-font"), 10);
        persist();
        applyState();
        announce("גודל הגופן שונה");
      }
    });

    document.getElementById("mmA11yVkCloseBtn").addEventListener("click", closeVirtualKeyboard);
    document.getElementById("mmA11yVkWrap").addEventListener("mousedown", function (e) {
      // מונע גניבת-פוקוס מהשדה הפעיל בזמן לחיצה על מקש-וירטואלי
      if (e.target.closest("[data-vk-char], [data-vk]")) e.preventDefault();
    });
    document.getElementById("mmA11yVkWrap").addEventListener("click", function (e) {
      var charBtn = e.target.closest("[data-vk-char]");
      if (charBtn) {
        insertIntoActiveElement(charBtn.getAttribute("data-vk-char"));
        return;
      }
      var vkBtn = e.target.closest("[data-vk]");
      if (!vkBtn) return;
      var action = vkBtn.getAttribute("data-vk");
      if (action === "space") insertIntoActiveElement(" ");
      else if (action === "backspace") backspaceActiveElement();
      else if (action === "enter") insertIntoActiveElement("\n");
      else if (action === "lang") {
        kbLangIndex = (kbLangIndex + 1) % kbLangOrder.length;
        renderKeyboardRows();
      }
    });

    document.addEventListener("click", onDocumentClickForTts, false);

    if (!ttsSupported) {
      var ttsBtn = document.querySelector('[data-a11y-action="tts"]');
      ttsBtn.disabled = true;
      ttsBtn.title = "קריאת טקסט אינה נתמכת בדפדפן זה";
    }
    if (!voiceSupported) {
      var voiceBtn = document.querySelector('[data-a11y-action="voice"]');
      voiceBtn.disabled = true;
      voiceBtn.title = "שליטה קולית אינה נתמכת בדפדפן זה";
    }
  }

  /* ---------- אתחול ---------- */

  function init() {
    buildMarkup();
    wireEvents();
    applyState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
