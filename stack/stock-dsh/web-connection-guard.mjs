import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
export const guard = `(() => {
  let lost = false;
  async function check() {
    try {
      // Any HTTP response proves transport reachability. 401 is expected
      // without the app's token; it must not be mistaken for a dead server.
      await fetch(location.pathname, {method:'HEAD', cache:'no-store', credentials:'same-origin', signal:AbortSignal.timeout(4000)});
    } catch {
      if (!lost) {
        lost = true;
        const banner = document.createElement('div');
        banner.id = 'halo-connection-lost';
        banner.setAttribute('role','alert');
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px 20px;background:#802b16;color:white;font:14px system-ui;text-align:center;box-shadow:0 2px 8px #0008';
        banner.textContent = 'Connection to DSH was lost. Running/job indicators may be stale. Preserve unsent text and reconnect before relying on progress. No work has been retried by this notice.';
        document.body.appendChild(banner);
      }
    }
  }
  setInterval(check,10000);
  check();
})();`;
const PRISTINE='d3581179edd3dde7208abdd098fa8a95387f84ec3076bea0d2b53e4e91f2d4ec';
export function ensureWebConnectionGuard(deployment) {
  const req=createRequire(join(deployment,'package.json'));
  const cli=createRequire(req.resolve('@deepseek-ai/dsh/package.json'));
  const app=createRequire(cli.resolve('@deepseek-ai/dsh-web-app'));
  const manifest=app.resolve('@deepseek-ai/dsh-web-frontend/package.json');
  const version=JSON.parse(readFileSync(manifest,'utf8')).version;
  if(version!=='0.2.2-rc.1')throw Error('Unreviewed frontend version '+version);
  const target=join(dirname(manifest),'dist','index.html');
  const before=readFileSync(target,'utf8');
  const marker='<script data-halo-connection-guard>';
  const backup=join(deployment,'runtime-patch-backups','web-frontend-'+version+'-index.html.original');
  if(before.includes(marker)){
    if(!existsSync(backup))throw Error('Patched HTML lacks its verified recovery original');
    const original=readFileSync(backup,'utf8');
    if(createHash('sha256').update(original).digest('hex')!==PRISTINE || before!==original.replace('</body>',marker+guard+'</script>\n  </body>'))throw Error('Patched frontend HTML has unrelated drift');
    return {changed:false,target};
  }
  const hash=createHash('sha256').update(before).digest('hex');
  if(hash!==PRISTINE)throw Error('Frontend HTML has unreviewed drift; refusing patch');
  if(!existsSync(backup)){mkdirSync(dirname(backup),{recursive:true});writeFileSync(backup,before);}
  if(before.split('</body>').length!==2)throw Error('Expected one HTML body');
  writeFileSync(target,before.replace('</body>',marker+guard+'</script>\n  </body>'));
  return {changed:true,target};
}
