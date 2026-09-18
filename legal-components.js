/**
 * legal-components.js
 * פונקציות רינדור HTML משותפות לתוכן משפטי/עסקי - גילוי-נאות (סעיף 14ג), מסמך פרטי עסקה,
 * תעודת אחריות, תג מבצע, והודעת החזרת ציוד חשמלי. כל הפונקציות מחזירות מחרוזת HTML/טקסט
 * ואינן תלויות בשום framework - נטענות אחרי business-config.js.
 */
(function () {
  "use strict";

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtIls(n) {
    if (n === null || n === undefined || isNaN(n)) return "";
    return "₪" + Number(n).toLocaleString("he-IL");
  }

  var B = window.BUSINESS_CONFIG || {};

  /**
   * גילוי-נאות מלא לפי סעיף 14ג לחוק הגנת הצרכן.
   * item: { title, priceILS, description, warrantyMonths, deliveryText, isService }
   */
  function legalDisclosureHtml(item) {
    item = item || {};
    var biz = window.BUSINESS_CONFIG || {};
    var legalName = biz.bizField ? biz.bizField("legalName", "שם העוסק") : "";
    var businessId = biz.bizField ? biz.bizField("businessId", "מספר עוסק / ח.פ") : "";
    var address = biz.bizField ? biz.bizField("address", "כתובת") : "";
    var phone = biz.phone || "";
    var email = biz.email || "";
    var vatNote = biz.vatNote ? biz.vatNote({ includeShipping: !item.isService }) : "";
    var warrantyText = item.warrantyMonths
      ? "אחריות " + item.warrantyMonths + " חודשים"
      : (biz.bizField ? biz.bizField("warrantyMonths_installation", "משך אחריות") : "");

    var html = "";
    html += '<div class="legal-disclosure">';
    html += '<h4 class="legal-disclosure-title">פרטי העסקה (גילוי נאות)</h4>';
    html += '<ul class="legal-disclosure-list">';
    html += "<li><strong>שם העוסק:</strong> " + esc(legalName) + "</li>";
    html += "<li><strong>מספר עוסק:</strong> " + esc(businessId) + "</li>";
    html += "<li><strong>כתובת:</strong> " + esc(address) + "</li>";
    html += "<li><strong>יצירת קשר:</strong> " + esc(phone) + (email ? " · " + esc(email) : "") + "</li>";
    if (item.description) {
      html += "<li><strong>תיאור:</strong> " + esc(item.description) + "</li>";
    }
    if (item.priceILS !== undefined && item.priceILS !== null) {
      html += "<li><strong>מחיר סופי כולל הכל:</strong> " + esc(fmtIls(item.priceILS)) + " (" + esc(vatNote) + ")</li>";
    }
    html += "<li><strong>תנאי תשלום:</strong> לפי סיכום מול נציג בעת אישור ההזמנה.</li>";
    if (item.deliveryText) {
      html += "<li><strong>מועד אספקה/התקנה:</strong> " + esc(item.deliveryText) + "</li>";
    }
    html += "<li><strong>תוקף ההצעה:</strong> 7 ימים ממועד קבלתה, אלא אם צוין אחרת.</li>";
    if (warrantyText) {
      html += "<li><strong>אחריות:</strong> " + esc(warrantyText) + "</li>";
    }
    html += '<li><a class="legal-disclosure-link" href="./cancellation-policy.html">מדיניות ביטולים והחזרות</a></li>';
    html += "</ul>";
    html += "</div>";
    return html;
  }

  function isSaleActive(sale) {
    if (!sale || !sale.startDate || !sale.endDate) return false;
    var now = new Date();
    var start = new Date(sale.startDate);
    var end = new Date(sale.endDate);
    return now >= start && now <= end;
  }

  function saleBadgeHtml(sale) {
    if (!isSaleActive(sale)) return "";
    var original = fmtIls(sale.originalPrice);
    var saleP = fmtIls(sale.salePrice);
    return (
      '<div class="sale-badge-wrap">' +
      '<span class="bundle-old-price">' + esc(original) + "</span>" +
      '<span class="sale-price">' + esc(saleP) + "</span>" +
      "</div>"
    );
  }

  /**
   * מסמך פרטי עסקה - HTML לתצוגה על המסך.
   * details: { items: [{title, qty, priceILS}], totalILS, customerName }
   */
  function transactionDocumentHtml(details) {
    details = details || {};
    var biz = window.BUSINESS_CONFIG || {};
    var inquiryId = "MM-" + Date.now().toString(36).toUpperCase();
    var items = details.items || [];
    var html = "";
    html += '<div class="transaction-document">';
    html += '<h4>מסמך פרטי עסקה</h4>';
    html += "<p>מספר פנייה: " + esc(inquiryId) + " · תאריך: " + esc(new Date().toLocaleDateString("he-IL")) + "</p>";
    if (items.length) {
      html += "<ul>";
      items.forEach(function (it) {
        html += "<li>" + esc(it.title) + (it.qty ? " × " + esc(it.qty) : "") + (it.priceILS !== undefined ? " - " + esc(fmtIls(it.priceILS)) : "") + "</li>";
      });
      html += "</ul>";
    }
    if (details.totalILS !== undefined) {
      html += "<p><strong>סה\"כ כולל מע\"מ: " + esc(fmtIls(details.totalILS)) + "</strong></p>";
    }
    html += "<p>" + esc(biz.bizField ? biz.bizField("legalName", "שם העוסק") : "") + " · " + esc(biz.bizField ? biz.bizField("businessId", "מספר עוסק") : "") + "</p>";
    html += "<p>" + esc(transactionCancellationNote()) + "</p>";
    html += "</div>";
    return html;
  }

  function transactionCancellationNote() {
    var biz = window.BUSINESS_CONFIG || {};
    var days = biz.returnWindowDays || 14;
    var pct = biz.cancellationFeePercent || 5;
    var maxIls = biz.cancellationFeeMaxIls || 100;
    return (
      "זכות ביטול: ניתן לבטל את העסקה תוך " + days +
      " ימים ממועד קבלת המוצר/השירות או ממועד קבלת מסמך זה - לפי המאוחר מביניהם. " +
      "ייתכן חיוב בדמי ביטול של עד " + pct + "% ממחיר העסקה או " + fmtIls(maxIls) +
      " ₪, לפי הנמוך מביניהם. לפרטים מלאים ראו מדיניות הביטולים באתר."
    );
  }

  /** גרסת טקסט-רגיל (לא HTML) של מסמך פרטי העסקה - להטמעה בתוך הודעת וואטסאפ/מייל */
  function transactionDocumentText(details) {
    details = details || {};
    var biz = window.BUSINESS_CONFIG || {};
    var inquiryId = "MM-" + Date.now().toString(36).toUpperCase();
    var lines = [];
    lines.push("מסמך פרטי עסקה");
    lines.push("מספר פנייה: " + inquiryId);
    lines.push("תאריך: " + new Date().toLocaleDateString("he-IL"));
    var items = details.items || [];
    items.forEach(function (it) {
      var line = "- " + it.title;
      if (it.qty) line += " × " + it.qty;
      if (it.priceILS !== undefined) line += " - " + fmtIls(it.priceILS);
      lines.push(line);
    });
    if (details.totalILS !== undefined) {
      lines.push('סה"כ כולל מע"מ: ' + fmtIls(details.totalILS));
    }
    lines.push((biz.legalName || "") + (biz.businessId ? " · " + biz.businessId : ""));
    lines.push(transactionCancellationNote());
    return lines.filter(Boolean).join("\n");
  }

  /**
   * תעודת אחריות - HTML להצגה/הדפסה.
   * details: { productOrServiceTitle, purchaseDate, warrantyMonths, included, excluded }
   */
  function warrantyCertificateHtml(details) {
    details = details || {};
    var biz = window.BUSINESS_CONFIG || {};
    var html = "";
    html += '<div class="warranty-certificate">';
    html += "<h4>תעודת אחריות</h4>";
    html += "<p>" + esc(biz.bizField ? biz.bizField("legalName", "שם העוסק") : "") + " · " + esc(biz.bizField ? biz.bizField("businessId", "מספר עוסק") : "") + "</p>";
    html += "<p>תאריך רכישה: " + esc(details.purchaseDate || new Date().toLocaleDateString("he-IL")) + "</p>";
    html += "<p>מוצר/שירות: " + esc(details.productOrServiceTitle || "") + "</p>";
    html += "<p>תקופת אחריות: " + esc(details.warrantyMonths ? details.warrantyMonths + " חודשים" : "") + "</p>";
    if (details.included) {
      html += "<p><strong>מה כלול:</strong> " + esc(details.included) + "</p>";
    }
    if (details.excluded) {
      html += "<p><strong>מה לא כלול:</strong> " + esc(details.excluded) + "</p>";
    }
    html += "<p>לפנייה בנושא האחריות: " + esc(biz.phone || "") + (biz.email ? " · " + esc(biz.email) : "") + "</p>";
    html += "</div>";
    return html;
  }

  function weeeNoticeHtml() {
    return (
      '<div class="weee-notice">' +
      "<p>ניתן להחזיר ציוד חשמלי ואלקטרוני וסוללות ישנים ללא עלות, בהתאם לחוק. " +
      '<a href="./weee-returns.html">לפרטים על אופן ההחזרה</a></p>' +
      "</div>"
    );
  }

  window.legalDisclosureHtml = legalDisclosureHtml;
  window.isSaleActive = isSaleActive;
  window.saleBadgeHtml = saleBadgeHtml;
  window.transactionDocumentHtml = transactionDocumentHtml;
  /**
   * משפט-פרטיות-קבוע להצגה מתחת לכפתורי וואטסאפ/מייל בכל נקודת-קשר.
   * מציג קישור למדיניות הפרטיות.
   */
  function privacyNoticeHtml() {
    return (
      '<p class="privacy-point-of-contact-note" style="font-size:.76rem;color:var(--text-tertiary,#7a7a7a);margin-top:6px;">' +
      'בשליחת הפנייה, הפרטים שתמסרו ישמשו ליצירת קשר ומתן הצעת מחיר. ' +
      '<a href="./privacy-policy.html" style="color:inherit;text-decoration:underline;">פרטים נוספים במדיניות הפרטיות</a>.' +
      "</p>"
    );
  }

  /**
   * צ'קבוקס-הסכמה לעדכונים/מבצעים - לא מסומן כברירת מחדל, לא חוסם שליחה.
   * idPrefix - קידומת ייחודית ל-id של תיבת הסימון (כדי לתמוך בכמה טפסים באותו עמוד).
   */
  function consentCheckboxHtml(idPrefix) {
    var id = (idPrefix || "consent") + "MarketingOptIn";
    return (
      '<label for="' + id + '" style="display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--text-tertiary,#7a7a7a);margin-top:6px;cursor:pointer;">' +
      '<input type="checkbox" id="' + id + '" style="margin:0;" />' +
      "אשמח לקבל עדכונים ומבצעים." +
      "</label>"
    );
  }

  /**
   * רושם את מועד/נוסח ההסכמה ל-localStorage (best-effort, לא מנגנון-שרת) - שיטת-התיעוד
   * המעשית היחידה באתר-סטטי-בלי-backend. גם מחזירה שורת-טקסט להטמעה בגוף ההודעה-היוצאת,
   * שהיא הרישום העסקי-האמיתי-הניתן-להוכחה.
   */
  function recordMarketingConsent(checked) {
    var record = { consented: !!checked, at: new Date().toISOString(), wording: "אשמח לקבל עדכונים ומבצעים." };
    try {
      localStorage.setItem("mm_marketing_consent", JSON.stringify(record));
    } catch (e) {}
    return checked
      ? "✅ אישר/ה קבלת עדכונים ומבצעים (" + new Date().toLocaleString("he-IL") + ")"
      : "";
  }

  window.transactionDocumentText = transactionDocumentText;
  window.warrantyCertificateHtml = warrantyCertificateHtml;
  window.weeeNoticeHtml = weeeNoticeHtml;
  window.privacyNoticeHtml = privacyNoticeHtml;
  window.consentCheckboxHtml = consentCheckboxHtml;
  window.recordMarketingConsent = recordMarketingConsent;
})();
