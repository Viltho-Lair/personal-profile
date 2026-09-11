(() => {
  const root = document.documentElement;
  const mark = document.querySelector('.soon .mark');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Start the entry sequence once the display face is in, so letters don't reflow mid-animation.
  const start = () => requestAnimationFrame(() => {
    root.classList.add('is-ready');
    setTimeout(() => root.classList.add('is-settled'), 2100);
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(start);

  if (reduceMotion || !mark || !matchMedia('(pointer: fine)').matches) return;

  // The mark opens up as the pointer approaches it.
  let frame = 0;
  window.addEventListener('pointermove', (e) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = mark.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      const t = Math.max(0, 1 - d / (r.width * 2.4));
      mark.style.setProperty('--hover', (t * t * 1.5).toFixed(3));
    });
  }, { passive: true });

  document.addEventListener('pointerleave', () => mark.style.setProperty('--hover', '0'));
})();
