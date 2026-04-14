import { memo } from 'react';

interface SophMeterProps {
  score: number;
}

function SophMeterInner({ score }: SophMeterProps) {
  const color = score <= 3 ? '#00e676' : score <= 6 ? '#ffab00' : '#ff1744';
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="w-[7px] h-2.5 rounded-sm transition-colors duration-300"
          style={{
            background: i < score ? color : '#1a2845',
            boxShadow: i < score ? `0 0 6px ${color}66` : 'none',
          }}
        />
      ))}
      <span className="font-mono text-[10px] ml-1" style={{ color }}>
        {score}/10
      </span>
    </div>
  );
}

export const SophMeter = memo(SophMeterInner);
