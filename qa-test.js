/* EQUILOCK — автотест калькулятора комісії (ЛР №11). НЕ підключається до сторінки:
   це інструмент QA, який вставляють у консоль Chrome на index.html.

   Проганяє 3 Happy Path і 10 кейсів із qa-log.md: сам ставить значення в поля,
   кидає події input/change, наприкінці повертає форму в початковий стан
   і виводить console.table: № | ввід | очікувано | фактично | OK/FAIL.

   Очікувані числа — з qa-log.md. Порівняння числове (текст з екрана парситься назад),
   щоб тест не залежав від локалі: uk-UA дає «41 915,00» — нерозривний пробіл і кому. */
(() => {
  const id = (name) => document.getElementById(name);
  const els = {
    amount: id("fee-amount"),
    rate: id("fee-rate"),
    type: id("fee-type"),
    insurance: id("fee-insurance"),
    amountError: id("fee-amount-error"),
    rateError: id("fee-rate-error"),
    typeError: id("fee-type-error"),
    commissionUsdt: id("fee-commission-usdt"),
    commissionUah: id("fee-commission-uah"),
    totalUsdt: id("fee-total-usdt"),
    totalUah: id("fee-total-uah"),
  };
  const missing = Object.entries(els).filter(([, el]) => !el).map(([key]) => key);
  if (missing.length) {
    console.error("QA: на сторінці немає елементів калькулятора:", missing.join(", "));
    return;
  }

  const DASH = "—";
  const OUTPUTS = ["commissionUsdt", "commissionUah", "totalUsdt", "totalUah"];
  const money = new Intl.NumberFormat(document.documentElement.lang.startsWith("en") ? "en-US" : "uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Початковий стан форми — щоб повернути все як було
  const snapshot = {
    amount: els.amount.value,
    rate: els.rate.value,
    type: els.type.value,
    insured: els.insurance.checked,
  };

  /* --- дії над формою --- */

  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));

  const put = (el, value) => {
    el.value = String(value);
    fire(el, "input");
    fire(el, "change");
  };

  const check = (el, value) => {
    el.checked = Boolean(value);
    fire(el, "input");
    fire(el, "change");
  };

  const setState = ({ amount, rate, type, insured }) => {
    if (amount !== undefined) put(els.amount, amount);
    if (rate !== undefined) put(els.rate, rate);
    if (type !== undefined) put(els.type, type);
    if (insured !== undefined) check(els.insurance, insured);
  };

  /* --- читання екрана --- */

  const BAD = /NaN|Infinity|undefined|e\+|^-/;
  const polluted = []; // усе «погане», що встигло з'явитися на екрані за весь прогін

  const read = () => {
    const texts = OUTPUTS.map((key) => els[key].textContent.trim());
    texts.forEach((text, i) => {
      if (BAD.test(text)) polluted.push(`${OUTPUTS[i]}: "${text}"`);
    });
    return texts;
  };

  const toNumber = (text) => Number(text.replace(/\s/g, "").replace(",", "."));
  const round2 = (value) => Math.round(value * 100) / 100;

  // Числовий результат: порівнюємо з очікуваним, округленим до 2 знаків
  const expectNumbers = (expected) => {
    const texts = read();
    const ok = expected.every((value, i) => Math.abs(toNumber(texts[i]) - round2(value)) < 0.005);
    return { ok, actual: texts.join(" / ") };
  };

  // Невалідний ввід: усі чотири рядки — прочерк, під полем є текст помилки
  const expectDashes = (errorKey) => {
    const texts = read();
    const message = els[errorKey].textContent.trim();
    return {
      ok: texts.every((text) => text === DASH) && message.length > 0,
      actual: `${texts.join(" / ")} · помилка: "${message || "немає"}"`,
    };
  };

  const expectedText = (values) => values.map((value) => money.format(round2(value))).join(" / ");

  /* --- кейси: 3 Happy Path + 10 із тест-плану --- */

  const cases = [
    {
      no: "HP1",
      input: "1000 / 41.5 / P2P / без страхування",
      expected: [10, 415, 1010, 41915],
      run() {
        setState({ amount: 1000, rate: 41.5, type: "p2p", insured: false });
        return expectNumbers(this.expected);
      },
    },
    {
      no: "HP2",
      input: "5000 / 41.5 / OTC / зі страхуванням",
      expected: [45, 1867.5, 5045, 209367.5],
      run() {
        setState({ amount: 5000, rate: 41.5, type: "otc", insured: true });
        return expectNumbers(this.expected);
      },
    },
    {
      no: "HP3",
      input: "50 / 41.5 / P2P / без страхування (мінімальна комісія)",
      expected: [1, 41.5, 51, 2116.5],
      run() {
        setState({ amount: 50, rate: 41.5, type: "p2p", insured: false });
        return expectNumbers(this.expected);
      },
    },
    {
      no: 1,
      input: "валідне число: сума 1000, курс 41.5, P2P, без страхування",
      expected: [10, 415, 1010, 41915],
      run() {
        setState({ amount: 1000, rate: 41.5, type: "p2p", insured: false });
        return expectNumbers(this.expected);
      },
    },
    {
      no: 2,
      input: "порожнє поле суми",
      expectedText: "прочерки + підказка під полем суми",
      run() {
        setState({ amount: "" });
        return expectDashes("amountError");
      },
    },
    {
      no: 3,
      input: "сума 0",
      expectedText: "прочерки + повідомлення про діапазон 10–1 000 000",
      run() {
        setState({ amount: 0 });
        return expectDashes("amountError");
      },
    },
    {
      no: 4,
      input: "сума -500",
      expectedText: "прочерки + помилка, від'ємних сум на екрані немає",
      run() {
        setState({ amount: -500 });
        return expectDashes("amountError");
      },
    },
    {
      no: 5,
      input: "сума 9999999999999999",
      expectedText: "прочерки + «максимум», без 1e+16 на екрані",
      run() {
        setState({ amount: 9999999999999999 });
        return expectDashes("amountError");
      },
    },
    {
      no: 6,
      input: "сума 100.555 (три знаки), 41.5, P2P",
      expected: [1.00555, 41.730325, 101.56055, 4214.762825],
      run() {
        setState({ amount: 100.555, rate: 41.5, type: "p2p", insured: false });
        return expectNumbers(this.expected);
      },
    },
    {
      no: 7,
      input: "зміна select P2P → OTC (1000 / 41.5)",
      expected: [6, 249, 1006, 41749],
      run() {
        setState({ amount: 1000, rate: 41.5, type: "p2p", insured: false });
        put(els.type, "otc");
        return expectNumbers(this.expected);
      },
    },
    {
      no: 8,
      input: "checkbox страхування увімк. → вимк. (1000 / 41.5 / OTC)",
      expected: [6, 249, 1006, 41749],
      expectedText: "увімкнено: 9.00 / 373.50 / 1009.00 / 41 873.50; вимкнено — назад 6.00",
      run() {
        setState({ amount: 1000, rate: 41.5, type: "otc", insured: true });
        const on = expectNumbers([9, 373.5, 1009, 41873.5]);
        check(els.insurance, false);
        const off = expectNumbers(this.expected);
        return { ok: on.ok && off.ok, actual: `увімк.: ${on.actual} · вимк.: ${off.actual}` };
      },
    },
    {
      no: 9,
      input: "50 швидких змін суми/типу/страхування підряд, далі 1000 / 41.5 / P2P / без",
      expected: [10, 415, 1010, 41915],
      run() {
        const started = performance.now();
        for (let i = 0; i < 50; i += 1) {
          put(els.amount, 100 + i);
          put(els.type, i % 2 ? "otc" : "p2p");
          check(els.insurance, i % 3 === 0);
        }
        const ms = Math.round(performance.now() - started);
        setState({ amount: 1000, rate: 41.5, type: "p2p", insured: false });
        const result = expectNumbers(this.expected);
        return { ok: result.ok, actual: `${result.actual} · 150 подій за ${ms} мс` };
      },
    },
    {
      no: 10,
      input: "видалено елемент виводу #fee-total-uah, далі зміна суми на 2000",
      expectedText: "без TypeError, решта рядків оновлюється",
      run() {
        setState({ amount: 1000, rate: 41.5, type: "p2p", insured: false });
        const el = els.totalUah;
        const parent = el.parentNode;
        const next = el.nextSibling;
        el.remove();
        let thrown = null;
        try {
          put(els.amount, 2000);
        } catch (error) {
          thrown = error;
        }
        parent.insertBefore(el, next); // повертаємо на місце
        // решта рядків мусила порахуватися: 2000 / 41.5 / P2P → 20 / 830 / 2020
        const rest = ["commissionUsdt", "commissionUah", "totalUsdt"].map((key) => els[key].textContent.trim());
        const restOk = [20, 830, 2020].every((value, i) => Math.abs(toNumber(rest[i]) - value) < 0.005);
        return {
          ok: !thrown && restOk,
          actual: thrown ? `виняток: ${thrown.name}: ${thrown.message}` : `без винятку · ${rest.join(" / ")}`,
        };
      },
    },
  ];

  /* --- прогін --- */

  const rows = cases.map((item) => {
    let outcome;
    try {
      outcome = item.run();
    } catch (error) {
      outcome = { ok: false, actual: `виняток у тесті: ${error.name}: ${error.message}` };
    }
    return {
      "№": item.no,
      ввід: item.input,
      очікувано: item.expectedText ?? expectedText(item.expected),
      фактично: outcome.actual,
      "OK/FAIL": outcome.ok ? "OK" : "FAIL",
    };
  });

  rows.push({
    "№": "екран",
    ввід: "усі кейси вище",
    очікувано: "ніде немає NaN, Infinity, undefined чи від'ємних сум",
    фактично: polluted.length ? polluted.join("; ") : "чисто",
    "OK/FAIL": polluted.length ? "FAIL" : "OK",
  });

  setState(snapshot); // форма — у початковий стан

  console.table(rows);
  const failed = rows.filter((row) => row["OK/FAIL"] === "FAIL");
  console.log(
    failed.length
      ? `QA: ${failed.length} з ${rows.length} FAIL — ${failed.map((row) => row["№"]).join(", ")}`
      : `QA: усі ${rows.length} перевірки OK`,
  );
  return rows;
})();
