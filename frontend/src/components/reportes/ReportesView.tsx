import { useMemo } from "react";
import { COLORS } from "@/lib/constants";
import { useAppStore } from "@/stores/useAppStore";
import { useClients } from "@/hooks/useClients";
import { useAlertStats } from "@/hooks/useAlerts";
import {
  Clock,
  TriangleAlert,
  Users,
  MessageCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";


const ALERTS_BY_DAY = [
  { d: "Lun", v: 14 },
  { d: "Mar", v: 9 },
  { d: "Mie", v: 17 },
  { d: "Jue", v: 11 },
  { d: "Vie", v: 22 },
  { d: "Sab", v: 8 },
  { d: "Dom", v: 6 },
];

const DIST_DATA = [
  { label: "SOS/panico", value: 23, color: COLORS.coral },
  { label: "Caidas", value: 18, color: COLORS.amber },
  { label: "Geocerca", value: 14, color: COLORS.blue },
  { label: "Bateria", value: 31, color: COLORS.gold },
  { label: "Compania", value: 42, color: COLORS.aqua },
  { label: "Inactividad", value: 9, color: COLORS.violet },
];

/* ── KPI Card ────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  delta,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  color: string;
  icon: React.ElementType;
}) {
  const isDown = delta.startsWith("-");
  return (
    <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} style={{ color }} />
        <span
          className="flex items-center gap-0.5 text-xs font-medium"
          style={{ color: isDown ? COLORS.aqua : COLORS.aqua }}
        >
          {isDown ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          {delta}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: COLORS.ink }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: COLORS.sub }}>
        {label}
      </p>
    </div>
  );
}

/* ── Distribution bar ────────────────────────────────────────── */

function DistBar({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs w-24 text-right shrink-0" style={{ color: COLORS.sub }}>
        {label}
      </span>
      <div className="flex-1 h-5 rounded-full relative" style={{ background: COLORS.panel2 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs w-6 shrink-0 font-medium" style={{ color: COLORS.ink }}>
        {value}
      </span>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function ReportesView() {
  const isMobile = useAppStore((s) => s.isMobile);

  // Real data from API
  const { data: clientsData } = useClients();
  const { data: alertStats } = useAlertStats();

  const realClientCount = clientsData?.total ?? clientsData?.items?.length ?? 8;
  const realAlertsAttended = alertStats?.total_resolved ?? alertStats?.attended_7d ?? null;

  // Build dynamic KPI cards with real values where available
  const kpiCards = useMemo(() => [
    {
      label: "Tiempo medio de respuesta",
      value: alertStats?.avg_response_secs != null
        ? `${alertStats.avg_response_secs}s`
        : "38s",
      delta: "-12%",
      positive: true,
      color: COLORS.aqua,
      icon: Clock,
    },
    {
      label: "Alertas atendidas (7d)",
      value: realAlertsAttended != null ? String(realAlertsAttended) : "87",
      delta: "+8%",
      positive: true,
      color: COLORS.coral,
      icon: TriangleAlert,
    },
    {
      label: "Clientes monitoreados",
      value: String(realClientCount),
      delta: "+2",
      positive: true,
      color: COLORS.aqua,
      icon: Users,
    },
    {
      label: "Mensajes enviados",
      value: alertStats?.messages_sent_7d != null ? String(alertStats.messages_sent_7d) : "42",
      delta: "+15%",
      positive: true,
      color: COLORS.gold,
      icon: MessageCircle,
    },
  ], [realClientCount, realAlertsAttended, alertStats]);

  const responseData = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => ({
      h: `${h}:00`,
      v: Math.round(18 + Math.sin(h / 3) * 8 + (Math.sin(h * 1.7) * 4)),
    }));
  }, []);

  const maxDist = Math.max(...DIST_DATA.map((d) => d.value));

  return (
    <div className="sc-scroll h-full overflow-y-auto" style={{ background: COLORS.bg }}>
      <div className={`mx-auto ${isMobile ? "px-4 py-4" : "px-8 py-6 max-w-5xl"}`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: COLORS.ink }}>
            Panel de gestion
          </h1>
          <p className="text-sm" style={{ color: COLORS.sub }}>
            Indicadores operativos · ultimos 7 dias
          </p>
        </div>

        {/* KPI cards */}
        <div className={`grid gap-3 mb-6 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
          {kpiCards.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Charts row */}
        <div className={`grid gap-4 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          {/* Alerts by day */}
          <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.ink }}>
              Alertas por dia (ultimos 7 dias)
            </h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ALERTS_BY_DAY}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
                  <XAxis dataKey="d" tick={{ fill: COLORS.sub, fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: COLORS.sub, fontSize: 11 }} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: COLORS.panel2,
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 8,
                      color: COLORS.ink,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="v" fill={COLORS.coral} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Response time 24h */}
          <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.ink }}>
              Respuesta promedio (24h)
            </h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={responseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
                  <XAxis
                    dataKey="h"
                    tick={{ fill: COLORS.sub, fontSize: 11 }}
                    axisLine={false}
                    interval={5}
                  />
                  <YAxis tick={{ fill: COLORS.sub, fontSize: 11 }} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: COLORS.panel2,
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 8,
                      color: COLORS.ink,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={COLORS.aqua}
                    fill={`${COLORS.aqua}33`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Distribution */}
        <div className="sc-card rounded-xl p-4" style={{ background: COLORS.panel }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: COLORS.ink }}>
            Distribucion por tipo
          </h3>
          {DIST_DATA.map((d) => (
            <DistBar key={d.label} {...d} max={maxDist} />
          ))}
        </div>
      </div>
    </div>
  );
}
