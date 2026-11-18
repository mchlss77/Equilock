/* EQUILOCK — перемикач теми (темна / світла).
   Початкову тему ставить inline-рядок у <head> кожної сторінки (до відмалювання, без спалаху),
   тому цей файл підключено з defer і він лише обслуговує кнопки. Кольори теми — CSS-змінні в css/style.css.
   Кнопки: [data-theme-value="light|dark"] у групах [data-theme-switch] (шапка й мобільне меню);
   стан для читачів екрана — aria-pressed. Вибір зберігається в localStorage. */
(() => {
  const KEY = "equilock-theme";
  const root = document.documentElement;

  const save = (theme) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* не зберігаємо — тема діятиме до перезавантаження */
    }
  };

  const sync = () =>
    document.querySelectorAll("[data-theme-value]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeValue === root.dataset.theme));
    });

  // defer: розмітка вже розібрана — окремий слухач DOMContentLoaded не потрібен
  sync();
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-value]");
    if (!button) return;
    root.dataset.theme = button.dataset.themeValue;
    save(root.dataset.theme);
    sync();
  });
})();
