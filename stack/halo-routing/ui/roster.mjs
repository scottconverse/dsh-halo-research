/*
 * DEV web-roster facts. ClientModuleRegistry discovers this package through
 * package.json's dsh.client declaration; no direct web route or second server
 * is needed. The registration helper below uses the stock Loader entry API;
 * it does not reach into ClientModuleRegistry's private table.
 */
export const HALO_ROUTER_UI_PACKAGE = '@deepseek-ai/dsh-halo-routing-ui'
export const HALO_ROUTER_UI_ENTRY_ID = 'halo-router-ui'
export const HALO_ROUTER_UI_CLIENT_PATH = './client.js'
export const HALO_ROUTER_UI_INJECT = Object.freeze([
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-api-remotes',
])

/** Exact package metadata consumed by DSH's client module roster. */
export const haloRouterUiClientDeclaration = Object.freeze({
  platform: 'web',
  inject: HALO_ROUTER_UI_INJECT,
  immediately: true,
})

/**
 * Return the one profile dependency/roster row the parent should add to DEV.
 * `url` is the normal module-table URL; `rev` must be changed when the client
 * artifact changes so the browser does not retain an older bundle.
 */
export function haloRouterUiRosterEntry(rev = '0.3.0-dev') {
  if (typeof rev !== 'string' || rev.length === 0) throw new TypeError('halo router UI rev must be a non-empty string')
  return Object.freeze({
    id: HALO_ROUTER_UI_PACKAGE,
    url: `/plugins/${HALO_ROUTER_UI_PACKAGE}/client.js?rev=${encodeURIComponent(rev)}`,
    rev,
    inject: [...HALO_ROUTER_UI_INJECT],
    immediately: true,
  })
}

/**
 * Return the stock Loader entry needed to activate both package faces.
 *
 * The package root is the Node host adapter (`host.mjs`); its `dsh.client`
 * declaration makes ClientModuleRegistry discover `exports["./client"]` and
 * publish the browser bundle in the normal `/plugins/<id>/client.js` graph.
 */
export function haloRouterUiLoaderEntry() {
  return Object.freeze({
    id: HALO_ROUTER_UI_ENTRY_ID,
    name: HALO_ROUTER_UI_PACKAGE,
  })
}

/**
 * Mount the DEV UI through the public Loader API. This is idempotent across
 * repeated parent setup calls and deliberately returns the loader's entry id.
 * The caller must first install this package in the DEV web profile so the
 * loader and ClientModuleRegistry resolve the same package instance.
 */
export async function mountHaloRouterUi(ctx) {
  if (!ctx?.loader || typeof ctx.loader.create !== 'function') {
    throw new TypeError('halo router UI requires the stock loader service')
  }
  for (const entry of ctx.loader.entries?.() ?? []) {
    if (entry.options?.name === HALO_ROUTER_UI_PACKAGE) return entry.id
  }
  return ctx.loader.create(haloRouterUiLoaderEntry())
}

/** Absolute DEV file URL for diagnostics/config generators, never a web route. */
export const haloRouterUiHostUrl = new URL('./host.mjs', import.meta.url).href
