# AUDIT — EQUILOCK, головна сторінка (Lighthouse, Mobile)

- **Джерело:** `audit/lighthouse-before.json.json` (файл має подвійне розширення `.json.json`)
- **URL:** https://equilock-lovat.vercel.app/
- **Пристрій:** Mobile (емуляція Lighthouse, throttling за замовчуванням)
- **Дата звіту:** 2026-11-18, 14:00 UTC
- **Стан коду:** «до» — код не змінювався, лише аналіз

---

## 1. Оцінки «до»

| Категорія | Оцінка |
|-----------|:------:|
| Performance | **95** |
| Accessibility | **94** |
| Best Practices | **96** |
| SEO | **91** |

### Ключові метрики

| Метрика | Значення | Оцінка метрики | Поріг «добре» (Lighthouse) |
|---------|:--------:|:--------------:|:-------------------------:|
| FCP — First Contentful Paint | **2.2 s** | 0.78 (жовта зона) | ≤ 1.8 s |
| LCP — Largest Contentful Paint | **2.5 s** | 0.90 (межа зеленої) | ≤ 2.5 s |
| CLS — Cumulative Layout Shift | **0.005** | 1.00 | ≤ 0.1 |
| TBT — Total Blocking Time | **0 ms** | 1.00 | ≤ 200 ms |

Додатково: Speed Index 2.2 s, Time to Interactive 2.5 s, загальна вага сторінки 1 401 KiB,
DOM — 810 елементів. LCP-елемент — hero-зображення (`section.border-b img.aspect-[4/3]`);
для нього вже стоять `fetchpriority="high"` і eager-завантаження, TTFB — 28 ms, тож
LCP гальмують не сервер і не саме зображення, а **render-blocking CSS** перед першим малюванням.

---

## 2. Зауваження

Пріоритет: **High** — впливає на оцінку категорії / метрику або порушує WCAG;
**Medium** — помітна економія ресурсів чи надійності; **Low** — косметика, мала економія.

### Performance

| Категорія | Проблема | Пріоритет | Причина | Рішення | Файл |
|-----------|----------|:---------:|---------|---------|------|
| Performance | Render-blocking ресурси, оцінна економія **870 ms** (головна причина FCP 2.2 s) | High | У `<head>` синхронно підключено 5 таблиць стилів, дві з них — зі стороннього домену jsDelivr (`swiper-bundle.min.css` −782 ms, `fancybox.css` −150 ms), плюс `all.min.css` Font Awesome (−450 ms) і `js/theme.js` без `defer` | Стилі Swiper і Fancybox потрібні лише слайдеру нижче першого екрана — завантажувати їх неблокуюче (`media="print" onload="this.media='all'"` або вставляти разом із JS слайдера); `theme.js` лишити синхронним (він крихітний, 1.1 KiB, і запобігає спалаху теми) | `index.html` (рядки 18–35) |
| Performance | Невикористаний CSS Font Awesome: **22 KiB із 22.8 KiB** (97 %) | High | Підключено повний `all.min.css` (усі ~2 000 іконок і три набори), а на сторінці використовується кілька десятків іконок | Залишити лише потрібні набори (`fontawesome.min.css` + `solid.min.css` + `brands.min.css`, без `regular`), або перейти на inline-SVG / SVG-спрайт для використаних іконок | `index.html:25`, `assets/vendor/fontawesome/css/all.min.css` |
| Performance | Зображення слайдера в PNG 1200×800, а показуються 760×507: оцінна економія **467 KiB** | High | `step1.png`…`step5.png` (~150 KiB кожен) віддаються в одному розмірі без WebP і без `srcset`; для hero, карти й відео-прев'ю в проєкті вже є WebP-версії 640/960/1280, а для слайдера — ні | Згенерувати `step*-640.webp` / `step*-1280.webp`, у `<img>` додати `srcset` + `sizes`; у посиланні Fancybox (`href`) можна лишити більший файл | `index.html:453–474`, `assets/images/step*.png` |
| Performance | Відео-прев'ю завантажується в 1280 px при показі 756×425 (економія 15.5 KiB) | Low | `sizes="(min-width: 1056px) 992px, calc(100vw - 32px)"` не враховує, що фрейм вужчий за контейнер (відступи картки) | Уточнити `sizes` під реальну ширину фрейму або додати проміжний варіант 960w | `index.html:505–507` |
| Performance | Font display: іконкові шрифти блокують текст (оцінна економія **140 ms**) | Medium | У `all.min.css` для `fa-solid-900`, `fa-regular-400`, `fa-brands-400` прописано `font-display: block` | Замінити на `font-display: swap` (або `optional`) у локальній копії CSS; прибрати `fa-regular-400`, якщо regular-іконки не потрібні | `assets/vendor/fontawesome/css/all.min.css` |
| Performance | Невикористаний JavaScript: **52 KiB** (Fancybox 32 KiB, Swiper 21 KiB) | Medium | Бібліотеки завантажуються й виконуються при старті сторінки, хоча слайдер — у середині сторінки, а Fancybox потрібен лише після кліку по скріну; Swiper — найдорожчий скрипт за bootup (620 ms загалом, 102 ms скриптингу) | Підключити Swiper/Fancybox з `defer`; ініціалізувати слайдер через `IntersectionObserver`, коли секція наближається до вʼюпорту; Fancybox — динамічно при першому кліку | `index.html:1607–1610`, `js/gallery.js` |
| Performance | Короткий термін кешування CDN-ресурсів (економія 8 KiB при повторних візитах) | Low | Посилання на діапазони версій `swiper@11` і `@fancyapps/ui@5.0` — jsDelivr віддає їх із коротким `Cache-Control`, бо вміст за таким URL може змінитися | Закріпити точні версії (`swiper@11.x.y`, `@fancyapps/ui@5.0.x`) — тоді CDN кешує на рік; як у `typed.js@2.1.0`, що вже закріплений | `index.html:28–29, 1607–1608` |
| Performance | Немає `preconnect` до `cdn.jsdelivr.net` | Low | Сторонній домен із render-blocking CSS: DNS + TLS-зʼєднання відбувається вже на критичному шляху | Додати `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>` — або, краще, перенести Swiper/Fancybox у `assets/vendor/` (як уже зроблено з Font Awesome), щоб прибрати сторонній домен з критичного шляху | `index.html` (`<head>`) |
| Performance | Немініфікований `style.css` (економія 3.8 KiB із 6.6 KiB) | Low | Файл відданий як є, з коментарями й відступами; збирання в проєкті немає | Додати мініфіковану копію (`style.min.css`) і підключати її; або обʼєднати з `tailwind.css`, щоб на один блокуючий запит менше | `css/style.css`, `index.html:32` |

