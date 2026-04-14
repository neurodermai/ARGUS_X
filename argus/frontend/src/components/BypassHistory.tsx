// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Bypass History Panel
// Shows the last 10 auto-patched bypasses — proof of self-healing.
// Fetches from /api/v1/redteam/bypass-history on mount + periodic refresh.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, memo } from 'react';
import { THREAT_COLORS } from '../constants';
import { API_URL } from '../utils/config';

interface BypassEntry {
  before_hash: string;
  before_preview: string;
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
        currentInterval = BASE_INTERVAL;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        currentInterval = Math.min(currentInterval * 1.5, MAX_INTERVAL);
      }

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
    <div className="bg-argus-panel border border-argus-border rounded-lg px-3 py-2.5 max-h-[220px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className="w-[5px] h-[5px] rounded-full bg-argus-green"
          style={{ boxShadow: '0 0 6px #00e676' }}
        />
        <div className="font-mono text-[8px] text-argus-muted tracking-[0.15em]">
          SELF-HEALING HISTORY
        </div>
        <div className="ml-auto font-mono text-[8px] text-argus-green">
          {entries.length} PATCHES
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="font-mono text-[9px] text-argus-dim text-center py-3">
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
            className="cursor-pointer py-1.5 px-1.5 rounded transition-colors"
            style={{
              borderBottom: i < entries.length - 1 ? '1px solid #0f1a30' : 'none',
              background: isExpanded ? 'rgba(0,230,118,0.04)' : 'transparent',
            }}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onKeyDown={(e) => e.key === 'Enter' && setExpanded(isExpanded ? null : i)}
          >
            {/* Summary row */}
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
              <div className="font-mono text-[8px] text-[#7a9ac0] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {entry.type.replace(/_/g, ' ')}
              </div>
              <div className="font-mono text-[7px] text-argus-muted shrink-0">T{entry.tier}</div>
              <div className="font-mono text-[7px] text-argus-green shrink-0">PATCHED</div>
              <div className="font-mono text-[7px] text-argus-dim shrink-0">{tsDisplay}</div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 animate-slide-up">
                <div>
                  <div className="font-mono text-[7px] text-argus-red tracking-[0.1em] mb-0.5">
                    ✕ BYPASS
                  </div>
                  <div className="font-mono text-[8px] text-[#5a7090] bg-[rgba(255,23,68,0.05)] border border-[#1a1020] rounded p-1 px-1.5 break-all max-h-12 overflow-hidden leading-snug">
                    {entry.before_preview}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[7px] text-argus-green tracking-[0.1em] mb-0.5">
                    ✓ PATCH
                  </div>
                  <div className="font-mono text-[8px] text-[#5a7090] bg-[rgba(0,230,118,0.05)] border border-[#0a2010] rounded p-1 px-1.5 leading-snug max-h-12 overflow-hidden">
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
