/* EQUILOCK — пошук угоди на status.html.
   Форми на головній і тут відкривають status.html?deal=EQ-12345.
   Скрипт підсвічує знайдену демо-угоду або пише, що її немає. */
(() => {
  const message = document.querySelector("[data-deal-message]");
  const input = document.getElementById("deal-id");
  if (!message || !input) return;

  // Повідомлення мовою сторінки (<html lang>): українська або англійська версія
  const en = document.documentElement.lang.startsWith("en");

  const raw = new URLSearchParams(location.search).get("deal");
  if (!raw) return;

  // «84920», «eq84920», «#EQ-84920» → «EQ-84920»
  const digits = raw.replace(/\D/g, "");
  const id = `EQ-${digits}`;
  input.value = id;

  const card = digits && document.getElementById(id);
  if (!card) {
    message.className = "mt-4 text-sm text-danger";
    message.textContent = en
      ? `Deal #${id} not found. Check the number or use a demo number.`
      : `Угоду #${id} не знайдено. Перевірте номер або скористайтеся демо-номером.`;
    return;
  }

  card.dataset.found = "";
  message.className = "mt-4 text-sm text-success";
  message.textContent = en
    ? `Deal #${id} found — its card is highlighted below.`
    : `Угоду #${id} знайдено — її картку підсвічено нижче.`;
  card.scrollIntoView({ block: "center" });
})();
