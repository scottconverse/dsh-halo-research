import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';
import { binary, extension, home, marker, port, profile, ready, relayHome, runBrowse } from './config.mjs';

const endpoint = 'http://127.0.0.1:' + port;

async function relayAvailable() {
  const socket = createConnection({ port, host: '127.0.0.1' });
  try {
    await Promise.race([once(socket, 'connect'), sleep(750).then(() => { throw new Error('connect timed out'); })]);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') return false;
    throw error;
  } finally {
    socket.destroy();
  }
}

async function relayStop(relay) {
  if (!relay || relay.exitCode !== null || relay.signalCode !== null) return;
  const closed = once(relay, 'exit');
  relay.kill();
  await closed;
}

function pair(context, extensionId) {
  const process = runBrowse(['pair', '--wait-seconds', '25'], { stdio: ['ignore', 'pipe', 'ignore'] });
  let output = '';
  const code = new Promise((resolve, reject) => {
    process.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/Pairing code:\s+([A-Z0-9]{4}-[A-Z0-9]{4})(?:\s|$)/i);
      if (match) resolve(match[1]);
    });
    process.once('exit', () => reject(new Error('Browse did not issue a pairing code')));
    process.once('error', reject);
  });
  const exit = once(process, 'exit');
  return (async () => {
    const tab = await context.newPage();
    try {
      const token = await code;
      await tab.goto('chrome-extension://' + extensionId + '/settings.html');
      await tab.locator('details.advanced > summary').click();
      await tab.getByPlaceholder('localhost:19988').fill('localhost:' + port);
      await tab.getByPlaceholder('XXXX-XXXX').fill(token);
      await tab.getByRole('button', { name: 'Connect', exact: true }).click();
      const [status] = await exit;
      if (status !== 0) throw new Error('Browse could not pair its dedicated Chrome profile');
    } finally {
      await tab.close();
      if (process.exitCode === null) process.kill();
    }
  })();
}

async function checkedStatus(relay, id) {
  const status = runBrowse(['status', '--json'], { stdio: ['ignore', 'pipe', 'ignore'] });
  const parts = [];
  status.stdout.on('data', part => parts.push(part));
  const [exit] = await once(status, 'close');
  if (exit !== 0) return false;
  const receipt = JSON.parse(Buffer.concat(parts).toString());
  return receipt.connected === true && receipt.relay?.pid === relay.pid
    && receipt.extension?.origin === 'chrome-extension://' + id;
}

async function start() {
  if (!existsSync(binary) || !existsSync(join(extension, 'manifest.json'))) {
    throw new Error('Install the pinned Browse package and verified extension before starting');
  }
  await mkdir(relayHome, { recursive: true });
  await mkdir(profile, { recursive: true });
  const proof = randomUUID();
  const stopFile = join(home, proof + '.stop');
  await writeFile(marker, JSON.stringify({ pid: process.pid, proof }), { flag: 'wx' });
  let relay;
  let browser;
  let stopping = false;
  let readyWritten = false;
  const stop = () => { stopping = true; };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    if (await relayAvailable()) throw new Error('Browse relay port is already in use');
    browser = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      chromiumSandbox: true,
      args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension],
    });
    browser.on('close', stop);
    const service = browser.serviceWorkers()[0] ?? await browser.waitForEvent('serviceworker', { timeout: 12_000 });
    const extensionId = new URL(service.url()).hostname;
    relay = runBrowse(['serve'], { stdio: ['ignore', 'ignore', 'inherit'] }, {
      OPENCODE_BROWSER_EXTENSION_ORIGINS: 'chrome-extension://' + extensionId,
    });
    let relayError;
    relay.once('error', error => { relayError = error; });
    for (let tries = 0; tries < 40; tries++) {
      if (relayError || relay.exitCode !== null) throw relayError ?? new Error('Owned Browse relay exited');
      if (await relayAvailable()) break;
      if (tries === 39) throw new Error('Browse relay did not start');
      await sleep(250);
    }
    let pairings = {};
    if (existsSync(join(relayHome, 'browsers.json'))) {
      pairings = JSON.parse(await readFile(join(relayHome, 'browsers.json'), 'utf8'));
    }
    if (!Object.keys(pairings).length) await pair(browser, extensionId);
    for (let tries = 0; tries < 30; tries++) {
      if (await checkedStatus(relay, extensionId)) break;
      if (tries === 29) throw new Error('The dedicated Chrome extension did not reconnect to the owned relay');
      await sleep(500);
    }
    await writeFile(ready, proof, { flag: 'wx' });
    readyWritten = true;
    console.log('Headless Browse is ready on ' + endpoint);
    while (!stopping && relay.exitCode === null && !existsSync(stopFile)) await sleep(500);
    if (relay.exitCode !== null) throw new Error('Owned Browse relay exited unexpectedly');
  } finally {
    try {
      await browser?.close();
    } finally {
      if (readyWritten) await unlink(ready);
      await relayStop(relay);
      if (existsSync(stopFile)) await unlink(stopFile);
      await unlink(marker);
    }
  }
}

if (process.argv[2] === 'stop') {
  const { proof } = JSON.parse(await readFile(marker, 'utf8'));
  if (!/^[0-9a-f-]{36}$/.test(proof)) throw new Error('Invalid Browse lease');
  await writeFile(join(home, proof + '.stop'), '');
  for (let tries = 0; tries < 40 && existsSync(marker); tries++) await sleep(250);
  if (existsSync(marker)) throw new Error('Browse stop is still pending');
} else {
  await start();
}
