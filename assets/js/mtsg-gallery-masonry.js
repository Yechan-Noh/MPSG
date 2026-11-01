/* Pack chronological news and gallery cards into the shortest available column. */
(() => {
  const grid = document.querySelector('#gallery-grid, #news-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.gallery-card, .news-card')];
  let pending = 0;
  function arrange() {
    pending = 0;
    const columns = matchMedia('(max-width:760px)').matches ? 1 : 2;
    const gap = columns === 1 ? 20 : 24;
    const width = (grid.clientWidth - gap * (columns - 1)) / columns;
    if (width <= 0) return;
    cards.forEach(card => { card.style.width = `${width}px`; });
    const heights = Array(columns).fill(0);
    cards.forEach(card => {
      const column = heights.indexOf(Math.min(...heights));
      card.style.left = `${column * (width + gap)}px`;
      card.style.top = `${heights[column]}px`;
      heights[column] += card.getBoundingClientRect().height + gap;
    });
    grid.style.height = `${Math.max(0, ...heights) - (cards.length ? gap : 0)}px`;
    grid.classList.add('gallery-masonry');
  }
  function schedule() {
    if (!pending) pending = requestAnimationFrame(arrange);
  }
  const observer = new ResizeObserver(schedule);
  // Watch width separately: setting the packed grid height must not create a loop.
  let lastWidth = 0;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== lastWidth) { lastWidth = width; schedule(); }
  }).observe(grid);
  cards.forEach(card => observer.observe(card));
  grid.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', schedule);
    img.addEventListener('error', schedule);
  });
  document.fonts?.ready.then(schedule);
  window.addEventListener('resize', schedule, { passive: true });
  arrange();
})();
