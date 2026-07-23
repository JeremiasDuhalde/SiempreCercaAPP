import { useState, useMemo, useCallback } from "react";
import { COLORS, AGENDA_TYPE_COLORS } from "@/lib/constants";
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
  { value: "med", label: "Medicacion" },
  { value: "turno", label: "Turno medico" },
  { value: "noche", label: "Visita enfermera" },
  { value: "remis", label: "Remis" },
  { value: "llamada", label: "Llamada de control" },
  { value: "otro", label: "Otro" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  med: "Medicacion",
  turno: "Turno medico",
  noche: "Visita enfermera",
  remis: "Remis",
  llamada: "Llamada de control",
  otro: "Otro",
};

const RECURRENCE_OPTIONS = [
  { value: "", label: "Ninguna" },
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pendiente: COLORS.sub,
  cumplido: "#22c55e",
  no_cumplido: COLORS.coral,
  cancelado: COLORS.sub,
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
  no_cumplido: "No cumplido",
  cancelado: "Cancelado",
};

const ICON_MAP: Record<string, React.ElementType> = {
  med: Pill,
  turno: Stethoscope,
  noche: UserCheck,
  remis: Car,
  llamada: Phone,
  otro: Calendar,
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 - 22:00

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const DAY_NAMES_LONG = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

/* ── Helpers ──────────────────────────────────────────────────── */

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateDisplay(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][d.getMonth()]} ${d.getFullYear()}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getTypeColor(type: string): string {
  const colorKey = AGENDA_TYPE_COLORS[type] || "sub";
  return (COLORS as Record<string, string>)[colorKey] || COLORS.sub;
}

/* ── Event Form Modal ─────────────────────────────────────────── */

interface EventFormProps {
  onClose: () => void;
  onSave: (data: EventFormData) => void;
  initial?: Partial<EventFormData>;
  clients: { id: number; name: string }[];
  saving?: boolean;
}

interface EventFormData {
  client_id: number | null;
  type: string;
  scheduled_at: string;
  detail: string;
  recurrence: string | null;
  recurrence_end: string | null;
  whatsapp_reminder: boolean;
  notes: string | null;
}

