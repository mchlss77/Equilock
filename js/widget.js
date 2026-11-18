/* EQUILOCK — калькулятор комісії escrow-угоди (<section id="fee-calc"> на index.html).
   Live-розрахунок: кнопки немає, перерахунок іде на кожну подію input/change у формі.

   ФОРМУЛА ПО КРОКАХ
   1. Базова ставка за типом угоди:   P2P → 1% (0.01), OTC → 0.6% (0.006)
   2. Якщо увімкнено страхування:     ставка += 0.3% (0.003)
   3. Комісія в USDT:                 сума × ставка, але не менше мінімальної — 1 USDT
                                      комісія_USDT = max(сума × ставка, 1)
   4. Комісія в UAH:                  комісія_USDT × курс
   5. До сплати в USDT:               сума + комісія_USDT
   6. До сплати в UAH:                до_сплати_USDT × курс
   7. На екран — із округленням до 2 знаків (Intl, локаль сторінки).

   Округлення — ТІЛЬКИ при виводі. Сама комісія рахується з повного значення суми,
   тому копійки не губляться в сумі до сплати: 100.555 → комісія 1,01, до сплати 101,56
   (а не 100,56 + 1,01). Кейс 6 у qa-log.md.

   ВАЛІДАЦІЯ кожного поля перед розрахунком: порожнє значення, не число (разом з Infinity),
   нуль, мінус і вихід за межі діапазону. Поки хоч одне поле невалідне, у результаті стоять
   прочерки — на екран не потрапляє ні NaN, ні Infinity, ні undefined, ні від'ємна сума. */
