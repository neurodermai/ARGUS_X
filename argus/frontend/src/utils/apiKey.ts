// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — API Key Manager
//
// SECURITY RISK: API key is stored in sessionStorage which is accessible
// to any JavaScript running on the same origin. If an XSS vulnerability
// exists, an attacker could exfiltrate this key.
//
// IDEAL: Move to HttpOnly cookie-based auth (server sets cookie via
// Set-Cookie header, JS never touches the token). This requires backend
// changes to support cookie-based session auth.
//
// CURRENT MITIGATIONS:
//   1. sessionStorage (not localStorage) — cleared when tab closes
//   2. CSP headers block inline scripts and untrusted script sources
//   3. All LLM output is HTML-escaped before rendering (chat.py)
//   4. In-memory cache reduces storage reads
//
// Never use localStorage for credentials — it persists across sessions.
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'ARGUS_API_KEY';

// In-memory cache (fastest access, cleared on page reload)
let _cachedKey: string | null = null;

/**
 * Get the API key. Checks in-memory cache first, then sessionStorage.
 */
export function getApiKey(): string {
  if (_cachedKey !== null) return _cachedKey;
  if (typeof window !== 'undefined') {
    _cachedKey = sessionStorage.getItem(STORAGE_KEY) || '';

    // MIGRATION: If key exists in localStorage (old behavior), move it
    const legacyKey = localStorage.getItem(STORAGE_KEY);
    if (legacyKey && !_cachedKey) {
      _cachedKey = legacyKey;
      sessionStorage.setItem(STORAGE_KEY, legacyKey);
      localStorage.removeItem(STORAGE_KEY);
    }

    return _cachedKey;
  }
  return '';
}

/**
 * Set the API key. Stores in sessionStorage + in-memory cache.
 */
export function setApiKey(key: string): void {
  _cachedKey = key;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, key);
    // Ensure localStorage copy is removed (migration cleanup)
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Clear the API key from all storage.
 */
export function clearApiKey(): void {
  _cachedKey = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  }
}
