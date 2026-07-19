import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { COLORS, BARRIOS } from "@/lib/constants";
import { initials } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useClients } from "@/hooks/useClients";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";
import {
  ChevronLeft,
  Wifi,
  WifiOff,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Smartphone,
  Shield,
  Pill,
  Phone,
  KeyRound,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Check,
  MapPin,
  Bell,
  User,
  AlertTriangle,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface RawContact {
  id: number;
  order: number;
  name: string;
  relationship_label: string;
  phone: string;
  has_key: boolean;
}

interface RawDevice {
  id: number;
  model: string;
  serial_number: string | null;
  external_device_id: string | null;
  battery_pct: number;
  signal_strength: number;
  is_online: boolean;
  last_seen_at: string | null;
}

interface RawGeofence {
  id: number;
  radius_m: number;
  is_active: boolean;
  lat: number | null;
  lng: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RawClient extends Record<string, any> {
  id: number;
  name: string;
  age: number;
  phone: string | null;
  address: string;
  address_entre: string | null;
  barrio: string;
  conditions: string[] | null;
  medications: Record<string, string> | null;
  color: string | null;
  notes: string | null;
  is_active: boolean;
  alta_completa: boolean;
  contacts: RawContact[];
  device: RawDevice | null;
  geofence: RawGeofence | null;
}

interface MedEntry {
  name: string;
  time: string;
}

interface NotifPrefs {
  alerta_emergencia: boolean;
  alerta_caida: boolean;
  recordatorio_med: boolean;
  recordatorio_turno: boolean;
  recordatorio_enfermera: boolean;
  recordatorio_monitoreo: boolean;
  parte_diario: boolean;
  bienvenida: boolean;
}

const NOTIF_LABELS: Record<keyof NotifPrefs, string> = {
  alerta_emergencia: "Alerta emergencia al familiar",
  alerta_caida: "Alerta caída al familiar",
  recordatorio_med: "Recordatorio medicación",
  recordatorio_turno: "Recordatorio turno médico",
  recordatorio_enfermera: "Recordatorio visita enfermera",
  recordatorio_monitoreo: "Recordatorio monitoreo 24hs",
  parte_diario: "Parte diario familiar",
  bienvenida: "Bienvenida al servicio",
};

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  alerta_emergencia: true,
  alerta_caida: true,
  recordatorio_med: false,
  recordatorio_turno: false,
  recordatorio_enfermera: false,
  recordatorio_monitoreo: false,
  parte_diario: false,
  bienvenida: true,
};

const PRESET_CONDITIONS = [
  "Hipertensión",
  "Diabetes",
  "EPOC",
  "Parkinson",
  "Demencia",
  "Artrosis",
  "Insuf. cardíaca",
  "ACV",
  "Osteoporosis",
  "Depresión",
];

const CLIENT_COLORS = [
  "#06b6d4",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#3b82f6",
];

/* ─────────────────────────────────────────────────────────────
   Helpers / adapter
───────────────────────────────────────────────────────────── */

function adaptApiClient(raw: RawClient): Client {
  const dev = raw.device;
  return {
    id: String(raw.id),
    name: raw.name ?? "Sin nombre",
    age: raw.age ?? 0,
    barrio: raw.barrio ?? "",
    dir: raw.address ?? "",
    entre: raw.address_entre ?? "",
    gx: 0.5,
    gy: 0.5,
    color: raw.color ?? COLORS.aqua,
    device: dev?.model ?? "Sin dispositivo",
    bat: dev?.battery_pct ?? 0,
    sig: dev?.signal_strength ?? 0,
    cond: raw.conditions ?? [],
    meds: raw.medications
      ? Object.entries(raw.medications).map(([k, v]) => `${k}: ${v}`)
      : [],
    contacts: (raw.contacts ?? []).map((ct) => ({
      ord: ct.order,
      n: ct.name,
      rel: ct.relationship_label,
      p: ct.phone,
      acceso: ct.has_key,
    })),
    hr: undefined,
    spo2: undefined,
    geofence: raw.geofence ? raw.geofence.is_active : false,
  };
}

/** Parse medications JSONB from backend into an array of {name, time} */
function parseMeds(raw: Record<string, string> | null): MedEntry[] {
  if (!raw) return [];
  return Object.entries(raw).map(([name, time]) => ({ name, time: String(time) }));
}

/** Serialize MedEntry[] back to the dict format the backend expects */
function serializeMeds(meds: MedEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of meds) {
    if (m.name.trim()) out[m.name.trim()] = m.time.trim();
  }
  return out;
}

