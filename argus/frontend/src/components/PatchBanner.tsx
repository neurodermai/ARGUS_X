// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Patch Banner
// Shows a "VULNERABILITY PATCHED" alert when the system self-heals.
// Displays redacted bypass hash → after (patch applied).
// Auto-dismisses after 8 seconds.
// ═══════════════════════════════════════════════════════════════════════

import { memo } from 'react';
import { fonts } from '../theme';
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
      style={{
        position: 'absolute',
        top: 52,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 'min(560px, 90vw)',
        background: 'rgba(0,230,118,0.06)',
        border: '1px solid rgba(0,230,118,0.25)',
        borderRadius: 10,
        padding: '14px 18px',
        backdropFilter: 'blur(12px)',
        animation: 'slideDown 0.35s ease-out',
        boxShadow: '0 8px 32px rgba(0,230,118,0.12)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#00e676',
            boxShadow: '0 0 10px #00e676',
            animation: 'pulse 0.6s ease-in-out infinite',
          }}
        />
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 11,
            fontWeight: 700,
            color: '#00e676',
            letterSpacing: '0.15em',
          }}
        >
          🛡️ VULNERABILITY PATCHED
        </div>
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: fonts.mono,
            fontSize: 7,
            color: '#3a5070',
          }}
        >
          SELF-HEALING · {patch.type.replace(/_/g, ' ')} · TIER {patch.tier}
        </div>
      </div>

      {/* Before / After */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Before */}
        <div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 7,
              color: '#ff1744',
              letterSpacing: '0.15em',
              marginBottom: 4,
            }}
          >
             ✕ BYPASS DETECTED
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 8,
              color: '#7a9ac0',
              background: 'rgba(255,23,68,0.06)',
              border: `1px solid ${color}25`,
              borderRadius: 5,
              padding: '6px 8px',
              lineHeight: 1.5,
              maxHeight: 52,
              overflow: 'hidden',
              wordBreak: 'break-all',
            }}
          >
            {patch.before_preview}
          </div>
        </div>

        {/* After */}
        <div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 7,
              color: '#00e676',
              letterSpacing: '0.15em',
              marginBottom: 4,
            }}
          >
            ✓ PATCH APPLIED
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 8,
              color: '#7a9ac0',
              background: 'rgba(0,230,118,0.06)',
              border: '1px solid rgba(0,230,118,0.15)',
              borderRadius: 5,
              padding: '6px 8px',
              lineHeight: 1.5,
              maxHeight: 52,
              overflow: 'hidden',
            }}
          >
            {patch.after}
          </div>
        </div>
      </div>
    </div>
  );
});
