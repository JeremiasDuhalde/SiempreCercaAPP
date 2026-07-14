import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { CLIENTS, WELLBEING_DATA } from "@/lib/mockData";
import { initials } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useWellbeingSnapshots } from "@/hooks/useWellbeing";
import {
  ChevronLeft,
  Moon,
  Footprints,
  Heart,
  Brain,
  Mic,
  FileText,
  Send,
  Info,
} from "lucide-react";
import type { Client, WellbeingData } from "@/lib/types";

/* ── API → WellbeingData adapter ─────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptApiSnapshot(raw: any): WellbeingData {
  return {
    flag: raw.flag ?? raw.needs_attention ?? true,
    sev: raw.sev ?? raw.severity_color ?? COLORS.amber,
    score: raw.score ?? raw.wellbeing_score ?? 70,
    prevent: raw.prevent ?? raw.alert_reason ?? "",
    sleep: {
      base: raw.sleep_base ?? raw.sleep?.base ?? 7,
      today: raw.sleep_today ?? raw.sleep?.today ?? 7,
    },
    steps: {
      base: raw.steps_base ?? raw.steps?.base ?? 2000,
      today: raw.steps_today ?? raw.steps?.today ?? 2000,
    },
    rhr: {
      base: raw.rhr_base ?? raw.rhr?.base ?? 72,
      today: raw.rhr_today ?? raw.rhr?.today ?? 72,
    },
    mood: raw.mood ?? "Regular",
    tags: raw.tags ?? [],
    voice: raw.voice ?? "",
    talk: raw.talk ?? [],
    family: raw.family ?? raw.family_report ?? "",
  };
}

/* ── Inline helpers ─────────────────────────────────────────── */

function Avatar({
  name,
  color,
  size = 44,
  pulse = false,
}: {
  name: string;
  color: string;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      {pulse && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: color, opacity: 0.25 }}
        />
      )}
      <div
        className="relative flex items-center justify-center rounded-full font-semibold"
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
    </div>
  );
}

/* ── Score circle ────────────────────────────────────────────── */

function ScoreCircle({ score, color }: { score: number; color: string }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative" style={{ width: 96, height: 96 }}>
      <svg viewBox="0 0 96 96" className="w-full h-full">
        <circle cx="48" cy="48" r={r} fill="none" stroke={COLORS.line} strokeWidth={6} />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px]" style={{ color: COLORS.sub }}>
          bienestar
        </span>
      </div>
    </div>
  );
}

/* ── Baseline bar ────────────────────────────────────────────── */

function BaselineBar({
  label,
  today,
  base,
  unit,
  icon: Icon,
}: {
  label: string;
  today: number;
  base: number;
  unit: string;
  icon: React.ElementType;
}) {
  const max = Math.max(today, base) * 1.3;
  const todayPct = (today / max) * 100;
  const basePct = (base / max) * 100;
  const isBelow = today < base;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: COLORS.sub }} />
        <span className="text-xs font-medium" style={{ color: COLORS.ink }}>
          {label}
        </span>
        <span className="ml-auto text-xs" style={{ color: isBelow ? COLORS.coral : COLORS.aqua }}>
          {today} {unit}
        </span>
      </div>
      <div className="relative h-4 rounded-full" style={{ background: COLORS.panel2 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${todayPct}%`,
            background: isBelow ? COLORS.coral : COLORS.aqua,
            opacity: 0.7,
          }}
        />
        {/* base reference line */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${basePct}%`,
            width: 2,
            background: COLORS.ink,
            opacity: 0.5,
          }}
        />
      </div>
      <p className="text-[10px] mt-0.5" style={{ color: COLORS.faint }}>
        Base: {base} {unit}
      </p>
    </div>
  );
}

/* ── Waveform ────────────────────────────────────────────────── */

function Waveform() {
  return (
    <div className="flex items-end gap-[2px] h-12">
      {Array.from({ length: 40 }).map((_, i) => {
        const h = 8 + Math.abs(Math.sin(i * 0.45)) * 32;
        return (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              height: h,
              background: COLORS.violet,
              opacity: 0.5 + Math.sin(i * 0.3) * 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Alert item in left panel ────────────────────────────────── */

function AlertItem({
  client,
  data,
  selected,
  onClick,
}: {
  client: Client;
  data: WellbeingData;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="sc-card w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: selected ? COLORS.panel2 : "transparent",
        border: selected ? `1px solid ${COLORS.line}` : "1px solid transparent",
      }}
      onClick={onClick}
    >
      <Avatar name={client.name} color={data.sev} size={40} pulse />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: COLORS.ink }}>
          {client.name}
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.sub }}>
          {data.prevent}
        </p>
      </div>
    </button>
  );
}

/* ── Detail panel ────────────────────────────────────────────── */

