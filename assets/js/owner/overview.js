(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = n => Number(n || 0).toLocaleString('en-US', {maximumFractionDigits: 0});
  const duration = n => n == null ? '—' : n < 60 ? `${Math.round(n)}s` : `${Math.floor(n / 60)}m ${Math.round(n % 60)}s`;
  const ratio = (a,b) => b > 0 ? a/b : null;
  const percent = n => n == null ? '—' : `${(n*100).toFixed(1)}%`;
  const delta = (now, before, rate = false) => before == null || now == null ? 'No comparison available' : rate ? `${now >= before ? '+' : ''}${((now-before)*100).toFixed(1)} pp vs prior period` : before === 0 ? (now === 0 ? 'No change from zero' : `Prior period: 0`) : `${now >= before ? '+' : ''}${((now-before)/before*100).toFixed(1)}% vs prior period`;
  function rows(report) {
    if (!report || !Array.isArray(report.metricHeaders)) throw new Error('The analytics response is incomplete.');
    return (report.rows || []).map(row => {
      const value = {};
      (report.dimensionHeaders || []).forEach((h,i) => value[h.name] = row.dimensionValues?.[i]?.value ?? '');
      report.metricHeaders.forEach((h,i) => { const n = Number(row.metricValues?.[i]?.value); if (!Number.isFinite(n)) throw new Error('Invalid analytics value.'); value[h.name] = n; });
      return value;
    });
  }
  function request(days, dimensions, metrics, previous = false, sort = null, limit = 100) {
    return {dateRanges:[{startDate:`${previous ? days*2 : days}daysAgo`,endDate:previous ? `${days+1}daysAgo`:'yesterday'}],dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name})),limit:String(limit),
      dimensionFilter:{filter:{fieldName:'hostName',stringFilter:{matchType:'EXACT',value:'yechan-noh.github.io',caseSensitive:false}}},
      ...(sort ? {orderBys:[{metric:{metricName:sort},desc:true}]} : {})};
  }
  function requests(days) {
    const totals=['activeUsers','screenPageViews','sessions','engagedSessions','userEngagementDuration'];
    return [
      request(days,[],totals), request(days,[],totals,true),
      request(days,['date'],['screenPageViews','sessions'],false,null,100),
      request(days,['pagePath'],['screenPageViews','activeUsers','userEngagementDuration'],false,'screenPageViews'),
      request(days,['sessionSourceMedium'],['sessions','engagedSessions'],false,'sessions'),
      request(days,['country','city'],['sessions'],false,'sessions'),
      request(days,['deviceCategory'],['sessions'],false,'sessions'),
      request(days,['eventName'],['eventCount'],false,'eventCount'),
      request(days,['countryId','country'],['sessions'],false,'sessions',300),
      {...request(days,['region'],['sessions'],false,'sessions',100),dimensionFilter:{andGroup:{expressions:[request(days,[],[]).dimensionFilter,{filter:{fieldName:'countryId',stringFilter:{matchType:'EXACT',value:'US'}}}]}}}
    ];
  }
  function table(headings, body, empty='No recorded activity in this period.') {
    return body.length ? `<div class="ov-scroll"><table><thead><tr>${headings.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map(cells=>`<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="ov-empty">${esc(empty)}</p>`;
  }
  function bars(data,key,metric,denominator) {
    const max=Math.max(1,...data.map(r=>r[metric]));
    return data.length ? `<ul class="ov-bars">${data.map(r=>`<li><div><span>${esc(r[key])}</span><strong>${number(r[metric])}<small>${percent(ratio(r[metric],denominator))}</small></strong></div><div class="ov-track"><span style="width:${r[metric]/max*100}%"></span></div></li>`).join('')}</ul>` : '<p class="ov-empty">No recorded activity.</p>';
  }
  function trend(data,days,tz) {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part=k=>parts.find(p=>p.type===k).value;
    const today=Date.UTC(Number(part('year')),Number(part('month'))-1,Number(part('day')));
    const daily=Array.from({length:days},(_,i)=>{
      const date=new Date(today-(days-i)*86400000).toISOString().slice(0,10);
      return {date,screenPageViews:0,sessions:0,...data.find(r=>r.date===date.replaceAll('-','')),label:date};
    });
    const max=Math.max(1,...daily.map(r=>r.screenPageViews),...daily.map(r=>r.sessions));
    const x=i=>44+i*692/Math.max(1,days-1), y=n=>194-n/max*160;
    const path=metric=>daily.map((r,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(r[metric]).toFixed(1)}`).join(' ');
    return `<svg class="ov-trend" viewBox="0 0 760 230" role="img" aria-label="Daily page views and sessions over the selected period"><title>Page views (green) and sessions (blue)</title>${[0,.5,1].map(f=>`<line x1="44" x2="736" y1="${y(max*f)}" y2="${y(max*f)}" stroke="#e5e9e6"/><text x="34" y="${y(max*f)+4}" text-anchor="end">${number(max*f)}</text>`).join('')}<path d="${path('screenPageViews')}" fill="none" stroke="#205a48" stroke-width="2.6"/><path d="${path('sessions')}" fill="none" stroke="#617fb2" stroke-width="2"/>${daily.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.screenPageViews)}" r="3" fill="#205a48"><title>${esc(r.label)}: ${number(r.screenPageViews)} views, ${number(r.sessions)} sessions</title></circle>`).join('')}<text x="44" y="222">${daily[0].label}</text><text x="736" y="222" text-anchor="end">${daily.at(-1).label}</text></svg><details><summary>Daily values</summary>${table(['Date','Views','Sessions'],daily.map(r=>[esc(r.label),number(r.screenPageViews),number(r.sessions)]))}</details>`;
  }
  function mapGraphic(shape,data,key,title) {
    if(!shape)return '<p class="ov-empty">Map geometry could not be loaded. Location values remain available in the tables.</p>';
    const counts=new Map(data.map(r=>[r[key],r.sessions]));
    const max=Math.max(1,...data.map(r=>r.sessions)), mapped=new Set(shape.regions.map(r=>r.id));
    const unknown=data.filter(r=>!mapped.has(r[key])).reduce((n,r)=>n+r.sessions,0);
    const active=shape.regions.filter(r=>counts.has(r.id)&&counts.get(r.id)>0);
    const paths=shape.regions.filter(r=>r.path).map(r=>{
      const n=counts.get(r.id)||0;
      const fill=n ? `hsl(153, 26%, ${82-48*Math.sqrt(n/max)}%)` : '#e1e6df';
      return `<path d="${r.path}" fill="${fill}" stroke="#fff" stroke-width=".65"><title>${esc(r.name)}: ${n ? number(n)+' sessions' : 'no sessions reported'}</title></path>`;
    }).join('');
    const points=active.map(r=>{const n=counts.get(r.id),label=`${r.name}: ${number(n)} sessions`;return `<circle cx="${r.center[0]}" cy="${r.center[1]}" r="${4+10*Math.sqrt(n/max)}" fill="#205a48" fill-opacity=".65" stroke="white" stroke-width="1.5" tabindex="0" role="button" aria-label="${esc(label)}" data-map-label="${esc(label)}"><title>${esc(label)}</title></circle>`;}).join('');
    return `<div class="ov-map"><svg viewBox="0 0 ${shape.width} ${shape.height}" role="group" aria-label="${esc(title)}"><title>${esc(title)}</title>${paths}${points}</svg><p data-map-detail aria-live="polite">${active.length} ${key==='region'?'states / DC':'countries / territories'} with reported sessions · Hover or tap a marker</p><div class="ov-map-key"><span><i></i> No sessions reported</span><span class="ov-scale"></span><span>Fewer → more sessions</span></div>${unknown?`<p class="ov-help">${number(unknown)} sessions have an unknown or unmapped location.</p>`:''}</div>`;
  }
  function layout() {
    return `<header class="ov-header"><div><a href="/MPSG/">MTSG</a><span>Private workspace</span></div><nav><a href="/MPSG/">Website ↗</a><button data-ov-signout>Sign out</button></nav></header>
    <main class="ov-main"><div class="ov-title"><div><p class="ov-eyebrow">Website analytics</p><h1>Site Overview</h1><p class="ov-subtitle">How your research is being discovered and explored.</p></div><div class="ov-controls"><label>Period<select data-ov-period><option value="7">Last 7 days</option><option value="28" selected>Last 28 days</option><option value="90">Last 90 days</option></select></label><button data-ov-refresh>Refresh</button></div></div>
    <div class="ov-status" data-ov-status role="status" aria-live="polite">Connecting to your analytics…</div><button data-ov-connect hidden>Connect Google Analytics</button>
    <div data-ov-content hidden></div>
    <footer class="ov-notes"><p>Source: Google Analytics · yechan-noh.github.io traffic only · Maps: Natural Earth / US Census via world-atlas / us-atlas; country identifiers by world-countries (ODbL) · Completed days only · This page does not record analytics events.</p><details><summary>Definitions & limitations</summary><p>Active users are GA4’s deduplicated active users, not verified individuals. Sessions are visits, not people. Engagement time is time in the foreground, not a measurement of reading. An engaged session lasts over 10 seconds, includes a key event, or has at least two page views.</p><p>Locations are approximate; a session can appear in more than one geographic row, so regional counts need not sum to the overall total. These reports cannot identify a professor, hiring committee, or institution. Your own visits may be included. Consent settings, blockers, processing delays and privacy thresholds can reduce reported activity. Daily users and page-level users must not be added to estimate unique visitors.</p></details></footer></main>`;
  }
  function render(reports,days,maps) {
    const parsed=reports.map(rows), [current,previous,daily,pages,sources,locations,devices,events,countries=[],states=[]]=parsed;
    const c=current[0] || {activeUsers:0,screenPageViews:0,sessions:0,engagedSessions:0,userEngagementDuration:0};
    const p=previous[0] || {activeUsers:0,screenPageViews:0,sessions:0,engagedSessions:0,userEngagementDuration:0};
    const tz=reports[0].metadata?.timeZone || 'UTC';
    const metrics=[['Active users',c.activeUsers,p.activeUsers,number,false],['Sessions',c.sessions,p.sessions,number,false],['Page views',c.screenPageViews,p.screenPageViews,number,false],['Engagement rate',ratio(c.engagedSessions,c.sessions),ratio(p.engagedSessions,p.sessions),percent,true]];
    const ranked=pages.filter(r=>!/^\/MPSG\/?$/.test(r.pagePath) && !/^\/MPSG\/(owner|dashboard)\/?$/.test(r.pagePath));
    const top=ranked[0];
    const src=sources[0];
    const insights=[top ? `<strong>${esc(top.pagePath)}</strong> leads content views beyond the homepage, with <strong>${number(top.screenPageViews)}</strong> views.` : 'No content-page activity is recorded yet.',src ? `<strong>${esc(src.sessionSourceMedium)}</strong> is the largest recorded source: <strong>${number(src.sessions)}</strong> sessions (${percent(ratio(src.sessions,c.sessions))}).` : 'No acquisition data is recorded yet.',`Average foreground engagement is <strong>${duration(ratio(c.userEngagementDuration,c.activeUsers))}</strong> per active user. Small counts can cause large percentage changes.`];
    const notices=[];
    if(reports.some(r=>r.metadata?.subjectToThresholding))notices.push('Privacy thresholds may suppress some rows.');
    if(reports.some(r=>r.metadata?.dataLossFromOtherRow))notices.push('Some categories are grouped as “(other)”.');
    if(reports.some(r=>r.metadata?.samplingMetadatas?.length))notices.push('Some results are sampled.');
    if(reports.some((r,i)=>r.rowCount>parsed[i].length))notices.push('Detail tables contain the top 100 rows; totals are queried separately.');
    return `<div class="ov-period-note">Last ${days} completed days · Compared with the preceding ${days} days · ${esc(tz)}</div>
      <section class="ov-kpis" aria-label="Key metrics">${metrics.map(([label,now,before,format,rate])=>`<article><p>${label}</p><strong>${format(now)}</strong><small>${delta(now,before,rate)}</small></article>`).join('')}</section>
      <section class="ov-insights" aria-label="Period highlights">${insights.map(t=>`<p>${t}</p>`).join('')}</section>
      ${notices.length?`<p class="ov-warning">${notices.join(' ')}</p>`:''}
      <section class="ov-map-grid" aria-label="Visitor locations"><article class="ov-card"><h2>Across the world</h2><p class="ov-help">Sessions by country · Markers represent countries, not exact visitor locations</p>${mapGraphic(maps?.world,countries,'countryId','World map of recorded sessions')}</article><article class="ov-card"><h2>Across the United States</h2><p class="ov-help">Sessions by state · Alaska and Hawaii shown as insets</p>${mapGraphic(maps?.us,states,'region','US map of recorded sessions by state')}</article></section>
      <div class="ov-grid"><section class="ov-card ov-wide"><div class="ov-card-title"><h2>Audience over time</h2><span><i class="ov-dot"></i> Views <i class="ov-dot blue"></i> Sessions</span></div>${trend(daily,days,tz)}</section>
      <section class="ov-card"><h2>Device mix</h2><p class="ov-help">Share of recorded sessions</p>${bars(devices,'deviceCategory','sessions',c.sessions)}</section>
      <section class="ov-card ov-full"><div class="ov-card-title"><div><h2>Where attention goes</h2><p class="ov-help">Pages ranked by views · Average engagement = foreground seconds / page-level active users</p></div><label class="ov-search">Find page<input type="search" data-ov-search placeholder="Research, publications…"></label></div><div data-ov-pages>${table(['Page','Views','Active users','Avg. engagement'],pages.map(r=>[esc(r.pagePath),number(r.screenPageViews),number(r.activeUsers),duration(ratio(r.userEngagementDuration,r.activeUsers))]))}</div></section>
      <section class="ov-card ov-wide"><h2>How people arrive</h2><p class="ov-help">Source / medium · Direct includes traffic without attribution</p>${table(['Source / medium','Sessions','Engaged sessions','Engagement rate'],sources.slice(0,12).map(r=>[esc(r.sessionSourceMedium),number(r.sessions),number(r.engagedSessions),percent(ratio(r.engagedSessions,r.sessions))]))}</section>
      <section class="ov-card"><h2>Recorded actions</h2><p class="ov-help">Event counts, not unique users. Absent events may not be configured.</p>${table(['Event','Count'],events.filter(r=>!['page_view','session_start','user_engagement','first_visit'].includes(r.eventName)).slice(0,8).map(r=>[esc(r.eventName),number(r.eventCount)]),'No additional events recorded in this period.')}</section>
      <section class="ov-card ov-full"><h2>Geographic reach</h2><p class="ov-help">Approximate city-level location · Does not establish university affiliation</p>${table(['Country','City','Sessions'],locations.slice(0,15).map(r=>[esc(r.country),esc(r.city),number(r.sessions)]))}</section></div>`;
  }
  function mount({root,propertyId,getSession,onRenew,onSignOut}) {
    root.className='ov-root'; root.innerHTML=layout();
    const find=s=>root.querySelector(s), status=find('[data-ov-status]'), content=find('[data-ov-content]'), connect=find('[data-ov-connect]'), select=find('[data-ov-period]'), refresh=find('[data-ov-refresh]');
    let controller, revision=0, removed=false, maps;
    const mapPromise=fetch('/MPSG/assets/js/owner/map-shapes.json').then(r=>r.ok?r.json():null).catch(()=>null);
    async function load() {
      const version=++revision;
      controller?.abort(); controller=new AbortController();
      content.hidden=true; content.replaceChildren(); connect.hidden=true; refresh.disabled=true;
      status.textContent='Loading your Google Analytics data…';
      const session=getSession();
      if(!session){status.textContent='Renew your Google sign-in to load the report.';connect.hidden=false;refresh.disabled=false;return;}
      try {
        maps=await mapPromise;
        const query=requests(Number(select.value)), reports=[];
        for(let i=0;i<query.length;i+=5){
          const response=await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:batchRunReports`,{method:'POST',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({requests:query.slice(i,i+5)}),cache:'no-store',credentials:'omit',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25000)])});
          if(!response.ok){
            const detail=await response.json().catch(()=>({}));
            if(detail.error?.details?.some(d=>d.reason==='SERVICE_DISABLED'))throw new Error('The Google Analytics Data API needs to be enabled for this app.');
            if(response.status===401||response.status===403){const error=new Error('Google Analytics read access is required. Connect the account that owns this property.');error.connect=true;throw error;}
            if(response.status===429)throw new Error('Google’s request limit has been reached. Please retry later.');
            throw new Error('Analytics could not be loaded. Please retry.');
          }
          const result=await response.json();
          if(!Array.isArray(result.reports)||result.reports.length!==query.slice(i,i+5).length)throw new Error('The analytics response is incomplete.');
          reports.push(...result.reports);
        }
        if(removed || version!==revision || !getSession())return;
        content.innerHTML=render(reports,Number(select.value),maps); content.hidden=false;
        status.textContent=`Updated ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · Data may be delayed by Google processing.`;
        root.querySelectorAll('[data-map-label]').forEach(point=>{
          const show=()=>point.closest('.ov-map').querySelector('[data-map-detail]').textContent=point.dataset.mapLabel;
          point.addEventListener('mouseenter',show);point.addEventListener('focus',show);point.addEventListener('click',show);
          point.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
        });
        find('[data-ov-search]').addEventListener('input',e=>{
          const q=e.target.value.toLowerCase();find('[data-ov-pages]').querySelectorAll('tbody tr').forEach(row=>row.hidden=!row.cells[0].textContent.toLowerCase().includes(q));
        });
      }catch(error){
        if(removed||version!==revision||error.name==='AbortError')return;
        status.textContent=error.name==='TimeoutError'?'Google took too long to respond. Please retry.':error.message;
        connect.hidden=!error.connect;
      }finally{if(!removed&&version===revision)refresh.disabled=false;}
    }
    select.addEventListener('change',load);refresh.addEventListener('click',load);connect.addEventListener('click',onRenew);find('[data-ov-signout]').addEventListener('click',onSignOut);
    load();
    return {reload:load,dispose(){removed=true;revision++;controller?.abort();root.replaceChildren();}};
  }
  window.MTSGOverview={mount};
  if(typeof module!=='undefined')module.exports={rows,request,requests,delta,ratio,render,trend,esc,mapGraphic};
})();
