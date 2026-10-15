# Small sales-summary repair

This module summarizes sales for a small shop. Repair defects in sales-summary.mjs without changing its public API or the tests. No dependencies are needed.

Contract:
- from and to are inclusive YYYY-MM-DD dates.
- Inputs contain valid dates, nonnegative decimal unit prices (at most two decimal places), and positive integer quantities.
- Revenue is returned as integer cents. Categories are ordered by revenue descending, then name ascending for ties.
- Return { totalCents, units, categories }, where each category is { name, units, totalCents }.
- Calling the function must not change the input array or its objects.
- An empty selection returns zero totals and an empty category list.

Run: node --test sales-summary.test.mjs
Stay within this directory. Fix the implementation, run the tests, and briefly explain the defects you found. Do not install packages or delegate.
