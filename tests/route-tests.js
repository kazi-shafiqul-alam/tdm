const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'marswalk.html'), 'utf8');

function fail(msg){ throw new Error(msg); }
function assert(cond,msg){ if(!cond) fail(msg); }

// Load the exact routing script embedded in the website, including its module.exports.
const modulePos = html.indexOf('if (typeof module !== "undefined") module.exports');
assert(modulePos > 0, 'routing module export not found');
const scriptStart = html.lastIndexOf('<script>', modulePos) + '<script>'.length;
const scriptEnd = html.indexOf('</script>', modulePos);
const engineCode = html.slice(scriptStart, scriptEnd);
const sandbox = { module: {exports:{}}, exports:{}, Math, Float64Array, Int32Array, Uint8Array, Infinity, Number, Set };
vm.createContext(sandbox);
vm.runInContext(engineCode, sandbox, {filename:'marswalk-routing.js'});
const E = sandbox.module.exports;
assert(E.planRoute && E.loadGrid && E.checkWalkback, 'routing exports incomplete');

const marker = '<script>window.MARSWALK_DATA=';
const dataStart = html.indexOf(marker);
assert(dataStart >= 0, 'embedded data not found');
const jsonStart = dataStart + marker.length;
const jsonEnd = html.indexOf(';</script>', jsonStart);
const DATA = JSON.parse(html.slice(jsonStart, jsonEnd));
const gridJson = DATA['tile_grid.json'];
const demo = DATA['demo_scenario.json'];
const G = E.loadGrid(gridJson);
const h = demo.habitat;
const B = {budget: demo.budget_s || 18000, reserve: demo.reserve_s || 1800, dwell: demo.dwell_s || 900};
const Thome = E.walkbackMap(G,h);
const results=[];
function test(name, fn){ try{ fn(); results.push([name,'PASS']); } catch(e){ results.push([name,'FAIL',e.message]); } }

function routeFor(stops, preset='balanced'){
  const route = E.planRoute(G, [h, ...stops, h], E.PRESETS[preset]);
  return {route, chk: route ? E.checkWalkback(G, route, Thome, B): null};
}

test('valid base + one destination', ()=>{
  const {route,chk}=routeFor([demo.stops[0]]);
  assert(route, 'route not found');
  assert(chk.ok, `expected feasible demo route, margin=${chk.minMargin}`);
  assert(route.path[0]===h && route.path.at(-1)===h,'route does not return to base');
});

test('multiple destinations', ()=>{
  const {route}=routeFor(demo.stops);
  assert(route,'multi-stop route not found');
  const reached=route.stopAt.map(k=>route.path[k]);
  assert(JSON.stringify(reached)===JSON.stringify(demo.stops),'intermediate stops not preserved in order');
});

test('reordered destinations', ()=>{
  const rev=[...demo.stops].reverse();
  const {route}=routeFor(rev);
  assert(route,'reordered route not found');
  const reached=route.stopAt.map(k=>route.path[k]);
  assert(JSON.stringify(reached)===JSON.stringify(rev),'reordered stop sequence not respected');
});

test('unreachable / blocked destination', ()=>{
  const bad=G.ok.findIndex(v=>v===0);
  assert(bad>=0,'no blocked demo cell found');
  const route=E.planRoute(G,[h,bad,h],E.PRESETS.balanced);
  assert(route===null,'blocked destination unexpectedly routed');
});

test('missing terrain remains unavailable', ()=>{
  const clone=JSON.parse(JSON.stringify(gridJson));
  const idx=demo.stops[0];
  clone.tiles[idx].sand=null; clone.tiles[idx].risk=null; clone.tiles[idx].ok=true;
  const G2=E.loadGrid(clone);
  assert(G2.ok[idx]===0,'missing terrain was not excluded');
  assert(Number.isNaN(G2.sand[idx]) && Number.isNaN(G2.risk[idx]),'missing terrain converted to numeric default');
});

