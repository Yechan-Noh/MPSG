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
  // Record explicit public-site selections only; never form values or URL queries.
  document.addEventListener?.('click', event => {
    if(excluded)return;
    const link=event.target.closest?.('a[href]');if(!link)return;
    let url;try{url=new URL(link.href,location.href);}catch{return;}
    let kind='',label='';
    if(url.protocol==='mailto:'){kind='email';label='Contact email';}
    else if(url.origin===location.origin&&/\/research\/$/.test(url.pathname)&&url.hash){kind='topic';label=url.hash.slice(1);}
    else if(/(?:cv|curriculum|resume)/i.test(url.pathname)&&/\.pdf$/i.test(url.pathname)){kind='cv';label='CV';}
    else if(/^(?:[^.]+\.)*(?:doi\.org|biorxiv\.org|arxiv\.org|pubs\.acs\.org|journals\.aps\.org|science\.org|onlinelibrary\.wiley\.com|nature\.com|sciencedirect\.com)$/.test(url.hostname)||/\/files\/.*\.pdf$/i.test(url.pathname)){kind='paper';label=(link.closest('article')?.querySelector('h2,h3')?.textContent||link.textContent||url.pathname).trim().slice(0,100);}
    if(kind)window.gtag('event','research_'+kind,{content_label:label,link_url:kind==='email'?'mailto:':url.origin+url.pathname+(kind==='topic'?url.hash:'')});
  },{passive:true});
})();
