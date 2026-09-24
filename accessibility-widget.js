/**
 * accessibility-widget.js
 * תפריט-נגישות צף (כפתור+פאנל), נבנה עצמאית בקוד-האתר עצמו - אינו שירות/overlay חיצוני
 * של צד-שלישי. שכבת-נוחות משלימה בלבד: ההנגשה האמיתית (ARIA/landmarks/ניווט-מקלדת/ניגודיות)
 * כבר קיימת בקוד-המקור, ר' README-accessibility.md - הכלי הזה לא מחליף אותה.
 *
 * עצמאי-לגמרי (IIFE), בדיוק כמו cookie-consent.js/compare-bar.js: מזריק את ה-<style> וה-DOM
 * שלו לבד, לא דורש שום שינוי-markup בקבצי ה-HTML מלבד תג <script src> יחיד. ממוקם בחלקו העליון
 * של העמוד (לא בתחתית) - --mm-a11y-header-h הוא משתנה-CSS משלו (אותו דפוס בדיוק כמו --mm-cookie-h
 * הקיים ב-cookie-consent.js), נמדד חי מגובה ה-.topbar כדי לזוז אוטומטית מתחת לכותרת-הדביקה בכל
 * עמוד, ובטוקני-הצבע/מיתוג הקיימים של האתר בלבד.
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

  /**
   * ממקם את הכפתור/הפאנל בחלקו העליון של העמוד, מתחת לכותרת-הדביקה (.topbar) בכל עמוד -
   * אותו דפוס בדיוק כמו syncSpacer ב-cookie-consent.js, רק --mm-a11y-header-h במקום --mm-cookie-h.
   */
  var headerResizeObserver = null;
  function syncHeaderHeight() {
    var topbar = document.querySelector(".topbar");
    var h = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--mm-a11y-header-h", h + "px");
  }
  function wireHeaderHeightSync() {
    syncHeaderHeight();
    var topbar = document.querySelector(".topbar");
    if (topbar && typeof ResizeObserver !== "undefined") {
      headerResizeObserver = new ResizeObserver(syncHeaderHeight);
      headerResizeObserver.observe(topbar);
    }
    window.addEventListener("resize", syncHeaderHeight);
  }

  /* ---------- CSS ---------- */

  function ensureStyle() {
    if (document.getElementById("mmA11yStyle")) return;
    var st = document.createElement("style");
    st.id = "mmA11yStyle";
    st.textContent =
      /* אין border עיצובי על הכפתור עצמו בכוונה - האיור עצמו (למטה) כבר-כולל את הטבעת-הכפולה
         כחלק מהצורה, בדיוק כמו בתמונת-הייחוס של ברק; border נוסף כאן היה יוצר טבעת-שלישית-
         מיותרת סביב שתי-הטבעות-שכבר-מצוירות. */
      "#mmA11yToggle{position:fixed;left:16px;top:calc(var(--mm-a11y-header-h,64px) + 16px);z-index:400;" +
      "width:52px;height:52px;border-radius:50%;border:none;" +
      "background:var(--brand-orange,#ea5b24);color:var(--brand-orange-ink,#fff);cursor:pointer;" +
      "display:flex;align-items:center;justify-content:center;padding:0;" +
      "box-shadow:var(--shadow,0 4px 16px rgba(0,0,0,.3));transition:transform .15s ease}" +
      "#mmA11yToggle:hover{transform:scale(1.06)}" +
      "#mmA11yToggle:focus-visible{outline:3px solid var(--brand-orange-2,#ff8a52);outline-offset:3px}" +
      "#mmA11yToggle img{width:42px;height:42px;display:block}" +
      /* direction:ltr כאן בכוונה - זה רק קובע את ציר-ה-flex של העטיפה (שממוקמת בפועל בצד
         שמאל, פיזית), לא את כיוון-הטקסט; #mmA11yPanel מצהיר direction:rtl משלו לתוכן. בלי זה,
         justify-content:flex-start היה נפתר לפי ה-rtl של <html> ופותח את הפאנל בצד ימין - לא
         תואם לכפתור שיושב תמיד ב-left הפיזי. */
      /* 24.9.2026 (מיקום כפתור/תפריט הנגישות, בקשת ברק): --mm-a11y-panel-top הוא מקור-האמת
         היחיד לגובה-שנתפס-מעל-הפאנל (כותרת+כפתור+רווח) - margin-top ו-max-height (למטה)
         חייבים-לנבוע-משתיהן-מאותו-משתנה. קודם היו-שני-חישובים-עצמאיים-לגמרי (margin-top חישב
         כותרת+52+24, max-height חישב min(640px,100vh-32px) בלי-לדעת-על-כך) - נמדד-בפועל
         (iPhone SE, 375x667): הפאנל-נחתך-ב-192px, "הצהרת נגישות"+כפתור-האיפוס-בתחתית-הפאנל
         היו-בלתי-נגישים-לגמרי (גם overflow-y:auto-הפנימי-של-הפאנל לא-עזר - הוא-גולל-רק-תוכן-
         בתוך-הפאנל, לא-את-מיקום-הפאנל-על-העמוד). גם הוצמד-הכפתור-קרוב-יותר-לראש-העמוד (הרווח
         בין-הכפתור-לפאנל צומצם 24px→10px) - פחות-שטח-מבוזבז-מעל, יותר-גובה-אמיתי-לפאנל. */
      "#mmA11yOverlay{position:fixed;inset:0;z-index:410;background:rgba(0,0,0,.35);display:flex;" +
      "overflow-y:auto;" +
      "direction:ltr;align-items:flex-start;justify-content:flex-start;padding:var(--mm-a11y-overlay-pad,16px)}" +
      "#mmA11yOverlay[hidden]{display:none}" +
      ":root{--mm-a11y-panel-top:calc(var(--mm-a11y-header-h,64px) + 52px + 10px);" +
      "--mm-a11y-panel-bottom-gap:16px;--mm-a11y-overlay-pad:16px}" +
      "#mmA11yPanel{width:min(360px,calc(100vw - 32px));" +
      "max-height:min(640px,calc(100vh - var(--mm-a11y-overlay-pad) - var(--mm-a11y-panel-top) - var(--mm-a11y-panel-bottom-gap)));" +
      "overflow-y:auto;background:var(--surface,#fff);color:var(--text-primary,#20272e);" +
      "border:1px solid var(--border,#e1ddd4);border-radius:16px;box-shadow:var(--shadow,0 16px 40px rgba(0,0,0,.35));" +
      "padding:16px;box-sizing:border-box;direction:rtl;font-family:inherit;" +
      "margin-top:var(--mm-a11y-panel-top)}" +
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
      ".mm-a11y-listening-badge{position:fixed;left:16px;top:calc(var(--mm-a11y-header-h,64px) + 76px);z-index:400;" +
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
      "html.mm-a11y-contrast img:not(.mm-a11y-keep-color),html.mm-a11y-contrast svg:not(.mm-a11y-keep-color){filter:grayscale(100%) contrast(120%)!important}" +
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
      "@media (max-width:480px){#mmA11yToggle{width:46px;height:46px;left:12px;top:calc(var(--mm-a11y-header-h,64px) + 12px)}" +
      "#mmA11yToggle img{width:36px;height:36px}#mmA11yOverlay{padding:8px}" +
      /* --mm-a11y-panel-top/--mm-a11y-panel-bottom-gap/--mm-a11y-overlay-pad בלבד - לא עוד
         margin-top/max-height נפרדים על #mmA11yPanel כאן: הכלל שכבר-מוצהר-למעלה קורא מהמשתנים
         האלה, אז דריסת-ערכיהם-כאן (כפתור קטן-יותר 46px, רווח-מכווץ-יותר 8px, ריפוד-8px תואם
         ל-#mmA11yOverlay padding:8px שכבר-למעלה) מספיקה - אין-סיכון-שתי-נוסחאות-נפרדות-שוב. */
      ":root{--mm-a11y-panel-top:calc(var(--mm-a11y-header-h,64px) + 46px + 8px);" +
      "--mm-a11y-panel-bottom-gap:8px;--mm-a11y-overlay-pad:8px}}";
    document.head.appendChild(st);
  }

  /* ---------- אייקון-נגישות (SVG אוניברסלי, אדם בתוך עיגול) ---------- */

  /* קובץ-הייחוס-המדויק-שברק-שמר ("תמונה לכפתור נגישות.png", שורש-הפרויקט) מוטמע-כאן-כמו-שהוא
     (base64, לא-נבנה-מחדש-כ-vector - ניסיון-קודם-לשחזר-ידנית-ב-SVG יצא "מכוער ולא כמו במקור"
     לדברי ברק). ⚠️ עיבוד-חובה שבוצע לפני ההטמעה, לא רק שינוי-גודל: הקובץ-המקורי הוא שחור-על-
     **לבן-אטום** (אומת ברמת-פיקסל - אין-בו-שום-שקיפות-אמיתית, למרות שהפורמט מתויג RGBA) - לכן
     נבנה-מחדש קובץ חדש עם alpha=255-פחות-בהירות-המקור וצבע-לבן-אחיד (סילואטה-לבנה-אמיתית-על-
     שקוף, לא flood-fill - שומר-אנטי-אליאסינג-חלק בפינות-המעוגלות), *ואז* נחתך-וממורכז-מחדש
     (הקנבס-המקורי-240x256 לא-היה-ממורכז - שוליים א-סימטריים 23px למעלה מול 6px למטה) לקנבס-
     ריבועי-120x120 עם התוכן-ממורכז-מדויק. **בלי הצעד הזה** - כפי-שנתפס-בפועל בסבב-קודם -
     הכפתור-כולו יצא מרובע-לבן-אטום (invert-CSS על-לבן-אטום=לבן, אין-שוני-בין-רקע-לצורה).
     class="mm-a11y-keep-color" נשאר-כרשת-ביטחון (מונע מהכלל-הגלובלי-הקיים `html.mm-a11y-
     contrast img{filter:grayscale...!important}` לגעת בפיקסלי-האנטי-אליאסינג-העדינים בשוגג). */
  var TOGGLE_ICON_SVG =
    '<img class="mm-a11y-keep-color" alt="" aria-hidden="true" src="data:image/png;base64,' +
    "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" +
    '">';

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
    wireHeaderHeightSync();
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