test('configured resource-budget violation', ()=>{
  const route=E.planRoute(G,[h,demo.stops[0],h],E.PRESETS.balanced);
  assert(route,'setup route not found');
  const baseline=E.checkWalkback(G,route,Thome,{budget:1e9,reserve:B.reserve,dwell:B.dwell});
  const tight={budget:baseline.totalTime+B.reserve-1,reserve:B.reserve,dwell:B.dwell};
  const chk=E.checkWalkback(G,route,Thome,tight);
  assert(!chk.ok && chk.minMargin<0,'budget violation was not detected');
});

test('outbound-feasible but return-infeasible case', ()=>{
  const out=E.outboundMap(G,h);
  let target=-1,budget=0;
  for(let i=0;i<G.ok.length;i++){
    if(!G.ok[i]||!Number.isFinite(out[i])||!Number.isFinite(Thome[i])) continue;
    if(Thome[i] > 300 && out[i] > 0){ target=i; budget=out[i]+B.reserve+120; break; }
  }
  assert(target>=0,'could not find test target');
  assert(out[target]+B.reserve < budget,'outbound leg not feasible under constructed budget');
  assert(out[target]+Thome[target]+B.reserve > budget,'constructed case does not fail return');
  const route=E.planRoute(G,[h,target,h],E.PRESETS.fast);
  assert(route,'round-trip route geometry not found');
  const chk=E.checkWalkback(G,route,Thome,{budget,reserve:B.reserve,dwell:0});
  assert(!chk.ok,'walkback check failed to reject return-infeasible plan');
});

test('competing terrain-cost and science objectives', ()=>{
  // Controlled 3x5 grid: direct middle row has high risk; upper row has high science and low risk.
  const rows=3, cols=5, tiles=[];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const i=r*cols+c, direct=r===1, upper=r===0;
    tiles.push({id:`T-${r}-${c}`,elev:0,p90:5,steep:0,sand:0,risk:direct&&c>0&&c<4?0.95:0.05,sci:upper?0.95:0.05,mineral:upper?'carbonate':null,ok:true});
  }
  const C=E.loadGrid({meta:{rows,cols,tile_m:100},candidates:[],tiles});
  const a=5,b=9;
  const fast=E.planRoute(C,[a,b],E.PRESETS.fast);
  const terrain=E.planRoute(C,[a,b],E.PRESETS.safe);
  const science=E.planRoute(C,[a,b],E.PRESETS.science);
  assert(fast&&terrain&&science,'controlled objective route missing');
  assert(fast.path.some(i=>Math.floor(i/cols)===1 && i!==a && i!==b),'fast route did not use direct row');
  assert(terrain.path.some(i=>Math.floor(i/cols)!==1),'terrain-cost route did not detour');
  assert(science.path.some(i=>Math.floor(i/cols)===0),'science objective did not favor science row');
});

test('reset/replan determinism', ()=>{
  const a=E.planRoute(G,[h,...demo.stops,h],E.PRESETS.balanced);
  assert(a,'first plan missing');
  E.planRoute(G,[h,demo.stops[0],h],E.PRESETS.fast); // intervening calculation
  const b=E.planRoute(G,[h,...demo.stops,h],E.PRESETS.balanced);
  assert(b,'second plan missing');
  assert(JSON.stringify(a.path)===JSON.stringify(b.path),'same inputs produced different route');
});


test('identical start and destination', ()=>{
  const route=E.planRoute(G,[h,h],E.PRESETS.fast);
  assert(route,'identity route not produced');
  assert(route.path.length===1 && route.path[0]===h,'identity route should remain at base');
  const chk=E.checkWalkback(G,route,Thome,{budget:B.budget,reserve:B.reserve,dwell:0});
  assert(chk.ok,'zero-distance identity route should satisfy the configured budget');
});

