import { useEffect, useMemo, useState } from "react";
import RealMap from "./RealMap";
import { useAlerts, useUpdateAlertStatus } from "@/hooks/useAlerts";
import {
  Siren,
  TriangleAlert,
  MapPinOff,
  BatteryLow,
  Footprints,
  Smile,
  ShieldCheck,
  Radio,
  Phone,
  PhoneCall,
  Truck,
  CheckCircle2,
  Sparkles,
  Pill,
  Key,
  BatteryFull,
  BatteryMedium,
  BatteryWarning,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  ClipboardList,
  Clock,
  User,
  type LucideIcon,
} from "lucide-react";
import { COLORS, ALERT_TYPES, ALERT_STATUSES, CRITICAL_CONDITIONS, colorTint } from "@/lib/constants";
import { api } from "@/lib/api";
import type { AlertType } from "@/lib/constants";
import type { Alert, Client } from "@/lib/types";
import { CLIENTS } from "@/lib/mockData";
import { useAppStore } from "@/stores/useAppStore";
import { initials, timeAgo } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Icon lookup                                                       */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  Siren,
  TriangleAlert,
  MapPinOff,
  BatteryLow,
  Footprints,
  Smile,
};

function alertIcon(type: AlertType): LucideIcon {
  return ICON_MAP[ALERT_TYPES[type].icon] ?? Radio;
}

/* ------------------------------------------------------------------ */
/*  Inline Avatar                                                     */
/* ------------------------------------------------------------------ */

function InlineAvatar({ client, size = 40 }: { client: Client; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: `${client.color}22`,
        color: client.color,
        fontSize: size * 0.34,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials(client.name)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline Battery / Signal                                           */
/* ------------------------------------------------------------------ */

function InlineBattery({ pct }: { pct: number }) {
  const Icon = pct > 60 ? BatteryFull : pct > 25 ? BatteryMedium : BatteryWarning;
  const color = pct > 60 ? COLORS.aqua : pct > 25 ? COLORS.amber : COLORS.coral;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderRadius: 8,
        backgroundColor: COLORS.panel2,
      }}
    >
      <Icon size={16} color={color} />
      <span style={{ fontSize: 13, color: COLORS.ink }}>{pct}%</span>
      <span style={{ fontSize: 11, color: COLORS.sub, marginLeft: "auto" }}>Batería</span>
    </div>
  );
}

function InlineSignal({ bars }: { bars: number }) {
  const Icon = bars >= 4 ? Signal : bars >= 3 ? SignalHigh : bars >= 2 ? SignalMedium : SignalLow;
  const color = bars >= 3 ? COLORS.aqua : bars >= 2 ? COLORS.amber : COLORS.coral;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderRadius: 8,
        backgroundColor: COLORS.panel2,
      }}
    >
      <Icon size={16} color={color} />
      <span style={{ fontSize: 13, color: COLORS.ink }}>{bars}/4</span>
      <span style={{ fontSize: 11, color: COLORS.sub, marginLeft: "auto" }}>Señal</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Triage score                                                      */
/* ------------------------------------------------------------------ */

