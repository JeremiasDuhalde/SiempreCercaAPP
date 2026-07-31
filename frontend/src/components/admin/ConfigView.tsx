import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Settings, Save, Eye, Phone, MessageSquare, Shield, RefreshCw, Wifi, WifiOff, AlertOctagon, Radio } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

type ConfigMap = Record<string, string>;
type WaProvider = "meta" | "mock";
type WaStatus = { provider: string; connected: boolean; banned: boolean } | null;

/* ── Helpers ────────────────────────────────────────────────── */

const EXAMPLE_DATA = {
  client_name: "María González",
  client_age: 78,
  location: "https://www.google.com/maps?q=-36.8201,-56.9920",
  alert_type: "SOS — Botón de pánico",
  timestamp: new Date().toLocaleString("es-AR", { hour12: false }).replace(",", ""),
  client_phone: "+5492257612345",
  family_phone: "+5492257698765",
};

function fillTemplate(template: string): string {
  return template
    .replace("{client_name}", EXAMPLE_DATA.client_name)
    .replace("{client_age}", String(EXAMPLE_DATA.client_age))
    .replace("{location}", EXAMPLE_DATA.location)
    .replace("{alert_type}", EXAMPLE_DATA.alert_type)
    .replace("{timestamp}", EXAMPLE_DATA.timestamp)
    .replace("{client_phone}", EXAMPLE_DATA.client_phone)
    .replace("{family_phone}", EXAMPLE_DATA.family_phone);
}

/* ── Section wrapper ─────────────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: COLORS.panel,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: `1px solid ${COLORS.line}`,
          backgroundColor: COLORS.panel2,
        }}
      >
        <Icon size={15} style={{ color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

/* ── Field row ───────────────────────────────────────────────── */

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.sub,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 10, color: COLORS.faint, marginTop: 3 }}>{hint}</div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: `1px solid ${COLORS.line}`,
  backgroundColor: COLORS.bg,
  color: COLORS.ink,
  fontSize: 13,
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

/* ── Save button ─────────────────────────────────────────────── */