test('very short reachable round trip', ()=>{
  const ns=E.neighbors(G,h,E.PRESETS.fast).map(x=>x[0]).filter(i=>G.ok[i]);
  assert(ns.length,'no reachable neighbor for short-route test');
  const route=E.planRoute(G,[h,ns[0],h],E.PRESETS.fast);
  assert(route && route.path.length>=3,'short round trip missing or disconnected');
  const st=E.routeStats(G,route);
  assert(st.dist>0 && st.dist<1000,`unexpected short-route distance ${st.dist}`);
});

test('long reachable route geometry', ()=>{
  const out=E.outboundMap(G,h);let target=-1,best=-1;
  for(let i=0;i<out.length;i++)if(G.ok[i]&&Number.isFinite(out[i])&&out[i]>best){best=out[i];target=i}
  assert(target>=0 && target!==h,'no distant reachable target found');
  const route=E.planRoute(G,[h,target,h],E.PRESETS.fast);
  assert(route && route.path[0]===h && route.path.at(-1)===h,'long round trip failed to return to base');
  assert(E.routeStats(G,route).dist>1000,'long-route test did not exceed 1 km');
});

test('repeated route calculations remain deterministic', ()=>{
  const first=E.planRoute(G,[h,...demo.stops,h],E.PRESETS.balanced);
  assert(first,'baseline repeated-calculation route missing');
  const sig=JSON.stringify(first.path);
  for(let i=0;i<50;i++){
    const r=E.planRoute(G,[h,...demo.stops,h],E.PRESETS.balanced);
    assert(r && JSON.stringify(r.path)===sig,`route changed on repetition ${i+1}`);
  }
});



test('real terrain schema routes without synthetic sand/risk fields', ()=>{
  const rows=3,cols=3,tiles=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)tiles.push({id:`R-${r}-${c}`,elev:0,p90:3,slope:2,terrain_cost:0.1,coverage:1,ok:true,sci:null,mineral:null});
  const R=E.loadGrid({meta:{rows,cols,tile_m:100,terrain_mode:'real'},candidates:[],tiles});
  assert(R.ok.every(v=>v===1),'real cells were rejected because legacy fields are absent');
  assert(Number.isFinite(R.risk[4]) && Math.abs(R.risk[4]-.1)<1e-9,'terrain_cost was not consumed by route engine');
  assert(E.planRoute(R,[0,8],E.PRESETS.safe),'real-schema route not usable');
});

test('source-derived elevation changes directional modeled travel time', ()=>{
  const mk=(z)=>E.loadGrid({meta:{rows:1,cols:2,tile_m:100,terrain_mode:'real'},candidates:[],tiles:[
    {id:'A',elev:0,p90:2,terrain_cost:.1,coverage:1,ok:true},{id:'B',elev:z,p90:2,terrain_cost:.1,coverage:1,ok:true}]});
  const flat=mk(0), uphill=mk(20);
  assert(E.edgeTime(uphill,0,1)>E.edgeTime(flat,0,1),'elevation gradient did not change travel-time model');
});

test('missing real terrain cost is not traversable', ()=>{
  const R=E.loadGrid({meta:{rows:1,cols:2,tile_m:100,terrain_mode:'real'},candidates:[],tiles:[
    {id:'A',elev:0,p90:2,terrain_cost:.1,coverage:1,ok:true},{id:'B',elev:1,p90:null,terrain_cost:null,coverage:.2,ok:true}]});
  assert(R.ok[1]===0,'unknown real-terrain cell was treated as traversable');
  assert(E.planRoute(R,[0,1],E.PRESETS.fast)===null,'route crossed unknown real-terrain cell');
});

const failed=results.filter(r=>r[1]==='FAIL');
for(const r of results) console.log(`${r[1]}\t${r[0]}${r[2]?` — ${r[2]}`:''}`);
console.log(`TOTAL\t${results.length-failed.length}/${results.length} passed`);
process.exitCode=failed.length?1:0;
