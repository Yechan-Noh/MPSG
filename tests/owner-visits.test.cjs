const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const visits=require('../assets/js/owner/visits.js');
const overview=require('../assets/js/owner/overview.js');
const source=fs.readFileSync('assets/js/owner/analytics.js','utf8');
function environment(stored={},pathname='/',hostname='yechan-noh.github.io') {
 const values=new Map(Object.entries(stored)),scripts=[],listeners={},docListeners={};
 const window={addEventListener:(name,fn)=>listeners[name]=fn};
 const context={window,localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},URL,location:{pathname,hostname,href:'https://'+hostname+pathname,origin:'https://'+hostname},document:{addEventListener:(name,fn)=>docListeners[name]=fn,createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}},Date};
 vm.runInNewContext(source,context);return {window,values,scripts,listeners,docListeners,context};
}
test('owners are excluded before loading Google; exclusion survives sign-out and crosses tabs',()=>{
 const env=environment({'mtsg-owner-remembered-v1':'yes'});
 assert.equal(env.scripts.length,0);assert.equal(env.window['ga-disable-G-ZM8MTZDBL3'],true);
 env.values.delete('mtsg-owner-remembered-v1');
 const again=environment(Object.fromEntries(env.values));assert.equal(again.scripts.length,0);
 const visitor=environment();assert.equal(visitor.scripts.length,1);
 visitor.listeners.storage({key:'mtsg-owner-excluded-v1',newValue:'yes'});assert.equal(visitor.window['ga-disable-G-ZM8MTZDBL3'],true);
});
test('public visitor loads only one tag; preview/private routes never collect',()=>{
 const env=environment();vm.runInNewContext(source,env.context);assert.equal(env.scripts.length,1);
 assert.equal(env.window.dataLayer.filter(a=>a[0]==='config').length,1);
 for(const path of ['/dashboard/','/owner/','/MPSG/dashboard/','/MPSG/owner/'])assert.equal(environment({},path).scripts.length,0);
 assert.equal(environment({},'/','127.0.0.1').scripts.length,0);
});
test('session query uses real session identity, parameterized dates and constrained costs',()=>{
 const q=visits.querySpec({start:'2026-11-01',end:'2026-11-06'},{country:"x' OR 1=1"});
 assert.match(q.query,/GROUP BY user_pseudo_id,sid/);assert.ok(!q.query.includes("x' OR 1=1"));assert.equal(q.queryParameters[0].parameterValue.value,'20261101');
 assert.equal(q.maximumBytesBilled,'100000000');assert.equal(q.useLegacySql,false);assert.match(q.query,/LIMIT 501/);assert.match(q.query,/owner\|dashboard/);
});
test('cities with the same name remain separate, and page evidence is escaped',()=>{
 const html=overview.cityPagesTable([{date:'20261106',country:'US',region:'IL',city:'Springfield',pagePath:'/research/',screenPageViews:2,userEngagementDuration:10},{date:'20261106',country:'US',region:'MA',city:'Springfield',pagePath:'<script>',screenPageViews:3,userEngagementDuration:20}]);
 assert.equal((html.match(/<details/g)||[]).length,2);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('2026-11-06'));
});
test('visit rendering keeps separate sessions even in one city and preserves path order',()=>{
 const row={id:'abcdefghijk',first_ms:1793980800000,last_ms:1793980860000,engagement_seconds:30,location:{city:'Chicago',region:'Illinois',country:'United States',device:'desktop'},page_views:2,pages:[{time_ms:1793980800000,path:'/people/'},{time_ms:1793980860000,path:'<research>'}]};
 const html=visits.renderVisits([row,{...row,id:'different'}],'America/Denver');
 assert.equal((html.match(/<details/g)||[]).length,2);const timeline=html.slice(html.indexOf('<ol'));assert.ok(timeline.indexOf('/people/')<timeline.indexOf('&lt;research&gt;'));
});
test('BigQuery query polling, parsing, absent export and missing permission are distinct',async()=>{
 let count=0;const row={id:'one',pages:[]};
 const result=await visits.loadVisits({range:{start:'2026-11-01',end:'2026-11-06'},token:'test',signal:new AbortController().signal,fetcher:async(url,opts)=>{assert.equal(opts.credentials,'omit');return {ok:true,json:async()=>++count===1?{jobComplete:false,jobReference:{projectId:'river-autumn-403814',jobId:'one'}}:{jobComplete:true,totalRows:'1',rows:[{f:[{v:JSON.stringify(row)}]}]}};}});
 assert.equal(count,2);assert.equal(result.visits[0].id,'one');
 assert.match(visits.messageFor(404,{error:{message:'Dataset not found'}}),/first daily export/);
 assert.match(visits.messageFor(403,{error:{message:'Access denied'}}),/permissions/);
});
test('canonical page merging adds views and engagement without summing unique users',()=>{
 const rows=overview.mergePages([{pagePath:'/MPSG/research/',screenPageViews:2,userEngagementDuration:12,activeUsers:1},{pagePath:'/research/',screenPageViews:3,userEngagementDuration:25,activeUsers:1}]);
 assert.equal(rows.length,1);assert.equal(rows[0].screenPageViews,5);assert.equal(rows[0].userEngagementDuration,37);assert.equal(rows[0].activeUsers,undefined);
});
test('journey counts require ordered page evidence and real returning flags',()=>{
 const v=(paths,returning=false)=>({location:{city:'Chicago',country:'US',region:'Illinois'},pages:paths.map(path=>({path})),returning});
 const data=[v(['/MPSG/research/','/publications/'],true),v(['/publications/','/research/']),v(['/people/'])];
 assert.deepEqual(visits.journeySummary(data),{research:2,continued:1,returning:1,scholar:0});
 assert.equal(visits.filterVisits(data,{kind:'sequence'}).length,1);assert.equal(visits.filterVisits(data,{kind:'returning'}).length,1);
 assert.equal(visits.filterVisits(data,{city:JSON.stringify(['US','Massachusetts','Chicago'])}).length,0);
});
test('only consecutive same-page views collapse, preserving later returns',()=>{
 const paths=visits.compactPages(['/MPSG/','/','/research/','/'].map(path=>({path})));
 assert.equal(paths.length,3);assert.equal(paths[0].repeat,2);assert.equal(paths[2].path,'/');
});
test('paper links reject lookalike domains and CV documents',()=>{
 assert.ok(overview.paperLink('https://doi.org/10.123/paper'));assert.ok(!overview.paperLink('https://doi.org.evil.test/paper'));assert.ok(!overview.paperLink('https://yechan-noh.github.io/files/CV.pdf'));
});
test('city filters retain full country and region identity in selected GA reports',()=>{
 const q=overview.requests(overview.periodFor('week','2026-11-06'),{city:JSON.stringify(['United States','Illinois','Springfield'])});
 const f=JSON.stringify(q.current.dimensionFilter);for(const s of ['Illinois','Springfield'])assert.ok(f.includes(s));
 assert.ok(!JSON.stringify(q.locations.dimensionFilter).includes('Springfield'),'map context retains all cities');
});
test('visit query includes explicit selection events and avoids first-acquisition attribution',()=>{
 const q=visits.querySpec({start:'2026-11-06',end:'2026-11-06'}).query;assert.match(q,/ga_session_number/);assert.match(q,/session_traffic_source_last_click/);assert.match(q,/research_paper/);assert.match(q,/SHA256\(user_pseudo_id\)/);
});

test('selection measurement removes query strings and email addresses',()=>{
 const env=environment();
 const click=href=>env.docListeners.click({target:{closest:()=>({href,textContent:'Paper',closest:()=>null})}});
 click('https://doi.org/10.123/paper?private=value');click('mailto:private@example.org');
 const events=env.window.dataLayer.filter(a=>a[0]==='event');
 assert.equal(events[0][2].link_url,'https://doi.org/10.123/paper');assert.equal(events[1][2].link_url,'mailto:');
 env.window.MTSGAnalytics.excludeOwner();click('https://doi.org/10.123/other');assert.equal(env.window.dataLayer.filter(a=>a[0]==='event').length,2);
});