### Accessibility

| Категорія | Проблема | Пріоритет | Причина | Рішення | Файл |
|-----------|----------|:---------:|---------|---------|------|
| Accessibility | Недостатній контраст бейджів кроків «01 / 04»…«04 / 04»: **4.01 : 1** при потрібних 4.5 : 1 (4 елементи) | High | Колір `text-primary` (#6366f1) на темному тлі картки #14171f при розмірі `text-3xs` (10 px) — дрібний текст вимагає 4.5 : 1. `aria-hidden="true"` не звільняє від перевірки — текст бачать зрячі користувачі | Для бейджів у темній темі використати світліший відтінок (`text-primary-light` / indigo-300, ≈ 8 : 1), або збільшити розмір і жирність. Перевірити й світлу тему | `index.html:417, 422, 427, 432` |
| Accessibility | Точки пагінації Swiper — **8×8 px** при мінімумі 24×24 px (5 елементів) | High | Стандартні `.swiper-pagination-bullet` Swiper 11 мають 8 px і відступ 4 px; у `style.css` перевизначено лише кольори, а не розмір. На мобільному в них важко влучити | Збільшити клікабельну зону до ≥ 24×24 px через змінні `--swiper-pagination-bullet-size` / `--swiper-pagination-bullet-horizontal-gap` або прозорий `padding` / псевдоелемент, залишивши видиму точку маленькою | `css/style.css` (~рядок 440) |

### SEO

| Категорія | Проблема | Пріоритет | Причина | Рішення | Файл |
|-----------|----------|:---------:|---------|---------|------|
| SEO | Невалідний `hreflang` — єдиний провалений аудит SEO (91 → 100 після виправлення) | High | `<link rel="alternate" hreflang="…">` використовують **відносні** URL (`index.html`, `en/index.html`, `../index.html`), а Google вимагає абсолютні; також немає `hreflang="x-default"` | Вказати повні адреси: `https://equilock-lovat.vercel.app/` і `https://equilock-lovat.vercel.app/en/`, додати `x-default`; зробити так само на всіх 24 сторінках (12 UA + 12 EN) | `index.html:14–15`, `en/index.html:14–15` та `<head>` решти сторінок |
| SEO | Немає `<link rel="canonical">` | Low | Сторінка доступна і як `/`, і як `/index.html` — без canonical пошуковик може вважати це дублікатами | Додати абсолютний `canonical` на кожну сторінку разом із виправленням `hreflang` | `index.html` (`<head>`), усі сторінки |

### Best Practices

| Категорія | Проблема | Пріоритет | Причина | Рішення | Файл |
|-----------|----------|:---------:|---------|---------|------|
| Best Practices | Логотип у шапці має замалу роздільність для екрана мобільного (єдиний провалений аудит категорії) | Medium | `logo-mark.webp` має 58×60 px, показується 28×28 CSS px; на мобільному з DPR 2.625 потрібно ≈ 74 px, тож знак розмитий. Файл ще й неквадратний (58×60) при квадратних `width/height` | Експортувати квадратний `logo-mark.webp` 84×84 px (3×) або додати `srcset` з 1x/2x/3x; найкраще — SVG-логотип | `index.html:94` (і футер, ~1490), `assets/icons/logo-mark.webp` |
| Best Practices | Немає Content-Security-Policy (інформаційний аудит, без впливу на оцінку) | Low | Статичний хостинг на Vercel без заголовків безпеки; сторінка тягне скрипти з jsDelivr і робить запит до api.coingecko.com | Додати `vercel.json` з `Content-Security-Policy` (`script-src 'self' https://cdn.jsdelivr.net`, `connect-src 'self' https://api.coingecko.com`, …) і `Subresource Integrity` (`integrity="sha384-…"`) для CDN-скриптів | новий `vercel.json`, `index.html:28–29, 1607–1609` |

### JavaScript

Lighthouse не знайшов помилок у консолі, застарілих API, легасі-поліфілів і примусових перерахунків
макета (forced reflow). Зауваження нижче — з огляду коду `js/` разом із даними звіту.

| Категорія | Проблема | Пріоритет | Причина | Рішення | Файл |
|-----------|----------|:---------:|---------|---------|------|
| JavaScript | Swiper, Fancybox і Typed.js підключені синхронно, без `defer` | Medium | Три `<script>` наприкінці `<body>` без `defer`: браузер завантажує й виконує їх послідовно до `DOMContentLoaded`, через це пізніше стартують `widget.js`, `ticker.js` та інші `defer`-скрипти | Додати `defer` усім чотирьом (`swiper`, `fancybox`, `typed`, `gallery.js`) — порядок виконання збережеться, а `gallery.js` і так чекає `DOMContentLoaded` | `index.html:1607–1610` |
| JavaScript | `gallery.js` падає, якщо CDN недоступний | Medium | `new Swiper(...)`, `Fancybox.bind(...)`, `new Typed(...)` викликаються без перевірки, що бібліотека завантажилась; при збої jsDelivr / блокувальнику — `ReferenceError` у консолі і решта функцій файлу (Typed) не запускається | Обгорнути кожну ініціалізацію перевіркою `typeof Swiper !== 'undefined'` тощо (або `try/catch` з `console.warn`), як це вже зроблено в `widget.js` | `js/gallery.js:4, 20, 31` |
| JavaScript | Автопрокрутка слайдера ігнорує `prefers-reduced-motion` | Medium | Для Typed.js перевірка «менше анімації» є, а `autoplay` Swiper (кожні 2.5 s, `loop: true`) запускається завжди; це також порушує WCAG 2.2.2 (рух > 5 s без можливості паузи, окрім наведення мишею) | Вмикати `autoplay` лише коли `reduceMotion === false` (змінна вже є у файлі — винести вище); розглянути кнопку паузи | `js/gallery.js:4–18` |
| JavaScript | Важка ініціалізація слайдера на старті | Low | Swiper — найдорожчий скрипт у bootup-time (620 ms загального часу головного потоку на мобільному), хоча секція далеко нижче першого екрана; TBT зараз 0 ms, але на слабших пристроях це перший кандидат | Ледача ініціалізація через `IntersectionObserver` (див. «Невикористаний JavaScript» у Performance) | `js/gallery.js` |
| JavaScript | Калькулятор перераховує 2–3 рази на одну дію | Low | Слухачі `input`, `change` і `focusout` на формі: зміна `<select>`/checkbox викликає `input` + `change`, вихід із поля — ще `focusout` | Свідоме рішення (див. коментар у коді й qa-log, кейс 9): розрахунок синхронний і дешевий, результат однаковий — змін не потребує, зафіксовано для повноти | `js/widget.js:189–193` |

---

## 3. Підсумок і пріоритет виправлень

| Пріоритет | Кількість | Що дасть |
|-----------|:---------:|----------|
| High | 6 | Render-blocking CSS + Font Awesome + зображення слайдера → FCP/LCP; контраст і розмір точок → Accessibility 100; `hreflang` → SEO 100 |
| Medium | 6 | `font-display`, невикористаний JS, логотип (Best Practices 100), надійність і доступність `gallery.js` |
| Low | 7 | Дрібна економія трафіку, кешування, canonical, CSP |

Рекомендований порядок: 1) `hreflang` і контраст / точки пагінації — дешево і одразу піднімають
SEO та Accessibility; 2) неблокуюче завантаження CSS слайдера і скорочення Font Awesome — головний
внесок у FCP; 3) WebP + `srcset` для `step*.png` — найбільша економія трафіку; 4) решта.
