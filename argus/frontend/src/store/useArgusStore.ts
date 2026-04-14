// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Zustand Global Store
// Single source of truth for all application state.
// Slices: attacks (WS feed), stats (polling), ui (alerts, patches, loading)
// ═══════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { AttackEvent, LogEntry, AlertEntry } from '../types';
import type { PatchEvent } from '../components/PatchBanner';

// ── Slice Interfaces ────────────────────────────────────────────────

export interface CampaignWsAlert {
  pattern: string;
  eventCount: number;
  sourceCount: number;
  severity: string;
}

interface AttackSlice {
  attacks: AttackEvent[];
  defenseLog: LogEntry[];
  lastUpdated: Date | null;
  sophHistory: number[];
  latHistory: number[];
  connected: boolean;

  addAttack: (atk: AttackEvent) => void;
  addHistoryBatch: (batch: AttackEvent[]) => void;
  addLogEntry: (entry: LogEntry) => void;
  addLogEntries: (entries: LogEntry[]) => void;
  pushSoph: (val: number) => void;
  pushLat: (val: number) => void;
  setConnected: (val: boolean) => void;
  setLastUpdated: (date: Date) => void;
}

interface StatsSlice {
  total: number;
  blocked: number;
  muts: number;
  bypasses: number;
  patched: number;
  tier: number;
  threatLevel: number;
  campaignCount: number;
  threatVelocity: Record<string, number>;
  redAgentRunning: boolean;
  loading: boolean;

  updateStats: (data: Partial<StatsSlice>) => void;
  setLoading: (val: boolean) => void;
}

interface UISlice {
  campaignWsAlert: CampaignWsAlert | null;
  showAlert: boolean;
  alertMsg: string;
  alertHistory: AlertEntry[];
  showAlertHistory: boolean;
  lastPatch: PatchEvent | null;
  showPatch: boolean;

  setCampaignWsAlert: (alert: CampaignWsAlert | null) => void;
  triggerAlert: (msg: string) => void;
  dismissAlert: () => void;
  toggleAlertHistory: () => void;
  triggerPatch: (patch: PatchEvent) => void;
  dismissPatch: () => void;
}

// ── Combined Store Type ─────────────────────────────────────────────

export type ArgusStore = AttackSlice & StatsSlice & UISlice;

// ── Store Implementation ────────────────────────────────────────────

export const useArgusStore = create<ArgusStore>()((set) => ({
  // ── Attack Slice ────────────────────────────────────────────────
  attacks: [],
  defenseLog: [],
  lastUpdated: null,
  sophHistory: [],
  latHistory: [],
  connected: false,

  addAttack: (atk) =>
    set((s) => ({ attacks: [atk, ...s.attacks.slice(0, 59)] })),

  addHistoryBatch: (batch) =>
    set((s) => ({ attacks: [...batch, ...s.attacks].slice(0, 60) })),

  addLogEntry: (entry) =>
    set((s) => ({ defenseLog: [entry, ...s.defenseLog.slice(0, 39)] })),

  addLogEntries: (entries) =>
    set((s) => ({ defenseLog: [...entries, ...s.defenseLog.slice(0, 40 - entries.length)] })),

  pushSoph: (val) =>
    set((s) => ({ sophHistory: [...s.sophHistory.slice(-19), val] })),

  pushLat: (val) =>
    set((s) => ({ latHistory: [...s.latHistory.slice(-19), val] })),

  setConnected: (val) => set({ connected: val }),
  setLastUpdated: (date) => set({ lastUpdated: date }),

  // ── Stats Slice ─────────────────────────────────────────────────
  total: 0,
  blocked: 0,
  muts: 0,
  bypasses: 0,
  patched: 0,
  tier: 1,
  threatLevel: 1,
  campaignCount: 0,
  threatVelocity: {},
  redAgentRunning: false,
  loading: true,

  updateStats: (data) => set((s) => ({ ...s, ...data })),
  setLoading: (val) => set({ loading: val }),

  // ── UI Slice ────────────────────────────────────────────────────
  campaignWsAlert: null,
  showAlert: false,
  alertMsg: '',
  alertHistory: [],
  showAlertHistory: false,
  lastPatch: null,
  showPatch: false,

  setCampaignWsAlert: (alert) => set({ campaignWsAlert: alert }),

  triggerAlert: (msg) =>
    set((s) => ({
      showAlert: true,
      alertMsg: msg,
      alertHistory: [
        { ts: new Date().toLocaleTimeString('en-US', { hour12: false }), msg },
        ...s.alertHistory.slice(0, 19),
      ],
    })),

  dismissAlert: () => set({ showAlert: false }),

  toggleAlertHistory: () =>
    set((s) => ({ showAlertHistory: !s.showAlertHistory })),

  triggerPatch: (patch) => set({ lastPatch: patch, showPatch: true }),
  dismissPatch: () => set({ showPatch: false }),
}));
