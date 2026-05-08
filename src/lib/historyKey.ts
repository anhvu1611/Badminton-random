/** Returns a normalized pair key "idA-idB" (alphabetical order) */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Increment the count for a pair in a HistoryMap (immutably) */
export function incrementPair(
  map: Record<string, number>,
  a: string,
  b: string,
): Record<string, number> {
  const key = pairKey(a, b);
  return { ...map, [key]: (map[key] ?? 0) + 1 };
}

/** Decrement the count for a pair, removing key when it reaches 0 */
export function decrementPair(
  map: Record<string, number>,
  a: string,
  b: string,
): Record<string, number> {
  const key = pairKey(a, b);
  const current = map[key] ?? 0;
  if (current <= 1) {
    const next = { ...map };
    delete next[key];
    return next;
  }
  return { ...map, [key]: current - 1 };
}

export function getPairCount(
  map: Record<string, number>,
  a: string,
  b: string,
): number {
  return map[pairKey(a, b)] ?? 0;
}
