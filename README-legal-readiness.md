# מוכנות משפטית/מסחרית של האתר - README

מסמך זה מסכם את מה שבוצע, מה נותר למילוי ידני, ומה קורה כשהופכים את `isRegistered` ל-`true`.

## איך למלא את `business-config.js`

הקובץ `public-site/business-config.js` הוא **מקור-האמת היחיד** לכל עובדה עסקית באתר. כל
שינוי שם משפיע אוטומטית על כל 9 העמודים (הם כולם טוענים אותו).

השדות (ב-`window.BUSINESS_CONFIG`):

| שדה | סטטוס נוכחי | איך למלא |
|---|---|---|
| `legalName` | ריק | שם העוסק/החברה הרשום (למשל "ישראל ישראלי עוסק מורשה" או "Master Mount בע\"מ") |
| `businessId` | ריק | מספר ע.מ./ח.פ. |
| `businessType` | ריק | "עוסק מורשה" / "עוסק פטור" / "חברה בע\"מ" וכו' |
| `address` | ריק | כתובת פיזית בישראל (רחוב, עיר, מיקוד) |
| `phone` | `+972-52-660-9971` | כבר מולא - לעדכן אם המספר משתנה |
| `email` | `mastermount@mastermount.co.il` | כבר מולא |
| `whatsappNumber` | `972526609971` | כבר מולא (פורמט בינלאומי, בלי `+`/רווחים) |
| `supportHours` | ריק | שעות מענה, למשל "א'-ה' 9:00-18:00" |
| `warrantyMonths_installation` | `null` | מספר חודשי אחריות על עבודת ההתקנה |
| `warrantyMonths_mount` | `null` | מספר חודשי אחריות על המתקן/מוצר הפיזי |
| `returnWindowDays` | `14` | ברירת מחדל חוקית - לא לשנות בלי ייעוץ משפטי |
| `cancellationFeePercent` | `5` | ברירת מחדל חוקית - לא לשנות בלי ייעוץ משפטי |
| `cancellationFeeMaxIls` | `100` | ברירת מחדל חוקית - לא לשנות בלי ייעוץ משפטי |
| `vatRate` | `0.18` | לא לשנות אלא אם שיעור המע"מ בישראל משתנה רשמית |
| `accessibilityCoordinator.name/phone/email` | ריקים | פרטי רכז הנגישות (ראו גם `accessibility-statement.html`) |
| `isRegistered` | `false` | **הדגל המרכזי** - ראו הסבר מלא למטה |

**חשוב**: שדה ריק מוצג בסביבת-פיתוח (כל דומיין שאינו `mastermount.co.il`) כ-
`[טרם הוזן: <שם השדה>]` - זו כוונה מפורשת, כדי שקל יהיה לאתר מה עוד חסר לפני עלייה לאוויר.
בסביבת-הייצור האמיתית שדה ריק פשוט לא מוצג (מחרוזת ריקה), כדי לא לשבור עיצוב ללקוח אמיתי.

## איך למלא את `installation-exclusions.js`

רשימת "מה כלול/לא כלול" בהתקנה, מוצגת ב-`installation.html` וב-`moving-day.html`. כל פריט:
`{id, label, note, alreadyPriced, catalogHint}`. אם מוסיפים פריט חדש-שכן-מתומחר-במחשבון,
לסמן `alreadyPriced: true` ולציין ב-`catalogHint` את השלב הרלוונטי - אחרת `alreadyPriced: false`.

## מה קורה כש-`isRegistered` עובר מ-`false` ל-`true`

שינוי שדה אחד (`business-config.js`) הופך אוטומטית, בלי לגעת בשום קובץ נוסף:

1. **index.html**: העגלה (אייקון בכותרת + הפאנל) הופכת גלויה ופעילה. כפתור "קניה מהירה ללא
   התקנה" בדף-המוצר חוזר לפעול (מוסיף לעגלה במקום לגלול ל-`#contact`).