(() => {
  const form = document.getElementById("fee-form");
  if (!form) return; // сторінка без калькулятора — скрипт просто не працює, без шуму в консолі

  // Елемент за id. Форма є, а елемента немає — це зламана розмітка:
  // попередження в консоль і вихід, замість TypeError на null
  const pick = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`Калькулятор комісії: не знайдено елемент #${id}`);
    return el;
  };

  const els = {
    amount: pick("fee-amount"),
    rate: pick("fee-rate"),
    type: pick("fee-type"),
    insurance: pick("fee-insurance"),
    amountError: pick("fee-amount-error"),
    rateError: pick("fee-rate-error"),
    typeError: pick("fee-type-error"),
    commissionUsdt: pick("fee-commission-usdt"),
    commissionUah: pick("fee-commission-uah"),
    totalUsdt: pick("fee-total-usdt"),
    totalUah: pick("fee-total-uah"),
  };
  if (Object.values(els).some((el) => !el)) return; // попередження вже виведені вище

  const LIMITS = {
    amount: { min: 10, max: 1000000 },
    rate: { min: 1, max: 1000 },
  };
  const BASE_RATE = { p2p: 0.01, otc: 0.006 }; // ключі = value у <option>
  const INSURANCE_RATE = 0.003;
  const MIN_COMMISSION = 1; // USDT
  const DASH = "—";

  // Мова сторінки (<html lang>) — як у решти скриптів проєкту
  const en = document.documentElement.lang.startsWith("en");
  const money = new Intl.NumberFormat(en ? "en-US" : "uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const TEXTS = en
    ? {
        amount: {
          empty: "Enter the amount",
          notNumber: "Enter a number",
          range: "Amount — from 10 to 1,000,000 USDT",
        },
        rate: { empty: "Enter the rate", notNumber: "Enter a number", range: "Rate — from 1 to 1,000 UAH" },
        type: "Select the deal type",
      }
    : {
        amount: {
          empty: "Введіть суму",
          notNumber: "Введіть число",
          range: "Сума — від 10 до 1 000 000 USDT",
        },
        rate: { empty: "Введіть курс", notNumber: "Введіть число", range: "Курс — від 1 до 1000 UAH" },
        type: "Виберіть тип угоди",
      };

  /* --- чисті функції: лише числа, жодного доступу до DOM --- */

  // Рядок з поля → { value } або { error }. Поля — type="text" + inputmode="decimal":
  // type="number" мовчки очищав «41,5» і «1 000» до "" (українська клавіатура телефона
  // має лише кому), і користувач бачив «Введіть курс», хоча курс ввів. Тому тут:
  // прибираємо пробіли розрядів (звичайні й нерозривні), одну кому вважаємо десятковою
  // крапкою, а далі приймаємо лише запис «цифри[.цифри]» зі знаком — без 1e3, 0x10 і Infinity.
  // Порожнє ловимо першим: Number("") дає 0
  const NUMBER_FORMAT = /^[+-]?(\d+\.?\d*|\.\d+)$/;

  const readNumber = (raw, { min, max }, texts) => {
    const text = String(raw).replace(/\s/g, "").replace(",", ".");
    if (!text) return { error: texts.empty };
    if (!NUMBER_FORMAT.test(text)) return { error: texts.notNumber };
    const value = Number(text);
    if (!Number.isFinite(value)) return { error: texts.notNumber };
    if (value < min || value > max) return { error: texts.range };
    return { value };
  };

  const feeRate = (type, insured) => BASE_RATE[type] + (insured ? INSURANCE_RATE : 0);

  const calculate = ({ amount, rate, type, insured }) => {
    const commissionUsdt = Math.max(amount * feeRate(type, insured), MIN_COMMISSION);
    const totalUsdt = amount + commissionUsdt;
    return {
      commissionUsdt,
      commissionUah: commissionUsdt * rate,
      totalUsdt,
      totalUah: totalUsdt * rate,
    };
  };

  /* --- вивід --- */

  // Остання перешкода перед екраном: число показуємо лише скінченне й невід'ємне
  const show = (value) => (Number.isFinite(value) && value >= 0 ? money.format(value) : DASH);

  // Рамка поля: червона, поки є помилка. У готовому css/tailwind.css є лише border-danger,
  // тому focus:border-primary треба саме зняти — інакше у фокусі рамка знову синіє
  // і помилку не видно. Повертаємо класи назад, щойно поле виправили
  const VALID_BORDER = ["border-line", "focus:border-primary"];

  const setError = (input, errorEl, message) => {
    // Поки поле у фокусі, помилку не показуємо: «5» на шляху до «50» — ще не помилка,
    // і червоніти на півслові було б неприємно. Зворотний зв'язок усе одно є —
    // у результаті стоять прочерки. Текст і рамка з'являються, коли поле лишають
    // (слухач focusout нижче знову запускає розрахунок)
    if (message && document.activeElement === input) message = "";

    errorEl.textContent = message ?? "";
    if (message) {
      input.classList.remove(...VALID_BORDER);
      input.classList.add("border-danger");
      input.setAttribute("aria-invalid", "true");
    } else {
      input.classList.remove("border-danger");
      input.classList.add(...VALID_BORDER);
      input.removeAttribute("aria-invalid");
    }
  };

  const outputs = [els.commissionUsdt, els.commissionUah, els.totalUsdt, els.totalUah];

  // Блок результату — жива область (aria-live), а розрахунок іде на кожне натискання клавіші.
  // Без цього читач екрана озвучував би всі чотири суми на кожну набрану цифру. Поки триває
  // набір, тримаємо aria-busy="true" — читач чекає й озвучує один раз, коли набір спинився
  const liveRegion = els.commissionUsdt.closest("[aria-live]");
  let quietTimer = 0;

  const holdAnnouncement = () => {
    if (!liveRegion) return;
    liveRegion.setAttribute("aria-busy", "true");
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => liveRegion.setAttribute("aria-busy", "false"), 700);
  };

  const recalculate = () => {
    holdAnnouncement();
    const amount = readNumber(els.amount.value, LIMITS.amount, TEXTS.amount);
    const rate = readNumber(els.rate.value, LIMITS.rate, TEXTS.rate);
    const type = els.type.value in BASE_RATE ? { value: els.type.value } : { error: TEXTS.type };

    setError(els.amount, els.amountError, amount.error);
    setError(els.rate, els.rateError, rate.error);
    setError(els.type, els.typeError, type.error);

    // Невалідне хоч одне поле — прочерки в усіх чотирьох рядках, без часткових результатів
    if (amount.error || rate.error || type.error) {
      outputs.forEach((el) => {
        el.textContent = DASH;
      });
      return;
    }

    const result = calculate({
      amount: amount.value,
      rate: rate.value,
      type: type.value,
      insured: els.insurance.checked,
    });

    els.commissionUsdt.textContent = show(result.commissionUsdt);
    els.commissionUah.textContent = show(result.commissionUah);
    els.totalUsdt.textContent = show(result.totalUsdt);
    els.totalUah.textContent = show(result.totalUah);
  };

  // Два слухачі на всю форму (делегування) замість слухача на кожне поле:
  // скільки б подій не йшло підряд, нові слухачі не з'являються — кейс 9 у qa-log.md.
  // Розрахунок синхронний і без побічних ефектів, тому подвійний виклик (input + change
  // на select і checkbox) дає той самий результат, а вивід завжди відповідає останньому стану полів
  form.addEventListener("input", recalculate);
  form.addEventListener("change", recalculate);
  // Поле лишили — саме тут показуємо помилку, яку притримали під час набору.
  // focusout, а не blur: blur не піднімається до форми, тому делегування з ним не працює
  form.addEventListener("focusout", recalculate);

  recalculate(); // перший розрахунок — зі значеннями за замовчуванням у розмітці
})();
