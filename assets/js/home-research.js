(() => {
  const strip = document.getElementById('home-research-topics');
  if (!strip) return;
  const controls = strip.parentElement.querySelector('.topic-controls');
  const buttons = controls.querySelectorAll('button');
  const update = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    controls.hidden = max <= 2;
    buttons[0].disabled = strip.scrollLeft <= 2;
    buttons[1].disabled = strip.scrollLeft >= max - 2;
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const card = strip.querySelector('.topic-preview');
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(strip).columnGap);
    strip.scrollBy({left: Number(button.dataset.topicDirection) * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }));
  strip.addEventListener('scroll', update, {passive: true});
  new ResizeObserver(update).observe(strip);
  update();
})();
