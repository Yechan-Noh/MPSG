(() => {
  'use strict';
  const PROJECT='river-autumn-403814', DATASET='analytics_499333574';
  const ENDPOINT=`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT}`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clear=()=>{};
  function querySpec(range, filters={}) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(range.start)||!/^\d{4}-\d{2}-\d{2}$/.test(range.end))throw new Error('Invalid date range.');
    // Group by the real browser + session key, never by city or time proximity.
    const query=`WITH events AS (
      SELECT event_timestamp, event_name, user_pseudo_id,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS sid,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key='page_location') AS url,
        COALESCE((SELECT value.int_value FROM UNNEST(event_params) WHERE key='engagement_time_msec'),0) AS engagement,
        geo.city AS city, geo.region AS region, geo.country AS country, device.category AS device
      FROM \`${PROJECT}.${DATASET}.events_*\`
      WHERE _TABLE_SUFFIX BETWEEN @start AND @end
    ), site AS (
      SELECT *,REGEXP_EXTRACT(url,r'^https?://[^/]+([^?#]*)') AS path FROM events
      WHERE NET.HOST(url)='yechan-noh.github.io' AND user_pseudo_id IS NOT NULL AND sid IS NOT NULL
    ), visits AS (
      SELECT TO_HEX(SHA256(CONCAT(user_pseudo_id,':',CAST(sid AS STRING)))) AS id,
        CAST(MIN(event_timestamp)/1000 AS INT64) AS first_ms,
        CAST(MAX(event_timestamp)/1000 AS INT64) AS last_ms,
        SUM(engagement)/1000.0 AS engagement_seconds,
        ARRAY_AGG(STRUCT(city,region,country,device) ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] AS location,
        COUNTIF(event_name='page_view') AS page_views,
        ARRAY_AGG(IF(event_name='page_view',STRUCT(CAST(event_timestamp/1000 AS INT64) AS time_ms,path AS path),NULL)
          IGNORE NULLS ORDER BY event_timestamp LIMIT 200) AS pages
      FROM site
      WHERE REGEXP_CONTAINS(path,r'^(/MPSG(/.*)?|/|/index\\.html|/(people|research|publication|publications|news|gallery|contact)(/.*)?)$')
        AND NOT REGEXP_CONTAINS(path,r'^/(MPSG/)?(owner|dashboard)(/|$)')
      GROUP BY user_pseudo_id,sid
      HAVING page_views>0
    )
    SELECT TO_JSON_STRING(v) AS visit FROM visits v
    WHERE (@country='' OR location.country=@country) AND (@device='' OR location.device=@device)
    ORDER BY first_ms DESC LIMIT 501`;
    return {query,useLegacySql:false,location:'US',timeoutMs:10000,maxResults:501,maximumBytesBilled:'100000000',parameterMode:'NAMED',queryParameters:Object.entries({start:range.start.replaceAll('-',''),end:range.end.replaceAll('-',''),country:filters.country||'',device:filters.device||''}).map(([name,value])=>({name,parameterType:{type:'STRING'},parameterValue:{value}}))};
  }
  function messageFor(status, body) {
    const text=body.error?.message||'';
    if(status===401||/insufficient authentication scopes/i.test(text))return 'Connect visit records with Google to allow read-only access.';
    if(status===404||/not found.*(dataset|table)|(dataset|table).*not found|does not match any table/i.test(text))return 'Waiting for the first daily export. The connection was created on November 6, 2026; earlier individual visits cannot be recovered here. Google normally starts exporting within 24 hours, but delivery can take longer.';
    if(/maximum bytes billed|quota|billingTierLimitExceeded/i.test(text)||status===429)return 'The query limit was reached. Choose a shorter date range; no billing upgrade is required by this dashboard.';
    if(status===403)return 'Google has not granted access to these visit records. Check the connected account and BigQuery permissions.';
    return 'Visit records could not be loaded. Please try again later.';
  }
  async function loadVisits({range,filters,token,signal,fetcher=fetch}) {
    async function call(url,opts={}) {
      const r=await fetcher(url,{...opts,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',credentials:'omit',signal});
      const body=await r.json();
      if(!r.ok||body.errors?.length){const e=new Error(messageFor(r.status,body));e.connect=r.status===401||/insufficient authentication scopes/i.test(body.error?.message||'');throw e;}
      return body;
    }
    let body=await call(ENDPOINT+'/queries',{method:'POST',body:JSON.stringify(querySpec(range,filters))});
    let polls=0;
    while(body.jobComplete===false) {
      if(++polls>6)throw new Error('The visit query is taking too long. Please retry shortly.');
      const ref=body.jobReference;
      if(ref?.projectId!==PROJECT||!ref.jobId)throw new Error('Invalid query reference.');
      body=await call(`${ENDPOINT}/queries/${encodeURIComponent(ref.jobId)}?location=US&timeoutMs=10000&maxResults=501`);
    }
    const all=[];
    function collect(result){for(const row of result.rows||[])all.push(JSON.parse(row.f[0].v));}
    collect(body);
    while(body.pageToken && all.length<501) {
      const ref=body.jobReference;
      body=await call(`${ENDPOINT}/queries/${encodeURIComponent(ref.jobId)}?location=US&maxResults=501&pageToken=${encodeURIComponent(body.pageToken)}`);collect(body);
    }
    return {visits:all.slice(0,500),limited:all.length>500||Boolean(body.pageToken),total:Number(body.totalRows||all.length)};
  }
  function renderVisits(data,timezone,search='') {
    const fmt=new Intl.DateTimeFormat('en-US',{timeZone:timezone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const time=ms=>fmt.format(new Date(Number(ms)));
    const mins=s=>`${Math.floor(Number(s)/60)}m ${Math.round(Number(s)%60)}s`;
    const visible=data.filter(v=>`${v.location.city} ${v.location.region} ${v.location.country} ${(v.pages||[]).map(p=>p.path).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
    return visible.map(v=>`<details class="ov-city"><summary><span><strong>${esc(v.location.city||'City unavailable')}</strong><small>${esc(v.location.region)} · ${esc(v.location.country)} · ${esc(time(v.first_ms))}</small></span><span>${Number(v.page_views)} views<small>${esc(mins(v.engagement_seconds))} engagement</small></span></summary><p class="ov-visit-meta"><span>${esc(v.location.device)}</span><span>Observed interval: ${esc(mins((v.last_ms-v.first_ms)/1000))}</span><span>Visit ${esc(v.id.slice(0,8))}</span></p><ol class="ov-visit-path">${(v.pages||[]).map(p=>`<li><time>${esc(time(p.time_ms))}</time>${esc(p.path||'/')}</li>`).join('')}</ol>${v.page_views>200?'<p class="ov-help">First 200 page views shown.</p>':''}</details>`).join('')||'<p class="ov-empty">No exported visits match this selection.</p>';
  }
  function mount({root,clientId,range,filters,timezone,getSession,onRenew}) {
    if(!root)return;
    let controller=new AbortController(),disposed=false,data=[],needsPermission=false;
    root.innerHTML=`<div class="ov-card-title"><div><p class="ov-eyebrow">Individual visits</p><h2>City and pages for each visit</h2><p class="ov-help">A separate record for each GA session, with page views in time order. Daily exports begin November 6, 2026; today’s visits appear after the next export.</p></div><button type="button" data-visit-load>Load visit records</button></div><p class="ov-help">Read-only Google connection · Approximate city, not a person’s identity · Times in ${esc(timezone)}</p><p data-visit-status role="status">Visit records require Google BigQuery read-only permission. No records are stored in this website.</p><div class="ov-visit-controls" hidden data-visit-controls><label>Find city or page<input type="search" data-visit-search aria-label="Find city or page" placeholder="City or page name…"></label></div><div class="ov-visit-list" data-visit-list></div>`;
    const button=root.querySelector('[data-visit-load]'),status=root.querySelector('[data-visit-status]'),list=root.querySelector('[data-visit-list]');
    async function load() {
      if(disposed||!getSession())return;
      button.disabled=true;status.textContent='Loading daily visit records…';
      try {
        const result=await loadVisits({range,filters,token:getSession().token,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(65000)])});
        if(disposed||!getSession())return;
        data=result.visits;list.innerHTML=renderVisits(data,timezone);root.querySelector('[data-visit-controls]').hidden=!data.length;
        status.textContent=`${data.length} exported visits${result.limited?' · Latest 500 shown; narrow the dates for the rest':''}. Only events inside the selected date range are shown. Foreground engagement and elapsed time are different measures.`;
      } catch(e) {if(disposed||e.name==='AbortError')return;list.replaceChildren();status.textContent=e.message;if(e.connect){needsPermission=true;button.textContent='Allow read-only visit access';}}
      finally{if(!disposed)button.disabled=false;}
    }
    button.addEventListener('click',()=>{if(needsPermission){onRenew();return;}load();});
    root.querySelector('[data-visit-search]').addEventListener('input',e=>list.innerHTML=renderVisits(data,timezone,e.target.value));
    return {dispose(){disposed=true;controller.abort();data=[];root.replaceChildren();}};
  }
  const api={mount,clear};
  if(typeof window!=='undefined')window.MTSGVisits=api;
  if(typeof module!=='undefined')module.exports={...api,querySpec,messageFor,loadVisits,renderVisits};
})();
