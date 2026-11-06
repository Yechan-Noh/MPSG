(() => {
  'use strict';
  const BASE = '';
  // Retain historical project URLs alongside the new site's main routes.
  const SITE_PATHS = '^(/MPSG(/.*)?|/|/index\\.html|/(people|research|publication|publications|news|gallery|contact)(/.*)?)$';
  const TOTALS = ['activeUsers', 'sessions', 'screenPageViews', 'engagedSessions', 'userEngagementDuration', 'averageSessionDuration', 'newUsers'];
  const DAY_MS = 86400000;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const number = n => n == null ? '—' : Number(n).toLocaleString('en-US', {maximumFractionDigits:0});
  const ratio = (a, b) => b > 0 ? a / b : null;
  const percent = n => n == null ? '—' : `${(n * 100).toFixed(1)}%`;
  function duration(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    const seconds = Math.round(Math.max(0, n));
    return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m` : seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  }
  function delta(now, before, rate = false) {
    if (now == null || before == null) return 'No comparison available';
    if (rate) return `${now >= before ? '+' : ''}${((now - before) * 100).toFixed(1)} pp`;
    if (!before) return now ? 'Prior period: 0' : 'No change';
    return `${now >= before ? '+' : ''}${((now - before) / before * 100).toFixed(0)}%`;
  }
  const dateKey = date => date.replaceAll('-', '');
  const isoDate = key => key.length === 8 ? `${key.slice(0,4)}-${key.slice(4,6)}-${key.slice(6)}` : key;
  const dateObject = date => new Date(`${date}T12:00:00Z`);
  const addDays = (date, count) => new Date(dateObject(date).getTime() + count * DAY_MS).toISOString().slice(0,10);
  const daysBetween = (a, b) => Math.round((dateObject(b) - dateObject(a)) / DAY_MS) + 1;
  const dateFormatters = new Map();
  function dateLabel(date, options = {}) {
    const key = JSON.stringify(options);
    if (!dateFormatters.has(key)) dateFormatters.set(key,new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC',...options}));
    return dateFormatters.get(key).format(dateObject(date));
  }
  function todayInZone(zone, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
    const get = key => parts.find(p => p.type === key).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function validDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(dateObject(date).getTime()) && dateObject(date).toISOString().slice(0,10) === date; }
  function periodFor(value, today, options = {}) {
    let start, end, displayEnd, shift, label;
    if (value === 'week') {
      const offset = Math.min(0, options.weekOffset || 0);
      const weekday = dateObject(today).getUTCDay();
      start = addDays(today, -((weekday + 6) % 7) + offset * 7);
      displayEnd = addDays(start, 6); end = displayEnd < today ? displayEnd : today;
      shift = 7; label = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : 'Week of ' + dateLabel(start);
    } else if (value === 'custom') {
      start = options.start; end = options.end;
      if (!validDate(start) || !validDate(end) || start > end || end > today || daysBetween(start, end) > 93) throw new Error('Choose a valid range of up to 93 days, ending no later than today.');
      displayEnd = end; shift = daysBetween(start, end); label = 'Custom range';
    } else {
      const length = [7,28,90].includes(Number(value)) ? Number(value) : 28;
      end = addDays(today, -1); start = addDays(end, -(length - 1)); displayEnd = end; shift = length; label = `Last ${length} days`;
    }
    return {start, end, displayEnd, shift, label, today, mode:value, comparisonStart:addDays(start,-shift), comparisonEnd:addDays(end,-shift)};
  }
  function focusRange(period, day) {
    if (day && (!validDate(day) || day < period.start || day > period.end)) throw new Error('This day is outside the selected period.');
    const start = day || period.start, end = day || period.end;
    return {...period, start, end, comparisonStart:addDays(start, -period.shift), comparisonEnd:addDays(end, -period.shift)};
  }
  function rows(report) {
    if (!report || !Array.isArray(report.metricHeaders)) throw new Error('The analytics response is incomplete.');
    return (report.rows || []).map(row => {
      const value = {};
      (report.dimensionHeaders || []).forEach((header,i) => value[header.name] = row.dimensionValues?.[i]?.value ?? '');
      report.metricHeaders.forEach((header,i) => {
        const n = Number(row.metricValues?.[i]?.value);
        if (!Number.isFinite(n)) throw new Error('Invalid analytics value.');
        value[header.name] = n;
      });
      return value;
    });
  }
  const match = (fieldName, value, matchType = 'EXACT') => ({filter:{fieldName, stringFilter:{matchType, value, caseSensitive:false}}});
  function request(range, dimensions, metrics, filters = {}, options = {}) {
    const expressions = [match('hostName','yechan-noh.github.io'), match('pagePath',SITE_PATHS,'FULL_REGEXP'), {notExpression:{orGroup:{expressions:['/dashboard','/owner','/MPSG/dashboard','/MPSG/owner'].map(path => match('pagePath',path,'BEGINS_WITH'))}}}];
    if (filters.country) expressions.push(match('country', filters.country));
    if (filters.device) expressions.push(match('deviceCategory', filters.device));
    if (options.us) expressions.push(match('countryId','US'));
    if (options.event) expressions.push(match('eventName',options.event));
    return {dateRanges:[{startDate:range.start,endDate:range.end}], dimensions:dimensions.map(name=>({name})), metrics:metrics.map(name=>({name})), dimensionFilter:{andGroup:{expressions}}, limit:String(options.limit || 200),
      ...(options.sort ? {orderBys:[{metric:{metricName:options.sort},desc:true}]} : dimensions.length === 1 && dimensions[0] === 'date' ? {orderBys:[{dimension:{dimensionName:'date'}}]} : {})};
  }
  function requests(range, filters = {}, daily = true) {
    const previous = {start:range.comparisonStart,end:range.comparisonEnd};
    return {
      current:request(range,[],TOTALS,filters), previous:request(previous,[],TOTALS,filters),
      ...(daily ? {daily:request(range,['date'],TOTALS,filters,{limit:100})} : {}),
      pages:request(range,['pagePath'],['screenPageViews','activeUsers','userEngagementDuration'],filters,{sort:'screenPageViews',limit:200}),
      sources:request(range,['sessionSourceMedium'],['sessions','engagedSessions','userEngagementDuration'],filters,{sort:'sessions'}),
      locations:request(range,['country','region','city'],['sessions','activeUsers','userEngagementDuration'],filters,{sort:'sessions',limit:500}),
      cityPages:request(range,['date','country','region','city','pagePath'],['screenPageViews','userEngagementDuration'],filters,{sort:'screenPageViews',limit:10000}),
      countries:request(range,['countryId','country'],['sessions'],filters,{sort:'sessions',limit:300}),
      // A non-US country selection cannot contain US states. Avoid contradictory geo filters.
      ...(!filters.country || filters.country==='United States' ? {states:request(range,['region'],['sessions'],filters,{sort:'sessions',us:true,limit:100})} : {}),
      devices:request(range,['deviceCategory'],['sessions'],filters,{sort:'sessions'}),
      hours:request(range,['dateHour'],['screenPageViews'],filters,{limit:3000}),
      events:request(range,['eventName'],['eventCount'],filters,{sort:'eventCount'}),
      outbound:request(range,['linkDomain'],['eventCount'],filters,{sort:'eventCount',event:'click'})
    };
  }
  function emptyTotals() { return Object.fromEntries(TOTALS.map(key=>[key,0])); }
  function dailySeries(report, period) {
    const byDate = new Map(rows(report).map(r=>[isoDate(r.date), r]));
    return Array.from({length:daysBetween(period.start,period.displayEnd)}, (_,i)=> {
      const date = addDays(period.start,i);
      return {...emptyTotals(),...byDate.get(date),date,future:date > period.today,today:date === period.today};
    });
  }
  function table(headings, body, empty = 'No activity reported for this selection.') {
    return body.length ? `<div class="ov-scroll"><table><thead><tr>${headings.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map(cells=>`<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="ov-empty">${esc(empty)}</p>`;
  }
  function bars(data, key, metric, denominator) {
    const max = Math.max(1,...data.map(r=>r[metric]));
    return data.length ? `<ul class="ov-bars">${data.map(r=>`<li><div><span>${esc(r[key])}</span><strong>${number(r[metric])}<small>${percent(ratio(r[metric],denominator))}</small></strong></div><div class="ov-track"><span style="width:${r[metric]/max*100}%"></span></div></li>`).join('')}</ul>` : '<p class="ov-empty">No activity reported.</p>';
  }
  function mapGraphic(shape, data, key, title) {
    if (!shape) return '<p class="ov-empty">Map unavailable. Location values are still listed below.</p>';
    const counts = new Map(data.map(r=>[r[key],r.sessions]));
    const max = Math.max(1,...data.map(r=>r.sessions)), mapped = new Set(shape.regions.map(r=>r.id));
    const unknown = data.filter(r=>!mapped.has(r[key])).reduce((n,r)=>n+r.sessions,0);
    const active = shape.regions.filter(r=>(counts.get(r.id)||0)>0);
    const paths = shape.regions.filter(r=>r.path).map(r=> {
      const n = counts.get(r.id)||0, fill = n ? `hsl(195, 25%, ${82-48*Math.sqrt(n/max)}%)` : '#e7edef';
      return `<path d="${r.path}" fill="${fill}" stroke="#fff" stroke-width=".65" aria-hidden="true"/>`;
    }).join('');
    const points = active.map(r=> {
      const n = counts.get(r.id), label = `${r.name}: ${number(n)} sessions`;
      return `<circle cx="${r.center[0]}" cy="${r.center[1]}" r="${4+9*Math.sqrt(n/max)}" fill="#42636e" fill-opacity=".72" stroke="white" stroke-width="1.5" tabindex="0" role="button" aria-label="${esc(label)}" data-map-label="${esc(label)}"><title>${esc(label)}</title></circle>`;
    }).join('');
    return `<div class="ov-map"><svg viewBox="0 0 ${shape.width} ${shape.height}" role="group" aria-label="${esc(title)}"><title>${esc(title)}</title>${paths}${points}</svg><p data-map-detail aria-live="polite">${active.length} ${key==='region'?'states / DC':'countries / territories'} · Tap a marker for sessions</p><div class="ov-map-key"><span><i></i> No activity reported</span><span class="ov-scale"></span><span>Fewer → more sessions</span></div>${unknown?`<p class="ov-help">${number(unknown)} sessions have an unmapped or unknown location.</p>`:''}</div>`;
  }
  function calendar(data, period, selected, metric) {
    const max = Math.max(1,...data.map(r=>r[metric]));
    if (period.mode !== 'week') {
      const x = i => 38 + i * 900 / Math.max(1,data.length-1), y = n => 160 - n / max * 125;
      return `<div class="ov-trend"><svg viewBox="0 0 980 200" role="group" aria-label="Daily activity; select a point to inspect that day">${[0,.5,1].map(f=>`<line x1="38" x2="938" y1="${y(max*f)}" y2="${y(max*f)}" stroke="#e6ecee"/><text x="28" y="${y(max*f)+4}" text-anchor="end">${metric==='userEngagementDuration'?esc(duration(max*f)):number(max*f)}</text>`).join('')}<path d="${data.map((r,i)=>`${i?'L':'M'}${x(i)},${y(r[metric])}`).join(' ')}" fill="none" stroke="#42636e" stroke-width="2.5"/>${data.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r[metric])}" r="${selected===r.date?6:4}" tabindex="0" role="button" data-day="${r.date}" aria-label="Inspect ${dateLabel(r.date,{weekday:'long'})}: ${metric==='userEngagementDuration'?duration(r[metric]):number(r[metric])}"><title>${r.date}: ${metric==='userEngagementDuration'?duration(r[metric]):number(r[metric])}</title></circle>`).join('')}<text x="38" y="190">${dateLabel(period.start)}</text><text x="938" y="190" text-anchor="end">${dateLabel(period.end)}</text></svg></div>`;
    }
    return `<div class="ov-week" aria-label="Days of the selected week">${data.map(r=>`<button type="button" class="ov-day${selected===r.date?' is-selected':''}${r.today?' is-today':''}" data-day="${r.date}" aria-pressed="${selected===r.date}" ${r.future?'disabled':''}><span class="ov-day-label">${dateLabel(r.date,{weekday:'short',month:undefined,day:undefined})}<small>${dateLabel(r.date)}${r.today?' · today':''}</small></span><strong>${r.future?'—':metric==='userEngagementDuration'?duration(r[metric]):number(r[metric])}</strong><span class="ov-day-track"><i style="height:${r.future?0:Math.max(3,r[metric]/max*100)}%"></i></span><span class="ov-day-foot">${r.future?'Upcoming':`${number(r.sessions)} visits · ${duration(ratio(r.userEngagementDuration,r.sessions))} / visit`}</span>${r.today?'<em>Partial data</em>':''}</button>`).join('')}</div>`;
  }
  function heatmap(data, range) {
    const dates = Array.from({length:daysBetween(range.start,range.end)},(_,i)=>addDays(range.start,i));
    const cells = new Map(data.map(r=>[r.dateHour,r.screenPageViews]));
    const max = Math.max(1,...data.map(r=>r.screenPageViews));
    return `<div class="ov-heat-scroll"><div class="ov-heat" style="--heat-rows:${dates.length}"><span></span>${Array.from({length:24},(_,h)=>`<span class="ov-heat-label">${h%3===0?String(h).padStart(2,'0'):''}</span>`).join('')}${dates.map(date=>{const shortDate=dateLabel(date);return `<span class="ov-heat-date">${dateLabel(date,{weekday:'short'})}</span>${Array.from({length:24},(_,h)=> {
      const count = cells.get(dateKey(date)+String(h).padStart(2,'0'))||0;
      const label = `${shortDate} · ${String(h).padStart(2,'0')}:00–${String(h).padStart(2,'0')}:59 · ${number(count)} views reported`;
      return `<button type="button" class="ov-heat-cell" data-hour="${esc(label)}" aria-label="${esc(label)}" style="--cell:${count?`hsl(195,25%,${84-51*Math.sqrt(count/max)}%)`:'#f0f3f4'}"><title>${esc(label)}</title></button>`;
    }).join('')}`;}).join('')}</div></div><p class="ov-help" data-hour-detail aria-live="polite">Tap a cell for the hour and page-view count. Hours use the reporting timezone.</p>`;
  }
  function dailyTable(data) {
    return table(['Day','Active users','Visits','Page views','Total engagement','Engagement / visit'],data.filter(r=>!r.future).map(r=>[`<button class="ov-text-button" data-day="${r.date}">${dateLabel(r.date,{weekday:'short'})}${r.today?' · partial':''}</button>`,number(r.activeUsers),number(r.sessions),number(r.screenPageViews),duration(r.userEngagementDuration),duration(ratio(r.userEngagementDuration,r.sessions))]));
  }
  function notices(reports) {
    const data = Object.values(reports), notes=[];
    if (data.some(r=>r.metadata?.subjectToThresholding)) notes.push('Google privacy thresholds may omit some activity.');
    if (data.some(r=>r.metadata?.dataLossFromOtherRow)) notes.push('Some categories are grouped as “(other)”.');
    if (data.some(r=>r.metadata?.samplingMetadatas?.length)) notes.push('Some results are sampled.');
    const limited = Object.entries(reports).filter(([,r])=>r.rowCount>(r.rows||[]).length).map(([key])=>key);
    if (limited.length) notes.push(`Top rows only in: ${limited.join(', ')}. Overall totals are queried separately; exports contain loaded rows.`);
    return notes;
  }
  function cityPagesTable(data, search = '') {
    const groups = new Map();
    for (const r of data) {
      if (!`${r.city} ${r.region} ${r.country}`.toLowerCase().includes(search.toLowerCase())) continue;
      const key = JSON.stringify([r.country,r.region,r.city]);
      if (!groups.has(key)) groups.set(key,{...r,views:0,engagement:0,items:[]});
      const group=groups.get(key); group.views+=r.screenPageViews; group.engagement+=r.userEngagementDuration; group.items.push(r);
    }
    return [...groups.values()].sort((a,b)=>b.views-a.views).slice(0,100).map(g=>`<details class="ov-city"><summary><span><strong>${esc(g.city==='(not set)'?'City unavailable':g.city)}</strong><small>${esc(g.region)} · ${esc(g.country)}</small></span><span>${number(g.views)} views<small>${duration(g.engagement)} engagement</small></span></summary>${table(['Day','Page','Views','Engagement'],g.items.sort((a,b)=>b.date.localeCompare(a.date)||b.screenPageViews-a.screenPageViews).map(r=>[esc(isoDate(r.date)),esc(r.pagePath),number(r.screenPageViews),duration(r.userEngagementDuration)]))}</details>`).join('') || '<p class="ov-empty">No city-level page activity reported.</p>';
  }
  function layout() {
    return `<header class="ov-header"><div><a href="${BASE}/">MTSG</a><span>PRIVATE ANALYTICS</span></div><nav><span class="ov-readonly">Read-only connection</span><a href="${BASE}/">Website ↗</a><button type="button" data-ov-signout>Sign out</button></nav></header>
    <main class="ov-main"><div class="ov-title"><div><p class="ov-eyebrow">Molecular Transport Simulation Group</p><h1>Site Overview<span>.</span></h1><p class="ov-subtitle">A closer look at when, where, and how your work is explored.</p></div><button type="button" data-ov-refresh>↻ Refresh data</button></div>
    <p class="ov-owner-status" data-ov-owner-status></p>
    <form class="ov-toolbar" data-ov-form><label>Reporting period<select aria-label="Reporting period" data-ov-period><option value="week">This week</option><option value="last-week">Last week</option><option value="7">Last 7 days</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option><option value="custom">Custom dates</option></select></label><div class="ov-custom" data-ov-custom hidden><label>From<input type="date" data-ov-start aria-label="From date" required></label><label>Through<input type="date" data-ov-end aria-label="Through date" required></label><button type="submit">Apply dates</button></div><label>Country<select aria-label="Country" data-ov-country><option value="">All countries</option></select></label><label>Device<select aria-label="Device" data-ov-device><option value="">All devices</option><option>desktop</option><option>mobile</option><option>tablet</option><option>smart tv</option></select></label><button class="ov-reset" type="button" data-ov-reset>Reset filters</button></form>
    <div class="ov-statusline"><p data-ov-status role="status" aria-live="polite">Connecting to Google Analytics…</p><span data-ov-zone></span></div><button type="button" data-ov-connect hidden>Renew Google connection</button><div data-ov-content hidden></div>
    <footer class="ov-notes"><p>Your Google Analytics data is fetched directly after owner authorization. No report data is saved to this website or its public source. This dashboard does not record analytics events.</p><details><summary>How to read these reports</summary><p>Visits are GA4 sessions. Active users are deduplicated within each report, not verified individuals; daily or page-level users must not be added to calculate unique people. New users are first_visit / first_open users, not a reliable count of people who have never seen your work.</p><p>Engagement means time the website was in the foreground, not measured reading time. Engagement per visit = total user engagement seconds / sessions. Average session duration is a separate GA metric. Zero seconds can mean no engagement event was reported. An engaged session meets your property’s engagement criteria.</p><p>Weeks run Monday–Sunday in the GA property’s timezone. Today is partial and can change as Google processes events; comparison periods include the corresponding full day. Recent completed days can also change. Missing rows may reflect consent, blockers, thresholds, or processing rather than no visits.</p><p>Locations are approximate and cannot identify a professor, committee, institution, or individual visitor. Sessions can appear in multiple geographic rows, so those counts need not sum to the overall total. Earlier data may include your visits. Future visits from an owner-excluded browser are not sent to Google. Other browsers must be authorized once; clearing site storage removes that exclusion. Country and device filters affect all reports; the page search only filters the page table.</p><p>Traffic from this website’s current pages and historical /MPSG/ addresses is queried; owner routes are excluded. Maps: Natural Earth / US Census via world-atlas / us-atlas; country identifiers by world-countries (ODbL). <a href="https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema" target="_blank" rel="noopener noreferrer">Google’s metric definitions ↗</a></p></details></footer></main>`;
  }
  function render(parent, detail, period, state, maps, timezone) {
    const parsed = Object.fromEntries(Object.entries(detail).map(([key,r])=>[key,rows(r)]));
    const c = parsed.current[0] || emptyTotals(), p = parsed.previous[0] || emptyTotals();
    const daily = dailySeries(parent.daily,period), range = focusRange(period,state.day);
    const {pages=[],sources=[],locations=[],cityPages=[],countries=[],states=[],devices=[],hours=[],events=[],outbound=[]} = parsed;
    const metric = state.metric || 'sessions';
    const focused = state.day ? dateLabel(state.day,{weekday:'long',year:'numeric'}) : `${dateLabel(period.start)} – ${dateLabel(period.end,{year:'numeric'})}`;
    const comparison = `${dateLabel(range.comparisonStart)}${range.comparisonStart!==range.comparisonEnd?' – '+dateLabel(range.comparisonEnd):''}`;
    const kpis = [['Active users',c.activeUsers,p.activeUsers,number,'Deduplicated in this selection'],['Visits',c.sessions,p.sessions,number,`${number(c.engagedSessions)} engaged sessions`],['Page views',c.screenPageViews,p.screenPageViews,number,'Includes repeated page views'],['Engagement / visit',ratio(c.userEngagementDuration,c.sessions),ratio(p.userEngagementDuration,p.sessions),duration,'Foreground time per session'],['Total engagement',c.userEngagementDuration,p.userEngagementDuration,duration,'Foreground time, all visits'],['Engagement rate',ratio(c.engagedSessions,c.sessions),ratio(p.engagedSessions,p.sessions),percent,`${number(c.newUsers)} new users reported`,true]];
    const top = pages.find(r=>!/^\/(?:MPSG\/?)?$/.test(r.pagePath));
    const sortedPages = [...pages].sort((a,b)=>(state.pageSort==='engagement'?b.userEngagementDuration-a.userEngagementDuration:state.pageSort==='users'?b.activeUsers-a.activeUsers:b.screenPageViews-a.screenPageViews));
    const visiblePages = sortedPages.filter(r=>r.pagePath.toLowerCase().includes((state.search||'').toLowerCase()));
    const filteredLocations = locations.filter(r=>`${r.country} ${r.region} ${r.city}`.toLowerCase().includes((state.locationSearch||'').toLowerCase()));
    const warnings = [...new Set([...notices(parent),...notices(detail)])];
    return `<section class="ov-card ov-calendar"><div class="ov-card-title"><div><p class="ov-eyebrow">${esc(period.label)}</p><h2>${dateLabel(period.start)} – ${dateLabel(period.displayEnd,{year:'numeric'})}</h2><p class="ov-help">Select a day to explore its locations, pages, and engagement.</p></div><div class="ov-calendar-controls">${period.mode==='week'?'<button type="button" data-ov-week="-1" aria-label="Previous week">←</button><button type="button" data-ov-week="1" aria-label="Next week" '+(state.weekOffset>=0?'disabled':'')+'>→</button>':''}<label>Daily chart<select aria-label="Daily chart" data-ov-metric><option value="sessions" ${metric==='sessions'?'selected':''}>Visits</option><option value="screenPageViews" ${metric==='screenPageViews'?'selected':''}>Page views</option><option value="userEngagementDuration" ${metric==='userEngagementDuration'?'selected':''}>Engagement time</option></select></label></div></div>${calendar(daily,period,state.day,metric)}<details><summary>Daily numbers · active users, visits, and time</summary>${dailyTable(daily)}</details></section>
    <div class="ov-focus"><div><span class="ov-focus-dot"></span><div><p class="ov-eyebrow">${state.day?'Selected day':'Selected period'}</p><h2>${focused}</h2><p>${state.country?esc(state.country):'All countries'} · ${state.device?esc(state.device):'All devices'}${range.end===period.today?' · Today’s data is partial':''}</p></div></div>${state.day?'<button type="button" data-ov-all>← Full period</button>':''}</div>
    <section class="ov-kpis" aria-label="Metrics for the selected day or period">${kpis.map(([label,now,before,format,help,rate])=>`<article><p>${label}</p><strong>${format(now)}</strong><small><b>${delta(now,before,rate)}</b> vs prior</small><span>${esc(help)}</span></article>`).join('')}</section><p class="ov-comparison">Compared with ${comparison} · ${range.end===period.today?'Current day is partial; comparison day is complete · ':''}Average session duration: ${duration(c.sessions?c.averageSessionDuration:null)}</p>
    <div class="ov-insights"><p><span>Content receiving attention</span>${top?`<strong>${esc(top.pagePath.replace(BASE,'')||'Homepage')}</strong>${number(top.screenPageViews)} views · ${duration(top.userEngagementDuration)} foreground engagement`:'No content-page activity reported.'}</p><p><span>Leading discovery source</span>${sources[0]?`<strong>${esc(sources[0].sessionSourceMedium)}</strong>${number(sources[0].sessions)} visits · ${duration(ratio(sources[0].userEngagementDuration,sources[0].sessions))} engagement / visit`:'No acquisition data reported.'}</p><p><span>Geographic reach</span><strong>${number(countries.filter(r=>r.sessions>0&&r.country!=='(not set)').length)} countries / territories</strong>Approximate locations · historical data may include your visits</p></div>
    ${warnings.length?`<p class="ov-warning">${warnings.map(esc).join(' ')}</p>`:''}
    <section class="ov-card ov-visits" data-ov-visits></section>
    <section class="ov-card ov-city-pages"><div class="ov-card-title"><div><p class="ov-eyebrow">City → pages</p><h2>What was viewed in each city</h2><p class="ov-help">Open a city to see daily page views and foreground time. These are aggregates, not individual visits. City locations are approximate.</p></div><label>Find city<input type="search" data-ov-city-search aria-label="Find city" placeholder="City, region, country…"></label></div><div data-ov-city-pages>${cityPagesTable(cityPages)}</div></section>
    <section class="ov-map-grid" aria-label="Locations for the selected day or period"><article class="ov-card"><div class="ov-section-label">01 / Geographic reach</div><h2>Across the world</h2><p class="ov-help">Sessions by country · country centers, not individual visitors</p>${mapGraphic(maps?.world,countries,'countryId','World map of recorded sessions')}</article><article class="ov-card"><div class="ov-section-label">02 / United States</div><h2>Across the United States</h2><p class="ov-help">Sessions by state · Alaska and Hawaii appear as insets</p>${mapGraphic(maps?.us,states,'region','United States sessions by state')}</article></section>
    <div class="ov-grid"><section class="ov-card ov-full"><div class="ov-card-title"><div><div class="ov-section-label">03 / Time of day</div><h2>When your website is viewed</h2><p class="ov-help">Page views by date and hour · ${esc(timezone)} · Darker means more views</p></div></div>${heatmap(hours,range)}</section>
    <section class="ov-card ov-full"><div class="ov-card-title"><div><div class="ov-section-label">04 / Content</div><h2>Where attention goes</h2><p class="ov-help">Engagement / user is foreground seconds divided by page-level active users.</p></div><div class="ov-table-controls"><label>Sort by<select aria-label="Sort pages by" data-ov-page-sort><option value="views" ${state.pageSort==='views'?'selected':''}>Page views</option><option value="engagement" ${state.pageSort==='engagement'?'selected':''}>Total engagement</option><option value="users" ${state.pageSort==='users'?'selected':''}>Active users</option></select></label><label>Find page<input type="search" data-ov-search aria-label="Find page" value="${esc(state.search||'')}" placeholder="Research, publications…"></label></div></div><div data-ov-pages>${table(['Page','Views','Active users','Total engagement','Engagement / user'],visiblePages.map(r=>[esc(r.pagePath),number(r.screenPageViews),number(r.activeUsers),duration(r.userEngagementDuration),duration(ratio(r.userEngagementDuration,r.activeUsers))]))}</div></section>
    <section class="ov-card ov-full"><div class="ov-card-title"><div><div class="ov-section-label">05 / Locations in detail</div><h2>Where visits come from</h2><p class="ov-help">Country, state / region, and city · approximate · first 100 matching rows shown</p></div><label class="ov-search">Find location<input type="search" data-ov-location-search aria-label="Find location" value="${esc(state.locationSearch||'')}" placeholder="City, state, country…"></label></div><div data-ov-locations>${table(['Location','Visits','Active users','Total engagement','Engagement / visit'],filteredLocations.slice(0,100).map(r=>[`<strong>${esc(r.city||'(not set)')}</strong><small class="ov-cell-sub">${esc(r.region)} · ${esc(r.country)}</small>`,number(r.sessions),number(r.activeUsers),duration(r.userEngagementDuration),duration(ratio(r.userEngagementDuration,r.sessions))]))}</div></section>
    <section class="ov-card ov-wide"><div class="ov-section-label">06 / Discovery</div><h2>How people arrive</h2><p class="ov-help">Source / medium · Direct includes visits without attribution</p>${table(['Source / medium','Visits','Engagement rate','Engagement / visit'],sources.slice(0,20).map(r=>[esc(r.sessionSourceMedium),number(r.sessions),percent(ratio(r.engagedSessions,r.sessions)),duration(ratio(r.userEngagementDuration,r.sessions))]))}</section>
    <section class="ov-card"><div class="ov-section-label">07 / Devices</div><h2>Device mix</h2><p class="ov-help">Share of recorded sessions</p>${bars(devices,'deviceCategory','sessions',c.sessions)}</section>
    <section class="ov-card ov-wide"><div class="ov-section-label">08 / Next steps</div><h2>Outbound destinations</h2><p class="ov-help">Recorded outbound clicks by domain · repeated clicks count separately</p>${table(['Destination domain','Clicks'],outbound.filter(r=>r.linkDomain&&r.linkDomain!=='(not set)').slice(0,20).map(r=>[esc(r.linkDomain),number(r.eventCount)]),'No outbound clicks reported. Enhanced Measurement must already be enabled to collect them.')}</section>
    <section class="ov-card"><div class="ov-section-label">09 / Interactions</div><h2>Recorded actions</h2><p class="ov-help">Event counts · not unique people</p>${table(['Event','Count'],events.filter(r=>!['page_view','session_start','user_engagement','first_visit'].includes(r.eventName)).slice(0,12).map(r=>[esc(r.eventName),number(r.eventCount)]))}</section>
    </div><section class="ov-export"><div><h2>Keep a snapshot</h2><p>Download the loaded aggregate rows. Daily summaries cover the full period; other exports use the selection above.</p></div><div><label class="ov-sr-only" for="ov-export-type">Export report</label><select id="ov-export-type" data-ov-export-type><option value="daily">Daily summary</option><option value="locations">Locations</option><option value="cityPages">City and pages</option><option value="pages">Pages</option><option value="sources">Traffic sources</option></select><button type="button" data-ov-export>Download CSV ↓</button></div></section>`;
  }
  function csv(data) {
    if (!data.length) return '';
    const keys = [...new Set(data.flatMap(row=>Object.keys(row)))];
    const cell = value => {let s=String(value??'');if(typeof value!=='number'&&/^[=+\-@\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    return '\uFEFF'+[keys.map(cell).join(','),...data.map(row=>keys.map(key=>cell(row[key])).join(','))].join('\r\n');
  }
  function exportRows(type, parent, detail, range, timezone) {
    const selected = type==='daily'?parent.daily:detail[type];
    return rows(selected).map(r=>({report:type,timezone,period_start:type==='daily'?parent.current.dateRanges?.[0]?.startDate||'':range.start,period_end:type==='daily'?parent.current.dateRanges?.[0]?.endDate||'':range.end,...r,...('date' in r?{date:isoDate(r.date)}:{})}));
  }
  function normalizeReport(report, query) {
    // GA can omit column headers on a recognized report with no matching rows.
    // Do not accept a missing/malformed response or discard nonempty rows.
    const empty=report && (!report.rows || Array.isArray(report.rows)&&report.rows.length===0) && Number(report.rowCount||0)===0;
    if (!Array.isArray(report?.metricHeaders) && empty && (report.kind==='analyticsData#runReport' || report.metadata?.emptyReason)) {
      return {...report,dimensionHeaders:query.dimensions||[],metricHeaders:query.metrics||[],rows:[],rowCount:0};
    }
    return report;
  }
  async function fetchReports(specs, {propertyId,session,signal,fetcher=fetch}) {
    const entries=Object.entries(specs), result={};
    for(let i=0;i<entries.length;i+=5) {
      const batch=entries.slice(i,i+5);
      const response=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:batchRunReports`, {method:'POST',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({requests:batch.map(([,query])=>query)}),cache:'no-store',credentials:'omit',signal});
      if(!response.ok) {
        const detail=await response.json().catch(()=>({}));
        if(detail.error?.details?.some(d=>d.reason==='SERVICE_DISABLED'))throw new Error('The Google Analytics Data API needs to be enabled for this app.');
        if(response.status===401||response.status===403){const error=new Error('Renew your Google connection to read this Analytics property.');error.connect=true;throw error;}
        if(response.status===429)throw new Error('Google’s request limit was reached. Please retry later.');
        throw new Error(response.status===400?'Google could not run this combination of report fields. Please retry without filters.':'Analytics could not be loaded. Please retry.');
      }
      const body=await response.json();
      if(!Array.isArray(body.reports)||body.reports.length!==batch.length)throw new Error('The analytics response is incomplete.');
      body.reports.forEach((rawReport,j)=> {
        const report=normalizeReport(rawReport,batch[j][1]);
        try { rows(report); } catch { throw new Error(`Google returned an incomplete ${batch[j][0]} report. Please refresh to retry.`); }
        result[batch[j][0]]=report;
      });
    }
    return result;
  }
  function mount({root,propertyId,clientId,getSession,onRenew,onSignOut}) {
    root.className='ov-root'; root.innerHTML=layout();
    const find=selector=>root.querySelector(selector), content=find('[data-ov-content]'), status=find('[data-ov-status]'), refresh=find('[data-ov-refresh]'), connect=find('[data-ov-connect]');
    const ownerStatus=window.MTSGAnalytics?.status();
    find('[data-ov-owner-status]').textContent=ownerStatus?.persisted ? 'Your visits from this browser are excluded from now on, even after sign-out. Historical data is unchanged.' : 'Owner exclusion is active for this page. Allow site storage to keep this browser excluded on future visits.';
    const state={weekOffset:0,day:null,metric:'sessions',country:'',device:'',pageSort:'views',search:'',locationSearch:''};
    let visits,controller,revision=0,removed=false,timezone,parent,detail,period,maps,loadedAt;
    const cache=new Map();
    const mapPromise=fetch(BASE+'/assets/js/owner/map-shapes.json',{credentials:'omit'}).then(r=>r.ok?r.json():null).catch(()=>null);
    const clearData=()=> {parent=detail=null;cache.clear();content.replaceChildren();content.hidden=true;};
    function draw() {if(parent&&detail&&!removed){visits?.dispose();content.innerHTML=render(parent,detail,period,state,maps,timezone);content.hidden=false;visits=window.MTSGVisits?.mount({root:find('[data-ov-visits]'),clientId,range:focusRange(period,state.day),filters:{country:state.country,device:state.device},timezone,getSession,onRenew});}}
    function updateCountries() {
      if(state.country)return;
      const select=find('[data-ov-country]');
      select.innerHTML='<option value="">All countries</option>'+rows(parent.countries).filter(r=>r.country&&r.country!=='(not set)').sort((a,b)=>a.country.localeCompare(b.country)).map(r=>`<option>${esc(r.country)}</option>`).join('');
    }
    async function load({fresh=false,focusOnly=false}={}) {
      const version=++revision;
      controller?.abort();controller=new AbortController();
      const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(45000)]);
      connect.hidden=true;refresh.disabled=true;root.setAttribute('aria-busy','true');
      content.hidden=true;content.replaceChildren();status.textContent='Loading your Google Analytics data…';
      const session=getSession();
      if(!session){clearData();status.textContent='Renew your Google sign-in to load the report.';connect.hidden=false;refresh.disabled=false;root.removeAttribute('aria-busy');return;}
      try {
        if(fresh)cache.clear();
        if(!timezone) {
          const bootstrap=await fetchReports({zone:request({start:'yesterday',end:'yesterday'},[],['sessions'])},{propertyId,session,signal});
          timezone=bootstrap.zone.metadata?.timeZone;
          if(!timezone)throw new Error('Google did not return the reporting timezone. Please retry.');
          // Validate the property timezone before making calendar-date requests.
          todayInZone(timezone);
        }
        const today=todayInZone(timezone);
        find('[data-ov-period] option[value="week"]').textContent=state.weekOffset ? 'Calendar week' : 'This week';
        find('[data-ov-zone]').textContent=timezone+' · GA reporting timezone';
        find('[data-ov-start]').max=today;find('[data-ov-end]').max=today;
        if(!focusOnly||!period||period.today!==today) {
          state.day=null;
          period=periodFor(find('[data-ov-period]').value,today,{weekOffset:state.weekOffset,start:find('[data-ov-start]').value,end:find('[data-ov-end]').value});
          if(!find('[data-ov-start]').value){find('[data-ov-start]').value=period.start;find('[data-ov-end]').value=period.end;}
        }
        const range=focusRange(period,state.day), key=JSON.stringify([range.start,range.end,range.comparisonStart,state.country,state.device]);
        const saved=cache.get(key);
        let reports;
        if(saved&&Date.now()-saved.time<180000)reports=saved.reports;
        else {
          reports=await fetchReports(requests(range,{country:state.country,device:state.device}),{propertyId,session,signal});
          if(removed||version!==revision||!getSession())return;
          cache.set(key,{time:Date.now(),reports});
          if(cache.size>16)cache.delete(cache.keys().next().value);
        }
        maps=await mapPromise;
        if(removed||version!==revision||!getSession())return;
        if(!state.day)parent=reports;
        detail=reports;loadedAt=new Date();updateCountries();draw();
        status.textContent=`Updated ${loadedAt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · Recent data can change as Google processes events.`;
      } catch(error) {
        if(removed||version!==revision||error.name==='AbortError')return;
        parent=detail=null;
        status.textContent=error.name==='TimeoutError'?'Google took too long to respond. Please refresh to retry.':error.message;
        connect.hidden=!error.connect;
      } finally {if(!removed&&version===revision){refresh.disabled=false;root.removeAttribute('aria-busy');}}
    }
    const filterLoad=()=> {state.day=null;state.country=find('[data-ov-country]').value;state.device=find('[data-ov-device]').value;load();};
    find('[data-ov-period]').addEventListener('change',e=> {
      if(e.target.value==='last-week'){e.target.value='week';state.weekOffset=-1;}else state.weekOffset=0;
      find('[data-ov-custom]').hidden=e.target.value!=='custom';
      if(e.target.value!=='custom')filterLoad();
    });
    find('[data-ov-form]').addEventListener('submit',e=>{e.preventDefault();if(find('[data-ov-period]').value==='custom')filterLoad();});
    find('[data-ov-country]').addEventListener('change',filterLoad);find('[data-ov-device]').addEventListener('change',filterLoad);
    refresh.addEventListener('click',()=>load({fresh:true}));
    find('[data-ov-reset]').addEventListener('click',()=>{find('[data-ov-country]').value='';find('[data-ov-device]').value='';filterLoad();});
    connect.addEventListener('click',onRenew);find('[data-ov-signout]').addEventListener('click',onSignOut);
    root.addEventListener('click',e=> {
      const day=e.target.closest('[data-day]');
      if(day&&!day.disabled){state.day=day.dataset.day;load({focusOnly:true});return;}
      if(e.target.closest('[data-ov-all]')){state.day=null;load({focusOnly:true});return;}
      const week=e.target.closest('[data-ov-week]');
      if(week&&!week.disabled){state.weekOffset=Math.min(0,state.weekOffset+Number(week.dataset.ovWeek));load();return;}
      const point=e.target.closest('[data-map-label]');if(point)point.closest('.ov-map').querySelector('[data-map-detail]').textContent=point.dataset.mapLabel;
      const hour=e.target.closest('[data-hour]');if(hour)find('[data-hour-detail]').textContent=hour.dataset.hour;
      if(e.target.closest('[data-ov-export]')&&parent&&detail) {
        const type=find('[data-ov-export-type]').value, range=focusRange(period,state.day);
        const data=exportRows(type,parent,detail,range,timezone).map(row=>({...row,period_start:type==='daily'?period.start:range.start,period_end:type==='daily'?period.end:range.end}));
        if(!data.length){status.textContent='There are no rows to export for this selection.';return;}
        const url=URL.createObjectURL(new Blob([csv(data)],{type:'text/csv;charset=utf-8'})), link=document.createElement('a');link.href=url;link.download=`MTSG-${type}-${type==='daily'?period.start:range.start}-${type==='daily'?period.end:range.end}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
    });
    root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg [data-day],svg [data-map-label]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
    root.addEventListener('focusin',e=>{if(e.target.matches('[data-map-label]'))e.target.closest('.ov-map').querySelector('[data-map-detail]').textContent=e.target.dataset.mapLabel;});
    root.addEventListener('mouseover',e=>{const point=e.target.closest('[data-map-label]');if(point)point.closest('.ov-map').querySelector('[data-map-detail]').textContent=point.dataset.mapLabel;});
    root.addEventListener('change',e=>{if(e.target.matches('[data-ov-metric]')){state.metric=e.target.value;draw();}if(e.target.matches('[data-ov-page-sort]')){state.pageSort=e.target.value;draw();}});
    root.addEventListener('input',e=> {
      if(e.target.matches('[data-ov-city-search]')){find('[data-ov-city-pages]').innerHTML=cityPagesTable(rows(detail.cityPages),e.target.value);return;}
      if(!e.target.matches('[data-ov-search],[data-ov-location-search]'))return;
      const location=e.target.matches('[data-ov-location-search]');state[location?'locationSearch':'search']=e.target.value;
      const target=find(location?'[data-ov-locations]':'[data-ov-pages]');
      // Update just the table; maps and the hourly chart stay untouched.
      if(location) {
        const filtered=rows(detail.locations).filter(r=>`${r.country} ${r.region} ${r.city}`.toLowerCase().includes(state.locationSearch.toLowerCase()));
        target.innerHTML=table(['Location','Visits','Active users','Total engagement','Engagement / visit'],filtered.slice(0,100).map(r=>[`<strong>${esc(r.city||'(not set)')}</strong><small class="ov-cell-sub">${esc(r.region)} · ${esc(r.country)}</small>`,number(r.sessions),number(r.activeUsers),duration(r.userEngagementDuration),duration(ratio(r.userEngagementDuration,r.sessions))]));
      } else {
        const filtered=rows(detail.pages).filter(r=>r.pagePath.toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>state.pageSort==='engagement'?b.userEngagementDuration-a.userEngagementDuration:state.pageSort==='users'?b.activeUsers-a.activeUsers:b.screenPageViews-a.screenPageViews);
        target.innerHTML=table(['Page','Views','Active users','Total engagement','Engagement / user'],filtered.map(r=>[esc(r.pagePath),number(r.screenPageViews),number(r.activeUsers),duration(r.userEngagementDuration),duration(ratio(r.userEngagementDuration,r.activeUsers))]));
      }
    });
    load();
    return {reload:()=>load({fresh:true}),dispose(){visits?.dispose();window.MTSGVisits?.clear();removed=true;revision++;controller?.abort();clearData();root.replaceChildren();}};
  }
  const api={mount};
  if(typeof window!=='undefined')window.MTSGOverview=api;
  if(typeof module!=='undefined')module.exports={...api,cityPagesTable,esc,number,duration,ratio,delta,rows,request,requests,todayInZone,periodFor,focusRange,dailySeries,calendar,heatmap,render,mapGraphic,csv,exportRows,normalizeReport,fetchReports};
})();
