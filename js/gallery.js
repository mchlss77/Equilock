/* Галерея «5 кроків» — Swiper 11 (слайдер) + Fancybox 5 (збільшення скрінів).
   Бібліотеки підключені з CDN перед цим файлом (кінець index.html); усі з defer, тож DOM уже
   розібраний і бібліотеки виконані — слухач DOMContentLoaded не потрібен.
   Блок у { } — щоб const не потрапили в глобальну область. */
{
  /* Ефекти, що працюють безперервно (автопрокрутка, друк), ставимо на паузу, коли блок поза екраном:
     у видимій частині все як було, а поза нею — без зайвої роботи головного потоку */
  const whileVisible = (el, start, stop) => {
    if (!el || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(el);
  };

  const swiper = new Swiper('.how__slider', {
    loop: true,
    speed: 500,
    grabCursor: true,
    slidesPerView: 1,
    spaceBetween: 24,
    autoplay: { delay: 2500, disableOnInteraction: false, pauseOnMouseEnter: true },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    pagination: { el: '.swiper-pagination', clickable: true },
    breakpoints: {
      0: { spaceBetween: 12 },
      640: { spaceBetween: 16 },
      1024: { spaceBetween: 24 },
    },
  });
  whileVisible(swiper.el, () => swiper.autoplay.start(), () => swiper.autoplay.stop());

  Fancybox.bind('[data-fancybox="equilock-steps"]', {
    Carousel: { transition: 'slide' },
    Images: { zoom: true },
    Thumbs: { type: 'classic' },
  });

  /* Ефект друку в підзаголовку Hero (Typed.js).
     При системному «менше анімації» анімації немає — лишається статична фраза з HTML */
  const typedTarget = document.querySelector('.hero-typed [data-typed]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typedTarget && !reduceMotion) {
    let observed = false;
    new Typed(typedTarget, {
      strings: [
        'Кошти в ескроу до підтвердження оплати',
        'Обмін USDT ↔ UAH без ризику скаму',
        'Multisig 2-of-3 і незалежний арбітраж',
      ],
      typeSpeed: 45,
      backSpeed: 25,
      backDelay: 1800,
      startDelay: 300,
      smartBackspace: true,
      loop: true,
      // Спостереження — після першої надрукованої фрази: тоді стан Typed узгоджений
      // і stop()/start() продовжують з того самого місця
      onStringTyped: (_, typed) => {
        if (observed) return;
        observed = true;
        whileVisible(typedTarget, () => typed.start(), () => typed.stop());
      },
    });
  }
}
