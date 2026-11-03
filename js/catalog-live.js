/* EQUILOCK — живі котирування в каталозі криптовалют (CoinGecko API).
   Рядок таблиці: <tr data-coin="id у CoinGecko">, комірки з data-f="rank|usd|uah|chg|vol|mcap", графік svg[data-f="spark"].
   Показники над таблицею: [data-stat="mcap|vol|leader|usdt"]. Стан: [data-live-status].

   • 3 запити на оновлення: coins/markets (USD, 24h, обсяг, капіталізація, графік 7 днів),
     simple/price (ціни в UAH), global (загальна капіталізація й обсяг ринку).
   • Оновлення щохвилини; коли вкладка прихована — пауза, після повернення — одразу оновлення.
   • При помилці або ліміті запитів (429) лишаються останні дані, інтервал подвоюється (до 5 хв).
   • Фільтр «Лідери зростання» (data-tags="gainers") перераховується за реальною зміною за 24 год. */
(() => {
  const rows = [...document.querySelectorAll("tr[data-coin]")];
  if (!rows.length) return;

  const en = document.documentElement.lang.startsWith("en");
  const T = en
    ? {
        loading: "Loading quotes…",
        updated: (time) => `CoinGecko data · updated at ${time} · refreshes every minute`,
        failed: (sec) => `Couldn't refresh quotes. Showing the last data; next attempt in ${sec} s.`,
        failedEmpty: (sec) => `Couldn't load quotes. Next attempt in ${sec} s.`,
      }
    : {
        loading: "Завантаження котирувань…",
        updated: (time) => `Дані CoinGecko · оновлено о ${time} · оновлюються щохвилини`,
        failed: (sec) => `Не вдалося оновити котирування. Показано останні дані; наступна спроба через ${sec} с.`,
        failedEmpty: (sec) => `Не вдалося завантажити котирування. Наступна спроба через ${sec} с.`,
      };
  const locale = en ? "en-US" : "uk-UA";

  const API = "https://api.coingecko.com/api/v3";
  const ids = rows.map((row) => row.dataset.coin).join(",");
  const status = document.querySelector("[data-live-status]");
  const form = document.querySelector("[data-catalog-filters]");
  const BASE_DELAY = 60_000;
  const MAX_DELAY = 300_000;
  let delay = BASE_DELAY;
  let timer = 0;
  let hasData = false;

  // Формати: ціна в USD — як у таблиці ($77,876.00; дрібні — 4 знаки), UAH — за мовою сторінки
  const usd = (v) =>
    "$" +
    v.toLocaleString("en-US", {
      minimumFractionDigits: v < 1 ? 4 : 2,
      maximumFractionDigits: v < 1 ? 4 : 2,
    });
  const compact = (v) =>
    "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);
  const uah = (v) =>
    v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₴";
  const pct = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}%`;
  const tone = (el, v) => {
    el.classList.remove("text-muted", "text-success", "text-danger");
    el.classList.add(v > 0 ? "text-success" : v < 0 ? "text-danger" : "text-muted");
  };
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

  const getJSON = async (path) => {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${API}${path}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(abort);
    }
  };

  // Графік за 7 днів: 168 погодинних точок → лінія 80×24 (зверху — максимум)
  const sparkline = (svg, prices) => {
    if (!prices?.length) return;
    const min = Math.min(...prices);
    const range = Math.max(...prices) - min || 1;
    const step = 80 / (prices.length - 1);
    const points = prices
      .map((p, i) => `${(i * step).toFixed(1)},${(22 - ((p - min) / range) * 20).toFixed(1)}`)
      .join(" ");
    svg.querySelector("polyline").setAttribute("points", points);
    const trend = prices[prices.length - 1] - prices[0];
    svg.classList.remove("text-muted", "text-success", "text-danger");
    svg.classList.add(trend >= 0 ? "text-success" : "text-danger");
  };

  async function refresh() {
    clearTimeout(timer);
    try {
      const [markets, prices, global] = await Promise.all([
        getJSON(`/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`),
        getJSON(`/simple/price?ids=${ids}&vs_currencies=uah`),
        getJSON("/global"),
      ]);
      if (!Array.isArray(markets) || !markets.length) throw new Error("Порожня відповідь");
      const byId = Object.fromEntries(markets.map((m) => [m.id, m]));
      let leader = null;

      rows.forEach((row) => {
        const m = byId[row.dataset.coin];
        if (!m) return;
        const cell = (f) => row.querySelector(`[data-f="${f}"]`);
        const change = m.price_change_percentage_24h ?? 0;
        if (m.market_cap_rank) cell("rank").textContent = m.market_cap_rank;
        cell("usd").textContent = usd(m.current_price);
        const priceUah = prices[row.dataset.coin]?.uah;
        if (typeof priceUah === "number") cell("uah").textContent = uah(priceUah);
        cell("chg").textContent = pct(change);
        tone(cell("chg"), change);
        cell("vol").textContent = compact(m.total_volume);
        cell("mcap").textContent = compact(m.market_cap);
        sparkline(cell("spark"), m.sparkline_in_7d?.price);

        // «Лідери зростання» — монети, що зросли за 24 год
        const tags = new Set(row.dataset.tags.split(" ").filter(Boolean));
        change > 0 ? tags.add("gainers") : tags.delete("gainers");
        row.dataset.tags = [...tags].join(" ");
        if (!leader || change > leader.change) leader = { symbol: m.symbol.toUpperCase(), change };
      });

      // Порядок рядків — за поточним рангом капіталізації
      const tbody = rows[0].parentElement;
      [...rows]
        .sort((x, y) => (byId[x.dataset.coin]?.market_cap_rank ?? 1e9) - (byId[y.dataset.coin]?.market_cap_rank ?? 1e9))
        .forEach((row) => tbody.append(row));

      const stat = (name) => document.querySelector(`[data-stat="${name}"]`);
      const g = global?.data;
      if (g) {
        stat("mcap").textContent = compact(g.total_market_cap.usd);
        stat("vol").textContent = compact(g.total_volume.usd);
      }
      if (leader) {
        stat("leader").textContent = `${leader.symbol} ${pct(leader.change)}`;
        tone(stat("leader"), leader.change);
      }
      const tetherUah = prices.tether?.uah;
      if (typeof tetherUah === "number") stat("usdt").textContent = `${uah(tetherUah).replace(" ₴", "")} UAH`;

      // Повторно застосувати фільтри (js/catalog.js слухає подію change форми)
      form?.dispatchEvent(new Event("change"));
      hasData = true;
      delay = BASE_DELAY;
      status.textContent = T.updated(clock.format(new Date()));
    } catch (err) {
      console.warn("Котирування каталогу:", err);
      delay = Math.min(delay * 2, MAX_DELAY);
      status.textContent = (hasData ? T.failed : T.failedEmpty)(Math.round(delay / 1000));
    }
    if (!document.hidden) timer = setTimeout(refresh, delay);
  }

  // Пауза у фоновій вкладці: не витрачаємо ліміт запитів, коли сторінку не видно
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearTimeout(timer);
    else refresh();
  });

  status.textContent = T.loading;
  refresh();
})();
