import type { AlertType, AlertStatus } from "./constants";

export interface Contact {
  ord: number;
  n: string;
  rel: string;
  p: string;
  acceso: boolean;
}

export interface Client {
  id: string;
  name: string;
  age: number;
  barrio: string;
  dir: string;
  entre: string;
  gx: number;
  gy: number;
  color: string;
  device: string;
  bat: number;
  sig: number;
  cond: string[];
  meds: string[];
  contacts: Contact[];
  hr?: number;
  spo2?: number;
  geofence?: boolean;
}

export interface Alert {
  id: string;
  clientId: string;
  type: AlertType;
  ts: number;
  status: AlertStatus;
  // Datos FLIC (opcionales, solo en alertas reales)
  latitude?: string;
  longitude?: string;
  buttonSerial?: string;
  clientName?: string;
  source?: string;
}

export interface LogEntry {
  id: number;
  txt: string;
  ts: number;
}

export interface AgendaItem {
  time: string;
  type: "med" | "remis" | "turno" | "noche";
  client: string;
  detail: string;
}

export interface MessageTemplate {
  k: string;
  icon: string;
  color: string;
  name: string;
  on: boolean;
  body: string;
}

export interface SentMessage {
  id: number;
  c: string;
  tpl: string;
  body: string;
  ts: number;
  st: "enviado" | "leido";
}

export interface WellbeingData {
  flag: boolean;
  sev: string;
  score: number;
  prevent: string;
  sleep: { base: number; today: number };
  steps: { base: number; today: number };
  rhr: { base: number; today: number };
  mood: string;
  tags: string[];
  voice: string;
  talk: { who: "bot" | "cli"; t: string }[];
  family: string;
}
