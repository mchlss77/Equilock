/* Галерея «5 кроків» — Swiper 11 (слайдер) + Fancybox 5 (збільшення скрінів).
   Бібліотеки підключені з CDN перед цим файлом (кінець index.html). */
document.addEventListener('DOMContentLoaded', () => {
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
    });
  }
});
