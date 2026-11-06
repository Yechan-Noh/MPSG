(() => {
  'use strict';
  const destination = document.currentScript.dataset.dashboard;
  const footer = document.getElementById('mtsg-footer');
  if (!footer || !destination) return;
  let armedAt = null;
  footer.querySelector('[data-overview-arm]').addEventListener('click', () => {
    armedAt = performance.now();
  });
  footer.querySelector('[data-overview-open]').addEventListener('click', () => {
    const ready = armedAt !== null && performance.now() - armedAt <= 5000;
    armedAt = null;
    if (ready) location.assign(destination);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) armedAt = null;
  });
})();
