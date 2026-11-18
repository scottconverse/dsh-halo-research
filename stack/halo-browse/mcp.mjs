import { readFileSync } from 'node:fs';
import { marker, ready, runBrowse } from './config.mjs';

function connectedLease() {
  try {
    const { proof } = JSON.parse(readFileSync(marker, 'utf8'));
    return proof && readFileSync(ready, 'utf8') === proof ? proof : undefined;
  } catch {
    return undefined;
  }
}

const lease = connectedLease();
if (!lease) throw new Error('Start the isolated Halo Browse companion first');
const child = runBrowse(['mcp'], { stdio: 'inherit' });
const watcher = setInterval(() => {
  if (lease !== connectedLease()) child.kill();
}, 1000);
child.once('exit', code => {
  clearInterval(watcher);
  process.exitCode = code ?? 1;
});
child.once('error', error => {
  clearInterval(watcher);
  console.error(error.message);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill());
