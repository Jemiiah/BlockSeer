// Shared market cache state for API routes
// This allows the predictions route to invalidate the market cache
// when a new prediction is placed

let cacheInvalidated = false;

export function invalidateMarketCache() {
  cacheInvalidated = true;
}

export function consumeInvalidation(): boolean {
  if (cacheInvalidated) {
    cacheInvalidated = false;
    return true;
  }
  return false;
}
