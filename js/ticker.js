/* EQUILOCK — рядок курсів у шапці (<aside data-ticker>).
   Ті самі дані, що й у віджетах курсів, — CoinGecko Simple Price API, але одним запитом
   на всі пари (менше ризик ліміту запитів). Показує ціну й зміну за 24 год.
   Пара задається на <li>: data-ticker-coin (id у CoinGecko), data-ticker-vs (валюта),
   data-ticker-digits (знаків після коми). Незалежний від інших скриптів — можна підключати на будь-якій сторінці.

   ЗАПИТИ Й КЕШ. Скрипт підключений на всіх 24 сторінках, тому раніше кожен перехід між
   сторінками давав новий запит — безплатний CoinGecko швидко відповідав 429, а в консолі
   на кожну таку відповідь з'являлася ще й помилка CORS (на 429 немає заголовків
   Access-Control-Allow-Origin). Тепер:
   - курси зберігаються в localStorage і малюються з кешу одразу, без мерехтіння «—»;
   - запит іде не частіше ніж раз на 60 с на весь сайт, а не на сторінку;
   - після невдачі діє та сама пауза 60 с — повторного запиту одразу немає,
     на екрані лишається останній відомий курс.
   Помилку самого запиту (429 або CORS) браузер пише в консоль сам, і з JS її не прибрати;
   прибрати можна лише сам запит — цим і займається кеш. */
(() => {
  const ticker = document.querySelector("[data-ticker]");
  if (!ticker) return;
  // Копія списку для безшовного бігу рядка на mobile (css/style.css, розділ 8).
  // Читачі екрана її не чують; ціни в ній оновлюються разом з оригіналом
  const list = ticker.querySelector("ul");
  if (list) {
    const copy = list.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    list.after(copy);
  }
  const items = [...ticker.querySelectorAll("[data-ticker-coin]")];
  const status = ticker.querySelector("[data-ticker-status]");
  const API = "https://api.coingecko.com/api/v3/simple/price";
  const CACHE_KEY = "equilock:ticker";
  const MIN_INTERVAL = 60000; // мінімальна пауза між запитами, мс

  // Мова сторінки (<html lang>): формат чисел і тексти стану
  const en = document.documentElement.lang.startsWith("en");
  const locale = en ? "en-US" : "uk-UA";

  const unique = (key) => [...new Set(items.map((li) => li.dataset[key]))].join(",");
  const url =
    `${API}?ids=${unique("tickerCoin")}&vs_currencies=${unique("tickerVs")}` +
    "&include_24hr_change=true&include_last_updated_at=true";

  const percent = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

  // localStorage може бути недоступним (приватний режим, заблоковані дані сайту) —
  // тоді скрипт просто працює без кешу, як раніше
  const readCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : null;
      return cache && typeof cache === "object" ? cache : null;
    } catch {
      return null;
    }
  };

  const writeCache = (patch) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), ...patch }));
    } catch {
      /* кеш не обов'язковий — мовчки живемо без нього */
    }
  };

  // Малює ціни й зміни. Повертає кількість заповнених пар і час даних
  const render = (data) => {
    let updatedAt = 0;
    let shown = 0;
    items.forEach((li) => {
      const { tickerCoin: coin, tickerVs: vs, tickerDigits: digits } = li.dataset;
      const row = data[coin] ?? {};
      const price = row[vs];
      const change = row[`${vs}_24h_change`];
      if (typeof price !== "number" || !Number.isFinite(price)) return; // лишається «—»

      li.querySelector("[data-ticker-price]").textContent = new Intl.NumberFormat(locale, {
        minimumFractionDigits: Number(digits),
        maximumFractionDigits: Number(digits),
      }).format(price);

      const changeEl = li.querySelector("[data-ticker-change]");
      if (typeof change === "number" && Number.isFinite(change)) {
        changeEl.textContent = `${percent.format(change)}%`;
        // Колір зміни: зелений — зростання, червоний — падіння, сірий — без змін
        changeEl.classList.remove("text-muted", "text-success", "text-danger");
        changeEl.classList.add(change > 0 ? "text-success" : change < 0 ? "text-danger" : "text-muted");
      }
      updatedAt = Math.max(updatedAt, row.last_updated_at ?? 0);
      shown += 1;
    });
    return { shown, updatedAt };
  };

  const setStatus = (text) => {
    status.textContent = text;
    ticker.title = text;
  };

  const showRates = (data, fetchedAt) => {
    const { shown, updatedAt } = render(data);
    if (!shown) throw new Error("Немає курсів у відповіді");
    const stamp = updatedAt ? updatedAt * 1000 : fetchedAt;
    const time = clock.format(new Date(stamp));
    setStatus(
      en
        ? `CoinGecko rates, updated at ${time}. Change over 24 hours.`
        : `Курси CoinGecko, оновлено о ${time}. Зміна — за 24 години.`,
    );
  };

  const cache = readCache();

  // 1. Є збережені курси — показуємо одразу, не чекаючи мережі
  if (cache?.data) {
    try {
      showRates(cache.data, cache.at);
    } catch (err) {
      console.warn("Рядок курсів, кеш:", err);
    }
  }

  // 2. Чи є сенс стукати в API. Пауза однакова і після успіху, і після помилки:
  //    у першому випадку дані ще свіжі, у другому — не добиваємо API повторним запитом
  const lastAttempt = Math.max(cache?.at ?? 0, cache?.failedAt ?? 0);
  if (Date.now() - lastAttempt < MIN_INTERVAL) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  ticker.setAttribute("aria-busy", "true");

  fetch(url, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const at = Date.now();
      showRates(data, at);
      writeCache({ data, at, failedAt: 0 });
    })
    .catch((err) => {
      console.warn("Рядок курсів:", err);
      writeCache({ failedAt: Date.now() }); // пауза перед наступною спробою
      // На екрані лишається останній відомий курс; «недоступні» пишемо лише якщо кешу немає
      if (!cache?.data) {
        setStatus(en ? "Rates are temporarily unavailable." : "Курси тимчасово недоступні.");
      }
    })
    .finally(() => {
      clearTimeout(timer);
      ticker.setAttribute("aria-busy", "false");
    });
})();
