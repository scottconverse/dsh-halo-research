import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSales } from './sales-summary.mjs';

const sale = (date, category, unitPrice, quantity = 1) =>
  ({ date, category, unitPrice, quantity });

test('summarizes ordinary whole-dollar sales', () => {
  assert.deepEqual(summarizeSales([
    sale('2026-10-12', 'books', '12.00', 2),
    sale('2026-10-13', 'books', '3.00'),
  ]), { totalCents: 2700, units: 3,
    categories: [{ name: 'books', units: 3, totalCents: 2700 }] });
});

test('includes both boundary dates and excludes neighboring dates', () => {
  const result = summarizeSales([
    sale('2026-10-09', 'books', '50.00'),
    sale('2026-10-10', 'books', '2.00'),
    sale('2026-10-11', 'books', '3.00'),
    sale('2026-10-12', 'books', '40.00'),
  ], { from: '2026-10-10', to: '2026-10-11' });
  assert.equal(result.totalCents, 500);
  assert.equal(result.units, 2);
});

test('keeps cents accurate when multiplying quantities', () => {
  const result = summarizeSales([
    sale('2026-10-10', 'supplies', '0.29', 3),
    sale('2026-10-10', 'supplies', '2.35', 2),
  ]);
  assert.equal(result.totalCents, 557);
});

test('orders categories by revenue, with alphabetical ties', () => {
  const result = summarizeSales([
    sale('2026-10-10', 'small', '9.00'),
    sale('2026-10-10', 'zebra', '10.00'),
    sale('2026-10-10', 'alpha', '10.00'),
  ]);
  assert.deepEqual(result.categories.map(c => c.name), ['alpha', 'zebra', 'small']);
});

test('leaves the input unchanged across repeated calls', () => {
  const rows = [sale('2026-10-12', 'b', '2.00'), sale('2026-10-10', 'a', '1.00')];
  const original = structuredClone(rows);
  summarizeSales(rows);
  summarizeSales(rows, { from: '2026-10-10', to: '2026-10-10' });
  assert.deepEqual(rows, original);
});

test('handles an empty selection', () => {
  assert.deepEqual(summarizeSales([], { from: '2026-10-10', to: '2026-10-10' }),
    { totalCents: 0, units: 0, categories: [] });
});
