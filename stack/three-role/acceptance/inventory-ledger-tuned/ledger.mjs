const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SKU_PATTERN = /^[A-Z0-9_-]{1,32}$/;
const EVENT_FIELDS = ['id', 'sku', 'kind', 'quantity'];
const KINDS = new Set(['receive', 'ship']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertEvent(event) {
  if (!isPlainObject(event)) throw new Error('Invalid event: expected an object');
  const keys = Object.keys(event);
  if (keys.length !== EVENT_FIELDS.length || EVENT_FIELDS.some((field) => !Object.hasOwn(event, field)))
    throw new Error('Invalid event: expected exactly id, sku, kind and quantity');
  const { id, sku, kind, quantity } = event;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) throw new Error('Invalid event: invalid id');
  if (typeof sku !== 'string' || !SKU_PATTERN.test(sku)) throw new Error('Invalid event: invalid sku');
  if (!KINDS.has(kind)) throw new Error('Invalid event: invalid kind');
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new Error('Invalid event: quantity must be a positive safe integer');
}

function copyEvent(event) {
  return { id: event.id, sku: event.sku, kind: event.kind, quantity: event.quantity };
}

function sameEvent(left, right) {
  return (
    left.id === right.id &&
    left.sku === right.sku &&
    left.kind === right.kind &&
    left.quantity === right.quantity
  );
}

// Validates stored history and returns detached canonical events plus the running
// balances that history implies. Throws on any malformed, duplicate or overdrawn
// ledger so callers never silently trust a corrupt prior state.
function validateState(state) {
  if (!isPlainObject(state)) throw new Error('Invalid state: expected an object');
  if (state.version !== 1) throw new Error('Invalid state: unsupported version');
  if (!Array.isArray(state.events)) throw new Error('Invalid state: events must be an array');
  const events = [];
  const seenIds = new Set();
  const balances = new Map();
  for (const stored of state.events) {
    assertEvent(stored);
    if (seenIds.has(stored.id)) throw new Error(`Invalid state: duplicate event id ${stored.id}`);
    seenIds.add(stored.id);
    const current = balances.get(stored.sku) ?? 0;
    let next;
    if (stored.kind === 'receive') {
      next = current + stored.quantity;
      if (!Number.isSafeInteger(next))
        throw new Error(`Invalid state: balance overflow for ${stored.sku}`);
    } else {
      if (current < stored.quantity)
        throw new Error(`Invalid state: negative balance for ${stored.sku}`);
      next = current - stored.quantity;
    }
    balances.set(stored.sku, next);
    events.push(copyEvent(stored));
  }
  return { events, balances };
}

export function emptyState() {
  return { version: 1, events: [] };
}

export function report(state) {
  const { events, balances } = validateState(state);
  const rows = [...balances].map(([sku, quantity]) => ({ sku, quantity }));
  rows.sort((left, right) => (left.sku < right.sku ? -1 : left.sku > right.sku ? 1 : 0));
  return { balances: rows, eventCount: events.length };
}

export function applyBatch(state, events) {
  const prior = validateState(state);
  if (!Array.isArray(events)) throw new Error('Invalid batch: expected an array');
  const byId = new Map(prior.events.map((event) => [event.id, event]));
  const nextEvents = prior.events.slice();
  const balances = new Map(prior.balances);
  for (const incoming of events) {
    assertEvent(incoming);
    const existing = byId.get(incoming.id);
    if (existing !== undefined) {
      if (!sameEvent(existing, incoming))
        throw new Error(`Conflicting event id ${incoming.id}`);
      continue;
    }
    const current = balances.get(incoming.sku) ?? 0;
    let next;
    if (incoming.kind === 'receive') {
      next = current + incoming.quantity;
      if (!Number.isSafeInteger(next))
        throw new Error(`Balance overflow for ${incoming.sku}`);
    } else {
      if (current < incoming.quantity)
        throw new Error(`Insufficient stock for ${incoming.sku}`);
      next = current - incoming.quantity;
    }
    const accepted = copyEvent(incoming);
    balances.set(accepted.sku, next);
    byId.set(accepted.id, accepted);
    nextEvents.push(accepted);
  }
  return { version: 1, events: nextEvents };
}
