/* EQUILOCK — автотест калькулятора комісії (ЛР №11). НЕ підключається до сторінки:
   це інструмент QA, який вставляють у консоль Chrome на index.html.

   Проганяє 3 Happy Path і 12 кейсів із qa-log.md (10 із тест-плану + 2 на результати Аудиту 4): сам ставить значення в поля,
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

  const INPUTS = ["amount", "rate", "type"];
  const redBordered = () => INPUTS.filter((key) => els[key].classList.contains("border-danger"));

  // Числовий результат: порівнюємо з очікуваним, округленим до 2 знаків.
  // Заразом перевіряємо, що червоної рамки не лишилося ні на одному полі
  const expectNumbers = (expected) => {
    const texts = read();
    const red = redBordered();
    const numbersOk = expected.every((value, i) => Math.abs(toNumber(texts[i]) - round2(value)) < 0.005);
    return {
      ok: numbersOk && red.length === 0,
      actual: texts.join(" / ") + (red.length ? ` · червона рамка лишилась: ${red.join(", ")}` : ""),
    };
  };

  // Невалідний ввід: прочерки в усіх чотирьох рядках, текст помилки під полем
  // і червона рамка саме на цьому полі (не на сусідніх)
  const expectInvalid = (fieldKey) => {
    const texts = read();
    const message = els[`${fieldKey}Error`].textContent.trim();
    const red = redBordered();
    return {
      ok:
        texts.every((text) => text === DASH) &&
        message.length > 0 &&
        red.length === 1 &&
        red[0] === fieldKey,
      actual: `${texts.join(" / ")} · помилка: "${message || "немає"}" · рамка: ${red.join(", ") || "немає"}`,
    };
  };

  const expectedText = (values) => values.map((value) => money.format(round2(value))).join(" / ");

  /* --- кейси: 3 Happy Path + 10 із тест-плану + 2 за Аудитом 4 --- */

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
      expectedText: "прочерки + підказка під полем + червона рамка на полі суми",
      run() {
        setState({ amount: "" });
        return expectInvalid("amount");
      },
    },
    {
      no: 3,
      input: "сума 0",
      expectedText: "прочерки + діапазон 10–1 000 000 + червона рамка",
      run() {
        setState({ amount: 0 });
        return expectInvalid("amount");
      },
    },
    {
      no: 4,
      input: "сума -500",
      expectedText: "прочерки + червона рамка, від'ємних сум на екрані немає",
      run() {
        setState({ amount: -500 });
        return expectInvalid("amount");
      },
    },
    {
      no: 5,
      input: "сума 9999999999999999",
      expectedText: "прочерки + червона рамка, без 1e+16 на екрані",
      run() {
        setState({ amount: 9999999999999999 });
        return expectInvalid("amount");
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
    {
      no: 11,
      input: "поле суми у фокусі, значення 5 (нижче мінімуму), далі вихід із поля",
      expectedText: "у фокусі: прочерки без рамки й тексту; після виходу — рамка й текст помилки",
      run() {
        setState({ amount: 1000, rate: 41.5, type: "p2p", insured: false });
        els.amount.focus();
        put(els.amount, 5);
        const during = { texts: read(), red: redBordered(), msg: els.amountError.textContent.trim() };
        els.amount.blur(); // focusout → розрахунок повторюється і помилку вже показує
        const after = { texts: read(), red: redBordered(), msg: els.amountError.textContent.trim() };
        return {
          ok:
            during.texts.every((text) => text === DASH) &&
            during.red.length === 0 &&
            during.msg === "" &&
            after.texts.every((text) => text === DASH) &&
            after.red.length === 1 &&
            after.red[0] === "amount" &&
            after.msg.length > 0,
          actual:
            `у фокусі: рамка ${during.red.join(", ") || "немає"}, текст "${during.msg}"` +
            ` · після виходу: рамка ${after.red.join(", ") || "немає"}, текст "${after.msg}"`,
        };
      },
    },
    {
      no: 12,
      input: "класи індикатора фокуса на полях",
      expectedText: "focus-visible:ring-2 на всіх трьох полях (контур outline-none прозорий)",
      run() {
        const without = INPUTS.filter((key) => !els[key].classList.contains("focus-visible:ring-2"));
        return {
          ok: without.length === 0,
          actual: without.length ? `рінга немає: ${without.join(", ")}` : "рінг є на всіх трьох полях",
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