function WellbeingDetail({
  client,
  data,
  onBack,
}: {
  client: Client;
  data: WellbeingData;
  onBack?: () => void;
}) {
  const isMobile = useAppStore((s) => s.isMobile);

  return (
    <div className="sc-scroll flex-1 overflow-y-auto p-4" style={{ background: COLORS.bg }}>
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
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={client.name} color={data.sev} size={60} />
        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: COLORS.ink }}>
            {client.name}
          </h2>
          <p className="text-xs" style={{ color: COLORS.sub }}>
            {client.age} anos · {client.barrio}
          </p>
        </div>
        <ScoreCircle score={data.score} color={data.sev} />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {data.tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ background: `${data.sev}22`, color: data.sev }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Linea de base personalizada */}
      <div className="sc-card rounded-xl p-4 mb-4" style={{ background: COLORS.panel }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.ink }}>
          Linea de base personalizada
        </h3>
        <BaselineBar label="Sueno" today={data.sleep.today} base={data.sleep.base} unit="h" icon={Moon} />
        <BaselineBar
          label="Actividad"
          today={data.steps.today}
          base={data.steps.base}
          unit="pasos"
          icon={Footprints}
        />
        <BaselineBar
          label="Animo"
          today={data.rhr.today}
          base={data.rhr.base}
          unit="bpm"
          icon={Heart}
        />
      </div>

      {/* Acompanante IA */}
      <div className="sc-card rounded-xl p-4 mb-4" style={{ background: COLORS.panel }}>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} style={{ color: COLORS.violet }} />
          <h3 className="text-sm font-semibold" style={{ color: COLORS.ink }}>
            Acompanante IA · Sofia
          </h3>
        </div>
        <div className="space-y-2">
          {data.talk.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.who === "cli" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
                style={{
                  background: msg.who === "bot" ? COLORS.panel2 : "#1f3b32",
                  color: COLORS.ink,
                }}
              >
                {msg.who === "bot" && (
                  <p
                    className="text-[10px] font-bold mb-0.5"
                    style={{ color: COLORS.violet }}
                  >
                    SOFIA
                  </p>
                )}
                {msg.t}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Biomarcadores de voz */}
      <div className="sc-card rounded-xl p-4 mb-4" style={{ background: COLORS.panel }}>
        <div className="flex items-center gap-2 mb-3">
          <Mic size={16} style={{ color: COLORS.aqua }} />
          <h3 className="text-sm font-semibold" style={{ color: COLORS.ink }}>
            Biomarcadores de voz
          </h3>
        </div>
        <Waveform />
        <p className="text-xs mt-2" style={{ color: COLORS.sub }}>
          {data.voice}
        </p>
      </div>

      {/* Parte diario */}
      <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} style={{ color: COLORS.gold }} />
          <h3 className="text-sm font-semibold" style={{ color: COLORS.ink }}>
            Parte diario para la familia
          </h3>
        </div>
        <div className="rounded-lg p-3 mb-3" style={{ background: COLORS.bg }}>
          <p className="text-xs italic" style={{ color: COLORS.sub }}>
            "{data.family}"
          </p>
        </div>
        <button
          className="sc-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.blue})`,
            color: "#fff",
          }}
        >
          <Send size={14} /> Enviar por WhatsApp
        </button>
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function BienestarView() {
  const isMobile = useAppStore((s) => s.isMobile);

  // API snapshots with mock fallback
  const { data: snapshotsData } = useWellbeingSnapshots();

  // Build a combined wellbeing record: start from mock, override with API data
  const wellbeingRecord: Record<string, WellbeingData> = { ...WELLBEING_DATA };

  if (snapshotsData) {
    const rawItems = snapshotsData.items ?? (Array.isArray(snapshotsData) ? snapshotsData : []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const raw of rawItems as any[]) {
      const clientId = raw.client_id ? String(raw.client_id) : null;
      if (clientId) {
        wellbeingRecord[clientId] = adaptApiSnapshot(raw);
      }
    }
  }

  // Clients with wellbeing flag
  const flaggedClients = CLIENTS.filter((c) => wellbeingRecord[c.id]?.flag);
  const [selectedId, setSelectedId] = useState<string | null>(flaggedClients[0]?.id ?? null);
  const [showDetail, setShowDetail] = useState(false);

  const selectedClient = CLIENTS.find((c) => c.id === selectedId) ?? null;
  const selectedData = selectedId ? wellbeingRecord[selectedId] ?? null : null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setShowDetail(true);
  };

  // Mobile detail
  if (isMobile && showDetail && selectedClient && selectedData) {
    return (
      <WellbeingDetail
        client={selectedClient}
        data={selectedData}
        onBack={() => setShowDetail(false)}
      />
    );
  }

  return (
    <div className="flex h-full" style={{ background: COLORS.bg }}>
      {/* Left panel */}
      <div
        className="sc-scroll flex flex-col overflow-y-auto border-r"
        style={{
          width: isMobile ? "100%" : 380,
          minWidth: isMobile ? undefined : 380,
          borderColor: COLORS.line,
          background: COLORS.panel,
        }}
      >
        <div className="p-4 pb-2">
          <p className="text-xs font-bold tracking-wider" style={{ color: COLORS.sub }}>
            ALERTAS PREVENTIVAS
          </p>
        </div>
        <div className="flex-1 px-2 space-y-1">
          {flaggedClients.map((cl) => (
            <AlertItem
              key={cl.id}
              client={cl}
              data={wellbeingRecord[cl.id]!}
              selected={selectedId === cl.id}
              onClick={() => handleSelect(cl.id)}
            />
          ))}
        </div>

        {/* Info box */}
        <div className="m-3 p-3 rounded-xl" style={{ background: COLORS.panel2 }}>
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} style={{ color: COLORS.aqua }} />
            <span className="text-xs font-semibold" style={{ color: COLORS.ink }}>
              Como funciona?
            </span>
          </div>
          <p className="text-[11px]" style={{ color: COLORS.sub }}>
            La IA aprende los patrones individuales de sueno, actividad y animo de cada
            cliente. Cuando detecta desviaciones sostenidas, genera una alerta preventiva
            antes de que se convierta en emergencia.
          </p>
        </div>
      </div>

      {/* Right panel - desktop */}
      {!isMobile && selectedClient && selectedData && (
        <WellbeingDetail client={selectedClient} data={selectedData} />
      )}
    </div>
  );
}
