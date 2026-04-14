// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Patch Banner
// Shows a "VULNERABILITY PATCHED" alert when the system self-heals.
// Displays redacted bypass hash → after (patch applied).
// Auto-dismisses after 8 seconds.
// ═══════════════════════════════════════════════════════════════════════

import { memo } from 'react';
import { THREAT_COLORS } from '../constants';

export interface PatchEvent {
  before_hash: string;
  before_preview: string;
  type: string;
  tier: number;
  after: string;
  ts: string;
}

interface PatchBannerProps {
  patch: PatchEvent | null;
  visible: boolean;
}

export const PatchBanner = memo(function PatchBanner({ patch, visible }: PatchBannerProps) {
  if (!visible || !patch) return null;

  const color = THREAT_COLORS[patch.type] || '#00e676';

  return (
    <div
      className="absolute top-[52px] left-1/2 -translate-x-1/2 z-[200] w-[min(560px,90vw)] rounded-[10px] p-3.5 px-[18px] backdrop-blur-[12px] animate-[slideDown_0.35s_ease-out]"
      style={{
        background: 'rgba(0,230,118,0.06)',
        border: '1px solid rgba(0,230,118,0.25)',
        boxShadow: '0 8px 32px rgba(0,230,118,0.12)',
      }}
      role="alert"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-2 h-2 rounded-full bg-argus-green animate-pulse-fast"
          style={{ boxShadow: '0 0 10px #00e676' }}
        />
        <div className="font-display text-[11px] font-bold text-argus-green tracking-[0.15em]">
          🛡️ VULNERABILITY PATCHED
        </div>
        <div className="ml-auto font-mono text-[7px] text-argus-muted">
          SELF-HEALING · {patch.type.replace(/_/g, ' ')} · TIER {patch.tier}
        </div>
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Before */}
        <div>
          <div className="font-mono text-[7px] text-argus-red tracking-[0.15em] mb-1">
             ✕ BYPASS DETECTED
          </div>
          <div
            className="font-mono text-[8px] text-[#7a9ac0] rounded-[5px] p-1.5 px-2 leading-relaxed max-h-[52px] overflow-hidden break-all"
            style={{
              background: 'rgba(255,23,68,0.06)',
              border: `1px solid ${color}25`,
            }}
          >
            {patch.before_preview}
          </div>
        </div>

        {/* After */}
        <div>
          <div className="font-mono text-[7px] text-argus-green tracking-[0.15em] mb-1">
            ✓ PATCH APPLIED
          </div>
          <div className="font-mono text-[8px] text-[#7a9ac0] bg-[rgba(0,230,118,0.06)] border border-[rgba(0,230,118,0.15)] rounded-[5px] p-1.5 px-2 leading-relaxed max-h-[52px] overflow-hidden">
            {patch.after}
          </div>
        </div>
      </div>
    </div>
  );
});
