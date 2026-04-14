import { memo } from 'react';
import { THREAT_COLORS } from '../constants';
import { SophMeter } from './SophMeter';
import type { AttackEvent } from '../types';

interface FeedItemProps {
  attack: AttackEvent;
}

function FeedItemInner({ attack }: FeedItemProps) {
  const color = THREAT_COLORS[attack.type] || '#ff1744';
  const action = attack.blocked ? 'BLOCKED' : 'PARTIAL';
  const actionColor = attack.blocked ? '#ff1744' : '#ffab00';
  return (
    <div
      className="py-[7px] px-2.5 rounded-[5px] bg-[#080c1a] border border-argus-border animate-slide-left shrink-0"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="py-px px-1.5 rounded-[3px] font-mono text-[8px] font-bold"
          style={{
            background: `${actionColor}18`,
            color: actionColor,
            border: `1px solid ${actionColor}30`,
          }}
        >
          {action}
        </div>
        <div className="font-mono text-[8px]" style={{ color }}>
          {attack.type.replace(/_/g, ' ')}
        </div>
        <div className="ml-auto font-mono text-[8px] text-argus-dim">
          {attack.latency}ms
        </div>
      </div>
      <div className="font-mono text-[9px] text-[#4a6080] whitespace-nowrap overflow-hidden text-ellipsis">
        {attack.text.slice(0, 58)}
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <SophMeter score={attack.soph} />
        {attack.muts > 0 && (
          <span className="font-mono text-[8px] text-[#4a1a80]">
            +{attack.muts} variants
          </span>
        )}
      </div>
    </div>
  );
}

export const FeedItem = memo(FeedItemInner);
