import { useMemo } from "react";
import { COLORS, AGENDA_TYPE_COLORS } from "@/lib/constants";
import { CLIENTS, AGENDA_ITEMS } from "@/lib/mockData";
import { useAppStore } from "@/stores/useAppStore";
import { useAppointments, useCreateAppointment } from "@/hooks/useAgenda";
import { Pill, Navigation, Stethoscope, Moon, Plus } from "lucide-react";
import type { AgendaItem } from "@/lib/types";

/* ── Icon map ────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ElementType> = {
  med: Pill,
  remis: Navigation,
  turno: Stethoscope,
  noche: Moon,
};

/* ── API → AgendaItem adapter ───────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptApiAppointment(raw: any): AgendaItem {
  // scheduled_at is ISO datetime e.g. "2026-07-02T09:30:00"
  const dt = raw.scheduled_at ? new Date(raw.scheduled_at) : null;
  const time = dt
    ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
    : raw.time ?? "00:00";
  const type = (raw.type ?? raw.appointment_type ?? "turno") as AgendaItem["type"];
  return {
    time,
    type: ["med", "remis", "turno", "noche"].includes(type) ? type : "turno",
    client: raw.client_id ? String(raw.client_id) : (raw.client ?? "all"),
    detail: raw.detail ?? raw.description ?? "",
  };
}

/* ── Timeline item ──────────────────────────────────────────── */

function TimelineItem({ item, now }: { item: AgendaItem; now: Date }) {
  const [hStr, mStr] = item.time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const itemMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isPast = itemMinutes < nowMinutes;
  const diffMin = itemMinutes - nowMinutes;
  const isNearFuture = diffMin > 0 && diffMin <= 60;

  const colorKey = AGENDA_TYPE_COLORS[item.type] as keyof typeof COLORS;
  const color = COLORS[colorKey];
  const Icon = ICON_MAP[item.type] ?? Pill;

  const client =
    item.client === "all"
      ? null
      : CLIENTS.find((c) => c.id === item.client);
  const clientLabel = client ? client.name : "Todos los clientes";

  return (
    <div
      className="flex gap-4 relative"
      style={{ opacity: isPast ? 0.55 : 1 }}
    >
      {/* Dot on timeline */}
      <div className="flex flex-col items-center" style={{ width: 20 }}>
        <div
          className="rounded-full shrink-0 mt-1"
          style={{
            width: 12,
            height: 12,
            border: `2px solid ${color}`,
            background: !isPast ? color : "transparent",
          }}
        />
        <div className="flex-1 w-px" style={{ background: COLORS.line }} />
      </div>

      {/* Time label */}
      <div className="shrink-0 pt-0.5" style={{ width: 48 }}>
        <span className="text-sm font-mono font-medium" style={{ color: COLORS.ink }}>
          {item.time}
        </span>
      </div>

      {/* Card */}
      <div
        className="sc-card flex-1 rounded-xl p-3 mb-3"
        style={{ background: COLORS.panel }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} style={{ color }} />
          <span className="text-sm font-medium" style={{ color: COLORS.ink }}>
            {clientLabel}
          </span>
          {isNearFuture && (
            <span
              className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: `${color}22`, color }}
            >
              en {diffMin}m
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: COLORS.sub }}>
          {item.detail}
        </p>
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function AgendaView() {
  const now = useAppStore((s) => s.now);
  const isMobile = useAppStore((s) => s.isMobile);

  // API appointments with mock fallback
  const { data: appointmentsData } = useAppointments();
  const createAppointment = useCreateAppointment();

  const apiItems: AgendaItem[] = appointmentsData?.items
    ? appointmentsData.items.map(adaptApiAppointment)
    : appointmentsData && Array.isArray(appointmentsData)
    ? appointmentsData.map(adaptApiAppointment)
    : [];

  const items = apiItems.length > 0 ? apiItems : AGENDA_ITEMS;

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const [ah, am] = a.time.split(":").map(Number);
        const [bh, bm] = b.time.split(":").map(Number);
        return ah * 60 + am - (bh * 60 + bm);
      }),
    [items]
  );

  const handleNewAppointment = () => {
    const detail = prompt("Detalle del turno / remis:");
    if (!detail) return;
    const dateStr = prompt("Fecha y hora (YYYY-MM-DDTHH:MM):", new Date().toISOString().slice(0, 16));
    if (!dateStr) return;
    createAppointment.mutate({
      client_id: 0, // no client selected — could open a picker
      type: "turno",
      detail,
      scheduled_at: dateStr,
    });
  };

  return (
    <div
      className="sc-scroll h-full overflow-y-auto"
      style={{ background: COLORS.bg }}
    >
      <div className={`mx-auto w-full ${isMobile ? "px-4 py-4" : "px-6 py-6 max-w-[1200px]"}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: COLORS.ink }}>
              Agenda del dia
            </h1>
            <p className="text-sm" style={{ color: COLORS.sub }}>
              Turnos · remises · recordatorios
            </p>
          </div>
          <button
            className="sc-btn flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            style={{
              background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.gold})`,
              color: "#fff",
            }}
            onClick={handleNewAppointment}
          >
            <Plus size={14} />
            {!isMobile && "Programar remis / turno"}
          </button>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[9px] top-0 bottom-0 w-px"
            style={{ background: COLORS.line }}
          />
          {sortedItems.map((item, i) => (
            <TimelineItem key={i} item={item} now={now} />
          ))}
        </div>
      </div>
    </div>
  );
}
