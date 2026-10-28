const EVENT_KEYS = Object.freeze(['id', 'sku', 'kind', 'quantity']);
const STATE_KEYS = Object.freeze(['version', 'events']);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SKU_PATTERN = /^[A-Z0-9_-]{1,32}$/;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactOwnKeys(value, expected) {
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== expected.length) return false;
  if (Object.getOwnPropertySymbols(value).length !== 0) return false;
  return expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function validateEvent(candidate) {
  if (!isPlainObject(candidate) || !hasExactOwnKeys(candidate, EVENT_KEYS)) {
    throw new Error('Invalid event: expected exactly id, sku, kind, quantity');
  }

  const { id, sku, kind, quantity } = candidate;

  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new Error('Invalid event id');
  }
  if (typeof sku !== 'string' || !SKU_PATTERN.test(sku)) {
    throw new Error('Invalid event sku');
  }
  if (kind !== 'receive' && kind !== 'ship') {
    throw new Error('Invalid event kind');
  }
  if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error('Invalid event quantity');
  }

  // Always return a detached record. Callers may mutate their objects later.
  return { id, sku, kind, quantity };
}

function nextBalance(balance, event) {
  if (!Number.isSafeInteger(balance)) throw new Error('Balance is not a safe integer');

  const next = event.kind === 'receive'
    ? balance + event.quantity
    : balance - event.quantity;

  if (!Number.isSafeInteger(next)) {
    throw new Error('Balance overflow');
  }
  if (next < 0) {
    throw new Error('Insufficient stock');
  }
  return next;
}

function validateState(state) {
  if (!isPlainObject(state) || !hasExactOwnKeys(state, STATE_KEYS)) {
    throw new Error('Invalid state: expected {version:1,events:[...]}');
  }
  if (state.version !== 1 || !Array.isArray(state.events)) {
    throw new Error('Invalid state: expected version 1 and an events array');
  }

  const events = [];
  const ids = new Map();
  const balances = new Map();
  const skus = new Set();

  for (let index = 0; index < state.events.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(state.events, index)) {
      throw new Error('Invalid state: sparse events array');
    }
    const event = validateEvent(state.events[index]);
    if (ids.has(event.id)) {
      throw new Error(`Invalid state: duplicate event id ${event.id}`);
    }
    const balance = nextBalance(balances.get(event.sku) ?? 0, event);
    ids.set(event.id, event);
    balances.set(event.sku, balance);
    skus.add(event.sku);
    events.push(event);
  }

  return { events, ids, balances, skus, eventCount: events.length };
}

export function emptyState() {
  return { version: 1, events: [] };
}

export function report(state) {
  const validated = validateState(state);
  const balances = [...validated.skus]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((sku) => ({ sku, quantity: validated.balances.get(sku) }));

  return { balances, eventCount: validated.eventCount };
}

export function applyBatch(state, events) {
  // Validate the complete prior ledger before looking at the incoming batch.
  const validated = validateState(state);
  if (!Array.isArray(events)) {
    throw new Error('Invalid batch: expected an array of events');
  }

  // Work only on detached copies. Nothing here can mutate the caller's state,
  // input event objects, or input array before every event has been accepted.
  const nextEvents = validated.events;
  const ids = validated.ids;
  const balances = validated.balances;

  for (let index = 0; index < events.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(events, index)) {
      throw new Error('Invalid batch: sparse events array');
    }

    const event = validateEvent(events[index]);
    const existing = ids.get(event.id);

    if (existing !== undefined) {
      // Durable idempotency key: equal payload in any key order is a no-op;
      // a different payload under the same id rejects the whole batch.
      if (existing.sku !== event.sku ||
          existing.kind !== event.kind ||
          existing.quantity !== event.quantity) {
        throw new Error(`ID conflict for ${event.id}`);
      }
      continue;
    }

    balances.set(event.sku, nextBalance(balances.get(event.sku) ?? 0, event));
    ids.set(event.id, event);
    nextEvents.push(event);
  }

  return { version: 1, events: nextEvents };
}
