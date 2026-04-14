import { memo } from 'react';
import type { LogEntry } from '../types';

interface DefenseLogProps {
  entries: LogEntry[];
}

function DefenseLogInner({ entries }: DefenseLogProps) {
  return (
    <div className="bg-argus-bg col-start-2 col-end-3 border-t border-[#0d1628] flex flex-col overflow-hidden">
      <div className="px-3 py-[5px] border-b border-argus-border shrink-0">
        <div className="font-mono text-[8px] tracking-[0.2em] text-argus-muted">
          DEFENSE LOG · REAL-TIME
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 py-1">
        {entries.map((l) => (
          <div
            key={l.id}
            className="font-mono text-[11px] leading-8 flex gap-2.5 animate-slide-up"
          >
            <span className="text-[#1a3050]">[{l.ts}]</span>
            <span style={{ color: l.color }}>[{l.type}]</span>
            <span className="text-[#4a6080]">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const DefenseLog = memo(DefenseLogInner);
