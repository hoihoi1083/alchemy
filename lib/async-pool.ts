/** Run async work over items with a fixed concurrency cap. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length;
  if (n === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, n));
  const results = new Array<R>(n);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= n) return;
      results[i] = await mapper(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
