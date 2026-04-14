import { memo } from 'react';
import { Sparkline } from './Sparkline';

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
  sparkData?: number[];
}

function StatCardInner({ label, value, color, sub, sparkData }: StatCardProps) {
  return (
    <div
      className="bg-argus-panel border border-argus-border rounded-lg px-3.5 py-[11px] flex flex-col gap-1"
      style={{ borderTop: `2px solid ${color}` }}
    >
      <div className="font-mono text-[8px] tracking-[0.18em] text-argus-muted uppercase">
        {label}
      </div>
      <div className="font-display text-2xl font-bold leading-none" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[9px] text-argus-muted">{sub}</div>
      )}
      {sparkData && (
        <div className="mt-1">
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  );
}

export const StatCard = memo(StatCardInner);
