import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { COLORS, colorTint } from "@/lib/constants";
import { useAppStore } from "@/stores/useAppStore";
import { useClients } from "@/hooks/useClients";
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
  useDeleteAppointment,
} from "@/hooks/useAgenda";
import {
  Calendar,
  Clock,
  Pill,
  Stethoscope,
  UserCheck,
  Car,
  Phone,
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CalendarOff,
  Trash2,
  Edit3,
  MessageCircle,
  FileText,
  Repeat,
} from "lucide-react";
import type { AppointmentData } from "@/lib/types";

/* ── Constants ────────────────────────────────────────────────── */

const TYPE_OPTIONS = [
  { value: "med",    label: "Medicación",        icon: Pill },
  { value: "turno",  label: "Turno médico",       icon: Stethoscope },
  { value: "noche",  label: "Visita enfermera",   icon: UserCheck },
  { value: "remis",  label: "Remis",              icon: Car },
  { value: "llamada",label: "Llamada de control", icon: Phone },
  { value: "otro",   label: "Otro",               icon: Calendar },
] as const;

const TYPE_LABELS: Record<string, string> = {
  med:    "Medicación",
  turno:  "Turno médico",
  noche:  "Visita enfermera",
  remis:  "Remis",
  llamada:"Llamada de control",
  otro:   "Otro",
};

// color CSS var for each type (solid color)
const TYPE_COLOR: Record<string, string> = {
  med:     COLORS.coral,
  turno:   COLORS.blue,
  noche:   COLORS.amber,
  remis:   COLORS.violet,
  llamada: COLORS.aqua,
  otro:    COLORS.sub,
};

// tinted background for each type
const TYPE_BG: Record<string, string> = {
  med:     colorTint(COLORS.coral,  "light"),
  turno:   colorTint(COLORS.blue,   "light"),
  noche:   colorTint(COLORS.amber,  "light"),
  remis:   colorTint(COLORS.violet, "light"),
  llamada: colorTint(COLORS.aqua,   "light"),
  otro:    colorTint(COLORS.sub,    "faint"),
};

const RECURRENCE_OPTIONS = [
  { value: "",        label: "Ninguna" },
  { value: "diario",  label: "Diario" },
  { value: "lun-vie", label: "Lun a Vie" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
] as const;

const RECURRENCE_LABELS: Record<string, string> = {
  diario:  "Diario",
  "lun-vie": "Lunes a Viernes",
  semanal: "Semanal",
  mensual: "Mensual",
};

const STATUS_COLORS: Record<string, string> = {
  pendiente:   COLORS.sub,
  cumplido:    "#22c55e",
  no_cumplido: COLORS.coral,
  cancelado:   COLORS.sub,
};

const STATUS_LABELS: Record<string, string> = {
  pendiente:   "Pendiente",
  cumplido:    "Cumplido",
  no_cumplido: "No cumplido",
  cancelado:   "Cancelado",
};

const ICON_MAP: Record<string, React.ElementType> = {
  med:     Pill,
  turno:   Stethoscope,
  noche:   UserCheck,
  remis:   Car,
  llamada: Phone,
  otro:    Calendar,
};

// 06:00 – 22:00 → 17 rows
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
// pixel height per hour
const HOUR_H = 64;
// pixel offset from top of grid to 06:00
const GRID_START = 6 * 60; // 360 minutes

const DAY_NAMES_SHORT  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_MOBILE = ["D", "L", "M", "X", "J", "V", "S"];
const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/* ── Helpers ──────────────────────────────────────────────────── */

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday first
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()    === b.getMonth()
    && a.getDate()     === b.getDate();
}

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** top offset in px for a given Date inside the HOURS grid */
function topForDate(d: Date): number {
  return ((minutesFromMidnight(d) - GRID_START) / 60) * HOUR_H;
}