/** Parse notification prefs from notes JSON or use defaults */
function parseNotifPrefs(notes: string | null): NotifPrefs {
  if (!notes) return { ...DEFAULT_NOTIF_PREFS };
  try {
    const parsed = JSON.parse(notes);
    if (parsed?.notif) return { ...DEFAULT_NOTIF_PREFS, ...parsed.notif };
  } catch {
    // notes is plain text
  }
  return { ...DEFAULT_NOTIF_PREFS };
}

/** Extract plain text notes, excluding the embedded JSON block */
function parsePlainNotes(notes: string | null): string {
  if (!notes) return "";
  try {
    const parsed = JSON.parse(notes);
    return parsed?.text ?? "";
  } catch {
    return notes;
  }
}

/** Serialize notes + notif prefs into notes field */
function serializeNotes(text: string, notif: NotifPrefs): string {
  return JSON.stringify({ text, notif });
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-semibold"
      style={{
        width: size,
        height: size,
        background: color,
        color: "#fff",
        fontSize: size * 0.34,
      }}
    >
      {initials(name)}
    </div>
  );
}

function BatteryIndicator({ level }: { level: number }) {
  const Icon = level <= 25 ? BatteryLow : level <= 60 ? BatteryMedium : BatteryFull;
  const color = level <= 25 ? COLORS.coral : level <= 50 ? COLORS.amber : COLORS.aqua;
  return (
    <span className="flex items-center gap-1" style={{ color }}>
      <Icon size={16} />
      <span className="text-xs font-medium">{level}%</span>
    </span>
  );
}

function SignalIndicator({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-px" style={{ height: 14 }}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="rounded-sm"
          style={{
            width: 3,
            height: 4 + i * 2.5,
            background: i <= level ? COLORS.aqua : COLORS.line,
          }}
        />
      ))}
    </span>
  );
}

/** Inline alpha blend for any CSS value (hex or CSS var) */
function alpha15(c: string) { return `color-mix(in srgb, ${c} 15%, transparent)`; }
function alpha12(c: string) { return `color-mix(in srgb, ${c} 12%, transparent)`; }
function alpha30(c: string) { return `color-mix(in srgb, ${c} 30%, transparent)`; }