function triageScore(alert: Alert, client: Client): number {
  const meta = ALERT_TYPES[alert.type];
  const age = client.age;
  const hasCritical = client.cond.some((c) =>
    CRITICAL_CONDITIONS.some((cc) => c.includes(cc))
  );
  const hasGeo = client.geofence === true;
  const secsSince = Math.max(0, (Date.now() - alert.ts) / 1000);
  const recency = Math.max(0, 150 - secsSince);
  return meta.priority * 1000 + age + (hasCritical ? 45 : 0) + (hasGeo ? 15 : 0) + recency;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function clientById(id: string, alert?: Alert): Client {
  const found = CLIENTS.find((c) => c.id === id);
  if (found) return found;
  // Fallback para alertas reales (FLIC) sin cliente mock
  return {
    id,
    name: alert?.clientName || `Dispositivo ${alert?.buttonSerial || id}`,
    age: 0,
    barrio: "Sin asignar",
    dir: alert?.latitude && alert?.longitude
      ? `GPS: ${alert.latitude}, ${alert.longitude}`
      : "Ubicacion desconocida",
    entre: "",
    gx: 0.5,
    gy: 0.5,
    color: "#FF5A5F",
    device: alert?.buttonSerial || "FLIC",
    bat: 0,
    sig: 4,
    cond: [],
    meds: [],
    contacts: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Tab switcher (mobile)                                             */
/* ------------------------------------------------------------------ */

function MobileTabSwitcher({
  activeTab,
  setActiveTab,
  alertCount,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  alertCount: number;
}) {
  const tabs = [
    { key: "alertas", label: "Alertas", badge: alertCount },
    { key: "mapa", label: "Mapa" },
    { key: "ficha", label: "Ficha" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "4px",
        backgroundColor: COLORS.panel,
        borderRadius: 10,
        marginBottom: 8,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          className="sc-btn"
          onClick={() => setActiveTab(t.key)}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: activeTab === t.key ? COLORS.panel2 : "transparent",
            color: activeTab === t.key ? COLORS.ink : COLORS.sub,
          }}
        >
          {t.label}
          {t.badge ? (
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                backgroundColor: COLORS.coral,
                color: "#fff",
                borderRadius: 8,
                padding: "1px 6px",
              }}
            >
              {t.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert Card                                                        */
/* ------------------------------------------------------------------ */

function AlertCard({
  alert,
  client,
  selected,
  onClick,
}: {
  alert: Alert;
  client: Client;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = ALERT_TYPES[alert.type];
  const statusMeta = ALERT_STATUSES[alert.status];
  const Icon = alertIcon(alert.type);
  const isHighPrio = meta.priority >= 3;
  const isActive = alert.status !== "resuelta";

  return (
    <button
      className="sc-btn sc-card"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: selected ? `1.5px solid ${meta.hex}` : `1px solid ${COLORS.line}`,
        backgroundColor: selected ? colorTint(meta.hex, "faint") : COLORS.panel,
        borderRadius: 10,
        padding: 12,
        cursor: "pointer",
        opacity: isActive ? 1 : 0.55,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      {/* Avatar with optional pulse */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <InlineAvatar client={client} size={38} />
        {isHighPrio && isActive && (
          <div
            style={{
              position: "absolute",
              inset: -3,
              borderRadius: "50%",
              border: `2px solid ${meta.hex}`,
              animation: "pulseRing 1.8s ease-in-out infinite",
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Type row */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          <Icon size={14} color={meta.hex} />
          <span style={{ fontSize: 12, fontWeight: 600, color: meta.hex }}>{meta.label}</span>
        </div>
        {/* Name */}
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{client.name}</div>
        {/* Address */}
        <div style={{ fontSize: 11, color: COLORS.sub, marginTop: 1 }}>
          {client.dir} · {client.barrio}
        </div>
        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: COLORS.faint }}>{timeAgo(alert.ts)}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 6,
              backgroundColor: `${COLORS[statusMeta.color as keyof typeof COLORS]}22`,
              color: COLORS[statusMeta.color as keyof typeof COLORS],
            }}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Botón borrar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          useAppStore.getState().removeAlert(alert.id);
        }}
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: COLORS.faint,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          lineHeight: 1,
        }}
        title="Descartar alerta"
      >
        ×
      </button>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert Queue                                                       */
/* ------------------------------------------------------------------ */

function AlertQueue() {
  const alerts = useAppStore((s) => s.alerts);
  const selectedAlertId = useAppStore((s) => s.selectedAlertId);
  const setSelectedAlert = useAppStore((s) => s.setSelectedAlert);
  const pushRealAlert = useAppStore((s) => s.pushRealAlert);
  const setAlertStatus = useAppStore((s) => s.setAlertStatus);

  // Load active alerts from API on mount (nueva + atendiendo)
  const { data: apiNuevas } = useAlerts({ status: "nueva" });
  const { data: apiAtendiendo } = useAlerts({ status: "atendiendo" });
  useEffect(() => {
    const allItems = [
      ...(apiNuevas?.items ?? []),
      ...(apiAtendiendo?.items ?? []),
    ];
    if (allItems.length === 0) return;
    const storeIds = new Set(alerts.map((a) => a.id));
    for (const raw of allItems) {
      const id = String(raw.id);
      if (storeIds.has(id)) continue;
      const type = (raw.type ?? "compania") as AlertType;
      const payload = raw.raw_payload || {};
      pushRealAlert({
        id,
        clientId: raw.client_id ? String(raw.client_id) : "unknown",
        type: ALERT_TYPES[type] ? type : "compania",
        ts: raw.created_at ? new Date(raw.created_at).getTime() : Date.now(),
        status: (raw.status ?? "nueva") as Alert["status"],
        clientName: raw.client_name ?? payload.button_serial_number,
        latitude: payload.latitude ? String(payload.latitude) : undefined,
        longitude: payload.longitude ? String(payload.longitude) : undefined,
        buttonSerial: payload.button_serial_number,
        source: "api",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiNuevas, apiAtendiendo]);

  void setAlertStatus; // referenced in ClientFicha via the store

  const activeAlerts = alerts.filter((a) => a.status !== "resuelta");

  const sorted = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const aActive = a.status !== "resuelta" ? 1 : 0;
      const bActive = b.status !== "resuelta" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      const aPrio = ALERT_TYPES[a.type].priority;
      const bPrio = ALERT_TYPES[b.type].priority;
      if (aPrio !== bPrio) return bPrio - aPrio;
      return b.ts - a.ts;
    });
  }, [alerts]);

  // Triage IA — only when 2+ active
  const triageItems = useMemo(() => {
    if (activeAlerts.length < 2) return null;
    return activeAlerts
      .map((a) => {
        const client = clientById(a.clientId, a);
        return { alert: a, client, score: triageScore(a, client) };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, 3) as { alert: Alert; client: Client; score: number }[];
  }, [activeAlerts]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: COLORS.sub }}>
            COLA DE ALERTAS
          </span>
          <span style={{ fontSize: 12, color: COLORS.faint }}>{activeAlerts.length} activas</span>
        </div>
      </div>

      {/* Triage IA */}
      {triageItems && (
        <div
          style={{
            margin: "0 12px 8px",
            padding: 10,
            borderRadius: 10,
            backgroundColor: "var(--sc-violet-a08)",
            border: "1px solid var(--sc-violet-a20)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.violet,
            }}
          >
            <Sparkles size={13} />
            TRIAGE IA · {activeAlerts.length} alertas → orden sugerido
          </div>
          {triageItems.map((item, idx) => {
            const Icon = alertIcon(item.alert.type);
            return (
              <div
                key={item.alert.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "var(--sc-violet-a20)",
                    color: COLORS.violet,
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>
                <Icon size={13} color={ALERT_TYPES[item.alert.type].hex} />
                <span style={{ fontSize: 12, color: COLORS.ink }}>
                  {item.client.name.split(" ")[0]}
                </span>
                <span style={{ fontSize: 11, color: COLORS.sub, marginLeft: "auto" }}>
                  {ALERT_TYPES[item.alert.type].label.split("—")[0].trim()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert list */}
      <div
        className="sc-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}
      >
        {sorted.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 10,
              color: COLORS.sub,
            }}
          >
            <ShieldCheck size={36} color={COLORS.aqua} />
            <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>Todo en orden</span>
            <span style={{ fontSize: 12, textAlign: "center" }}>
              Sin alertas activas. Los dispositivos reportan normal.
            </span>
          </div>
        ) : (
          sorted.map((alert) => {
            const client = clientById(alert.clientId, alert);
            return (
              <AlertCard
                key={alert.id}
                alert={alert}
                client={client}
                selected={alert.id === selectedAlertId}
                onClick={() => setSelectedAlert(alert.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Real MapLibre GL Map                                              */
/* ------------------------------------------------------------------ */

function MonitoreoMap() {
  const alerts = useAppStore((s) => s.alerts);
  const selectedAlertId = useAppStore((s) => s.selectedAlertId);
  const setSelectedAlert = useAppStore((s) => s.setSelectedAlert);

  const alertByClient = useMemo(() => {
    const map = new Map<string, Alert>();
    for (const a of alerts) {
      if (a.status !== "resuelta" && !map.has(a.clientId)) {
        map.set(a.clientId, a);
      }
    }
    return map;
  }, [alerts]);

  return (
    <RealMap
      clients={CLIENTS}
      alerts={alertByClient}
      allAlerts={alerts}
      selectedAlertId={selectedAlertId}
      onSelectAlert={setSelectedAlert}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Device Assigner — para dispositivos FLIC no asociados              */
/* ------------------------------------------------------------------ */

function DeviceAssigner({ buttonSerial }: { buttonSerial: string }) {
  const [mode, setMode] = useState<"idle" | "existing" | "new">("idle");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newBarrio, setNewBarrio] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const addLog = useAppStore((s) => s.addLog);

  const handleAssign = async () => {
    setSaving(true);
    try {
      const { api } = await import("@/lib/api");
      if (mode === "existing" && selectedClientId) {
        const res = await api.post("/api/clients/assign-device", {
          button_serial: buttonSerial,
          client_id: parseInt(selectedClientId, 10),
        });
        setResult(`Asociado a ${res.data.client_name}`);
        addLog(`Dispositivo ${buttonSerial} asociado a ${res.data.client_name}`);
      } else if (mode === "new" && newName) {
        const res = await api.post("/api/clients/assign-device", {
          button_serial: buttonSerial,
          name: newName,
          age: parseInt(newAge, 10) || 0,
          barrio: newBarrio || "Sin asignar",
        });
        setResult(`Paciente ${res.data.client_name} creado y asociado`);
        addLog(`Nuevo paciente ${res.data.client_name} con dispositivo ${buttonSerial}`);
      }
    } catch (err: any) {
      setResult(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div
        style={{
          padding: 10,
          borderRadius: 10,
          backgroundColor: "var(--sc-aqua-a08)",
          border: "1px solid var(--sc-aqua-a20)",
          fontSize: 12,
          color: COLORS.aqua,
          fontWeight: 600,
        }}
      >
        {result}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 10,
        borderRadius: 10,
        backgroundColor: "var(--sc-amber-a07)",
        border: "1px solid var(--sc-amber-a20)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber, marginBottom: 8 }}>
        DISPOSITIVO NO REGISTRADO — {buttonSerial}
      </div>

      {mode === "idle" && (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setMode("existing")}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 6,
              border: "1px solid var(--sc-blue-a25)",
              backgroundColor: "var(--sc-blue-a08)",
              color: COLORS.blue,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Asociar a paciente
          </button>
          <button
            onClick={() => setMode("new")}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 6,
              border: "1px solid var(--sc-aqua-a25)",
              backgroundColor: "var(--sc-aqua-a08)",
              color: COLORS.aqua,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Crear paciente nuevo
          </button>
        </div>
      )}

      {mode === "existing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${COLORS.line}`,
              backgroundColor: COLORS.panel2,
              color: COLORS.ink,
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            <option value="">Seleccionar paciente...</option>
            {CLIENTS.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.barrio}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setMode("idle")} style={{ flex: 1, padding: "6px", borderRadius: 6, border: `1px solid ${COLORS.line}`, backgroundColor: "transparent", color: COLORS.sub, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
            <button onClick={handleAssign} disabled={!selectedClientId || saving} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", backgroundColor: COLORS.blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: !selectedClientId || saving ? 0.5 : 1 }}>
              {saving ? "Guardando..." : "Asociar"}
            </button>
          </div>
        </div>
      )}

      {mode === "new" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input placeholder="Nombre completo" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.line}`, backgroundColor: COLORS.panel2, color: COLORS.ink, fontSize: 12, fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="Edad" value={newAge} onChange={(e) => setNewAge(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.line}`, backgroundColor: COLORS.panel2, color: COLORS.ink, fontSize: 12, fontFamily: "inherit" }} />
            <input placeholder="Barrio" value={newBarrio} onChange={(e) => setNewBarrio(e.target.value)} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.line}`, backgroundColor: COLORS.panel2, color: COLORS.ink, fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setMode("idle")} style={{ flex: 1, padding: "6px", borderRadius: 6, border: `1px solid ${COLORS.line}`, backgroundColor: "transparent", color: COLORS.sub, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
            <button onClick={handleAssign} disabled={!newName || saving} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", backgroundColor: COLORS.aqua, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: !newName || saving ? 0.5 : 1 }}>
              {saving ? "Guardando..." : "Crear y asociar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Client Ficha                                                      */
/* ------------------------------------------------------------------ */

function ClientFicha() {
  const alerts = useAppStore((s) => s.alerts);
  const selectedAlertId = useAppStore((s) => s.selectedAlertId);
  const setAlertStatus = useAppStore((s) => s.setAlertStatus);
  const addLog = useAppStore((s) => s.addLog);
  const log = useAppStore((s) => s.log);
  const updateAlertStatus = useUpdateAlertStatus();

  const alert = alerts.find((a) => a.id === selectedAlertId);
  const client = alert ? clientById(alert.clientId, alert) : undefined;

  if (!alert || !client) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 12,
          color: COLORS.sub,
        }}
      >
        <User size={40} strokeWidth={1.2} />
        <span style={{ fontSize: 14, fontWeight: 500 }}>Seleccioná una alerta</span>
      </div>
    );
  }

  const meta = ALERT_TYPES[alert.type];
  const Icon = alertIcon(alert.type);

  const actionButtons = [
    {
      label: "Llamar al reloj",
      icon: PhoneCall,
      color: COLORS.aqua,
      action: () => addLog(`Llamada al reloj de ${client.name}`),
    },
    {
      label: "Llamar familiar",
      icon: Phone,
      color: COLORS.blue,
      action: () => {
        const primary = client.contacts[0];
        addLog(`Llamada a ${primary?.n ?? "familiar"} (${primary?.rel ?? ""})`);
      },
    },
    {
      label: "Despachar móvil",
      icon: Truck,
      color: COLORS.amber,
      action: async () => {
        try {
          await api.post("/api/dispatch/emp", {
            client_id: parseInt(client.id) || null,
            client_name: client.name,
            client_age: client.age,
            client_phone: client.contacts[0]?.p || "",
            family_phone: client.contacts[0]?.p || "",
            location:
              alert.latitude && alert.longitude
                ? `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`
                : client.dir,
            alert_type: meta.label,
          });
          addLog(`Despacho EMP enviado — WhatsApp a emergencias + llamada automática`);
        } catch (err) {
          addLog(`Error al despachar EMP: ${err}`);
        }
      },
    },
    {
      label: "Marcar resuelta",
      icon: CheckCircle2,
      color: COLORS.coral,
      action: () => {
        setAlertStatus(alert.id, "resuelta");
        addLog(`Alerta ${alert.type} de ${client.name} marcada resuelta`);
        // If alert id is numeric (from API), also update via API
        const numericId = parseInt(alert.id, 10);
        if (!isNaN(numericId)) {
          updateAlertStatus.mutate({ id: numericId, status: "resuelta" });
        }
      },
    },
  ];

  return (
    <div
      className="sc-scroll"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        overflowY: "auto",
        padding: "12px 14px",
      }}
    >
      {/* 1. Alert banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 10,
          backgroundColor: colorTint(meta.hex, "faint"),
          border: `1px solid ${colorTint(meta.hex, "strong")}`,
        }}
      >
        <Icon size={18} color={meta.hex} />
        <span style={{ fontSize: 13, fontWeight: 600, color: meta.hex }}>{meta.label}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.faint }}>
          {timeAgo(alert.ts)}
        </span>
      </div>

      {/* 2. Client info */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <InlineAvatar client={client} size={52} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink }}>{client.name}</div>
          <div style={{ fontSize: 12, color: COLORS.sub }}>{client.age > 0 ? `${client.age} años · ` : ""}{client.barrio}</div>
          <div style={{ fontSize: 11, color: COLORS.faint }}>{client.dir} {client.entre}</div>
          {alert.latitude && alert.longitude && parseFloat(alert.latitude) !== 0 && (
            <a
              href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.blue,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              📍 Ver en Google Maps
            </a>
          )}
        </div>
      </div>

      {/* 2b. Dispositivo desconocido — asociar a paciente */}
      {alert.clientId === "unknown" && alert.buttonSerial && (
        <DeviceAssigner buttonSerial={alert.buttonSerial} />
      )}

      {/* 3. Battery + Signal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <InlineBattery pct={client.bat} />
        <InlineSignal bars={client.sig} />
      </div>

      {/* 4. Copiloto IA */}
      <div
        style={{
          padding: 10,
          borderRadius: 10,
          backgroundColor: "var(--sc-violet-a08)",
          border: "1px solid var(--sc-violet-a20)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.violet,
          }}
        >
          <Sparkles size={13} />
          COPILOTO IA · sugerencia de protocolo
        </div>
        <p style={{ fontSize: 12, color: COLORS.ink, margin: 0, lineHeight: 1.5 }}>
          {meta.suggestion}
        </p>
      </div>

      {/* 5. Cuadro clínico */}
      {client.cond.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.sub, marginBottom: 6 }}>
            Cuadro clínico
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {client.cond.map((c) => {
              const isCritical = CRITICAL_CONDITIONS.some((cc) => c.includes(cc));
              return (
                <span
                  key={c}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 6,
                    backgroundColor: isCritical ? "var(--sc-coral-a13)" : COLORS.panel2,
                    color: isCritical ? COLORS.coral : COLORS.ink,
                    fontWeight: isCritical ? 600 : 400,
                  }}
                >
                  {c}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Medicacion */}
      {client.meds.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.sub, marginBottom: 6 }}>
            Medicación
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {client.meds.map((m) => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.ink }}>
                <Pill size={12} color={COLORS.coral} />
                {m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. A quien llamar */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.sub, marginBottom: 6 }}>
          A quién llamar
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {client.contacts.map((ct) => (
            <div
              key={ct.ord}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                backgroundColor: COLORS.panel2,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: "var(--sc-violet-a20)",
                  color: COLORS.violet,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {ct.ord}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, display: "flex", alignItems: "center", gap: 4 }}>
                  {ct.n}
                  {ct.acceso && <Key size={11} color={COLORS.amber} />}
                </div>
                <div style={{ fontSize: 11, color: COLORS.sub }}>{ct.rel}</div>
              </div>
              <span style={{ fontSize: 11, color: COLORS.faint, flexShrink: 0 }}>{ct.p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {actionButtons.map((btn) => (
          <button
            key={btn.label}
            className="sc-btn"
            onClick={btn.action}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 8px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              backgroundColor: `${btn.color}22`,
              color: btn.color,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <btn.icon size={14} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* 9. Bitacora */}
      {log.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.sub,
              marginBottom: 6,
            }}
          >
            <ClipboardList size={12} />
            Bitácora
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {log.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontSize: 11,
                  color: COLORS.ink,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--sc-line-a20)",
                }}
              >
                <Clock size={11} color={COLORS.faint} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ color: COLORS.faint, flexShrink: 0 }}>{timeAgo(entry.ts)}</span>
                <span>{entry.txt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main: MonitoreoView                                               */
/* ------------------------------------------------------------------ */

export default function MonitoreoView() {
  const isMobile = useAppStore((s) => s.isMobile);
  const alerts = useAppStore((s) => s.alerts);
  const activeCount = alerts.filter((a) => a.status !== "resuelta").length;

  // Mobile tab state
  const [mobileTab, setMobileTab] = useMobileTab("alertas");

  if (isMobile) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 8 }}>
        <MobileTabSwitcher activeTab={mobileTab} setActiveTab={setMobileTab} alertCount={activeCount} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          {mobileTab === "alertas" && <AlertQueue />}
          {mobileTab === "mapa" && <MonitoreoMap />}
          {mobileTab === "ficha" && <ClientFicha />}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        gap: 1,
        backgroundColor: COLORS.line,
      }}
    >
      {/* Left: Alert queue */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          backgroundColor: COLORS.bg,
          overflow: "hidden",
        }}
      >
        <AlertQueue />
      </div>

      {/* Center: Map */}
      <div
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
        }}
      >
        <MonitoreoMap />
      </div>

      {/* Right: Ficha */}
      <div
        style={{
          width: 360,
          flexShrink: 0,
          backgroundColor: COLORS.bg,
          overflow: "hidden",
        }}
      >
        <ClientFicha />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny hook for mobile tab                                          */
/* ------------------------------------------------------------------ */

function useMobileTab(initial: string) {
  return useState(initial);
}
