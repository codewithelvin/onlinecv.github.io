/**
 * Client-side id generator for list items (React key + reorder/remove).
 * Uses the Web Crypto UUID when available, with a safe fallback.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
