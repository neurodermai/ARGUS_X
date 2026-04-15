import { useEffect } from 'react';
import type { WSMessage, LogEntry } from '../types';
import { WS_URL, API_URL } from '../utils/config';
import { normalizeEvent } from '../utils/sanitize';
import { uid } from '../utils/helpers';
import { getApiKey } from '../utils/apiKey';
import { useArgusStore } from '../store/useArgusStore';

/**
 * Fetch a short-lived WS auth token from the backend.
 * Falls back to the raw API key if the endpoint is unavailable.
 * SECURITY: Prevents permanent API keys from appearing in WS frames.
 */
async function getWsToken(): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) return '';
  try {
    const res = await fetch(`${API_URL}/api/v1/ws-token`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return data.token || apiKey;
    }
  } catch {
    /* fallback to raw key */
  }
  return apiKey;
}

/**
 * Manages the WebSocket connection lifecycle.
 * All state updates go directly into the global Zustand store.
 * Call this hook once in the root component (CommandCenter).
 */
export function useRealtimeFeed(): void {
  const store = useArgusStore.getState;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let retries = 0;
    const historyBuf: ReturnType<typeof normalizeEvent>[] = [];
    let historyFlush: ReturnType<typeof setTimeout> | null = null;

    // Get store actions once (stable references)
    const {
      addAttack, addHistoryBatch, addLogEntry, addLogEntries,
      pushSoph, pushLat, setConnected, setLastUpdated,
      setCampaignWsAlert,
    } = store();

    async function connect() {
      // SECURITY: Get a short-lived token BEFORE connecting
      const wsToken = await getWsToken();
      try {
        // SECURITY: No token in URL — auth is sent after connection
        ws = new WebSocket(`${WS_URL}/ws/live`);
      } catch {
        return;
      }

      ws.onopen = () => {
        // Send auth message as first frame (auth-after-connect protocol)
        // Uses short-lived token instead of permanent API key
        if (wsToken) {
          ws!.send(JSON.stringify({ type: 'auth', token: wsToken }));
        }
        retries = 0;
        setConnected(true);
      };

      ws.onmessage = (e: MessageEvent) => {
        try {
          const msg: WSMessage = JSON.parse(e.data);
          if (msg.type === 'ping') return;
          const ev = msg.data;
          if (!ev) return;

          if (msg.type === 'history') {
            historyBuf.push(normalizeEvent(ev));
            if (historyFlush) clearTimeout(historyFlush);
            historyFlush = setTimeout(() => {
              const batch = historyBuf.splice(0);
              addHistoryBatch(batch);
            }, 150);
            return;
          }

          // Campaign alert pushed from correlator
          if (msg.type === 'campaign' && msg.data) {
            const d = msg.data as Record<string, unknown>;
            setCampaignWsAlert({
              pattern: String(d.threat_type || 'UNKNOWN').replace(/_/g, ' '),
              eventCount: Number(d.events_count || 0),
              sourceCount: Number(d.unique_users || 0),
              severity: String(d.severity || 'HIGH'),
            });
            setTimeout(() => setCampaignWsAlert(null), 6000);
            return;
          }

          // Live event (attack, sanitized, clean)
          const atk = normalizeEvent(ev);
          addAttack(atk);
          setLastUpdated(new Date());
          pushSoph(atk.soph);
          pushLat(atk.latency);

          // Defense log entry
          const logEntry: LogEntry = {
            id: uid(),
            ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
            type: atk.blocked ? 'BLOCK' : ev.action === 'SANITIZED' ? 'SANITIZE' : 'CLEAN',
            msg: atk.blocked
              ? `${atk.type.replace(/_/g, ' ')} blocked · T${atk.tier} · ${Math.round(atk.score * 100)}% · ${atk.latency}ms`
              : ev.action === 'SANITIZED'
                ? `⚠ SANITIZED: ${atk.type.replace(/_/g, ' ')} · output auditor`
                : `✓ CLEAN: input passed all layers`,
            color: atk.blocked ? '#00e676' : ev.action === 'SANITIZED' ? '#ffab00' : '#00e5ff',
          };

          if (atk.muts > 0) {
            addLogEntries([
              {
                id: uid(),
                ts: logEntry.ts,
                type: 'MUTATE' as const,
                msg: `Mutation engine: +${atk.muts} variants pre-blocked`,
                color: '#5a0090',
              },
              logEntry,
            ]);
          } else {
            addLogEntry(logEntry);
          }
        } catch {
          /* ignore malformed messages */
        }
      };

      ws.onclose = (event) => {
        setConnected(false);
        // 4003 = auth failure — don't retry with same credentials
        if (event.code === 4003) {
          console.error('ARGUS WS: Authentication failed (4003)');
          return;
        }
        retries++;
        const delay = Math.min(1000 * Math.pow(2, retries), 15000);
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (historyFlush) clearTimeout(historyFlush);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
