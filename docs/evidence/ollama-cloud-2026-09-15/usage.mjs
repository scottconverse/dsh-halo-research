export function remainingPercent(usedPercent) {
  if (typeof usedPercent !== 'number' || !Number.isFinite(usedPercent)) {
    return null;
  }

  return Math.min(100, Math.max(0, 100 - usedPercent));
}
