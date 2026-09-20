/* compare-core.js - הלוגיקה הטהורה של השוואת שני דגמים (ללא DOM, ניתנת לבדיקה).
   דורש MM_COMPARE_SCHEMA (compare-schema.js). מקור-הנתונים: MM_COMPARE_DATA.models (compare-data.js).
   כללי-ברזל:
   * ערך ריק (null/""/[]) = "לא זמין". אף פעם לא נחשב מנצח, גם לא מול ערך קיים.
   * מנצח נקבע רק לשדות מספריים (prefer=high/low) ולשדה סדור (ordinal). שדות טקסט/רשימה: רק סימון הבדל.
   * שדה מסוג multi: אין מנצח ואין ספירת ערכים; רק מי ייחודי לכל צד. */
(function (root) {
  "use strict";
  var S = root.MM_COMPARE_SCHEMA || { fields: [], groups: [], emptyLabel: "לא זמין" };

  function isEmpty(v) { return v == null || v === "" || (Array.isArray(v) && v.length === 0); }
  function fieldByKey(k) { for (var i = 0; i < S.fields.length; i++) if (S.fields[i].key === k) return S.fields[i]; return null; }

  /* ערך שדה מתוך דגם: derived (מחיר) מהשורש, השאר מ-values */
  function getValue(model, f) {
    if (!model) return null;
    if (f.type === "derived") { var v = model[f.key]; return typeof v === "number" ? v : null; }
    var x = model.values ? model.values[f.key] : null;
    return isEmpty(x) ? null : x;
  }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    return a.every(function (x) { return b.indexOf(x) !== -1; });
  }

  /* השוואה בין שני ערכים של אותו שדה.
     status: same | diff | missing-one | missing-both. winner: "a" | "b" | null. aOnly/bOnly: לשדות multi. */
  function compareField(f, a, b) {
    var ea = isEmpty(a), eb = isEmpty(b);
    if (ea && eb) return { status: "missing-both", winner: null, aOnly: [], bOnly: [] };
    if (ea || eb) return { status: "missing-one", winner: null, aOnly: [], bOnly: [], missing: ea ? "a" : "b" };
    if (f.type === "multi") {
      var A = Array.isArray(a) ? a : [a], B = Array.isArray(b) ? b : [b];
      if (sameSet(A, B)) return { status: "same", winner: null, aOnly: [], bOnly: [] };
      return {
        status: "diff", winner: null,
        aOnly: A.filter(function (x) { return B.indexOf(x) === -1; }),
        bOnly: B.filter(function (x) { return A.indexOf(x) === -1; })
      };
    }
    if (a === b) return { status: "same", winner: null, aOnly: [], bOnly: [] };
    var winner = null;
    if (f.type === "number" || f.type === "derived") {
      if (typeof a === "number" && typeof b === "number" && f.prefer) {
        if (f.prefer === "high") winner = a > b ? "a" : "b";
        else if (f.prefer === "low") winner = a < b ? "a" : "b";
      }
    } else if (f.type === "enum" && f.ordinal && f.prefer === "high") {
      var ia = (f.options || []).indexOf(a), ib = (f.options || []).indexOf(b);
      if (ia !== -1 && ib !== -1 && ia !== ib) winner = ia > ib ? "a" : "b";
    }
    return { status: "diff", winner: winner, aOnly: [], bOnly: [] };
  }

  function fmtNumber(f, n) {
    if (f.noGrouping) return String(n);
    try { return n.toLocaleString("he-IL"); } catch (e) { return String(n); }
  }
  /* מחרוזת תצוגה לערך סקלרי (לא multi) */
  function formatScalar(f, v) {
    if (isEmpty(v)) return S.emptyLabel;
    if (f.type === "derived" || f.type === "number") {
      var num = fmtNumber(f, v);
      if (f.key === "priceILS") return "₪" + num;
      return f.unit ? num + " " + f.unit : num;
    }
    return String(v);
  }

  /* עוגן במדריך הטכנולוגיות לפי מותג + טכנולוגיה. אם אין עוגן ספציפי - עוגן המותג. */
  function guideAnchor(brand, tech) {
    var b = String(brand || "").toUpperCase(), t = String(tech || "");
    if (b === "SAMSUNG") {
      if (/neo\s*qled/i.test(t)) return "samsung-neo-qled";
      if (/micro\s*rgb|mrgb/i.test(t)) return "samsung-micro-rgb";
      if (/oled/i.test(t)) return "samsung-oled";
      if (/qled/i.test(t)) return "samsung-qled";
      if (/crystal|uhd/i.test(t)) return "samsung-crystal-uhd";
      return "samsung";
    }
    if (b === "LG") {
      if (/oled/i.test(t)) return "lg-oled-evo";
      if (/qned/i.test(t)) return "lg-qned-evo";
      if (/nano/i.test(t)) return "lg-nanocell";
      if (/led/i.test(t) && !/mini|mrgb/i.test(t)) return "lg-led";
      return "lg";
    }
    if (b === "TCL") {
      if (/rgb/i.test(t)) return "tcl-rgb-mini-led";
      if (/qd\s*mini|super\s*qd/i.test(t)) return "tcl-qd-mini-led";
      if (/qled/i.test(t)) return "tcl-qled";
      return "tcl";
    }
    return "";
  }

  function slugOf(model) { return String(model || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

  function compareModels(ma, mb) {
    var rows = [], diffs = 0, missing = 0;
    S.groups.forEach(function (g) {
      var list = S.fields.filter(function (f) { return f.group === g.key; }).map(function (f) {
        var a = getValue(ma, f), b = getValue(mb, f), r = compareField(f, a, b);
        if (r.status === "diff") diffs++;
        if (r.status === "missing-one") missing++;
        return { field: f, a: a, b: b, result: r };
      });
      if (list.length) rows.push({ group: g, rows: list });
    });
    var total = S.fields.length;
    return { groups: rows, diffs: diffs, missing: missing, total: total };
  }

  root.MM_COMPARE_CORE = {
    isEmpty: isEmpty, fieldByKey: fieldByKey, getValue: getValue, compareField: compareField,
    formatScalar: formatScalar, guideAnchor: guideAnchor, slugOf: slugOf, compareModels: compareModels
  };
})(typeof window !== "undefined" ? window : this);
