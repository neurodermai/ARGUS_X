// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Bypass History Panel
// Shows the last 10 auto-patched bypasses — proof of self-healing.
// Fetches from /api/v1/redteam/bypass-history on mount + periodic refresh.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, memo } from 'react';
import { fonts } from '../theme';
import { THREAT_COLORS } from '../constants';
import { API_URL } from '../utils/config';

interface BypassEntry {
  before: string;
  type: string;
  tier: number;
  score: number;
  cycle: number;
  after: string;
  ts: string;
}

export const BypassHistory = memo(function BypassHistory() {
  const [entries, setEntries] = useState<BypassEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const BASE_INTERVAL = 60000;
    const MAX_INTERVAL = 300000;
    let currentInterval = BASE_INTERVAL;

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/api/v1/redteam/bypass-history`, {
          signal: controller.signal,
        });
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.bypasses && active) {
          setEntries(data.bypasses);
        }
        // Reset backoff on success
        currentInterval = BASE_INTERVAL;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Backoff: 60s → 90s → 120s → capped at 300s
        currentInterval = Math.min(currentInterval * 1.5, MAX_INTERVAL);
      }

      // Schedule next poll only after current one completes (no overlap)
      if (active) {
        setTimeout(poll, currentInterval);
      }
    }

    poll();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <div
      style={{
        background: '#080d1c',
        border: '1px solid #1a2845',
        borderRadius: 8,
        padding: '10px 12px',
        maxHeight: 220,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#00e676',
            boxShadow: '0 0 6px #00e676',
          }}
        />
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 8,
            color: '#3a5070',
            letterSpacing: '0.15em',
          }}
        >
          SELF-HEALING HISTORY
        </div>
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: fonts.mono,
            fontSize: 8,
            color: '#00e676',
          }}
        >
          {entries.length} PATCHES
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            color: '#2a4060',
            textAlign: 'center',
            padding: '12px 0',
          }}
        >
          No bypasses patched yet — system is learning…
        </div>
      )}

      {/* Entries */}
      {entries.map((entry, i) => {
        const isExpanded = expanded === i;
        const color = THREAT_COLORS[entry.type] || '#5a7090';
        const tsDisplay = entry.ts
          ? new Date(entry.ts).toLocaleTimeString('en-US', { hour12: false })
          : '—';

        return (
          <div
            key={`${entry.ts}-${i}`}
            onClick={() => setExpanded(isExpanded ? null : i)}
            style={{
              cursor: 'pointer',
              padding: '5px 6px',
              borderBottom: i < entries.length - 1 ? '1px solid #0f1a30' : 'none',
              transition: 'background 0.15s',
              borderRadius: 4,
              background: isExpanded ? 'rgba(0,230,118,0.04)' : 'transparent',
            }}
          >
            {/* Summary row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 8,
                  color: '#7a9ac0',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.type.replace(/_/g, ' ')}
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 7,
                  color: '#3a5070',
                  flexShrink: 0,
                }}
              >
                T{entry.tier}
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 7,
                  color: '#00e676',
                  flexShrink: 0,
                }}
              >
                PATCHED
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 7,
                  color: '#2a4060',
                  flexShrink: 0,
                }}
              >
                {tsDisplay}
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div
                style={{
                  marginTop: 6,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                  animation: 'slideUp 0.2s ease-out',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 7,
                      color: '#ff1744',
                      letterSpacing: '0.1em',
                      marginBottom: 2,
                    }}
                  >
                    ✕ BYPASS
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 8,
                      color: '#5a7090',
                      background: 'rgba(255,23,68,0.05)',
                      border: '1px solid #1a1020',
                      borderRadius: 4,
                      padding: '4px 6px',
                      wordBreak: 'break-all',
                      maxHeight: 48,
                      overflow: 'hidden',
                      lineHeight: 1.4,
                    }}
                  >
                    {entry.before}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 7,
                      color: '#00e676',
                      letterSpacing: '0.1em',
                      marginBottom: 2,
                    }}
                  >
                    ✓ PATCH
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 8,
                      color: '#5a7090',
                      background: 'rgba(0,230,118,0.05)',
                      border: '1px solid #0a2010',
                      borderRadius: 4,
                      padding: '4px 6px',
                      lineHeight: 1.4,
                      maxHeight: 48,
                      overflow: 'hidden',
                    }}
                  >
                    {entry.after}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
