/* EQUILOCK — перемикач теми (темна / світла).
   Підключений у <head> БЕЗ defer: тема ставиться на <html data-theme> ще до відмалювання,
   тож сторінка не «блимає» темною перед світлою. Кольори теми — CSS-змінні в css/style.css.
   Кнопки: [data-theme-value="light|dark"] у групах [data-theme-switch] (шапка й мобільне меню);
   стан для читачів екрана — aria-pressed. Вибір зберігається в localStorage. */
(() => {
  const KEY = "equilock-theme";
  const root = document.documentElement;

  const read = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null; // приватний режим / заблоковане сховище — тема за замовчуванням
    }
  };
  const save = (theme) => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* не зберігаємо — тема діятиме до перезавантаження */
    }
  };

  // Темна — тема дизайн-системи за замовчуванням
  root.dataset.theme = read() === "light" ? "light" : "dark";

  const sync = () =>
    document.querySelectorAll("[data-theme-value]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeValue === root.dataset.theme));
    });

  document.addEventListener("DOMContentLoaded", () => {
    sync();
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-value]");
      if (!button) return;
      root.dataset.theme = button.dataset.themeValue;
      save(root.dataset.theme);
      sync();
    });
  });
})();
