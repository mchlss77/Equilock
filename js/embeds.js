/* EQUILOCK — відкладене завантаження вбудованого вмісту (відеогід, карта).
   До натискання кнопки сторінка не звертається до YouTube чи Google Maps:
   iframe створюється лише після кліку і стає на місце кнопки.
   Кнопка: data-embed-src (адреса iframe), data-embed-title (назва для читачів екрана),
   data-embed-allow (необов'язково — дозволи iframe). Контейнер — найближчий [data-embed-frame]. */
(() => {
  document.querySelectorAll("[data-embed-src]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const frame = button.closest("[data-embed-frame]");
        const iframe = document.createElement("iframe");
        iframe.src = button.dataset.embedSrc;
        iframe.title = button.dataset.embedTitle;
        iframe.className = "absolute inset-0 h-full w-full border-0";
        if (button.dataset.embedAllow) iframe.allow = button.dataset.embedAllow;
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        frame.replaceChildren(iframe);
        // Фокус переходить на вбудований вміст, щоб користувач клавіатури не загубився
        iframe.focus();
      },
      { once: true },
    );
  });
})();