function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sM = MONTH_NAMES[weekStart.getMonth()];
  const eM = MONTH_NAMES[end.getMonth()];
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()} – ${end.getDate()} ${sM} ${end.getFullYear()}`;
  }
  return `${weekStart.getDate()} ${sM} – ${end.getDate()} ${eM} ${end.getFullYear()}`;
}

/* ── EventFormModal ───────────────────────────────────────────── */

interface EventFormData {
  client_id: number | null;
  type: string;
  scheduled_at: string;
  detail: string;
  recurrence: string | null;
  recurrence_end: string | null;
  recurrence_start: string | null;
  whatsapp_reminder: boolean;
  notes: string | null;
}

interface EventFormProps {
  onClose: () => void;
  onSave: (data: EventFormData) => void;
  initial?: Partial<EventFormData>;
  clients: { id: number; name: string }[];
  saving?: boolean;
}

function EventFormModal({ onClose, onSave, initial, clients, saving }: EventFormProps) {
  const now = new Date();
  const defaultDate = initial?.scheduled_at ? initial.scheduled_at.slice(0, 10) : formatDate(now);
  const defaultTime = initial?.scheduled_at ? initial.scheduled_at.slice(11, 16) : formatTime(now);

  const [clientId,        setClientId]        = useState<number | null>(initial?.client_id ?? null);
  const [type,            setType]            = useState(initial?.type ?? "turno");
  const [date,            setDate]            = useState(defaultDate);
  const [time,            setTime]            = useState(defaultTime);
  const [detail,          setDetail]          = useState(initial?.detail ?? "");
  const [recurrence,      setRecurrence]      = useState(initial?.recurrence ?? "");
  const [recurrenceStart, setRecurrenceStart] = useState(initial?.recurrence_start ?? defaultDate);
  const [recurrenceEnd,   setRecurrenceEnd]   = useState(initial?.recurrence_end ?? "");
  const [whatsapp,        setWhatsapp]        = useState(initial?.whatsapp_reminder ?? false);
  const [notes,           setNotes]           = useState(initial?.notes ?? "");

  const isEdit = !!initial?.type;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // When recurring: scheduled_at carries the recurrence_start date + chosen time
    const scheduled = recurrence
      ? `${recurrenceStart}T${time}:00`
      : `${date}T${time}:00`;
    onSave({
      client_id:       clientId,
      type,
      scheduled_at:    scheduled,
      detail,
      recurrence:      recurrence || null,
      recurrence_start:recurrence ? (recurrenceStart || null) : null,
      recurrence_end:  recurrence ? (recurrenceEnd || null)   : null,
      whatsapp_reminder: whatsapp,
      notes: notes || null,
    });
  };

  const inp: React.CSSProperties = {
    background: COLORS.panel2,
    color: COLORS.ink,
    border: `1px solid ${COLORS.line}`,
    outline: "none",
  };

  const TypeIcon = ICON_MAP[type] ?? Calendar;
  const typeColor = TYPE_COLOR[type] ?? COLORS.sub;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        style={{ background: COLORS.bg, border: `1px solid ${COLORS.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b"
          style={{ borderColor: COLORS.line }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: TYPE_BG[type] ?? colorTint(COLORS.sub, "faint") }}
          >
            <TypeIcon size={18} style={{ color: typeColor }} />
          </div>
          <h2 className="text-base font-bold flex-1" style={{ color: COLORS.ink }}>
            {isEdit ? "Editar evento" : "Nuevo evento"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: COLORS.sub }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Client */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
              Cliente
            </label>
            <select
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={inp}
            >
              <option value="">Sin cliente (todos)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((t) => {
                const TIcon = t.icon;
                const tColor = TYPE_COLOR[t.value] ?? COLORS.sub;
                const selected = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: selected ? TYPE_BG[t.value] : COLORS.panel,
                      border: `1.5px solid ${selected ? tColor : COLORS.line}`,
                      color: selected ? tColor : COLORS.sub,
                    }}
                  >
                    <TIcon size={16} />
                    <span className="text-[10px] leading-tight text-center">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
              Repetición
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {RECURRENCE_OPTIONS.map((r) => {
                const sel = recurrence === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRecurrence(r.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: sel ? COLORS.amber : COLORS.panel,
                      color: sel ? "#fff" : COLORS.sub,
                      border: `1px solid ${sel ? COLORS.amber : COLORS.line}`,
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date / Time */}
          {!recurrence ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={inp}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
                  Hora
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={inp}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
                  Hora
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={inp}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
                  Desde
                </label>
                <input
                  type="date"
                  value={recurrenceStart}
                  onChange={(e) => setRecurrenceStart(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
                  Hasta
                </label>
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(e) => setRecurrenceEnd(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={inp}
                />
              </div>
            </div>
          )}

          {/* Detail */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
              Detalle
            </label>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Ej: Turno con Dr. Pérez"
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={inp}
              required
            />
          </div>

          {/* WhatsApp toggle */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl"
            style={{ background: COLORS.panel }}
            onClick={() => setWhatsapp(!whatsapp)}
          >
            <div
              className="w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0"
              style={{ background: whatsapp ? "#22c55e" : COLORS.line }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: whatsapp ? 22 : 2 }}
              />
            </div>
            <MessageCircle size={15} style={{ color: whatsapp ? "#22c55e" : COLORS.sub }} />
            <span className="text-sm" style={{ color: COLORS.ink }}>
              Recordatorio por WhatsApp
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.sub }}>
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
              style={inp}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
              opacity: saving ? 0.65 : 1,
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isEdit ? "Guardar cambios" : "Crear evento"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── EventDetailPopup ─────────────────────────────────────────── */

interface EventDetailProps {
  event: AppointmentData;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  updatingStatus?: boolean;
  deleting?: boolean;
}

function EventDetailPopup({
  event,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
  updatingStatus,
  deleting,
}: EventDetailProps) {
  const dt     = new Date(event.scheduled_at);
  const color  = TYPE_COLOR[event.type] ?? COLORS.sub;
  const bg     = TYPE_BG[event.type]    ?? colorTint(COLORS.sub, "faint");
  const Icon   = ICON_MAP[event.type]   ?? Calendar;
  const sBadge = STATUS_COLORS[event.status] || COLORS.sub;
  const isCancelled = event.status === "cancelado";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ background: COLORS.bg, border: `1px solid ${COLORS.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored top stripe */}
        <div className="h-1.5" style={{ background: color }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg }}
              >
                <Icon size={22} style={{ color }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: COLORS.ink }}>
                  {TYPE_LABELS[event.type] || event.type}
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.sub }}>
                  {event.client_name || "Todos los clientes"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: COLORS.sub }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2 mb-4">
            <InfoRow icon={<Calendar size={13} style={{ color: COLORS.sub }} />}>
              {`${DAY_NAMES_SHORT[dt.getDay()]} ${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`}
            </InfoRow>
            <InfoRow icon={<Clock size={13} style={{ color: COLORS.sub }} />}>
              {formatTime(dt)}
            </InfoRow>
            {event.detail && (
              <InfoRow icon={<FileText size={13} style={{ color: COLORS.sub }} />}>
                <span style={{ textDecoration: isCancelled ? "line-through" : "none" }}>
                  {event.detail}
                </span>
              </InfoRow>
            )}
            {event.recurrence && (
              <InfoRow icon={<Repeat size={13} style={{ color: COLORS.sub }} />}>
                {RECURRENCE_LABELS[event.recurrence] || event.recurrence}
                {event.recurrence_end ? ` · hasta ${event.recurrence_end}` : ""}
              </InfoRow>
            )}
            {event.whatsapp_reminder && (
              <InfoRow icon={<MessageCircle size={13} style={{ color: "#22c55e" }} />}>
                <span style={{ color: "#22c55e" }}>Recordatorio WhatsApp activo</span>
              </InfoRow>
            )}
            {event.notes && (
              <div
                className="mt-1 p-3 rounded-xl text-xs leading-relaxed"
                style={{ background: COLORS.panel, color: COLORS.ink }}
              >
                {event.notes}
              </div>
            )}
          </div>

          {/* Status badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: `${sBadge}20`, color: sBadge }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: sBadge }} />
            {STATUS_LABELS[event.status] || event.status}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {event.status === "pendiente" && (
              <>
                <ActionBtn
                  color="#22c55e"
                  onClick={() => onStatusChange("cumplido")}
                  disabled={updatingStatus}
                  icon={<Check size={13} />}
                >
                  Cumplido
                </ActionBtn>
                <ActionBtn
                  color={COLORS.coral}
                  onClick={() => onStatusChange("no_cumplido")}
                  disabled={updatingStatus}
                  icon={<X size={13} />}
                >
                  No cumplido
                </ActionBtn>
                <ActionBtn
                  color={COLORS.sub}
                  onClick={() => onStatusChange("cancelado")}
                  disabled={updatingStatus}
                  icon={<X size={13} />}
                >
                  Cancelar
                </ActionBtn>
              </>
            )}
            <ActionBtn
              color={COLORS.blue}
              onClick={onEdit}
              icon={<Edit3 size={13} />}
            >
              Editar
            </ActionBtn>
            <ActionBtn
              color={COLORS.coral}
              onClick={onDelete}
              disabled={deleting}
              icon={<Trash2 size={13} />}
            >
              {deleting ? "..." : "Eliminar"}
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function ActionBtn({
  color,
  onClick,
  disabled,
  icon,
  children,
}: {
  color: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50"
      style={{ background: `${color}18`, color }}
    >
      {icon}
      {children}
    </button>
  );
}

/* ── CalendarGrid (week view) ─────────────────────────────────── */

const GUTTER_W = 48; // px width of the hour labels column

interface CalendarGridProps {
  weekStart: Date;
  events: AppointmentData[];
  today: Date;
  now: Date;
  isMobile: boolean;
  onEventClick: (ev: AppointmentData) => void;
}

function CalendarGrid({ weekStart, events, today, now, isMobile, onEventClick }: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // On mount: scroll so 07:00 is near top
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = HOUR_H * 1; // 1 hour above 06:00 → shows from 06:00
    }
  }, []);

  const days = useMemo(
    () => Array.from({ length: isMobile ? 1 : 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart, isMobile]
  );

  // Group events by day key
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentData[]>();
    for (const d of days) map.set(formatDate(d), []);
    for (const ev of events) {
      const key = formatDate(new Date(ev.scheduled_at));
      if (map.has(key)) map.get(key)!.push(ev);
    }
    return map;
  }, [events, days]);

  const nowMinutes = minutesFromMidnight(now);
  const nowTop = ((nowMinutes - GRID_START) / 60) * HOUR_H;
  const nowVisible = nowMinutes >= GRID_START && nowMinutes <= GRID_START + HOURS.length * 60;
  const isTodayInView = days.some((d) => isSameDay(d, today));

  const totalH = HOURS.length * HOUR_H;

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto flex-1 relative"
      style={{ minHeight: 0 }}
    >
      <div className="relative" style={{ height: totalH }}>
        {/* Hour grid lines + labels */}
        <div
          className="absolute inset-0"
          style={{ paddingLeft: GUTTER_W }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: (h - 6) * HOUR_H }}
            >
              {/* Hour label */}
              <div
                className="absolute flex items-center justify-end pr-2"
                style={{ width: GUTTER_W, top: -8, left: 0 }}
              >
                <span
                  className="text-[10px] font-mono select-none"
                  style={{ color: COLORS.sub }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
              {/* Horizontal rule */}
              <div
                className="absolute"
                style={{
                  left: GUTTER_W,
                  right: 0,
                  top: 0,
                  borderTop: `1px solid ${COLORS.line}`,
                  opacity: 0.5,
                }}
              />
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: GUTTER_W, right: 0, display: "flex" }}
        >
          {days.map((d) => {
            const key = formatDate(d);
            const isToday = isSameDay(d, today);
            const dayEvts = byDay.get(key) || [];

            return (
              <div
                key={key}
                className="relative flex-1 border-l"
                style={{
                  borderColor: colorTint(COLORS.line, "faint"),
                  background: isToday
                    ? colorTint(COLORS.amber, "faint")
                    : "transparent",
                }}
              >
                {/* Events for this day */}
                {dayEvts.map((ev) => (
                  <EventBlock
                    key={ev.id}
                    ev={ev}
                    onClick={() => onEventClick(ev)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Current time indicator */}
        {nowVisible && isTodayInView && (
          <CurrentTimeIndicator
            top={nowTop}
            days={days}
            today={today}
            gutterW={GUTTER_W}
          />
        )}
      </div>
    </div>
  );
}

/* ── EventBlock ───────────────────────────────────────────────── */

interface EventBlockProps {
  ev: AppointmentData;
  onClick: () => void;
}

function EventBlock({ ev, onClick }: EventBlockProps) {
  const dt          = new Date(ev.scheduled_at);
  const top         = topForDate(dt);
  const color       = TYPE_COLOR[ev.type] ?? COLORS.sub;
  const bg          = TYPE_BG[ev.type]    ?? colorTint(COLORS.sub, "faint");
  const Icon        = ICON_MAP[ev.type]   ?? Calendar;
  const isCancelled = ev.status === "cancelado";
  const isCumplido  = ev.status === "cumplido";

  return (
    <div
      className="absolute inset-x-1 rounded-[6px] cursor-pointer group transition-all duration-150 overflow-hidden select-none"
      style={{
        top:       Math.max(top, 0),
        minHeight: 22,
        height:    Math.max(HOUR_H * 0.75, 22),
        background: bg,
        borderLeft: `3px solid ${color}`,
        opacity: isCancelled ? 0.45 : isCumplido ? 0.75 : 1,
        zIndex: 1,
        boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
      }}
      onClick={onClick}
      // hover via inline style + group
    >
      {/* Hover overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-[6px]"
        style={{ background: color, opacity: 0 }}
      />

      <div className="relative px-1.5 py-1 flex items-start gap-1 group-hover:scale-[1.01] transition-transform duration-150">
        <Icon size={11} style={{ color, marginTop: 1, shrink: 0, flexShrink: 0 }} />
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-mono font-semibold leading-tight"
            style={{ color }}
          >
            {formatTime(dt)}
          </p>
          <p
            className="text-[11px] font-medium leading-tight truncate"
            style={{
              color: COLORS.ink,
              textDecoration: isCancelled ? "line-through" : "none",
            }}
          >
            {ev.client_name || ev.detail || TYPE_LABELS[ev.type] || ev.type}
          </p>
        </div>
        {/* Status icons */}
        {isCumplido && (
          <Check size={10} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
        )}
        {ev.recurrence && (
          <Repeat size={9} style={{ color: COLORS.sub, flexShrink: 0, marginTop: 2 }} />
        )}
        {ev.whatsapp_reminder && (
          <MessageCircle size={9} style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }} />
        )}
      </div>
    </div>
  );
}

/* ── CurrentTimeIndicator ─────────────────────────────────────── */

function CurrentTimeIndicator({
  top,
  days,
  today,
  gutterW,
}: {
  top: number;
  days: Date[];
  today: Date;
  gutterW: number;
}) {
  const todayIdx = days.findIndex((d) => isSameDay(d, today));
  if (todayIdx < 0) return null;

  const colPct = (todayIdx / days.length) * 100;
  const colW   = 100 / days.length;

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{ top, left: gutterW, right: 0 }}
    >
      {/* Dot at left edge of today column */}
      <div
        className="absolute w-2.5 h-2.5 rounded-full"
        style={{
          background: "#ef4444",
          top: -5,
          left: `calc(${colPct}% - 5px)`,
        }}
      />
      {/* Line spanning today's column */}
      <div
        className="absolute h-px"
        style={{
          background: "#ef4444",
          left: `${colPct}%`,
          width: `${colW}%`,
        }}
      />
    </div>
  );
}

/* ── WeekHeader ───────────────────────────────────────────────── */

interface WeekHeaderProps {
  weekStart: Date;
  today: Date;
  isMobile: boolean;
}

function WeekHeader({ weekStart, today, isMobile }: WeekHeaderProps) {
  const days = useMemo(
    () => Array.from({ length: isMobile ? 1 : 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart, isMobile]
  );

  return (
    <div
      className="flex border-b shrink-0"
      style={{ borderColor: COLORS.line }}
    >
      {/* Gutter spacer */}
      <div style={{ width: GUTTER_W, flexShrink: 0 }} />
      {/* Day headers */}
      {days.map((d) => {
        const isToday = isSameDay(d, today);
        return (
          <div
            key={formatDate(d)}
            className="flex-1 flex flex-col items-center py-2 border-l"
            style={{
              borderColor: colorTint(COLORS.line, "faint"),
              background: isToday ? colorTint(COLORS.amber, "faint") : "transparent",
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: isToday ? COLORS.amber : COLORS.sub }}
            >
              {isMobile ? DAY_NAMES_MOBILE[d.getDay()] : DAY_NAMES_SHORT[d.getDay()]}
            </span>
            <span
              className="text-base font-bold leading-tight"
              style={{ color: isToday ? COLORS.amber : COLORS.ink }}
            >
              {d.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── EmptyWeek ────────────────────────────────────────────────── */

function EmptyWeek() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
      <CalendarOff size={44} style={{ color: COLORS.line }} />
      <p className="text-sm font-medium" style={{ color: COLORS.sub }}>
        Sin eventos esta semana
      </p>
      <p className="text-xs" style={{ color: COLORS.line }}>
        Creá un nuevo evento con el botón +&nbsp;Nuevo
      </p>
    </div>
  );
}

/* ── Main AgendaView ──────────────────────────────────────────── */

export default function AgendaView() {
  const now      = useAppStore((s) => s.now);
  const isMobile = useAppStore((s) => s.isMobile);

  const [weekStart,      setWeekStart]      = useState<Date>(() => startOfWeek(new Date()));
  const [filterClientId, setFilterClientId] = useState<number | undefined>(undefined);
  const [showForm,       setShowForm]       = useState(false);
  const [editingEvent,   setEditingEvent]   = useState<AppointmentData | null>(null);
  const [selectedEvent,  setSelectedEvent]  = useState<AppointmentData | null>(null);

  // In mobile mode, show a single day (start of the single-day "week")
  const [mobileDay, setMobileDay] = useState<Date>(() => new Date());

  const effectiveStart = isMobile ? startOfWeek(mobileDay) : weekStart;

  // Date range for API
  const dateFrom = formatDate(effectiveStart);
  const dateTo   = formatDate(addDays(effectiveStart, isMobile ? 0 : 6));

  const { data: rawAppointments, isLoading, isError } = useAppointments(dateFrom, dateTo, filterClientId);
  const { data: clientsData } = useClients();

  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const updateStatus      = useUpdateAppointmentStatus();
  const deleteAppointment = useDeleteAppointment();

  const clients: { id: number; name: string }[] = useMemo(() => {
    if (!clientsData) return [];
    const items = (clientsData as { items?: unknown[] }).items || clientsData;
    if (!Array.isArray(items)) return [];
    return (items as { id: number; name: string }[]).map((c) => ({ id: c.id, name: c.name }));
  }, [clientsData]);

  const events: AppointmentData[] = useMemo(() => {
    if (!rawAppointments) return [];
    if (Array.isArray(rawAppointments)) return rawAppointments;
    return [];
  }, [rawAppointments]);

  /* Navigation */
  const goToday = useCallback(() => {
    const t = new Date();
    setWeekStart(startOfWeek(t));
    setMobileDay(t);
  }, []);

  const goPrev = useCallback(() => {
    if (isMobile) {
      setMobileDay((d) => addDays(d, -1));
    } else {
      setWeekStart((d) => addDays(d, -7));
    }
  }, [isMobile]);

  const goNext = useCallback(() => {
    if (isMobile) {
      setMobileDay((d) => addDays(d, 1));
    } else {
      setWeekStart((d) => addDays(d, 7));
    }
  }, [isMobile]);

  /* Handlers */
  const handleCreateOrUpdate = useCallback(
    (data: EventFormData) => {
      if (editingEvent) {
        updateAppointment.mutate(
          { id: editingEvent.id, ...data },
          { onSuccess: () => { setShowForm(false); setEditingEvent(null); } }
        );
      } else {
        createAppointment.mutate(
          data as Parameters<typeof createAppointment.mutate>[0],
          { onSuccess: () => setShowForm(false) }
        );
      }
    },
    [editingEvent, createAppointment, updateAppointment]
  );

  const handleEventClick = useCallback((ev: AppointmentData) => {
    setSelectedEvent(ev);
  }, []);

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!selectedEvent) return;
      updateStatus.mutate(
        { id: selectedEvent.id, status },
        { onSuccess: () => setSelectedEvent(null) }
      );
    },
    [selectedEvent, updateStatus]
  );

  const handleDelete = useCallback(() => {
    if (!selectedEvent) return;
    if (!confirm("¿Eliminar este evento?")) return;
    deleteAppointment.mutate(selectedEvent.id, {
      onSuccess: () => setSelectedEvent(null),
    });
  }, [selectedEvent, deleteAppointment]);

  const handleEdit = useCallback(() => {
    if (!selectedEvent) return;
    setEditingEvent(selectedEvent);
    setSelectedEvent(null);
    setShowForm(true);
  }, [selectedEvent]);

  const handleNew = useCallback(() => {
    setEditingEvent(null);
    setShowForm(true);
  }, []);

  // Range label for header
  const rangeLabel = isMobile
    ? `${DAY_NAMES_SHORT[mobileDay.getDay()]} ${mobileDay.getDate()} ${MONTH_NAMES[mobileDay.getMonth()]} ${mobileDay.getFullYear()}`
    : `Semana del ${weekRangeLabel(weekStart)}`;

  const isEmpty = !isLoading && !isError && events.length === 0;

  return (
    <div
      className="flex flex-col w-full h-full overflow-hidden"
      style={{ background: COLORS.bg }}
    >
      {/* ── Top bar ─────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b shrink-0 flex-wrap"
        style={{ borderColor: COLORS.line }}
      >
        {/* Nav arrows + range label */}
        <button
          onClick={goPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ background: COLORS.panel, color: COLORS.ink }}
        >
          <ChevronLeft size={16} />
        </button>

        <span
          className="text-sm font-semibold select-none"
          style={{ color: COLORS.ink, minWidth: isMobile ? 160 : 260, textAlign: "center" }}
        >
          {rangeLabel}
        </span>

        <button
          onClick={goNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ background: COLORS.panel, color: COLORS.ink }}
        >
          <ChevronRight size={16} />
        </button>

        {/* Hoy button */}
        <button
          onClick={goToday}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: COLORS.panel, color: COLORS.sub, border: `1px solid ${COLORS.line}` }}
        >
          Hoy
        </button>

        <div className="flex-1" />

        {/* Client filter */}
        <select
          value={filterClientId ?? ""}
          onChange={(e) => setFilterClientId(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-lg px-3 py-1.5 text-xs"
          style={{
            background: COLORS.panel,
            color: COLORS.ink,
            border: `1px solid ${COLORS.line}`,
            maxWidth: isMobile ? 120 : 180,
          }}
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* + Nuevo */}
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})` }}
        >
          <Plus size={14} />
          {!isMobile && "Nuevo"}
        </button>
      </div>

      {/* ── Loading / Error states ───────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center flex-1 gap-2">
          <Loader2 size={20} className="animate-spin" style={{ color: COLORS.amber }} />
          <span className="text-sm" style={{ color: COLORS.sub }}>Cargando agenda...</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center flex-1 gap-2">
          <AlertCircle size={20} style={{ color: COLORS.coral }} />
          <span className="text-sm" style={{ color: COLORS.coral }}>Error al cargar la agenda</span>
        </div>
      )}

      {/* ── Calendar grid ───────────────────────────── */}
      {!isLoading && !isError && (
        <>
          <WeekHeader
            weekStart={isMobile ? startOfWeek(mobileDay) : weekStart}
            today={now}
            isMobile={isMobile}
          />
          {isEmpty ? (
            <EmptyWeek />
          ) : (
            <CalendarGrid
              weekStart={isMobile ? startOfWeek(mobileDay) : weekStart}
              events={events}
              today={now}
              now={now}
              isMobile={isMobile}
              onEventClick={handleEventClick}
            />
          )}
        </>
      )}

      {/* ── Modals ──────────────────────────────────── */}
      {showForm && (
        <EventFormModal
          onClose={() => { setShowForm(false); setEditingEvent(null); }}
          onSave={handleCreateOrUpdate}
          initial={
            editingEvent
              ? {
                  client_id:        editingEvent.client_id,
                  type:             editingEvent.type,
                  scheduled_at:     editingEvent.scheduled_at,
                  detail:           editingEvent.detail ?? "",
                  recurrence:       editingEvent.recurrence,
                  recurrence_end:   editingEvent.recurrence_end,
                  recurrence_start: null,
                  whatsapp_reminder:editingEvent.whatsapp_reminder,
                  notes:            editingEvent.notes,
                }
              : {
                  scheduled_at: `${formatDate(isMobile ? mobileDay : new Date())}T${formatTime(now)}`,
                }
          }
          clients={clients}
          saving={createAppointment.isPending || updateAppointment.isPending}
        />
      )}

      {selectedEvent && (
        <EventDetailPopup
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          updatingStatus={updateStatus.isPending}
          deleting={deleteAppointment.isPending}
        />
      )}
    </div>
  );
}
