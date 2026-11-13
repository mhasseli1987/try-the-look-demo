# Try the Look — Demo

بازسازی کامل و مستقل بخش «Try the Look.» با HTML، CSS و جاوااسکریپت خالص (بدون هیچ فریم‌ورک یا کتابخانه). کل صفحه در یک فایل `index.html` جمع شده است: استایل‌ها، اسکریپت، فونت Inter (به‌صورت base64) و کاتالوگ محصولات همه داخل همان فایل هستند.

## فایل‌ها

| فایل | توضیح |
|---|---|
| `index.html` | نسخه نهایی و مستقل سایت (همین فایل را باز کنید) |
| `src/styles.css` | استایل کامل، شامل توکن‌ها، چیدمان، انیمیشن‌ها و مدیا کوئری‌ها |
| `src/runway.js` | تعریف `<runway-section>` با `customElements.define` و منطق سبد خرید |
| `build.js` | سازنده `index.html` از روی `src/` و `catalog.json` |
| `catalog.json` | داده محصولات، واریانت‌ها و لوک‌ها |

## اجرا

فقط `index.html` را در مرورگر باز کنید؛ نیازی به سرور یا build نیست. تصاویر مدل‌ها و محصولات از دامنه اصلی (`https://reel-ref-try-the-look.vercel.app/assets/…`) لود می‌شوند و فونت Inter داخل خود فایل embed شده است.

برای ویرایش سورس و ساخت دوباره:

```bash
node build.js
```

## ساختار صفحه

```
<header class="site-header shopify-section-group-header-group">   ← ارتفاع ۸۸px (۶۸px در موبایل)
<main>
  <runway-section class="rw rw--popup rw--list …">                ← کاستوم المنت اصلی
    .rw__sticky  (ارتفاع = viewport منهای هدر)
      .rw__grid  (ستون چپ صحنه + ستون راست پنل ۳۸۰px)
        .rw__left
          .rw__head            عنوان + زیرعنوان + live region
          .rw__stage           ناحیه چرخفلک (role=region, aria-roledescription=carousel)
            .rw__actors        ۶ بدن + ۶ کلون (حلقه ۱۲تایی)
            .rw__heroes        ۶ قهرمان تیز و کامل
            .rw__sweep         نور کشویی
            .rw__cursor        کرسر سفارشی Drag/View
            .rw__walk          نوار پیشرفت مخصوص موبایل
          .rw__controls        فلش‌ها + تیک‌های ۰۱–۰۶ + دکمه پخش
          .rw__lb              پاپ‌آپ «View look»
        .rw__panel
          .rw__panel-head      «In this look»
          ۶ × .rw__look-panel  ردیف‌های محصول + picker + باکس Complete the look
<dialog id="bag-dialog">            سبد استایل محلی
<div id="bag-status">               توست اعلان
```

## داده‌ها و ویرایش

- **لوک‌ها، پین‌ها و تگ New:** در `build.js` داخل `PINS`، `TAGS` و `LOOK_KEYS`. ترتیب محصولات هر لوک از `looks[].products` در `catalog.json` می‌آید.
- **محصولات، سایزها، واریانت‌ها و لینک‌ها:** `catalog.json`. هر آیتم باید `id`, `name`, `price`, `image`, `sizes`, `variants[{id,a,o}]` و `url` داشته باشد.
- **رنگ‌ها و اندازه‌ها:** توکن‌های inline روی `<runway-section>` (نسخه دسکتاپ با پسوند `-d` و موبایل با `-m`) و مشتق‌ها در ابتدای `src/styles.css`.
- بعد از هر تغییر `node build.js` را اجرا کنید تا `index.html` دوباره ساخته شود.

## رفتارهای پیاده‌شده

- **چرخفلک سه‌بعدی حلقه‌ای** روی دسکتاپ (۱۲ بدن، پرسپکتیو، بلور عمق، مقیاس و روشنایی بر اساس فاصله از جلو) و **صف مورب کلاسیک** روی موبایل با حرکت پله‌ای و «سفر» بدن‌ها از جلو به عقب.
- **پخش خودکار هر ۵ ثانیه** با نوار پیشرفت روی تیک فعال، توقف با هاور روی پنل، و توقف دائمی بعد از تعامل با محصولات.
- **درگ ماوس، سوایپ لمسی، ترک‌پد افقی و کلیدهای جهت‌دار**؛ تشخیص سرعت و مومنتوم؛ سرکوب کلیک بعد از درگ.
- **کرسر سفارشی** با حلقه ۸۴px، حالت‌های Drag / View / Link و اینرسی حرکت.
- **پاپ‌آپ View look** با بزرگ‌شدن FLIP از جای مدل روی صحنه، پین‌های شماره‌دار و تولتیپ شیشه‌ای.
- **پنل In this look** با انتخاب سایز (قرص‌های S/L/M/XL و ۴۰–۴۶)، افزودن تک‌پوش، حالت‌های loading/added و انیمیشن تیک.
- **Add full look to bag** با پیام «Pick a size for: …»، تکمیل تدریجی و حالت نهایی «Full look in your bag».
- **سبد استایل محلی** در `localStorage` (کلید `runway-styling-bag-v3`) با دیالوگ، شمارنده، حذف آیتم، جمع مرجع و دانلود `runway-outfit-shortlist.txt`.
- **شیت سایز پایین صفحه** در موبایل (منتقل‌شده به `body` تا ترنسفورم‌های قالب آن را نشکند).
- **دسترس‌پذیری:** live region، `aria-current` روی تیک‌ها، `aria-expanded` روی دکمه‌های +، فوکوس‌های visible، احترام کامل به `prefers-reduced-motion`.

## نکات

- قیمت باندل (`$547.00 → $492.30`) صرفاً نمایشی است؛ تخفیف ۱۰٪ در سبد اعمال نمی‌شود و هر قلم با قیمت کامل جمع می‌زند.
- تصاویر مطابق بریف، از دامنه اصلی و با URL مطلق لود می‌شوند (بازآپلود نشده‌اند).
- لینک‌های محصول به فروشگاه Shopify اصلی (`nike-makknzjs.myshopify.com`) اشاره می‌کنند.
- فونت Inter فقط در ناوبری هدر استفاده شده؛ بقیه متن‌ها با `Helvetica, Arial, sans-serif` رندر می‌شوند.
