import { create } from "zustand";
import { ALERT_TYPES, type AlertType, type AlertStatus } from "@/lib/constants";
import { CLIENTS, INITIAL_MESSAGES } from "@/lib/mockData";
import type { Alert, LogEntry, SentMessage } from "@/lib/types";

interface AppState {
  // Navigation
  activeModule: string;
  setActiveModule: (m: string) => void;

  // Clock
  now: Date;
  tickClock: () => void;

  // Alerts
  alerts: Alert[];
  selectedAlertId: string | null;
  setSelectedAlert: (id: string | null) => void;
  setAlertStatus: (id: string, status: AlertStatus) => void;
  pushAlert: (type?: AlertType, clientId?: string) => void;
  pushRealAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
  _nextAlertId: number;

  // Log
  log: LogEntry[];
  addLog: (txt: string) => void;
  _nextLogId: number;

  // Messages
  messages: SentMessage[];
  addMessage: (msg: SentMessage) => void;
  markRead: (id: number) => void;
  _nextMsgId: number;

  // Responsive
  isMobile: boolean;
  isTablet: boolean;
  setIsMobile: (v: boolean) => void;
  setIsTablet: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeModule: "monitoreo",
  setActiveModule: (m) => set({ activeModule: m }),

  now: new Date(),
  tickClock: () => set({ now: new Date() }),

  alerts: [],
  selectedAlertId: null,
  setSelectedAlert: (id) => set({ selectedAlertId: id }),
  setAlertStatus: (id, status) =>
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, status } : a)) })),
  pushAlert: (type, clientId) => {
    const s = get();
    const types = Object.keys(ALERT_TYPES) as AlertType[];
    const t = type || types[Math.floor(Math.random() * types.length)];
    const c = clientId || CLIENTS[Math.floor(Math.random() * CLIENTS.length)].id;
    const id = "a" + s._nextAlertId;
    set({
      alerts: [{ id, clientId: c, type: t, ts: Date.now(), status: "nueva" as const }, ...s.alerts].slice(0, 12),
      selectedAlertId: id,
      _nextAlertId: s._nextAlertId + 1,
    });
  },
  pushRealAlert: (alert) => {
    const s = get();
    set({
      alerts: [alert, ...s.alerts].slice(0, 20),
      selectedAlertId: alert.id,
    });
  },
  removeAlert: (id) =>
    set((s) => {
      const alerts = s.alerts.filter((a) => a.id !== id);
      return { alerts, selectedAlertId: s.selectedAlertId === id ? null : s.selectedAlertId };
    }),
  clearAlerts: () => set({ alerts: [], selectedAlertId: null }),
  _nextAlertId: 100,

  log: [],
  addLog: (txt) => {
    const s = get();
    set({
      log: [{ id: s._nextLogId, txt, ts: Date.now() }, ...s.log].slice(0, 8),
      _nextLogId: s._nextLogId + 1,
    });
  },
  _nextLogId: 1,

  messages: INITIAL_MESSAGES,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  markRead: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, st: "leido" as const } : m)) })),
  _nextMsgId: 50,

  isMobile: typeof window !== "undefined" && window.innerWidth < 820,
  isTablet: typeof window !== "undefined" && window.innerWidth >= 820 && window.innerWidth < 1100,
  setIsMobile: (v) => set({ isMobile: v }),
  setIsTablet: (v) => set({ isTablet: v }),
}));
