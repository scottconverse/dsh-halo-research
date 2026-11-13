import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const native = fs.readFileSync(new URL('./dashboard.mjs', import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const web = fs.readFileSync(new URL('../stock-dsh/mission-control/mission-control.mjs', import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const client = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const host = fs.readFileSync(new URL('./index.mjs', import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const between=(s,a,b)=>{const start=s.indexOf(a),end=s.indexOf(b,start+a.length); assert.ok(start>=0 && end>start, 'Required source markers: '+a+' to '+b); return s.slice(start,end);};

test('embedded dashboard preserves complete Web styling, navigation, graph and telemetry rendering',()=>{
  assert.equal(between(native,'<style>','</style>'),between(web,'<style>','</style>'));
  assert.equal(between(native,'<nav class="tabs"','</nav>'),between(web,'<nav class="tabs"','</nav>'));
  for(const name of ['renderOverview','renderModels','renderSessions','renderPlugins']) {
    assert.equal(native.includes('function '+name+'('),web.includes('function '+name+'('));
  }
  assert.equal(between(native,'function mgStartSim(){','function statusWarning(message){'),between(web,'function mgStartSim(){','function statusWarning(message){'));
  for(const id of ['ov-vitals','models-table','sessions-table','plugins-table','settings-body','tab-memory'])assert.ok(native.includes(id),id);
  assert.equal(between(native,'function renderPlugins(){','function renderSystem(s)'),between(web,'function renderPlugins(){','function renderSystem(s)'));
});

test('all existing dashboard API routes and model controls remain available',()=>{
  const routes=s=>[...s.matchAll(/url\.pathname === (['"])(.*?)\1/g)].map(m=>m[2]);
  assert.deepEqual(routes(native),routes(web));
  for(const action of ['load-q5','load-worker','unload-all','load-model','unload-model','stop-session','apply-settings'])assert.ok(native.includes(action),action);
});

test('Desktop authentication accepts only the current host origin and never falls back to the Web log',()=>{
  const body=between(native,'function validDshLaunchUrl(value) {','async function openDshInChrome()');
  const make=url=>new Function('DSH_ORIGIN','desktopBridge',body+'; return {validDshLaunchUrl,currentDshLaunchUrl};')('http://127.0.0.1:54123',{launchUrl:()=>url});
  const api=make('http://127.0.0.1:54123/?token=native-token');
  assert.equal(api.currentDshLaunchUrl().port,'54123');
  for(const url of ['http://127.0.0.1:3080/?token=web-token','https://example.com/?token=x','http://user@127.0.0.1:54123/?token=x'])assert.equal(make(url).currentDshLaunchUrl(),null);
  assert.ok(!body.includes('readFileSync'));
  assert.ok(host.includes('ctx.connection.authenticatedUrl'));
});

test('Web CSRF controls remain intact and Desktop lifecycle never starts automatic model recovery',()=>{
  assert.equal(between(native,'function actionAuthorized(req) {','const HOME ='),between(web,'function actionAuthorized(req) {','const HOME ='));
  assert.ok(native.includes('frame-ancestors dsh-app://app'));
  const start=native.slice(native.indexOf('export async function startDesktopDashboard'));
  assert.ok(!/modelRecoveryTick\s*\(/.test(start));
  assert.ok(start.includes('server.closeAllConnections()'));
  assert.ok(start.includes('desktopClosing = true'));
  assert.ok(!host.includes('spawn('));
});

test('native panel is additive and validates both frame origin and frame window before navigation',()=>{
  let plugin;
  vm.runInNewContext(client,{window:{__ModuleLoader__:{load:d=>{plugin=d.factory(()=>({}));}}}});
  const entries=[];
  plugin.apply({layout:{},slots:{inject:(_name,fn)=>fn(),register:definition=>{entries.push(definition);return()=>{};}}});
  assert.equal(entries.length,2);
  assert.equal(entries[0].key,'desktop-mission-control');
  assert.equal(entries[1].name,'sidebar.panellist');
  assert.ok(client.includes("event.origin !== ORIGIN || event.source !== frame.current?.contentWindow"));
  assert.ok(client.includes("title: 'Desktop Mission Control'"));
});


test('Desktop availability probes its current port once without self recursion', async () => {
  const declaration=native.split('\n').find(line=>line.startsWith('const dshAvailable ='));
  assert.ok(declaration);
  let calls=0;
  const invoke=new Function('desktopBridge','DSH_ORIGIN','tcpCheck',declaration+'; return dshAvailable();');
  assert.equal(await invoke({signal:{aborted:false}},'http://127.0.0.1:54321',async port=>{calls++;assert.equal(port,54321);return true;}),true);
  assert.equal(calls,1);
  assert.equal(await invoke({signal:{aborted:true}},'http://127.0.0.1:54321',()=>{throw Error('aborted bridge must not probe');}),false);
});
