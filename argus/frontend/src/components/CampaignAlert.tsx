import { memo } from 'react';
import type { AlertEntry } from '../types';

interface CampaignAlertProps {
  showAlert: boolean;
  alertMsg: string;
  alertHistory: AlertEntry[];
  showAlertHistory: boolean;
  onToggleHistory: () => void;
}

function CampaignAlertInner({
  showAlert,
  alertMsg,
  alertHistory,
  showAlertHistory,
  onToggleHistory,
}: CampaignAlertProps) {
  if (showAlert) {
    return (
      <div
        className="absolute top-[60px] right-4 z-[100] bg-[rgba(6,10,20,0.97)] border border-argus-red rounded-lg px-4 py-3 max-w-[300px] animate-slide-alert"
        style={{ boxShadow: '0 0 24px rgba(255,23,68,0.3)' }}
        role="alert"
      >
        <div className="font-mono text-[9px] text-argus-red tracking-[0.2em] mb-1.5">
          ⚠ CAMPAIGN DETECTED
        </div>
        <div className="font-mono text-[10px] text-[#c0d0e0] leading-relaxed">
          {alertMsg}
        </div>
        <div className="mt-1.5 font-mono text-[8px] text-[#5a7090]">
          Correlator flagged · Auto-escalated
        </div>
      </div>
    );
  }

  if (alertHistory.length === 0) return null;

  return (
    <div className="absolute top-[60px] right-4 z-[90]">
      <button
        onClick={onToggleHistory}
        className="font-mono text-[8px] text-argus-orange cursor-pointer tracking-[0.1em] py-1 px-2.5 bg-[rgba(6,10,20,0.9)] border border-[#331500] rounded-md hover:bg-[rgba(6,10,20,1)] transition-colors"
        aria-expanded={showAlertHistory}
        aria-label={`${alertHistory.length} campaign alerts`}
      >
        ⚠ {alertHistory.length} CAMPAIGN{alertHistory.length > 1 ? 'S' : ''} ·{' '}
        {showAlertHistory ? 'HIDE' : 'SHOW'}
      </button>
      {showAlertHistory && (
        <div className="mt-1 bg-[rgba(6,10,20,0.97)] border border-[#331500] rounded-md px-2.5 py-2 max-w-[300px] max-h-[200px] overflow-y-auto">
          {alertHistory.map((a, i) => (
            <div
              key={i}
              className="font-mono text-[9px] text-[#7a8a9a] leading-[1.7] py-0.5"
              style={{
                borderBottom: i < alertHistory.length - 1 ? '1px solid #1a2030' : 'none',
              }}
            >
              <span className="text-[#5a4030]">[{a.ts}]</span> {a.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const CampaignAlert = memo(CampaignAlertInner);
