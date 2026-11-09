/* EQUILOCK — рядок курсів у шапці (<aside data-ticker>).
   Ті самі дані, що й у віджетах курсів, — CoinGecko Simple Price API, але одним запитом
   на всі пари (менше ризик ліміту запитів). Показує ціну й зміну за 24 год.
   Пара задається на <li>: data-ticker-coin (id у CoinGecko), data-ticker-vs (валюта),
   data-ticker-digits (знаків після коми). Незалежний від інших скриптів — можна підключати на будь-якій сторінці. */
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  ticker.setAttribute("aria-busy", "true");

  fetch(url, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
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
      if (!shown) throw new Error("Немає курсів у відповіді");
      const time = updatedAt ? clock.format(new Date(updatedAt * 1000)) : clock.format(new Date());
      status.textContent = en
        ? `CoinGecko rates, updated at ${time}. Change over 24 hours.`
        : `Курси CoinGecko, оновлено о ${time}. Зміна — за 24 години.`;
    })
    .catch((err) => {
      console.warn("Рядок курсів:", err);
      status.textContent = en ? "Rates are temporarily unavailable." : "Курси тимчасово недоступні.";
    })
    .finally(() => {
      clearTimeout(timer);
      ticker.setAttribute("aria-busy", "false");
      ticker.title = status.textContent;
    });
})();
