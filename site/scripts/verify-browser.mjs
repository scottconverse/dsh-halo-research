import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "./serve.mjs";
const require = createRequire(
  process.env.DSH_SITE_PLAYWRIGHT_PACKAGE ||
    new URL("../package.json", import.meta.url),
);
const { chromium } = require("playwright");
const output = path.resolve(
  process.env.DSH_SITE_EVIDENCE || "site/verification-output",
);
fs.mkdirSync(output, { recursive: true });
const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const evidence = {
  startedAt: new Date().toISOString(),
  headless: true,
  source: "built site/dist",
  viewports: [],
  externalLinks: [],
  errors: [],
  httpFailures: [],
};
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.DSH_SITE_CHROMIUM || undefined,
  });
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => evidence.errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      evidence.httpFailures.push({ url: r.url(), status: r.status() });
  });
  for (const [name, width, height] of [
    ["desktop", 1440, 1050],
    ["tablet", 820, 1100],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      (
        await page.goto(origin + "/dsh-halo-research/", {
          waitUntil: "networkidle",
        })
      ).status(),
      200,
    );
    await page.evaluate(() => document.fonts.ready);
    const measure = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      images: [...document.images].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
      h1: document.querySelectorAll("h1").length,
      anchors: [...document.querySelectorAll('a[href^="#"]')]
        .filter((a) => a.hash && !document.querySelector(a.hash))
        .map((a) => a.hash),
    }));
    assert.ok(measure.scroll <= width, `Overflow ${name}: ${measure.scroll}`);
    assert.ok(measure.images);
    assert.equal(measure.h1, 1);
    assert.deepEqual(measure.anchors, []);
    if (name === "mobile") {
      const summary = page.locator(".mobile-nav summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.ok(await page.locator(".mobile-nav").evaluate((e) => e.open));
      await page.locator('.mobile-nav a[href="#inside"]').click();
      assert.equal(
        await page.locator(".mobile-nav").evaluate((e) => e.open),
        false,
      );
      await summary.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator(".mobile-nav").evaluate((e) => e.open),
        false,
      );
      assert.ok(await summary.evaluate((e) => e === document.activeElement));
    }
    await page.locator(".copy-button").click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      ".\\Install-DSH.cmd",
    );
    assert.equal(
      await page.locator(".copy-status").innerText(),
      "Command copied.",
    );
    await page.goto(origin + "/dsh-halo-research/", {
      waitUntil: "networkidle",
    });
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "Skip to content",
    );
    await page.keyboard.press("Enter");
    assert.equal(new URL(page.url()).hash, "#main");
    await page.evaluate(() => {
      document.activeElement.blur();
      scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(output, name + ".png"),
      fullPage: true,
    });
    if (name === "desktop")
      await page.screenshot({
        path: path.join(output, "desktop-first-screen.png"),
      });
    evidence.viewports.push({
      name,
      ...measure,
      navigation: true,
      copy: true,
      skipLink: true,
    });
  }
  evidence.contrast = await page.evaluate(() => {
    const luminance = (c) =>
      c
        .slice(0, 3)
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const failures = [];
    let checked = 0;
    for (const e of document.querySelectorAll("body *")) {
      if (
        !e.getClientRects().length ||
        !Array.from(e.childNodes).some(
          (n) => n.nodeType === 3 && n.textContent.trim(),
        )
      )
        continue;
      const s = getComputedStyle(e);
      let p = e,
        b;
      while (p) {
        b = parse(getComputedStyle(p).backgroundColor);
        if (b.length === 3 || b[3] === 1) break;
        p = p.parentElement;
      }
      if (!p) continue;
      const colors = [luminance(parse(s.color)), luminance(b)].sort(
        (a, b) => a - b,
      );
      const ratio = (colors[1] + 0.05) / (colors[0] + 0.05);
      const large =
        parseFloat(s.fontSize) >= 24 ||
        (parseFloat(s.fontSize) >= 18.66 && parseInt(s.fontWeight) >= 700);
      checked++;
      if (ratio < (large ? 3 : 4.5))
        failures.push({ text: e.textContent.slice(0, 70), ratio });
    }
    return { checked, failures };
  });
  assert.deepEqual(evidence.contrast.failures, []);
  const links = await page
    .locator("a")
    .evaluateAll((links) => [
      ...new Set(
        links.map((a) => a.href).filter((h) => h.startsWith("https://")),
      ),
    ]);
  for (const url of links) {
    const r = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    evidence.externalLinks.push({ url, status: r.status });
    assert.ok(r.ok, `External link ${r.status}: ${url}`);
  }
  const rootPage = await context.newPage();
  assert.equal(
    (await rootPage.goto(origin + "/", { waitUntil: "networkidle" })).status(),
    200,
  );
  await rootPage.close();
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const np = await noJs.newPage();
  await np.goto(origin + "/dsh-halo-research/");
  await np.locator(".mobile-nav summary").click();
  assert.ok(await np.locator(".mobile-nav nav").isVisible());
  assert.ok(await np.locator('.mobile-nav a[href="#install"]').isVisible());
  await noJs.close();
  evidence.noJavaScriptNavigation = true;
  assert.deepEqual(evidence.errors, []);
  assert.deepEqual(evidence.httpFailures, []);
  evidence.passed = true;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  evidence.serverStopped = true;
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(output, "verification.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
}
