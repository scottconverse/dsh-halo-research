import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const inject = ['webServer', 'connection'];
export function apply(ctx, config = {}) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const home = process.env.DSH_HOME;
  if (!home) throw new Error('Desktop Mission Control requires DSH_HOME');
  const port = config.port || 3091;
  ctx.effect(async () => {
    const controller = new AbortController();
    const target = {
      home, port, root: config.deploymentRoot || path.resolve(here, '../stock-dsh'),
      profile: path.join(home, 'profiles/desktop/cordis.patch.yml'),
      repoProfile: config.repositoryProfile || path.resolve(here, '../desktop-tuning/cordis.patch.yml'),
      dataDir: path.join(home, 'desktop-mission-control'),
      ollamaOnly: config.ollamaOnly === true, ollamaOrigin: config.ollamaOrigin,
      version: config.version || process.env.DSH_CLIENT_VERSION,
      testFrameOrigin: config.headlessVerification === true ? `http://127.0.0.1:${ctx.webServer.port}` : undefined,
    };
    const url = new URL('./dashboard.mjs', import.meta.url);
    url.searchParams.set('target', JSON.stringify(target));
    const {startDesktopDashboard} = await import(url);
    let dashboard;
    try { dashboard = await startDesktopDashboard({signal: controller.signal,
      launchUrl: () => ctx.connection.authenticatedUrl(`${ctx.webServer.protocol}//127.0.0.1:${ctx.webServer.port}`)}); }
    catch (error) {controller.abort(); throw error;}
    return async () => {controller.abort(); await dashboard.close();};
  }, 'Desktop Mission Control dashboard');
}