function Tag({
  label,
  onRemove,
  color,
}: {
  label: string;
  onRemove?: () => void;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        background: alpha15(color ?? COLORS.aqua),
        color: color ?? COLORS.aqua,
      }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full flex items-center justify-center"
          style={{ opacity: 0.7 }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

function SectionCard({
  title,
  icon,
  iconColor,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: iconColor }}>{icon}</span>
          <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
            {title}
          </span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: COLORS.sub }}>
        {label}
        {required && <span style={{ color: COLORS.coral }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="rounded-lg px-3 py-2 text-sm outline-none border"
        style={{
          background: COLORS.panel2,
          color: COLORS.ink,
          borderColor: COLORS.line,
        }}
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: COLORS.sub }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm outline-none border"
        style={{
          background: COLORS.panel2,
          color: COLORS.ink,
          borderColor: COLORS.line,
        }}
      >
        <option value="">— Seleccionar —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function IconBtn({
  icon,
  onClick,
  color,
  title,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center rounded-lg p-1.5 transition-opacity hover:opacity-80"
      style={{
        background: alpha12(color ?? COLORS.sub),
        color: color ?? COLORS.sub,
      }}
    >
      {icon}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Client card (list item)
───────────────────────────────────────────────────────────── */

function ClientCard({
  client,
  selected,
  onClick,
}: {
  client: Client;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="sc-card flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all"
      style={{
        background: selected ? COLORS.panel2 : "transparent",
        border: selected ? `1px solid ${COLORS.line}` : "1px solid transparent",
      }}
      onClick={onClick}
    >
      <Avatar name={client.name} color={client.color} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: COLORS.ink }}>
          {client.name}
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.sub }}>
          {client.age} años · {client.barrio}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <BatteryIndicator level={client.bat} />
        <SignalIndicator level={client.sig} />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   New / Edit client form
───────────────────────────────────────────────────────────── */

interface ClientFormProps {
  initial?: RawClient | null;
  onSaved: (id: string) => void;
  onCancel: () => void;
  isMobile?: boolean;
}

function ClientForm({ initial, onSaved, onCancel, isMobile }: ClientFormProps) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [age, setAge] = useState(String(initial?.age ?? ""));
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [addressEntre, setAddressEntre] = useState(initial?.address_entre ?? "");
  const [barrio, setBarrio] = useState(initial?.barrio ?? "");
  const [color, setColor] = useState(initial?.color ?? CLIENT_COLORS[0]);
  const [conditions, setConditions] = useState<string[]>(initial?.conditions ?? []);
  const [condInput, setCondInput] = useState("");
  const [meds, setMeds] = useState<MedEntry[]>(parseMeds(initial?.medications ?? null));
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(parseNotifPrefs(initial?.notes ?? null));
  const [plainNotes, setPlainNotes] = useState(parsePlainNotes(initial?.notes ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCondition = (c: string) => {
    const trimmed = c.trim();
    if (trimmed && !conditions.includes(trimmed)) {
      setConditions((prev) => [...prev, trimmed]);
    }
    setCondInput("");
  };

  const removeCondition = (c: string) => setConditions((prev) => prev.filter((x) => x !== c));

  const addMed = () => setMeds((prev) => [...prev, { name: "", time: "" }]);
  const removeMed = (i: number) => setMeds((prev) => prev.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof MedEntry, val: string) =>
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));

  const toggleNotif = (key: keyof NotifPrefs) =>
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        age: Number(age) || 0,
        phone: phone.trim() || null,
        address: address.trim(),
        address_entre: addressEntre.trim() || null,
        barrio: barrio || "Sin asignar",
        conditions: conditions.length ? conditions : null,
        medications: meds.length ? serializeMeds(meds) : null,
        color,
        notes: serializeNotes(plainNotes, notifPrefs),
      };

      let id: string;
      if (isEdit) {
        const res = await api.patch(`/api/clients/${initial!.id}`, payload);
        id = String(res.data.id);
      } else {
        const res = await api.post("/api/clients/", payload);
        id = String(res.data.id);
      }

      await qc.invalidateQueries({ queryKey: ["clients"] });
      onSaved(id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Error al guardar. Intenta de nuevo.";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: COLORS.panel2,
    color: COLORS.ink,
    borderColor: COLORS.line,
  };

  return (
    <div
      className="sc-scroll flex-1 overflow-y-auto p-4"
      style={{ background: COLORS.bg }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        {isMobile && (
          <button
            type="button"
            className="flex items-center gap-1 text-sm"
            style={{ color: COLORS.sub }}
            onClick={onCancel}
          >
            <ChevronLeft size={18} /> Volver
          </button>
        )}
        <h2 className="text-lg font-bold" style={{ color: COLORS.ink }}>
          {isEdit ? "Editar cliente" : "Nuevo cliente"}
        </h2>
        {!isMobile && (
          <button type="button" onClick={onCancel} style={{ color: COLORS.sub }}>
            <X size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos básicos */}
        <div className="sc-card rounded-xl p-4 space-y-3" style={{ background: COLORS.panel }}>
          <p className="text-xs font-bold tracking-wider" style={{ color: COLORS.sub }}>
            DATOS BÁSICOS
          </p>
          <FormInput label="Nombre completo" value={name} onChange={setName} required placeholder="Ej. María González" />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Edad" value={age} onChange={setAge} type="number" placeholder="75" />
            <FormInput label="Teléfono" value={phone} onChange={setPhone} type="tel" placeholder="+54 911 ..." />
          </div>
          <FormInput label="Dirección" value={address} onChange={setAddress} placeholder="Calle 123" />
          <FormInput label="Entre calles" value={addressEntre} onChange={setAddressEntre} placeholder="Opcional" />
          <FormSelect label="Barrio" value={barrio} onChange={setBarrio} options={BARRIOS} />
        </div>

        {/* Color avatar */}
        <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
          <p className="text-xs font-bold tracking-wider mb-3" style={{ color: COLORS.sub }}>
            COLOR DE IDENTIFICACIÓN
          </p>
          <div className="flex gap-2 flex-wrap">
            {CLIENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{
                  width: 32,
                  height: 32,
                  background: c,
                  outline: color === c ? `3px solid ${COLORS.ink}` : "none",
                  outlineOffset: 2,
                }}
              >
                {color === c && <Check size={14} color="#fff" />}
              </button>
            ))}
          </div>
        </div>

        {/* Condiciones médicas */}
        <div className="sc-card rounded-xl p-4 space-y-3" style={{ background: COLORS.panel }}>
          <p className="text-xs font-bold tracking-wider" style={{ color: COLORS.sub }}>
            CUADRO CLÍNICO
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conditions.map((c) => (
              <Tag key={c} label={c} color={COLORS.coral} onRemove={() => removeCondition(c)} />
            ))}
          </div>
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CONDITIONS.filter((p) => !conditions.includes(p)).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => addCondition(p)}
                className="px-2 py-0.5 rounded-full text-xs border transition-opacity hover:opacity-80"
                style={{ borderColor: COLORS.line, color: COLORS.sub }}
              >
                + {p}
              </button>
            ))}
          </div>
          {/* Custom input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={condInput}
              onChange={(e) => setCondInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCondition(condInput);
                }
              }}
              placeholder="Otra condición..."
              className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none border"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => addCondition(condInput)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: alpha15(COLORS.coral), color: COLORS.coral }}
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Medicación */}
        <div className="sc-card rounded-xl p-4 space-y-3" style={{ background: COLORS.panel }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider" style={{ color: COLORS.sub }}>
              MEDICACIÓN
            </p>
            <button
              type="button"
              onClick={addMed}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
              style={{ background: alpha15(COLORS.gold), color: COLORS.gold }}
            >
              <Plus size={12} /> Agregar
            </button>
          </div>
          {meds.length === 0 && (
            <p className="text-xs" style={{ color: COLORS.faint }}>
              Sin medicaciones cargadas.
            </p>
          )}
          {meds.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={m.name}
                onChange={(e) => updateMed(i, "name", e.target.value)}
                placeholder="Nombre del medicamento"
                className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none border"
                style={inputStyle}
              />
              <input
                type="text"
                value={m.time}
                onChange={(e) => updateMed(i, "time", e.target.value)}
                placeholder="Horario (ej. 8:00, 20:00)"
                className="w-28 rounded-lg px-3 py-1.5 text-xs outline-none border"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeMed(i)}
                style={{ color: COLORS.coral }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Notificaciones */}
        <div className="sc-card rounded-xl p-4 space-y-2" style={{ background: COLORS.panel }}>
          <p className="text-xs font-bold tracking-wider mb-2" style={{ color: COLORS.sub }}>
            PREFERENCIAS DE NOTIFICACIÓN
          </p>
          {(Object.keys(NOTIF_LABELS) as (keyof NotifPrefs)[]).map((key) => (
            <label
              key={key}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div
                onClick={() => toggleNotif(key)}
                className="w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0"
                style={{
                  background: notifPrefs[key]
                    ? COLORS.aqua
                    : alpha30(COLORS.sub),
                }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                  style={{
                    background: "#fff",
                    left: notifPrefs[key] ? "calc(100% - 18px)" : "2px",
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: COLORS.ink }}>
                {NOTIF_LABELS[key]}
              </span>
            </label>
          ))}
        </div>

        {/* Notas */}
        <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
          <p className="text-xs font-bold tracking-wider mb-2" style={{ color: COLORS.sub }}>
            NOTAS INTERNAS
          </p>
          <textarea
            value={plainNotes}
            onChange={(e) => setPlainNotes(e.target.value)}
            placeholder="Observaciones, particularidades..."
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none border resize-none"
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{ background: alpha15(COLORS.coral), color: COLORS.coral }}
          >
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: COLORS.line, color: COLORS.sub }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: COLORS.aqua,
              opacity: saving ? 0.6 : 1,
              color: "#fff",
            }}
          >
            {saving ? (
              "Guardando..."
            ) : (
              <>
                <Save size={15} />
                {isEdit ? "Guardar cambios" : "Crear cliente"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Contacts section (within detail)
───────────────────────────────────────────────────────────── */

interface ContactsSectionProps {
  clientId: string;
  contacts: RawContact[];
  onRefresh: () => void;
}

function ContactsSection({ clientId, contacts, onRefresh }: ContactsSectionProps) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", relationship_label: "", phone: "", has_key: false, order: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => setForm({ name: "", relationship_label: "", phone: "", has_key: false, order: contacts.length + 1 });

  const openAdd = () => {
    resetForm();
    setForm((f) => ({ ...f, order: contacts.length + 1 }));
    setEditId(null);
    setAdding(true);
    setError(null);
  };

  const openEdit = (ct: RawContact) => {
    setForm({ name: ct.name, relationship_label: ct.relationship_label, phone: ct.phone, has_key: ct.has_key, order: ct.order });
    setEditId(ct.id);
    setAdding(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Nombre y teléfono son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editId !== null) {
        await api.patch(`/api/clients/${clientId}/contacts/${editId}`, form);
      } else {
        await api.post(`/api/clients/${clientId}/contacts`, form);
      }
      onRefresh();
      setAdding(false);
      resetForm();
    } catch {
      setError("Error al guardar el contacto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este contacto?")) return;
    try {
      await api.delete(`/api/clients/${clientId}/contacts/${id}`);
      onRefresh();
    } catch {
      /* ignore */
    }
  };

  const inputStyle = { background: COLORS.panel2, color: COLORS.ink, borderColor: COLORS.line };

  return (
    <SectionCard
      title="A quién llamar"
      icon={<Phone size={16} />}
      iconColor={COLORS.blue}
      action={
        !adding && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{ background: alpha15(COLORS.blue), color: COLORS.blue }}
          >
            <Plus size={12} /> Agregar
          </button>
        )
      }
    >
      {/* Contact list */}
      <ul className="space-y-2 mb-2">
        {contacts
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((ct) => (
            <li
              key={ct.id}
              className="flex items-start justify-between"
              style={{ borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 6 }}
            >
              <div className="flex-1 text-xs" style={{ color: COLORS.sub }}>
                <div className="flex items-center gap-1">
                  <span className="font-medium" style={{ color: COLORS.ink }}>
                    {ct.order}. {ct.name}
                  </span>
                  {ct.has_key && <span title="Tiene llave / acceso"><KeyRound size={11} style={{ color: COLORS.amber }} /></span>}
                </div>
                <span>{ct.relationship_label}</span>
                <span className="ml-2">{ct.phone}</span>
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <IconBtn icon={<Pencil size={12} />} onClick={() => openEdit(ct)} color={COLORS.sub} title="Editar contacto" />
                <IconBtn icon={<Trash2 size={12} />} onClick={() => handleDelete(ct.id)} color={COLORS.coral} title="Eliminar contacto" />
              </div>
            </li>
          ))}
        {contacts.length === 0 && !adding && (
          <li className="text-xs" style={{ color: COLORS.faint }}>
            Sin contactos cargados.
          </li>
        )}
      </ul>

      {/* Inline form */}
      {adding && (
        <div className="space-y-2 rounded-lg p-3" style={{ background: COLORS.panel2 }}>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Nombre *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg px-2 py-1.5 text-xs outline-none border col-span-2"
              style={inputStyle}
            />
            <input
              placeholder="Parentesco (ej. Hija)"
              value={form.relationship_label}
              onChange={(e) => setForm((f) => ({ ...f, relationship_label: e.target.value }))}
              className="rounded-lg px-2 py-1.5 text-xs outline-none border"
              style={inputStyle}
            />
            <input
              placeholder="Teléfono *"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-lg px-2 py-1.5 text-xs outline-none border"
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Orden"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
              className="rounded-lg px-2 py-1.5 text-xs outline-none border"
              style={inputStyle}
            />
            <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.ink }}>
              <input
                type="checkbox"
                checked={form.has_key}
                onChange={(e) => setForm((f) => ({ ...f, has_key: e.target.checked }))}
              />
              Tiene llave / acceso
            </label>
          </div>
          {error && <p className="text-xs" style={{ color: COLORS.coral }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAdding(false); setError(null); }}
              className="flex-1 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: COLORS.line, color: COLORS.sub }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: COLORS.blue, color: "#fff", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   Client detail panel
───────────────────────────────────────────────────────────── */

interface ClientDetailProps {
  raw: RawClient;
  onBack?: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onRefresh: () => void;
  isMobile?: boolean;
}

function ClientDetail({ raw, onBack, onEdit, onDeleted, onRefresh, isMobile }: ClientDetailProps) {
  const client = adaptApiClient(raw);
  const dev = raw.device;
  const notifPrefs = parseNotifPrefs(raw.notes);
  const plainNotes = parsePlainNotes(raw.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/clients/${raw.id}`);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const activeNotifs = (Object.keys(notifPrefs) as (keyof NotifPrefs)[]).filter((k) => notifPrefs[k]);

  return (
    <div className="sc-scroll flex-1 overflow-y-auto p-4" style={{ background: COLORS.bg }}>
      {/* Back button mobile */}
      {isMobile && onBack && (
        <button
          className="flex items-center gap-1 mb-4 text-sm"
          style={{ color: COLORS.sub }}
          onClick={onBack}
        >
          <ChevronLeft size={18} /> Volver
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <Avatar name={client.name} color={client.color} size={72} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold leading-tight" style={{ color: COLORS.ink }}>
            {client.name}
          </h2>
          <p className="text-sm" style={{ color: COLORS.sub }}>
            {client.age} años · {client.barrio}
          </p>
          {raw.phone && (
            <p className="text-xs mt-0.5" style={{ color: COLORS.sub }}>
              <Phone size={11} className="inline mr-1" />
              {raw.phone}
            </p>
          )}
          {client.dir && (
            <p className="text-xs mt-0.5" style={{ color: COLORS.faint }}>
              <MapPin size={11} className="inline mr-1" />
              {client.dir}{client.entre ? ` (entre ${client.entre})` : ""}
            </p>
          )}
          {/* Online badge */}
          <span
            className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: alpha15(dev?.is_online ? COLORS.aqua : COLORS.sub),
              color: dev?.is_online ? COLORS.aqua : COLORS.sub,
            }}
          >
            {dev?.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {dev?.is_online ? "Dispositivo online" : dev ? "Dispositivo offline" : "Sin dispositivo"}
          </span>
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <IconBtn icon={<Pencil size={15} />} onClick={onEdit} color={COLORS.aqua} title="Editar cliente" />
          <IconBtn
            icon={<Trash2 size={15} />}
            onClick={() => setConfirmDelete(true)}
            color={COLORS.coral}
            title="Eliminar cliente"
          />
        </div>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div
          className="rounded-xl p-4 mb-4 space-y-3"
          style={{ background: alpha12(COLORS.coral), border: `1px solid ${alpha30(COLORS.coral)}` }}
        >
          <p className="text-sm font-semibold" style={{ color: COLORS.coral }}>
            ¿Eliminar a {raw.name}?
          </p>
          <p className="text-xs" style={{ color: COLORS.sub }}>
            El cliente quedará inactivo. Esta acción no se puede deshacer fácilmente.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: COLORS.line, color: COLORS.sub }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: COLORS.coral, color: "#fff", opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      )}

      {/* Device + Signal cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="sc-card rounded-xl p-3" style={{ background: COLORS.panel }}>
          <p className="text-xs mb-1" style={{ color: COLORS.sub }}>Batería</p>
          <BatteryIndicator level={client.bat} />
        </div>
        <div className="sc-card rounded-xl p-3" style={{ background: COLORS.panel }}>
          <p className="text-xs mb-1" style={{ color: COLORS.sub }}>Señal</p>
          <SignalIndicator level={client.sig} />
        </div>
      </div>

      {/* 4-panel grid */}
      <div className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* Dispositivo */}
        <SectionCard title="Dispositivo" icon={<Smartphone size={16} />} iconColor={COLORS.aqua}>
          {dev ? (
            <div className="space-y-1 text-xs" style={{ color: COLORS.sub }}>
              <p>Modelo: <span style={{ color: COLORS.ink }}>{dev.model}</span></p>
              {dev.serial_number && <p>Serial: {dev.serial_number}</p>}
              {dev.external_device_id && <p>ID externo: {dev.external_device_id}</p>}
              <p>
                Geocerca:{" "}
                <span style={{ color: raw.geofence?.is_active ? COLORS.aqua : COLORS.faint }}>
                  {raw.geofence?.is_active ? `Activa (${raw.geofence.radius_m}m)` : "No configurada"}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>
                  {dev.last_seen_at
                    ? `Último contacto: ${new Date(dev.last_seen_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`
                    : "Sin registro de conexión"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: COLORS.faint }}>Sin dispositivo asignado.</p>
          )}
        </SectionCard>

        {/* Cuadro clínico */}
        <SectionCard title="Cuadro clínico" icon={<Shield size={16} />} iconColor={COLORS.coral}>
          <div className="flex flex-wrap gap-1.5">
            {client.cond.length === 0 ? (
              <p className="text-xs" style={{ color: COLORS.faint }}>Sin condiciones cargadas.</p>
            ) : (
              client.cond.map((c) => <Tag key={c} label={c} color={COLORS.coral} />)
            )}
          </div>
        </SectionCard>

        {/* Medicación */}
        <SectionCard title="Medicación" icon={<Pill size={16} />} iconColor={COLORS.gold}>
          {client.meds.length === 0 ? (
            <p className="text-xs" style={{ color: COLORS.faint }}>Sin medicaciones cargadas.</p>
          ) : (
            <ul className="space-y-1 text-xs" style={{ color: COLORS.sub }}>
              {client.meds.map((m) => (
                <li key={m} className="flex items-center gap-1.5">
                  <Pill size={11} style={{ color: COLORS.gold }} />
                  {m}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Contactos */}
        <ContactsSection
          clientId={String(raw.id)}
          contacts={raw.contacts ?? []}
          onRefresh={onRefresh}
        />
      </div>

      {/* Notificaciones */}
      <SectionCard title="Notificaciones activas" icon={<Bell size={16} />} iconColor={COLORS.violet}>
        {activeNotifs.length === 0 ? (
          <p className="text-xs" style={{ color: COLORS.faint }}>Ninguna activada.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeNotifs.map((k) => (
              <Tag key={k} label={NOTIF_LABELS[k]} color={COLORS.violet} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Notas */}
      {plainNotes && (
        <div className="sc-card rounded-xl p-4 mt-3" style={{ background: COLORS.panel }}>
          <div className="flex items-center gap-2 mb-2">
            <User size={14} style={{ color: COLORS.sub }} />
            <span className="text-xs font-semibold" style={{ color: COLORS.sub }}>Notas internas</span>
          </div>
          <p className="text-xs" style={{ color: COLORS.ink, whiteSpace: "pre-wrap" }}>{plainNotes}</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main view
───────────────────────────────────────────────────────────── */

type PanelMode = "detail" | "new" | "edit";

export default function ClientesView() {
  const isMobile = useAppStore((s) => s.isMobile);
  const qc = useQueryClient();

  const { data: clientsData, isLoading } = useClients();

  // Use raw API data directly — don't adapt until needed per-render
  const rawClients: RawClient[] = clientsData?.items ?? [];
  const clients: Client[] = rawClients.map(adaptApiClient);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("detail");
  const [showPanel, setShowPanel] = useState(false); // mobile only

  // Keep selectedId in sync when list loads (auto-select first)
  const effectiveSelectedId = selectedId ?? (clients[0]?.id ?? null);
  const selectedRaw = rawClients.find((c) => String(c.id) === effectiveSelectedId) ?? null;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setPanelMode("detail");
    if (isMobile) setShowPanel(true);
  }, [isMobile]);

  const handleNewClick = () => {
    setSelectedId(null);
    setPanelMode("new");
    if (isMobile) setShowPanel(true);
  };

  const handleEditClick = () => {
    setPanelMode("edit");
  };

  const handleSaved = (id: string) => {
    setSelectedId(id);
    setPanelMode("detail");
    if (isMobile) setShowPanel(true);
  };

  const handleCancelForm = () => {
    if (panelMode === "new") {
      if (isMobile) setShowPanel(false);
      setSelectedId(null);
    }
    setPanelMode("detail");
  };

  const handleDeleted = () => {
    qc.invalidateQueries({ queryKey: ["clients"] });
    setSelectedId(null);
    setPanelMode("detail");
    if (isMobile) setShowPanel(false);
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  // ─── Mobile: show panel full screen ────────────────────────
  if (isMobile && showPanel) {
    if (panelMode === "new") {
      return (
        <ClientForm
          onSaved={handleSaved}
          onCancel={() => { setShowPanel(false); setPanelMode("detail"); }}
          isMobile
        />
      );
    }
    if (panelMode === "edit" && selectedRaw) {
      return (
        <ClientForm
          initial={selectedRaw}
          onSaved={handleSaved}
          onCancel={() => setPanelMode("detail")}
          isMobile
        />
      );
    }
    if (selectedRaw) {
      return (
        <ClientDetail
          raw={selectedRaw}
          onBack={() => setShowPanel(false)}
          onEdit={handleEditClick}
          onDeleted={handleDeleted}
          onRefresh={handleRefresh}
          isMobile
        />
      );
    }
  }

  // ─── Desktop + mobile list ──────────────────────────────────
  const rightPanel = () => {
    if (panelMode === "new") {
      return (
        <ClientForm
          onSaved={handleSaved}
          onCancel={handleCancelForm}
        />
      );
    }
    if (panelMode === "edit" && selectedRaw) {
      return (
        <ClientForm
          initial={selectedRaw}
          onSaved={handleSaved}
          onCancel={handleCancelForm}
        />
      );
    }
    if (selectedRaw) {
      return (
        <ClientDetail
          raw={selectedRaw}
          onEdit={handleEditClick}
          onDeleted={handleDeleted}
          onRefresh={handleRefresh}
        />
      );
    }
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3"
        style={{ color: COLORS.faint }}
      >
        <User size={40} strokeWidth={1} />
        <p className="text-sm">Seleccioná un cliente</p>
      </div>
    );
  };

  return (
    <div className="flex h-full" style={{ background: COLORS.bg }}>
      {/* Left panel — list */}
      <div
        className="sc-scroll flex flex-col overflow-y-auto border-r"
        style={{
          width: isMobile ? "100%" : 380,
          minWidth: isMobile ? undefined : 380,
          borderColor: COLORS.line,
          background: COLORS.panel,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
          style={{ borderColor: COLORS.line, background: COLORS.panel }}
        >
          <p className="text-xs font-bold tracking-wider" style={{ color: COLORS.sub }}>
            PADRÓN · {clients.length} clientes
          </p>
          <button
            type="button"
            onClick={handleNewClick}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
            style={{ background: COLORS.aqua, color: "#fff" }}
          >
            <Plus size={14} />
            Nuevo cliente
          </button>
        </div>

        {/* List */}
        <div className="flex-1 px-2 pb-4 space-y-1 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8" style={{ color: COLORS.sub }}>
              <span className="text-sm">Cargando...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: COLORS.sub }}>
              <span className="text-sm font-medium">Sin clientes cargados</span>
              <span className="text-xs" style={{ color: COLORS.faint }}>
                Usá "Nuevo cliente" para agregar el primero.
              </span>
            </div>
          ) : (
            clients.map((cl) => (
              <ClientCard
                key={cl.id}
                client={cl}
                selected={effectiveSelectedId === cl.id}
                onClick={() => handleSelect(cl.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel — desktop only */}
      {!isMobile && (
        <div className="flex-1 flex flex-col min-w-0" style={{ background: COLORS.bg }}>
          {rightPanel()}
        </div>
      )}
    </div>
  );
}
