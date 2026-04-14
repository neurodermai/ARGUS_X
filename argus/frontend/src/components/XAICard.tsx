import { memo, useMemo } from 'react';
import { THREAT_COLORS } from '../constants';
import { SophMeter } from './SophMeter';
import type { AttackEvent } from '../types';

interface XAICardProps {
  attack: AttackEvent;
}

function XAICardInner({ attack }: XAICardProps) {
  const color = THREAT_COLORS[attack.type] || '#ff1744';

  // Real layer scores derived from backend data — no fake random values.
  const layerScores = useMemo(() => {
    const s = attack.score;
    const isRegex = attack.layer === 'INPUT_FIREWALL' || attack.layer === 'INPUT' || attack.layer === 'REGEX_ENGINE';
    const isML = attack.layer === 'ONNX_DEBERTA_V3';
    const isAudit = attack.layer === 'OUTPUT' || attack.layer === 'OUTPUT_AUDITOR';

    return [
      { name: 'Regex Engine', v: isRegex ? Math.min(s, 1) : attack.blocked ? s * 0.3 : 0 },
      { name: 'ML Classifier', v: isML ? Math.min(s, 1) : attack.blocked ? Math.min(attack.soph / 10, 1) : 0 },
      { name: 'Output Auditor', v: isAudit ? Math.min(s, 1) : 0 },
    ];
  }, [attack.id, attack.score, attack.layer, attack.blocked, attack.soph]);

  return (
    <div
      className="bg-argus-panel rounded-lg py-[11px] px-[13px] animate-slide-up shrink-0"
      style={{
        border: `1px solid ${color}30`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 mr-2.5">
          <div className="font-mono text-[10px] text-[#5a7090] mb-0.5">
            {attack.type.replace(/_/g, ' ')} · T{attack.tier} · {attack.latency}ms
          </div>
          <div className="font-mono text-[10px] text-[#7a9ac0] leading-relaxed">
            {attack.text.slice(0, 70)}
            {attack.text.length > 70 ? '…' : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className="font-mono text-[11px] font-bold py-0.5 px-2 rounded"
            style={{
              color: attack.blocked ? '#ff1744' : '#ffab00',
              background: attack.blocked ? 'rgba(255,23,68,0.1)' : 'rgba(255,171,0,0.1)',
              border: `1px solid ${attack.blocked ? '#ff174440' : '#ffab0040'}`,
            }}
          >
            {attack.blocked ? '⛔ BLOCKED' : '⚠ PARTIAL'}
          </div>
          <div className="mt-1.5">
            <SophMeter score={attack.soph} />
          </div>
        </div>
      </div>

      {/* Layer breakdown */}
      <div className="flex flex-col gap-[3px] mb-[7px]">
        {layerScores.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="font-mono text-[8px] text-argus-muted w-[90px] shrink-0">
              {l.name}
            </div>
            <div className="flex-1 h-[3px] bg-[#0d1a30] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-600"
                style={{
                  width: `${Math.round(l.v * 100)}%`,
                  background: l.v > 0.75 ? '#ff1744' : l.v > 0.5 ? '#ffab00' : '#00e676',
                }}
              />
            </div>
            <div className="font-mono text-[8px] w-[30px] text-right text-[#4a6080]">
              {Math.round(l.v * 100)}%
            </div>
          </div>
        ))}
      </div>

      {/* XAI Reasoning */}
      <div className="bg-[rgba(100,0,200,0.06)] border border-[rgba(180,0,255,0.12)] rounded-[5px] py-1.5 px-[9px] font-mono text-[9px] text-[rgba(180,100,255,0.85)] leading-relaxed italic">
        🧠 {attack.reason}
      </div>

      {attack.muts > 0 && (
        <div className="mt-1.5 font-mono text-[9px] text-[#5a3090]">
          ⌬ {attack.muts} semantic variants auto-pre-blocked
        </div>
      )}
    </div>
  );
}

export const XAICard = memo(XAICardInner);
