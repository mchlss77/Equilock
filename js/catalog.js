/* EQUILOCK — фільтри й пошук у каталозі криптовалют.
   Рядки таблиці мають data-tags (категорії) і data-name (назва й тікер).
   Без JS таблиця показує всі монети. */
(() => {
  const form = document.querySelector("[data-catalog-filters]");
  if (!form) return;

  const rows = [...document.querySelectorAll("tbody tr[data-tags]")];
  const empty = document.querySelector("[data-catalog-empty]");
  const count = document.querySelector("[data-catalog-count]");
  const en = document.documentElement.lang.startsWith("en"); // мова сторінки

  const apply = () => {
    const filter = form.elements.filter.value;
    const query = form.elements.q.value.trim().toLowerCase();
    let shown = 0;

    rows.forEach((row) => {
      const byTag = filter === "all" || row.dataset.tags.split(" ").includes(filter);
      const byName = !query || row.dataset.name.includes(query);
      row.hidden = !(byTag && byName);
      if (!row.hidden) shown += 1;
    });

    empty.classList.toggle("hidden", shown > 0);
    count.textContent = en
      ? `Coins shown: ${shown} of ${rows.length}`
      : `Показано монет: ${shown} з ${rows.length}`;
  };

  form.addEventListener("change", apply);
  form.addEventListener("input", apply);
  // Enter у полі пошуку не перезавантажує сторінку
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    apply();
  });
})();
