export function summarizeSales(sales, { from, to } = {}) {
  const start = from ?? '0000-01-01';
  const end = to ?? '9999-12-31';
  const selected = sales
    .filter(sale => sale.date >= start && sale.date <= end);

  const groups = new Map();
  let totalCents = 0;
  let units = 0;
  for (const sale of selected) {
    const lineCents = Math.round(Number(sale.unitPrice) * 100) * sale.quantity;
    totalCents += lineCents;
    units += sale.quantity;
    let category = groups.get(sale.category);
    if (!category) {
      category = { name: sale.category, units: 0, totalCents: 0 };
      groups.set(sale.category, category);
    }
    category.units += sale.quantity;
    category.totalCents += lineCents;
  }

  const categories = [...groups.values()].sort((a, b) =>
    b.totalCents - a.totalCents ||
    a.name.localeCompare(b.name)
  );
  return { totalCents, units, categories };
}
