import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { CLIENTS } from "@/lib/mockData";
import { initials } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useClients } from "@/hooks/useClients";
import {
  ChevronLeft,
  Wifi,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Smartphone,
  Shield,
  Pill,
  Phone,
  KeyRound,
  Clock,
} from "lucide-react";
import type { Client } from "@/lib/types";

/* ── API → Client adapter ───────────────────────────────────── */

// The API returns full field names; mock uses short names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptApiClient(raw: any): Client {
  return {
    id: String(raw.id),
    name: raw.full_name ?? raw.name ?? "Sin nombre",
    age: raw.age ?? 0,
    barrio: raw.neighborhood ?? raw.barrio ?? "",
    dir: raw.address ?? raw.dir ?? "",
    entre: raw.address_ref ?? raw.entre ?? "",
    gx: raw.geo_x ?? raw.gx ?? 0.5,
    gy: raw.geo_y ?? raw.gy ?? 0.5,
    color: raw.color ?? COLORS.aqua,
    device: raw.device_model ?? raw.device ?? "Dispositivo",
    bat: raw.battery_pct ?? raw.bat ?? 0,
    sig: raw.signal_bars ?? raw.sig ?? 0,
    cond: raw.conditions ?? raw.cond ?? [],
    meds: raw.medications ?? raw.meds ?? [],
    contacts: (raw.contacts ?? []).map((ct: any) => ({
      ord: ct.ord ?? ct.order ?? 1,
      n: ct.n ?? ct.name ?? "",
      rel: ct.rel ?? ct.relationship ?? "",
      p: ct.p ?? ct.phone ?? "",
      acceso: ct.acceso ?? ct.has_key ?? false,
    })),
    hr: raw.hr,
    spo2: raw.spo2,
    geofence: raw.geofence_active ?? raw.geofence,
  };
}

/* ── Inline helpers ─────────────────────────────────────────── */

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

/* ── Client card in list ────────────────────────────────────── */

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
          {client.age} anos · {client.barrio}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <BatteryIndicator level={client.bat} />
        <SignalIndicator level={client.sig} />
      </div>
    </button>
  );
}

/* ── Client detail ──────────────────────────────────────────── */

function ClientDetail({ client, onBack }: { client: Client; onBack?: () => void }) {
  const isMobile = useAppStore((s) => s.isMobile);

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
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={client.name} color={client.color} size={72} />
        <div>
          <h2 className="text-xl font-bold" style={{ color: COLORS.ink }}>
            {client.name}
          </h2>
          <p className="text-sm" style={{ color: COLORS.sub }}>
            {client.age} anos · {client.barrio}
          </p>
          <p className="text-xs" style={{ color: COLORS.faint }}>
            {client.dir} {client.entre}
          </p>
          <span
            className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: `${COLORS.aqua}22`, color: COLORS.aqua }}
          >
            <Wifi size={12} /> Dispositivo online
          </span>
        </div>
      </div>

      {/* Battery + Signal cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="sc-card rounded-xl p-3" style={{ background: COLORS.panel }}>
          <p className="text-xs mb-1" style={{ color: COLORS.sub }}>
            Bateria
          </p>
          <BatteryIndicator level={client.bat} />
        </div>
        <div className="sc-card rounded-xl p-3" style={{ background: COLORS.panel }}>
          <p className="text-xs mb-1" style={{ color: COLORS.sub }}>
            Senal
          </p>
          <SignalIndicator level={client.sig} />
        </div>
      </div>

      {/* 4 section cards */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* Dispositivo */}
        <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
          <div className="flex items-center gap-2 mb-3">
            <Smartphone size={16} style={{ color: COLORS.aqua }} />
            <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
              Dispositivo
            </span>
          </div>
          <div className="space-y-1 text-xs" style={{ color: COLORS.sub }}>
            <p>Modelo: {client.device}</p>
            <p>
              ID: SC-{client.id}-{client.age}
            </p>
            <p>
              Geocerca:{" "}
              <span style={{ color: client.geofence ? COLORS.aqua : COLORS.faint }}>
                {client.geofence ? "Activada" : "No configurada"}
              </span>
            </p>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>Ultima conexion: ahora</span>
            </div>
          </div>
        </div>

        {/* Cuadro clinico */}
        <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{ color: COLORS.coral }} />
            <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
              Cuadro clinico
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {client.cond.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: COLORS.panel2, color: COLORS.ink }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Medicacion */}
        <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
          <div className="flex items-center gap-2 mb-3">
            <Pill size={16} style={{ color: COLORS.gold }} />
            <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
              Medicacion
            </span>
          </div>
          <ul className="space-y-1 text-xs" style={{ color: COLORS.sub }}>
            {client.meds.map((m) => (
              <li key={m} className="flex items-center gap-1.5">
                <Pill size={11} style={{ color: COLORS.gold }} />
                {m}
              </li>
            ))}
          </ul>
        </div>

        {/* Contactos */}
        <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
          <div className="flex items-center gap-2 mb-3">
            <Phone size={16} style={{ color: COLORS.blue }} />
            <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
              A quien llamar
            </span>
          </div>
          <ul className="space-y-2">
            {client.contacts
              .slice()
              .sort((a, b) => a.ord - b.ord)
              .map((ct) => (
                <li key={ct.n} className="text-xs" style={{ color: COLORS.sub }}>
                  <div className="flex items-center gap-1">
                    <span className="font-medium" style={{ color: COLORS.ink }}>
                      {ct.ord}. {ct.n}
                    </span>
                    {ct.acceso && <KeyRound size={11} style={{ color: COLORS.amber }} />}
                  </div>
                  <span>{ct.rel}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function ClientesView() {
  const isMobile = useAppStore((s) => s.isMobile);

  // API data with mock fallback
  const { data: clientsData } = useClients();
  const clients: Client[] = clientsData?.items
    ? clientsData.items.map(adaptApiClient)
    : CLIENTS;

  const [selectedId, setSelectedId] = useState<string | null>(clients[0]?.id ?? null);
  const [showDetail, setShowDetail] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setShowDetail(true);
  };

  // Mobile detail view
  if (isMobile && showDetail && selectedClient) {
    return <ClientDetail client={selectedClient} onBack={() => setShowDetail(false)} />;
  }

  return (
    <div className="flex h-full" style={{ background: COLORS.bg }}>
      {/* Left panel - client list */}
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
            PADRON · {clients.length} clientes
          </p>
        </div>
        <div className="flex-1 px-2 pb-4 space-y-1">
          {clients.map((cl) => (
            <ClientCard
              key={cl.id}
              client={cl}
              selected={selectedId === cl.id}
              onClick={() => handleSelect(cl.id)}
            />
          ))}
        </div>
      </div>

      {/* Right panel - detail (desktop only) */}
      {!isMobile && selectedClient && <ClientDetail client={selectedClient} />}
    </div>
  );
}