function EventFormModal({ onClose, onSave, initial, clients, saving }: EventFormProps) {
  const now = new Date();
  const defaultDate = initial?.scheduled_at
    ? initial.scheduled_at.slice(0, 10)
    : formatDate(now);
  const defaultTime = initial?.scheduled_at
    ? initial.scheduled_at.slice(11, 16)
    : formatTime(now);

  const [clientId, setClientId] = useState<number | null>(initial?.client_id ?? null);
  const [type, setType] = useState(initial?.type ?? "turno");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? "");
  const [recurrenceEnd, setRecurrenceEnd] = useState(initial?.recurrence_end ?? "");
  const [whatsappReminder, setWhatsappReminder] = useState(initial?.whatsapp_reminder ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      client_id: clientId,
      type,
      scheduled_at: `${date}T${time}:00`,
      detail,
      recurrence: recurrence || null,
      recurrence_end: recurrenceEnd || null,
      whatsapp_reminder: whatsappReminder,
      notes: notes || null,
    });
  };

  const inputStyle: React.CSSProperties = {
    background: COLORS.panel2,
    color: COLORS.ink,
    border: `1px solid ${COLORS.line}`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: COLORS.bg, border: `1px solid ${COLORS.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: COLORS.ink }}>
            {initial?.type ? "Editar evento" : "Nuevo evento"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{ color: COLORS.sub }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Client */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Cliente</label>
            <select
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
            >
              <option value="">Sin cliente (todos)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Detail */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Detalle</label>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Ej: Turno con Dr. Perez"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
              required
            />
          </div>

          {/* Recurrence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Repetir</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={inputStyle}
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {recurrence && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Repetir hasta</label>
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(e) => setRecurrenceEnd(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* WhatsApp reminder */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setWhatsappReminder(!whatsappReminder)}
          >
            <div
              className="w-9 h-5 rounded-full relative transition-colors shrink-0"
              style={{ background: whatsappReminder ? "#22c55e" : COLORS.line }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: whatsappReminder ? 18 : 2 }}
              />
            </div>
            <span className="text-sm" style={{ color: COLORS.ink }}>
              Recordatorio por WhatsApp
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: COLORS.sub }}>Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas adicionales..."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={inputStyle}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {initial?.type ? "Guardar cambios" : "Crear evento"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Event Detail Panel ──────────────────────────────────────── */

interface EventDetailProps {
  event: AppointmentData;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}

function EventDetailPanel({ event, onClose, onEdit, onStatusChange, onDelete }: EventDetailProps) {
  const dt = new Date(event.scheduled_at);
  const color = getTypeColor(event.type);
  const Icon = ICON_MAP[event.type] ?? Calendar;
  const statusColor = STATUS_COLORS[event.status] || COLORS.sub;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md"
        style={{ background: COLORS.bg, border: `1px solid ${COLORS.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: COLORS.ink }}>
                {TYPE_LABELS[event.type] || event.type}
              </h3>
              <p className="text-xs" style={{ color: COLORS.sub }}>
                {event.client_name || "Todos los clientes"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{ color: COLORS.sub }}>
            <X size={18} />
          </button>
        </div>

        {/* Info rows */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
            <Calendar size={14} style={{ color: COLORS.sub }} />
            <span>{formatDateDisplay(dt)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
            <Clock size={14} style={{ color: COLORS.sub }} />
            <span>{formatTime(dt)}</span>
          </div>
          {event.detail && (
            <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
              <FileText size={14} style={{ color: COLORS.sub }} />
              <span>{event.detail}</span>
            </div>
          )}
          {event.recurrence && (
            <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
              <Repeat size={14} style={{ color: COLORS.sub }} />
              <span>
                Repite: {event.recurrence}
                {event.recurrence_end ? ` (hasta ${event.recurrence_end})` : ""}
              </span>
            </div>
          )}
          {event.whatsapp_reminder && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "#22c55e" }}>
              <MessageCircle size={14} />
              <span>Recordatorio WhatsApp activo</span>
            </div>
          )}
          {event.notes && (
            <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: COLORS.panel, color: COLORS.ink }}>
              {event.notes}
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor }} />
          <span className="text-sm font-medium" style={{ color: statusColor }}>
            {STATUS_LABELS[event.status] || event.status}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {event.status === "pendiente" && (
            <>
              <button
                onClick={() => onStatusChange("cumplido")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
              >
                <Check size={14} /> Cumplido
              </button>
              <button
                onClick={() => onStatusChange("no_cumplido")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: `color-mix(in srgb, ${COLORS.coral} 12%, transparent)`, color: COLORS.coral }}
              >
                <X size={14} /> No cumplido
              </button>
              <button
                onClick={() => onStatusChange("cancelado")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: `color-mix(in srgb, ${COLORS.sub} 15%, transparent)`, color: COLORS.sub }}
              >
                <X size={14} /> Cancelar
              </button>
            </>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: `color-mix(in srgb, ${COLORS.blue} 12%, transparent)`, color: COLORS.blue }}
          >
            <Edit3 size={14} /> Editar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: `color-mix(in srgb, ${COLORS.coral} 12%, transparent)`, color: COLORS.coral }}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Day View ─────────────────────────────────────────────────── */

interface DayViewProps {
  events: AppointmentData[];
  onEventClick: (e: AppointmentData) => void;
  now: Date;
}

