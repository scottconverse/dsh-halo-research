# DSH Halo landing site

Static HTML, CSS and a small progressive-enhancement script. No framework, packages, tracking, external fonts, backend or model service is required. The product's Segoe UI stack and navy/teal tokens come from the actual Mission Control source.

## Run and build

With Node 22 or newer, from the repository root:

```powershell
npm run dev --prefix site
# http://127.0.0.1:4178/dsh-halo-research/
npm run build --prefix site
npm test --prefix site
npm run preview --prefix site
```

No npm install is needed. Both source and built previews serve only the explicit public asset list, bind loopback and also support root hosting. Stop the foreground preview with Ctrl+C. A different port can be set through the process's PORT environment variable. No DSH runtime is started.

`site/dist/` is the deployable artifact. Assets are relative, so it works at the GitHub project subpath `/dsh-halo-research/` as well as a domain root. This is one document with fragment navigation, so no SPA rewrite rule or route fallback is needed.

## Deploy

The `Landing page` workflow builds and checks site changes on pull requests and pushes to master. It uploads a Pages-compatible artifact. GitHub Pages is enabled with GitHub Actions. The live site is https://scottconverse.github.io/dsh-halo-research/. Source pushes build/check artifacts; publication remains an explicit deployment.

To publish an updated build, run **Actions → Landing page → Run workflow** on `master` with **deploy** checked. The deploy job uses the standard `github-pages` environment and Pages OIDC permissions. Later deployments use the same explicit workflow dispatch. Any static host can instead serve the contents of `site/dist/`.

Published project URL: https://scottconverse.github.io/dsh-halo-research/. Initial deployment and actual live headless verification completed November 13, 2026.

## Maintain

- `index.html`: positioning, navigation, product capture, architecture, installer and evidence links.
- `styles.css`: product-derived design tokens and responsive layouts.
- `site.js`: optional command copy, menu close and Escape handling; native menu/anchors work without it.
- `scripts/`: explicit-asset build, loopback preview and dependency-free deployment checks.
- `DESIGN.md`: positioning, evidence map and design decisions.

The screenshot is an unchanged real capture from the isolated rc.1 Desktop headless acceptance on November 13, 2026. It uses a metadata-only provider and contains no model output, private paths, tokens or personal sessions. Its source SHA-256 is recorded in the dated site verification report. Keep the test-environment caption; do not turn the capture into a live-status claim.

When changing the installer version, update both page occurrences, the download/checksum links and the Web/Desktop version labels from `stack/complete-windows/components.json`. Recheck public links and build/preview under the project subpath. Review desktop, tablet and mobile renders, keyboard and no-JavaScript navigation. Existing app/installer tests need not be repeated for copy-only changes.

Claims about model calls, accounts, fresh-PC installation or performance require their own evidence. The current site explicitly limits those claims. There is no root repository license grant; upstream components retain their own terms.

## Optional browser acceptance

The dated receipt contains executed checks. To rerun only after relevant site changes, install Playwright in an isolated tooling folder (or use an existing installation), then point `DSH_SITE_PLAYWRIGHT_PACKAGE` at that folder's package.json. Set `DSH_SITE_CHROMIUM` to an existing headless Chromium executable, or use Playwright's installed browser. This avoids adding dependencies to the landing site itself.

From the repository root, after building:

```powershell
node site/scripts/verify-browser.mjs --built
```

It uses an ephemeral loopback port, always launches Chromium with `headless: true`, tests root/project hosting, three viewports, menu/keyboard/copy/no-JavaScript behavior, text contrast and public links, then closes the browser/server. Results go to ignored `site/verification-output/`, or `DSH_SITE_EVIDENCE` when specified. It never starts an application host or model service.
