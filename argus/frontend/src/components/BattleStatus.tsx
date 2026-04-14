import { memo } from 'react';

interface BattleStatusProps {
  redAtks: number;
  blueBlocks: number;
  redBypasses: number;
  tier: number;
}

const TIERS = ['NAIVE', 'BASIC', 'OBFUSCATED', 'ADVERSARIAL', 'APEX'];

function BattleStatusInner({ redAtks, blueBlocks, redBypasses, tier }: BattleStatusProps) {
  const blockRate = redAtks > 0 ? Math.round((blueBlocks / redAtks) * 100) : 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-[7px]">
          <div className="w-2 h-2 rounded-full bg-argus-red animate-pulse-fast" />
          <span className="font-mono text-[9px] text-argus-red">
            RED AGENT · {TIERS[Math.min(tier - 1, 4)]}
          </span>
        </div>
        <span className="font-mono text-[9px] text-argus-muted">
          {redAtks} attacks
        </span>
      </div>
      <div className="h-[3px] bg-argus-input rounded-sm">
        <div
          className="h-full bg-argus-red rounded-sm transition-all duration-500"
          style={{ width: `${Math.min((redBypasses / Math.max(redAtks, 1)) * 100 * 5, 100)}%` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-[7px]">
          <div className="w-2 h-2 rounded-full bg-argus-cyan animate-pulse-dot" />
          <span className="font-mono text-[9px] text-argus-cyan">
            ARGUS-X DEFENSE
          </span>
        </div>
        <span className="font-mono text-[9px] text-argus-green">
          {blockRate}% block rate
        </span>
      </div>
      <div className="h-[3px] bg-argus-input rounded-sm">
        <div
          className="h-full bg-argus-cyan rounded-sm transition-all duration-500"
          style={{
            width: `${blockRate}%`,
            boxShadow: '0 0 6px #00e5ff44',
          }}
        />
      </div>
      <div className="font-mono text-[8px] text-argus-dim">
        {redBypasses} bypasses found · {redBypasses} auto-patched
      </div>
    </div>
  );
}

export const BattleStatus = memo(BattleStatusInner);