function SaveBtn({
  onClick,
  saving,
  saved,
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 6,
        border: "none",
        backgroundColor: saved ? COLORS.aqua : COLORS.coral,
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        cursor: saving ? "not-allowed" : "pointer",
        opacity: saving ? 0.7 : 1,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <Save size={13} />
      {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export default function ConfigView() {
  const user = useAuthStore((s) => s.user);

  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Per-section save state
  const [empSaving, setEmpSaving] = useState(false);
  const [empSaved, setEmpSaved] = useState(false);
  const [centralSaving, setCentralSaving] = useState(false);
  const [centralSaved, setCentralSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Local editable state
  const [empWhatsapp, setEmpWhatsapp] = useState("");
  const [empCall, setEmpCall] = useState("");
  const [empTemplate, setEmpTemplate] = useState("");
  const [centralPhone, setCentralPhone] = useState("");
  const [centralName, setCentralName] = useState("");

  // WhatsApp provider state
  const [waProvider, setWaProvider] = useState<WaProvider>("mock");
  const [waSaving, setWaSaving] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [waStatus, setWaStatus] = useState<WaStatus>(null);
  const [waChecking, setWaChecking] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ConfigMap>("/api/config/");
      setConfig(data);
      setEmpWhatsapp(data.emp_whatsapp_number ?? "");
      setEmpCall(data.emp_call_number ?? "");
      setEmpTemplate(data.emp_message_template ?? "");
      setCentralPhone(data.central_phone ?? "");
      setCentralName(data.central_name ?? "");
      if (data.whatsapp_provider) {
        setWaProvider(data.whatsapp_provider as WaProvider);
      }
    } catch {
      setError("No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function saveKey(key: string, value: string) {
    await api.put("/api/config/", { key, value });
  }

  async function handleSaveEmp() {
    setEmpSaving(true);
    try {
      await saveKey("emp_whatsapp_number", empWhatsapp);
      await saveKey("emp_call_number", empCall);
      await saveKey("emp_message_template", empTemplate);
      setEmpSaved(true);
      setTimeout(() => setEmpSaved(false), 2500);
    } finally {
      setEmpSaving(false);
    }
  }

  async function handleSaveCentral() {
    setCentralSaving(true);
    try {
      await saveKey("central_phone", centralPhone);
      await saveKey("central_name", centralName);
      setCentralSaved(true);
      setTimeout(() => setCentralSaved(false), 2500);
    } finally {
      setCentralSaving(false);
    }
  }

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      await api.post("/api/config/seed-defaults");
      await fetchConfig();
    } finally {
      setSeeding(false);
    }
  }

  async function handleSaveWaProvider() {
    setWaSaving(true);
    try {
      await api.post("/api/config/whatsapp-provider", { value: waProvider });
      setWaSaved(true);
      setTimeout(() => setWaSaved(false), 2500);
    } finally {
      setWaSaving(false);
    }
  }

  async function handleCheckWaStatus() {
    setWaChecking(true);
    try {
      const { data } = await api.get<{ provider: string; connected: boolean; banned: boolean }>(
        "/api/config/whatsapp-status"
      );
      setWaStatus(data);
    } catch {
      setWaStatus({ provider: waProvider, connected: false, banned: false });
    } finally {
      setWaChecking(false);
    }
  }

  if (user?.role !== "admin") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 10,
          color: COLORS.sub,
        }}
      >
        <Shield size={36} strokeWidth={1.2} />
        <span style={{ fontSize: 14 }}>Solo los administradores pueden ver esta sección</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.faint }}>
        Cargando configuración...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: COLORS.sub }}>
        <span style={{ fontSize: 13 }}>{error}</span>
        <button
          onClick={fetchConfig}
          style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.line}`, backgroundColor: "transparent", color: COLORS.sub, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="sc-scroll" style={{ height: "100%", width: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Settings size={18} style={{ color: COLORS.violet }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink }}>Configuración del sistema</div>
            <div style={{ fontSize: 11, color: COLORS.faint }}>Parámetros operativos de Siempre Cerca</div>
          </div>
        </div>
        <button
          onClick={handleSeedDefaults}
          disabled={seeding}
          title="Restaurar valores por defecto (solo agrega los que faltan)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${COLORS.line}`,
            backgroundColor: "transparent",
            color: COLORS.sub,
            fontSize: 11,
            cursor: seeding ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: seeding ? 0.6 : 1,
          }}
        >
          <RefreshCw size={12} style={{ animation: seeding ? "spin 1s linear infinite" : "none" }} />
          {seeding ? "Restaurando..." : "Restaurar defaults"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>
        {/* EMP Section */}
        <Section title="Despacho de Emergencia (EMP)" icon={Phone} color={COLORS.amber}>
          <FieldRow label="WhatsApp EMP" hint="Número que recibe el mensaje de despacho vía WhatsApp">
            <input
              type="tel"
              value={empWhatsapp}
              onChange={(e) => setEmpWhatsapp(e.target.value)}
              placeholder="+5492245406323"
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow label="Teléfono EMP (llamada)" hint="Número para llamada de voz al móvil (integración telefónica pendiente)">
            <input
              type="tel"
              value={empCall}
              onChange={(e) => setEmpCall(e.target.value)}
              placeholder="+5492246529000"
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow
            label="Template del mensaje"
            hint="Variables disponibles: {client_name}, {client_age}, {location}, {alert_type}, {timestamp}, {client_phone}, {family_phone}"
          >
            <textarea
              value={empTemplate}
              onChange={(e) => setEmpTemplate(e.target.value)}
              rows={10}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
          </FieldRow>

          {/* Vista previa */}
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => setShowPreview((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${COLORS.line}`,
                backgroundColor: showPreview ? COLORS.panel2 : "transparent",
                color: COLORS.sub,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: showPreview ? 10 : 0,
              }}
            >
              <Eye size={12} />
              {showPreview ? "Ocultar vista previa" : "Vista previa con datos de ejemplo"}
            </button>

            {showPreview && (
              <div
                style={{
                  backgroundColor: COLORS.bg,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 12,
                  color: COLORS.ink,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  fontFamily: "monospace",
                }}
              >
                {fillTemplate(empTemplate)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <SaveBtn onClick={handleSaveEmp} saving={empSaving} saved={empSaved} />
          </div>
        </Section>

        {/* Central Section */}
        <Section title="Central de Monitoreo" icon={MessageSquare} color={COLORS.aqua}>
          <FieldRow label="Teléfono de la central" hint="Se incluye en mensajes automáticos a familiares">
            <input
              type="tel"
              value={centralPhone}
              onChange={(e) => setCentralPhone(e.target.value)}
              placeholder="+5492257653843"
              style={inputStyle}
            />
          </FieldRow>

          <FieldRow label="Nombre de la central" hint="Aparece en el pie de los mensajes automáticos">
            <input
              type="text"
              value={centralName}
              onChange={(e) => setCentralName(e.target.value)}
              placeholder="Siempre Cerca SRL"
              style={inputStyle}
            />
          </FieldRow>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <SaveBtn onClick={handleSaveCentral} saving={centralSaving} saved={centralSaved} />
          </div>
        </Section>

        {/* WhatsApp Provider Section */}
        <Section title="Proveedor de WhatsApp" icon={Radio} color={COLORS.aqua}>
          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {waStatus === null ? (
                <span style={{ fontSize: 12, color: COLORS.faint }}>Sin verificar</span>
              ) : waStatus.banned ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: COLORS.coral }}>
                  <AlertOctagon size={14} />
                  Bloqueado
                </span>
              ) : waStatus.connected ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: COLORS.aqua }}>
                  <Wifi size={14} />
                  Conectado
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: COLORS.amber }}>
                  <WifiOff size={14} />
                  Desconectado
                </span>
              )}
            </div>
            <button
              onClick={handleCheckWaStatus}
              disabled={waChecking}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${COLORS.line}`,
                backgroundColor: "transparent",
                color: COLORS.sub,
                fontSize: 11,
                cursor: waChecking ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: waChecking ? 0.6 : 1,
              }}
            >
              <RefreshCw size={11} style={{ animation: waChecking ? "spin 1s linear infinite" : "none" }} />
              {waChecking ? "Verificando..." : "Verificar conexion"}
            </button>
          </div>

          {/* Provider radio buttons */}
          <FieldRow label="Canal activo">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(
                [
                  {
                    value: "meta" as WaProvider,
                    label: "Meta API (pago)",
                    hint: "API oficial de WhatsApp Business. Requiere token y phone ID. Mas confiable, sin riesgo de ban.",
                    color: COLORS.aqua,
                  },
                  {
                    value: "mock" as WaProvider,
                    label: "Mock (desarrollo)",
                    hint: "Simula envios en logs. Los mensajes NO se envian. Solo para desarrollo local.",
                    color: COLORS.violet,
                  },
                ] as { value: WaProvider; label: string; hint: string; color: string }[]
              ).map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 7,
                    border: `1px solid ${waProvider === opt.value ? opt.color : COLORS.line}`,
                    backgroundColor: waProvider === opt.value ? "color-mix(in srgb, " + opt.color + " 8%, transparent)" : "transparent",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background-color 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="wa_provider"
                    value={opt.value}
                    checked={waProvider === opt.value}
                    onChange={() => setWaProvider(opt.value)}
                    style={{ marginTop: 2, accentColor: opt.color }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 2 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.sub, lineHeight: 1.4 }}>{opt.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </FieldRow>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <SaveBtn onClick={handleSaveWaProvider} saving={waSaving} saved={waSaved} />
          </div>
        </Section>

        {/* Info footer */}
        <div
          style={{
            fontSize: 11,
            color: COLORS.faint,
            textAlign: "center",
            padding: "8px 0 16px",
          }}
        >
          Los cambios se aplican de inmediato en los próximos despachos.
          {Object.keys(config).length === 0 && (
            <span style={{ color: COLORS.amber, display: "block", marginTop: 4 }}>
              No hay configuración guardada — usá "Restaurar defaults" para cargar los valores iniciales.
            </span>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
