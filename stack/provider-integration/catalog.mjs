// Model listings are discovery, not proof of authentication or successful inference.
export function catalogModels(rows, connected = new Set()) {
  const unique = new Map();
  for (const row of rows) {
    if (typeof row.provider !== 'string' || !row.provider || typeof row.model !== 'string' || !row.model) continue;
    const id = `${row.provider}/${row.model}`;
    if (unique.has(id)) continue;
    const known = Number.isSafeInteger(row.contextWindow) && row.contextWindow > 0;
    const status = connected.has(row.provider) ? 'configured' : 'connect account';
    unique.set(id, { id, name: `${row.name || row.model} [${row.provider}; ${status}${known && row.contextVerified !== false ? '' : '; context unverified'}]`, contextWindow: known ? row.contextWindow : 32768 });
  }
  return [...unique.values()];
}