2. **installation.html**: כפתור-הסיום חוזר לומר "🛒 הוסיפו לעגלה" (במקום "📩 בקשו הצעת
   מחיר"), עגלת ה-installation חוזרת גלויה, ומחיר-הרץ מפסיק להציג "(הערכה, לא מחייב)".
3. **moving-day.html**: מחיר-הרץ מפסיק להציג "(הערכה, לא מחייב)" (התהליך שם תמיד "בקשת הצעת
   מחיר", ללא עגלה - זה לא משתנה).
4. בכל מקום שכותרת/טקסט תלויים ב-`warrantyMonths_installation` (כותרת ה-hero) - ברגע שהשדה
   מלא, המספר יופיע אוטומטית.

**שום קובץ HTML לא צריך עריכה** כדי להפעיל את זה - רק לשנות `isRegistered: true` ב-
`business-config.js`.

## 4 המסמכים המשפטיים הדורשים אישור עורך דין לפני עלייה לאוויר

לכל אחד מהעמודים הבאים יש הערת-קוד `<!-- ⚠️ טעון אישור עורך דין לפני עלייה לאוויר -->`
מיד בתחילת ה-`<body>` (גלויה רק ב-View Source, לא ללקוח):

- `terms-of-use.html` - תנאי שימוש
- `privacy-policy.html` - מדיניות פרטיות
- `cancellation-policy.html` - מדיניות ביטולים והחזרות
- `accessibility-statement.html` - הצהרת נגישות (תוכן מלא, ראו למטה)

**חשוב**: `weee-returns.html` (החזרת ציוד חשמלי) **לא** סומן בהערה הזו במקור התוכנית, אבל
מומלץ לכלול גם אותו בסבב-הבדיקה המשפטי כי הוא מתאר חובה חוקית ספציפית (חוק WEEE).

## רשימת כל המקומות הדורשים מילוי ידני נוסף

1. **`accessibility-statement.html`** - **עודכן**: כבר אינו שלד-זמני. הוחלף בתוכן מלא (סקירת
   רמת הנגישות באתר, התאמות שבוצעו) כחלק מעבודת-הנגישות המקיפה - ראו `README-accessibility.md`
   לפירוט המלא.
2. **`business-config.js`** - כל השדות הריקים בטבלה למעלה: `legalName`, `businessId`,
   `businessType`, `address`, `supportHours`, `warrantyMonths_installation`,
   `warrantyMonths_mount`, `accessibilityCoordinator.*`.
3. **מבצעים לבאנדלים** - `CATALOG.tvBundles` ב-`index.html` תומך בשדה `sale: {originalPrice,
   salePrice, startDate, endDate}` לכל באנדל (דרך `saleBadgeHtml`/`isSaleActive` ב-
   `legal-components.js`), אבל **אף באנדל לא מוגדר עם `sale` כרגע** - התג פשוט לא יופיע עד
   שיתווסף שדה כזה בפועל לבאנדל ספציפי.
4. **שדות-סכימה-אופציונליים למוצר** (`energyRating`, `energyLabelImage`) - לא ידועים כיום,
   לא מוצגים. `modelNumber`/`manufacturerWarranty` כבר נופלים אוטומטית לשדות הקיימים
   (`model`/`warrantyText`). `importerName` **כבר מחולץ אוטומטית** מתוך הטקסט הקיים
   ב-`warrantyText` (התבנית "ע\"י \<שם\>, היבואן הרשמי") - לא דורש פעולה.
5. **אנליטיקס/פיקסלים** - `cookie-consent.js` מוכן ופעיל (הבאנר כבר מוצג בכל עמוד), אבל
   **אין כרגע שום סקריפט-מדידה בפועל באתר** - אם/כש-יתווסף כלי-אנליטיקס, יש לוודא שהטעינה
   שלו מותנית ב-`window.CookieConsent.isAccepted()`.

## הערות-עריכה פנימיות (הוסרו מ-`<!-- TODO -->` בקוד ב-18.9.2026, לא ציות - החלטות תוכן בלבד)
הוצאו מ-`tv-technology-guide.html` (היו נגישות ב-View Source, לא-מוצגות ללקוח) לכאן, כדי שלא
יישארו TODO-ים גלויים בקוד המשווק:
1. לאשר מול המלאי אם להשאיר את כרטיס TCL RGB Mini-LED (בקרוב בישראל) או להסיר אותו.
2. אם ירצה ברק בעתיד טווח מחירים בשקלים בטבלת ההשוואה - להוסיף שורה כזו מחדש (הוסרה במכוון).

## קבצים משותפים חדשים (נטענים בכל העמודים הרלוונטיים)

- `business-config.js` - קונפיג עסקי מרכזי + פונקציות-עזר.
- `installation-exclusions.js` - רשימת "מה כלול/לא כלול".
- `legal-components.js` - רינדור גילוי-נאות/מסמך-עסקה/תעודת-אחריות/הודעת-פרטיות/עוגיות.
- `cookie-consent.js` - ניהול הסכמה לעוגיות + באנר.
- `shared-legal-page.css` - עיצוב בסיסי (מ-`tv-technology-guide.html`) עבור 5 העמודים החדשים.

## עמודים חדשים

`terms-of-use.html`, `privacy-policy.html`, `cancellation-policy.html`,
`accessibility-statement.html`, `weee-returns.html` - כולם מקושרים מהפוטר של כל 9 העמודים.

## לא נגעו (מחוץ להיקף)

`admin-crm/admin.html`, `business-plan/business-plan.html`, `catalog-seed-data.json`,
`tv-catalog-research/*.json`.

## פרסום

עבודה זו בוצעה ואומתה **מקומית בלבד** (קבצים + בדיקות headless). **לא פורסם** ל-Artifact
או ל-GitHub Pages - זה עדיין בהמתנה, בהתאם להנחיה הקיימת שלא לגעת בפרסום-ה-Artifact הציבורי
בלי אישור מפורש נפרד. יש לדון עם ברק על מועד/אופן הפרסום בנפרד.
