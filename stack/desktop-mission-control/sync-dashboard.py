import pathlib,re,json,hashlib
repo=pathlib.Path(__file__).resolve().parents[2]
source=repo/'stack/stock-dsh/mission-control/mission-control.mjs'
dest=repo/'stack/desktop-mission-control/dashboard.mjs'
s=source.read_text(encoding='utf-8-sig')
def replace(old,new,count=1):
    global s
    if s.count(old)!=count: raise RuntimeError(f'Expected {count} matches: {old[:90]!r}; got {s.count(old)}')
    s=s.replace(old,new)
replace("const PORT = Number(process.env.DSH_MC_PORT || 3090);", """// Desktop adapter: the dashboard below is the verified Web implementation.
// Only host transport, deployment paths, framing and lifecycle differ.
const target = JSON.parse(new URL(import.meta.url).searchParams.get('target') || 'null');
if (!target?.home || !target?.root || !target?.profile || !target?.repoProfile) throw new Error('Desktop dashboard requires explicit deployment paths');
const PORT = target.port || 3091;
let desktopBridge;
let desktopClosing = false;
const dshAvailable = async () => !!desktopBridge && !desktopBridge.signal.aborted && await tcpCheck(+new URL(DSH_ORIGIN).port);""")
replace("const OLLAMA_ORIGIN = process.env.DSH_MC_OLLAMA_ORIGIN || 'http://127.0.0.1:11434';", "const OLLAMA_ORIGIN = target.ollamaOrigin || process.env.DSH_MC_OLLAMA_ORIGIN || 'http://127.0.0.1:11434';")
replace("const OLLAMA_ONLY = process.env.DSH_MC_OLLAMA_ONLY === '1';", "const OLLAMA_ONLY = target.ollamaOnly === true || process.env.DSH_MC_OLLAMA_ONLY === '1';")
replace("const DSH_HOME = path.resolve(process.env.DSH_HOME || path.join(HOME, '.dsh-stock'));", "const DSH_HOME = path.resolve(target.home);")
replace("const DSH_ROOT = path.resolve(process.env.HALO_DSH_ROOT || path.join(path.dirname(SOURCE_FILE), '..'));", "const DSH_ROOT = path.resolve(target.root);")
replace("const MC_DIR = path.resolve(process.env.HALO_MC_DIR || path.join(DSH_HOME, 'mission-control'));", "const MC_DIR = path.resolve(target.dataDir || path.join(DSH_HOME, 'mission-control'));")
replace("    return typeof parsed.version === 'string' && parsed.version.trim() ? parsed.version.trim() : 'unknown';", "    return target.version || (typeof parsed.version === 'string' && parsed.version.trim() ? parsed.version.trim() : 'unknown');")
replace("const DSH_ORIGIN = process.env.DSH_MC_ORIGIN || 'http://127.0.0.1:3080';", "let DSH_ORIGIN = 'http://127.0.0.1:0';")
start=s.index('function validDshLaunchUrl(value) {')
end=s.index('\nasync function openDshInChrome()',start)
s=s[:start]+r"""function validDshLaunchUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.origin === DSH_ORIGIN && url.protocol === 'http:' && url.hostname === '127.0.0.1'
      && !url.username && !url.password && url.pathname === '/' && /^[\w-]+$/.test(url.searchParams.get('token') || '') ? url : null;
  } catch {return null;}
}
function currentDshLaunchUrl() {
  // Native Host authority stays in memory; never inspect a Web log or reuse its token.
  return desktopBridge ? validDshLaunchUrl(desktopBridge.launchUrl()) : null;
}
"""+s[end:]
s=s.replace("'ws://127.0.0.1:3080/api/remote.mux'", "DSH_ORIGIN.replace('http:', 'ws:') + '/api/remote.mux'")
replace('function scheduleMuxReconnect() {', 'function scheduleMuxReconnect() {\n  if (desktopClosing) return;')
# No startup against Web's port, log or cookie. The retained implementation is
# kept close to the upstream Web source for review; Desktop takes the bridge.
s=s.replace('tcpCheck(Number(new URL(DSH_ORIGIN).port))', 'dshAvailable()')
replace('muxConnect();\n\n// Follow only active sessions.', '// The Desktop owner starts the stream after binding its in-process bridge.\n\n// Follow only active sessions.')
replace("setInterval(() => { void pollLlamaDecode(); }, 2000).unref();\nvoid pollLlamaDecode();", "let desktopLlamaTimer;")
replace("const PROFILE_FILE = path.join(DSH_HOME, 'profiles', 'web', 'cordis.patch.yml');", "const PROFILE_FILE = path.resolve(target.profile);")
replace("const REPO_PROFILE_FILE = path.join(DSH_ROOT, 'web-profile', 'cordis.patch.yml');", "const REPO_PROFILE_FILE = path.resolve(target.repoProfile);")
replace("const CORDIS_PATCH = path.join(DSH_HOME, 'cordis.patch.yml');", "const CORDIS_PATCH = path.resolve(target.profile);")
replace("  'start-cockpit': () => safeSpawnStarted('powershell', ['-NoProfile', ...(OLLAMA_ONLY ? [] : ['-ExecutionPolicy', 'Bypass']), '-WindowStyle', 'Hidden', '-File', START_DSH, '-NoOpen', '-KeepMissionControl'], { detached: true, stdio: 'ignore', windowsHide: true }),", "  'start-cockpit': () => { throw new Error('Desktop owns this dashboard lifecycle; reopen the Desktop app normally.'); },")
replace("  'open-dsh': () => openDshInChrome(),", "  'open-dsh': async () => { /* The embedded page navigates its native parent. */ },")
start=s.index('async function openDsh(){')
end=s.index('\nasync function act(a){',start)
s=s[:start]+"""async function openDsh(){
  window.parent.postMessage({type:'desktop-mission-control:open-conversation'}, '*');
}
"""+s[end:]
replace("  res.setHeader('Content-Security-Policy', \"frame-ancestors 'none'; base-uri 'none'; object-src 'none'\");\n  res.setHeader('X-Frame-Options', 'DENY');", "  res.setHeader('Content-Security-Policy', `frame-ancestors dsh-app://app${target.testFrameOrigin ? ' ' + target.testFrameOrigin : ''}; base-uri 'none'; object-src 'none'`);")
# Validate against the current Desktop host, never launch a second Web host.
start=s.index("        if (!fs.existsSync(DSH_BIN)) throw new Error('installed DSH validator")
end=s.index('        const fingerprintAfter = configurationFingerprint();',start)
s=s[:start]+"""        await dshRpc('settings/describe', {});
        const computed = computeSettings(fs.readFileSync(PROFILE_FILE, 'utf8'));
        const warnings = [...computed.refusals];
"""+s[end:]
s=s.replace('const modelRecovery = state.modelRecovery || recoveryState();', 'const modelRecovery = {...(state.modelRecovery || recoveryState()), observeOnly: true};')
s=s.replace("mr.monitorError||(!mr.dshUp", "mr.monitorError||(mr.observeOnly?'observe only (automatic recovery remains with Web)':!mr.dshUp")
s=s.replace("'Web host'", "'Desktop host'").replace('Web host is unavailable', 'Desktop host is unavailable')
s=s.replace('Open DSH in Chrome', 'Open Desktop')
s=s.replace('written to the Web profile', 'written to the Desktop profile')
s=s.replace('running &mdash; this dumps the full config, can take up to 2 minutes&hellip;', 'checking the current Desktop host and editable profile&hellip;')
s=s.replace('HALO Mission Control', 'HALO Desktop Mission Control')
s=s.replace('The values Web DSH actually uses.', 'The values Desktop DSH actually uses.')
s=s.replace('profiles/web/cordis.patch.yml', 'profiles/desktop/cordis.patch.yml')
s=s.replace("'web cordis.patch.yml'", "'desktop cordis.patch.yml'")
s=s.replace('live Web profile', 'live Desktop profile').replace('repository Web profile','repository Desktop profile')
s=s.replace('cockpit :3080 is down', 'Desktop host is unavailable').replace('Cockpit (:3080)', 'Desktop host')
s=s.replace('Open DSH', 'Open Desktop').replace('Open cockpit', 'Open Desktop')
start=s.index("server.listen(PORT, '127.0.0.1', () => {")
s=s[:start]+"""export async function startDesktopDashboard(bridge) {
  if (desktopBridge) throw new Error('Desktop dashboard already started');
  desktopBridge = bridge;
  const launchUrl = new URL(bridge.launchUrl());
  if (launchUrl.protocol !== 'http:' || launchUrl.hostname !== '127.0.0.1' || launchUrl.username || launchUrl.password || !/^[\\w-]+$/.test(launchUrl.searchParams.get('token') || '')) throw new Error('Desktop did not provide a valid authenticated loopback URL');
  DSH_ORIGIN = launchUrl.origin;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => {server.off('error', reject); resolve();});
  });
  muxConnect();
  void appendHistory();
  const historyTimer = setInterval(appendHistory, 60000);
  desktopLlamaTimer = setInterval(() => {void pollLlamaDecode();}, 2000);
  desktopLlamaTimer.unref();
  // Web already owns shared-model automatic recovery. Desktop observes only;
  // opening the panel never loads or recovers a model automatically.
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: async () => {
      desktopClosing = true;
      clearInterval(historyTimer); clearInterval(desktopLlamaTimer);
      clearTimeout(mux.reconnectTimer); clearTimeout(mux.openTimer); clearInterval(mux.watchdogTimer);
      try {mux.socket?.close();} catch {}
      for (const state of liveDecode.values()) {try {state.socket?.close();} catch {}}
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}
"""
dest.write_text(s,encoding='utf-8')
receipt={'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'candidate':str(dest),'candidateSha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'sharedWebSourceChanged':False,'method':'Reuse complete Web dashboard; adapt current Desktop host transport, paths, framing and owned lifecycle. No automatic model recovery.'}
(repo/'stack/desktop-mission-control/web-provenance.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt,indent=2))
