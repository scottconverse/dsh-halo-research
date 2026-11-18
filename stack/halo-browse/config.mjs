import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const home = join(process.env.LOCALAPPDATA, 'DSH-Halo-Browse');
export const relayHome = join(home, 'relay');
export const extension = join(home, 'extension-0.1.5');
export const profile = join(home, 'chrome');
export const marker = join(home, 'browser.json');
export const ready = join(home, 'browser.ready');
export const port = 19971;
export const binary = fileURLToPath(new URL('./node_modules/@opencode/browse-windows-x64/bin/browse.exe', import.meta.url));

export const relaySettings = {
  OPENCODE_BROWSER_HOME: relayHome,
  OPENCODE_BROWSER_PORT: String(port),
  OPENCODE_BROWSER_AUTO_UPDATE: 'off',
  OPENCODE_BROWSER_TOOLS: 'plain',
};

export function runBrowse(args, options = {}, extra = {}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !key.toUpperCase().startsWith('OPENCODE_BROWSER_')));
  return spawn(binary, args, { env: { ...env, ...relaySettings, ...extra }, windowsHide: true, ...options });
}
