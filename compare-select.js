/* compare-select.js - אחסון הבחירה להשוואה (עד שני דגמים), משותף לעמוד הבית ולעמוד ההשוואה.
   נשמר ב-localStorage כדי לשרוד רענון וניווט בין עמודים. כל גישה ל-localStorage עטופה ב-try/catch
   (מצב פרטי/חסימת אחסון) - ללא אחסון הבחירה פשוט חיה בזיכרון העמוד בלבד. */
(function () {
  "use strict";
  var KEY = "mm_compare_v1";
  var MAX = 2;
  var mem = [];

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return mem.slice();
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (x) { return typeof x === "string" && x; }).slice(0, MAX);
    } catch (e) { return mem.slice(); }
  }
  function write(ids) {
    mem = ids.slice(0, MAX);
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("mm-compare-change", { detail: { ids: mem.slice() } })); } catch (e) {}
  }

  var API = {
    MAX: MAX,
    get: read,
    has: function (id) { return read().indexOf(id) !== -1; },
    isFull: function () { return read().length >= MAX; },
    /* מחזיר {ok:true} או {ok:false, reason:"full"} - לעולם לא מחליף דגם קיים אוטומטית */
    add: function (id) {
      var ids = read();
      if (ids.indexOf(id) !== -1) return { ok: true };
      if (ids.length >= MAX) return { ok: false, reason: "full" };
      ids.push(id); write(ids); return { ok: true };
    },
    remove: function (id) {
      var ids = read().filter(function (x) { return x !== id; });
      write(ids);
    },
    set: function (ids) { write((ids || []).filter(Boolean)); },
    clear: function () { write([]); }
  };
  window.MM_COMPARE_SEL = API;
  /* סנכרון בין לשוניות/חלונות */
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) { try { window.dispatchEvent(new CustomEvent("mm-compare-change", { detail: { ids: read() } })); } catch (err) {} }
  });
})();
