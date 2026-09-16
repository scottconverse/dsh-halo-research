export type Range = [number, number];
export function mergeRanges(input: Range[]): Range[] {
  const sorted = input.slice().sort(([a], [b]) => a - b);
  const result: Range[] = [];
  for (const range of sorted) {
    const previous = result.at(-1);
    if (previous && range[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], range[1]);
    } else {
      result.push([range[0], range[1]]);
    }
  }
  return result;
}
