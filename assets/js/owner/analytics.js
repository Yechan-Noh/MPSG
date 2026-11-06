(() => {
  'use strict';
  if (window.MTSGAnalytics) return;
  const id = 'G-ZM8MTZDBL3';
  const excludeKey = 'mtsg-owner-excluded-v1';
  const rememberedKey = 'mtsg-owner-remembered-v1';
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  let excluded = read(excludeKey) === 'yes' || read(rememberedKey) === 'yes';
  let persisted = false;
  function excludeOwner() {
    excluded = true;
    window['ga-disable-' + id] = true;
    try { localStorage.setItem(excludeKey, 'yes'); persisted = true; } catch {}
  }
  if (excluded) excludeOwner();
  window.MTSGAnalytics = {excludeOwner, status: () => ({excluded, persisted})};
  window.addEventListener('storage', event => {
    if ((event.key === excludeKey || event.key === rememberedKey) && event.newValue === 'yes') excludeOwner();
  });
  // Owner routes and previews must never send even a first page-view event.
  const privatePage = /^\/(?:MPSG\/)?(?:dashboard|owner)(?:\/|$)/.test(location.pathname);
  if (excluded || privatePage || location.hostname !== 'yechan-noh.github.io') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(script);
})();
