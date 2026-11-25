// A truncated model must not become a reusable cache entry.
export function validModelSize(actual, expected) {
  return Number.isFinite(actual) && Number.isFinite(expected) && expected > 0 && actual >= expected * .85;
}
