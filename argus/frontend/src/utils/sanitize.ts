// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Input Sanitization
// SECURITY: All attack payloads are untrusted input.
// WARNING: Do NOT use dangerouslySetInnerHTML anywhere in the frontend.
// ═══════════════════════════════════════════════════════════════════════

import type { AttackEvent, RawEvent } from '../types';
import { uid } from './helpers';

/**
 * Defense-in-depth text sanitizer for untrusted strings.
 *
 * PRIMARY XSS DEFENSE: React's JSX escaping. React automatically escapes
 * all values embedded in JSX, preventing script injection. This function
 * is NOT the primary defense — it is a secondary safety net.
 *
 * This helper strips:
 *   - HTML angle brackets (< >)
 *   - Null bytes
 *   - Event handler patterns (onerror=, onload=, onclick=, etc.)
 *   - javascript: / vbscript: / data: URI schemes
 *
 * WARNING: This does NOT make strings safe for dangerouslySetInnerHTML.
 * Do NOT use dangerouslySetInnerHTML anywhere in the frontend.
 * If HTML rendering is ever needed, use a proper allowlist sanitizer (e.g., DOMPurify).
 */
export function sanitizeText(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\x00]/g, '')                          // null bytes
    .replace(/[<>]/g, '')                            // angle brackets
    .replace(/on\w+\s*=/gi, '')                      // event handlers (onerror=, onload=, etc.)
    .replace(/javascript\s*:/gi, '')                 // javascript: URIs
    .replace(/vbscript\s*:/gi, '')                   // vbscript: URIs
    .replace(/data\s*:[^,]*;base64/gi, '');          // data: base64 URIs
}

/**
 * Normalize a raw backend event into the typed AttackEvent shape.
 * All string fields are sanitized at ingestion time.
 */
export function normalizeEvent(ev: RawEvent): AttackEvent {
  return {
    id: ev.id ? Number(ev.id) || uid() : uid(),
    type: sanitizeText(ev.threat_type || 'UNKNOWN'),
    tier: Math.ceil((ev.sophistication || 1) / 2),
    soph: ev.sophistication || 1,
    blocked: ev.action === 'BLOCKED',
    text: sanitizeText(ev.preview || ev.message || ''),
    score: ev.score || 0,
    latency: ev.latency_ms || 0,
    reason: sanitizeText(ev.explanation || ''),
    muts: ev.mutations_preblocked || 0,
    ts: ev.ts ? new Date(ev.ts) : new Date(),
    layer: sanitizeText(ev.layer || ev.method || 'INPUT_FIREWALL'),
  };
}
