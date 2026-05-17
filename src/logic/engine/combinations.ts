// ============================================================
// Combinatoric Helpers
// ============================================================

/**
 * Generate all C(n, k) combinations from the given array.
 * Returns an array of arrays, each containing k elements.
 *
 * For Dolryeo-daegi: combinations(hand, 3) yields 10 combinations
 * from a 5-card hand (C(5,3) = 10).
 */
export function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];

  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

/**
 * Given an array and a subset, returns the complement
 * (elements in arr that are NOT in subset), compared by reference.
 */
export function complement<T>(arr: T[], subset: T[]): T[] {
  const subsetSet = new Set(subset);
  return arr.filter((item) => !subsetSet.has(item));
}
