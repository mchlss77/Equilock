/* EQUILOCK — шапка (ЛР №6).
   JS лише перемикає aria-expanded на кнопках. Показ і приховування меню
   робить Tailwind у розмітці через peer-aria-expanded:*, тож стан один — в ARIA.
   Dropdown «Ресурси» необов'язковий: на лендингу (index.html) його немає. */
(() => {
  const header = document.querySelector("[data-header]");
  if (!header) return;

  const burger = header.querySelector('[aria-controls="main-nav"]');
  const dropdown = header.querySelector('[aria-controls="resources-menu"]');
  const dropdownItem = dropdown ? dropdown.parentElement : null;
  const buttons = [dropdown, burger].filter(Boolean);

  const isOpen = (btn) => btn.getAttribute("aria-expanded") === "true";
  const setOpen = (btn, open) =>
    btn.setAttribute("aria-expanded", String(open));

  buttons.forEach((btn) =>
    btn.addEventListener("click", () => setOpen(btn, !isOpen(btn))),
  );

  // Esc: спершу закриває dropdown, потім мобільне меню, і повертає фокус на кнопку
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const btn = buttons.find(isOpen);
    if (!btn) return;
    setOpen(btn, false);
    btn.focus();
  });

  // Клік по будь-якому посиланню в шапці (зокрема якорю) закриває і dropdown, і мобільне меню
  header.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    buttons.forEach((btn) => setOpen(btn, false));
  });

  if (!dropdownItem) return;

  // Dropdown закривається, якщо клікнути або перейти фокусом (Tab) поза нього
  document.addEventListener("click", (event) => {
    if (!dropdownItem.contains(event.target)) setOpen(dropdown, false);
  });
  dropdownItem.addEventListener("focusout", (event) => {
    if (!dropdownItem.contains(event.relatedTarget)) setOpen(dropdown, false);
  });
})();