function DayView({ events, onEventClick, now }: DayViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <CalendarOff size={48} style={{ color: COLORS.line }} />
        <p className="text-sm font-medium" style={{ color: COLORS.sub }}>
          Sin eventos para este dia
        </p>
      </div>
    );
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="relative" style={{ minHeight: HOURS.length * 64 }}>
      {/* Hour grid lines */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 flex items-start"
          style={{ top: (h - 6) * 64 }}
        >
          <div className="shrink-0 text-right pr-3 pt-px" style={{ width: 52 }}>
            <span className="text-xs font-mono" style={{ color: COLORS.sub }}>
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
          <div className="flex-1 border-t" style={{ borderColor: COLORS.line, opacity: 0.5 }} />
        </div>
      ))}

      {/* Now indicator */}
      {nowMinutes >= 360 && nowMinutes <= 1320 && (
        <div
          className="absolute left-[52px] right-0 flex items-center z-10"
          style={{ top: ((nowMinutes - 360) / 60) * 64 }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: COLORS.coral, marginLeft: -4 }} />
          <div className="flex-1 h-px" style={{ background: COLORS.coral }} />
        </div>
      )}

      {/* Event blocks */}
      {events.map((ev) => {
        const dt = new Date(ev.scheduled_at);
        const evMinutes = dt.getHours() * 60 + dt.getMinutes();
        const top = ((evMinutes - 360) / 60) * 64;
        const color = getTypeColor(ev.type);
        const Icon = ICON_MAP[ev.type] ?? Calendar;
        const isCancelled = ev.status === "cancelado";
        const statusColor = STATUS_COLORS[ev.status] || COLORS.sub;

        return (
          <div
            key={ev.id}
            className="absolute left-[56px] right-2 rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md"
            style={{
              top: Math.max(top, 0),
              minHeight: 52,
              background: `color-mix(in srgb, ${color} 10%, ${COLORS.panel})`,
              borderLeft: `3px solid ${color}`,
              opacity: isCancelled ? 0.5 : 1,
            }}
            onClick={() => onEventClick(ev)}
          >
            <div className="flex items-center gap-2">
              {/* Status dot */}
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
              <Icon size={14} style={{ color }} />
              <span
                className="text-xs font-mono font-medium"
                style={{ color: COLORS.ink }}
              >
                {formatTime(dt)}
              </span>
              <span
                className="text-sm font-medium truncate"
                style={{
                  color: COLORS.ink,
                  textDecoration: isCancelled ? "line-through" : "none",
                }}
              >
                {ev.client_name || "Todos"}
              </span>
              {ev.recurrence && (
                <Repeat size={12} style={{ color: COLORS.sub }} className="shrink-0" />
              )}
              {ev.whatsapp_reminder && (
                <MessageCircle size={12} style={{ color: "#22c55e" }} className="shrink-0" />
              )}
            </div>
            {ev.detail && (
              <p
                className="text-xs mt-0.5 truncate pl-[18px]"
                style={{
                  color: COLORS.sub,
                  textDecoration: isCancelled ? "line-through" : "none",
                }}
              >
                {ev.detail}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Week View ────────────────────────────────────────────────── */

interface WeekViewProps {
  weekStart: Date;
  events: AppointmentData[];
  onEventClick: (e: AppointmentData) => void;
  today: Date;
}

function WeekView({ weekStart, events, onEventClick, today }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AppointmentData[]>();
    for (const d of days) {
      map.set(formatDate(d), []);
    }
    for (const ev of events) {
      const dt = new Date(ev.scheduled_at);
      const key = formatDate(dt);
      if (map.has(key)) {
        map.get(key)!.push(ev);
      }
    }
    // Sort each day's events
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    }
    return map;
  }, [events, days]);

  return (
    <div className="grid grid-cols-7 gap-1" style={{ minHeight: 400 }}>
      {days.map((d) => {
        const key = formatDate(d);
        const dayEvents = eventsByDay.get(key) || [];
        const isToday = isSameDay(d, today);

        return (
          <div
            key={key}
            className="rounded-xl p-2 flex flex-col gap-1"
            style={{
              background: isToday ? `color-mix(in srgb, ${COLORS.amber} 6%, ${COLORS.panel})` : COLORS.panel,
              border: isToday ? `1px solid ${COLORS.amber}` : `1px solid ${COLORS.line}`,
              minHeight: 120,
            }}
          >
            {/* Day header */}
            <div className="text-center mb-1">
              <div className="text-[10px] font-medium uppercase" style={{ color: COLORS.sub }}>
                {DAY_NAMES[d.getDay()]}
              </div>
              <div
                className="text-sm font-bold"
                style={{ color: isToday ? COLORS.amber : COLORS.ink }}
              >
                {d.getDate()}
              </div>
            </div>

            {/* Events */}
            {dayEvents.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[10px]" style={{ color: COLORS.line }}>-</span>
              </div>
            )}
            {dayEvents.map((ev) => {
              const color = getTypeColor(ev.type);
              const dt = new Date(ev.scheduled_at);
              const isCancelled = ev.status === "cancelado";
              const statusColor = STATUS_COLORS[ev.status] || COLORS.sub;

              return (
                <div
                  key={ev.id}
                  className="rounded-lg p-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    borderLeft: `2px solid ${color}`,
                    opacity: isCancelled ? 0.5 : 1,
                  }}
                  onClick={() => onEventClick(ev)}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor }} />
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: COLORS.ink }}
                    >
                      {formatTime(dt)}
                    </span>
                  </div>
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{
                      color: COLORS.ink,
                      textDecoration: isCancelled ? "line-through" : "none",
                    }}
                  >
                    {ev.client_name || ev.detail || TYPE_LABELS[ev.type] || ev.type}
                  </p>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main AgendaView ──────────────────────────────────────────── */

export default function AgendaView() {
  const now = useAppStore((s) => s.now);
  const isMobile = useAppStore((s) => s.isMobile);

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"dia" | "semana">(isMobile ? "dia" : "dia");
  const [filterClientId, setFilterClientId] = useState<number | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppointmentData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AppointmentData | null>(null);

  // Date range for queries
  const dateFrom = useMemo(() => {
    if (viewMode === "semana") {
      return formatDate(startOfWeek(selectedDate));
    }
    return formatDate(selectedDate);
  }, [selectedDate, viewMode]);

  const dateTo = useMemo(() => {
    if (viewMode === "semana") {
      return formatDate(addDays(startOfWeek(selectedDate), 6));
    }
    return formatDate(selectedDate);
  }, [selectedDate, viewMode]);

  // Queries
  const { data: appointments, isLoading, isError } = useAppointments(dateFrom, dateTo, filterClientId);
  const { data: clientsData } = useClients();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const updateStatus = useUpdateAppointmentStatus();
  const deleteAppointment = useDeleteAppointment();

  const clients: { id: number; name: string }[] = useMemo(() => {
    if (!clientsData) return [];
    const items = clientsData.items || clientsData;
    if (!Array.isArray(items)) return [];
    return items.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name }));
  }, [clientsData]);

  const events: AppointmentData[] = useMemo(() => {
    if (!appointments) return [];
    if (Array.isArray(appointments)) return appointments;
    return [];
  }, [appointments]);

  // Events filtered for day view
  const dayEvents = useMemo(() => {
    if (viewMode !== "dia") return events;
    return events.filter((ev) => {
      const dt = new Date(ev.scheduled_at);
      return isSameDay(dt, selectedDate);
    });
  }, [events, selectedDate, viewMode]);

  // Navigation
  const goToday = useCallback(() => setSelectedDate(new Date()), []);
  const goPrev = useCallback(() => {
    setSelectedDate((d) => addDays(d, viewMode === "semana" ? -7 : -1));
  }, [viewMode]);
  const goNext = useCallback(() => {
    setSelectedDate((d) => addDays(d, viewMode === "semana" ? 7 : 1));
  }, [viewMode]);

  // Handlers
  const handleCreateOrUpdate = useCallback(
    (data: EventFormData) => {
      if (editingEvent) {
        updateAppointment.mutate(
          { id: editingEvent.id, ...data },
          {
            onSuccess: () => {
              setShowForm(false);
              setEditingEvent(null);
            },
          }
        );
      } else {
        createAppointment.mutate(data as Parameters<typeof createAppointment.mutate>[0], {
          onSuccess: () => setShowForm(false),
        });
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
    if (!confirm("Eliminar este evento?")) return;
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

  const handleNewEvent = useCallback(() => {
    setEditingEvent(null);
    setShowForm(true);
  }, []);

  return (
    <div className="sc-scroll h-full overflow-y-auto" style={{ background: COLORS.bg }}>
      <div className={`mx-auto w-full ${isMobile ? "px-3 py-3" : "px-6 py-6 max-w-[1200px]"}`}>

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold" style={{ color: COLORS.ink }}>
              Agenda
            </h1>
            <button
              onClick={handleNewEvent}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium shrink-0 text-white"
              style={{ background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})` }}
            >
              <Plus size={14} />
              {!isMobile && "Nuevo evento"}
            </button>
          </div>

          {/* Controls row */}
          <div className={`flex ${isMobile ? "flex-col gap-2" : "items-center gap-3"}`}>
            {/* Date navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: COLORS.ink, background: COLORS.panel }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ color: COLORS.ink, background: COLORS.panel }}
              >
                {viewMode === "semana"
                  ? `${formatDateDisplay(startOfWeek(selectedDate))} - ${formatDateDisplay(addDays(startOfWeek(selectedDate), 6))}`
                  : `Hoy: ${formatDateDisplay(selectedDate)}`}
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: COLORS.ink, background: COLORS.panel }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* View toggle */}
            {!isMobile && (
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.line}` }}>
                <button
                  onClick={() => setViewMode("dia")}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: viewMode === "dia" ? COLORS.amber : "transparent",
                    color: viewMode === "dia" ? "#fff" : COLORS.sub,
                  }}
                >
                  Dia
                </button>
                <button
                  onClick={() => setViewMode("semana")}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: viewMode === "semana" ? COLORS.amber : "transparent",
                    color: viewMode === "semana" ? "#fff" : COLORS.sub,
                  }}
                >
                  Semana
                </button>
              </div>
            )}

            {/* Client filter */}
            <select
              value={filterClientId ?? ""}
              onChange={(e) => setFilterClientId(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{ background: COLORS.panel, color: COLORS.ink, border: `1px solid ${COLORS.line}` }}
            >
              <option value="">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 gap-2">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.amber }} />
            <span className="text-sm" style={{ color: COLORS.sub }}>Cargando agenda...</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-20 gap-2">
            <AlertCircle size={20} style={{ color: COLORS.coral }} />
            <span className="text-sm" style={{ color: COLORS.coral }}>Error al cargar la agenda</span>
          </div>
        )}

        {!isLoading && !isError && viewMode === "dia" && (
          <DayView events={dayEvents} onEventClick={handleEventClick} now={now} />
        )}

        {!isLoading && !isError && viewMode === "semana" && (
          <WeekView
            weekStart={startOfWeek(selectedDate)}
            events={events}
            onEventClick={handleEventClick}
            today={now}
          />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────── */}
      {showForm && (
        <EventFormModal
          onClose={() => { setShowForm(false); setEditingEvent(null); }}
          onSave={handleCreateOrUpdate}
          initial={
            editingEvent
              ? {
                  client_id: editingEvent.client_id,
                  type: editingEvent.type,
                  scheduled_at: editingEvent.scheduled_at,
                  detail: editingEvent.detail ?? "",
                  recurrence: editingEvent.recurrence,
                  recurrence_end: editingEvent.recurrence_end,
                  whatsapp_reminder: editingEvent.whatsapp_reminder,
                  notes: editingEvent.notes,
                }
              : { scheduled_at: `${formatDate(selectedDate)}T${formatTime(now)}` }
          }
          clients={clients}
          saving={createAppointment.isPending || updateAppointment.isPending}
        />
      )}

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
