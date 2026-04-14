import { memo } from 'react';

interface ThreatLevelBarProps {
  level: number;
}

const LEVELS = ['MINIMAL', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL'];
const LEVEL_COLORS = ['#00e676', '#69f0ae', '#ffab00', '#ff6d00', '#ff1744', '#ff1744'];

function ThreatLevelBarInner({ level }: ThreatLevelBarProps) {
  const idx = Math.min(level, 5);
  const pct = ((level + 1) / 6) * 100;
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="font-mono text-[8px] text-argus-muted tracking-[0.15em]">
          THREAT LEVEL
        </span>
        <span className="font-mono text-[9px] font-bold" style={{ color: LEVEL_COLORS[idx] }}>
          {LEVELS[idx]}
        </span>
      </div>
      <div className="h-1 bg-argus-input rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: LEVEL_COLORS[idx],
            boxShadow: `0 0 8px ${LEVEL_COLORS[idx]}66`,
          }}
        />
      </div>
    </div>
  );
}

export const ThreatLevelBar = memo(ThreatLevelBarInner);
