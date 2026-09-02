/** Block board save while Run all or any node generation is in flight. */
export function shouldBlockUltraCanvasSave(boardBusy: boolean): boolean {
  return boardBusy;
}

/** Synchronous latch so two rapid Run-all clicks cannot start overlapping loops. */
export function tryAcquireRunAllLatch(runningAll: boolean): boolean {
  if (runningAll) return false;
  return true;
}
