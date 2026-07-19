import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppStore } from "@/stores/useAppStore";
import { DollarSign, Shield } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

/* ── Types ──────────────────────────────────────────────────── */

interface ServiceSummary {
  quantity: number;
  cost_usd: number;
}

interface DailyEntry {
  date: string;
  service: string;
  cost_usd: number;
  quantity: number;
}

interface CostSummaryResponse {
  period_days: number;
  total_cost_usd: number;
  by_service: Record<string, ServiceSummary>;
  daily: DailyEntry[];
}

/* ── Service config ─────────────────────────────────────────── */

const SERVICE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  whatsapp_meta: {
    label: "WhatsApp Meta",
    color: "#25D366",
    description: "API oficial de Meta",
  },
  whatsapp_baileys: {
    label: "WhatsApp Baileys",
    color: "#128C7E",
    description: "Conector alternativo",
  },
  gcp: {
    label: "GCP Infra",
    color: "#4285F4",
    description: "Google Cloud Platform",
  },
  llm: {
    label: "LLM / IA",
    color: "#a78bfa",
    description: "Modelos de lenguaje",
  },
};

const ALL_SERVICES = Object.keys(SERVICE_CONFIG);

/* ── Period selector ────────────────────────────────────────── */

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
];

/* ── Helpers ────────────────────────────────────────────────── */

function fmtUSD(v: number): string {
  return v === 0 ? "$0.00" : `$${v.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/* ── Service Card ───────────────────────────────────────────── */

function ServiceCard({
  serviceKey,
  data,
  total,
}: {
  serviceKey: string;
  data: ServiceSummary | undefined;
  total: number;
}) {
  const cfg = SERVICE_CONFIG[serviceKey];
  const cost = data?.cost_usd ?? 0;
  const qty = data?.quantity ?? 0;
  const pct = total > 0 ? Math.round((cost / total) * 100) : 0;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.line}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: cfg.color }}
          />
          <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
            {cfg.label}
          </span>
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${cfg.color}22`, color: cfg.color }}
        >
          {pct}%
        </span>
      </div>

      {/* Cost */}
      <p className="text-2xl font-bold mb-1" style={{ color: COLORS.ink }}>
        {fmtUSD(cost)}
      </p>

      {/* Quantity */}
      <p className="text-xs mb-3" style={{ color: COLORS.sub }}>
        {qty.toLocaleString()} unidades · {cfg.description}
      </p>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.panel2 }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: cfg.color }}
        />
      </div>
    </div>
  );
}

/* ── Chart: pivot daily data by date ───────────────────────── */

function buildChartData(daily: DailyEntry[]): Record<string, number | string>[] {
  const byDate: Record<string, Record<string, number>> = {};

  for (const entry of daily) {
    if (!byDate[entry.date]) byDate[entry.date] = {};
    byDate[entry.date][entry.service] = (byDate[entry.date][entry.service] ?? 0) + entry.cost_usd;
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, services]) => ({
      date,
      label: fmtDate(date),
      ...services,
    }));
}

/* ── Empty state ────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div
      className="rounded-xl p-10 flex flex-col items-center gap-3 text-center"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
    >
      <DollarSign size={36} style={{ color: COLORS.faint }} />
      <p className="text-sm font-semibold" style={{ color: COLORS.sub }}>
        Sin datos de consumo aun
      </p>
      <p className="text-xs max-w-xs" style={{ color: COLORS.faint }}>
        Los costos se registran automaticamente al enviar mensajes.
      </p>
    </div>
  );
}

/* ── Custom tooltip ─────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: COLORS.panel2,
        border: `1px solid ${COLORS.line}`,
        color: COLORS.ink,
      }}
    >
      <p className="font-semibold mb-1" style={{ color: COLORS.sub }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: COLORS.sub }}>{SERVICE_CONFIG[p.dataKey]?.label ?? p.dataKey}:</span>
          <span className="font-medium">{fmtUSD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function CostsView() {
  const currentUser = useAuthStore((s) => s.user);
  const isMobile = useAppStore((s) => s.isMobile);

  const [days, setDays] = useState(30);
  const [data, setData] = useState<CostSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard: only admins
  if (currentUser?.role !== "admin") {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3"
        style={{ background: COLORS.bg }}
      >
        <Shield size={40} style={{ color: COLORS.faint }} />
        <p className="text-base font-semibold" style={{ color: COLORS.sub }}>
          Acceso restringido
        </p>
        <p className="text-sm" style={{ color: COLORS.faint }}>
          Solo los administradores pueden ver los costos.
        </p>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get<CostSummaryResponse>(`/api/costs/summary?days=${days}`);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al cargar costos");
    } finally {
      setLoading(false);
    }
  }, [days]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty = !loading && !error && data && data.daily.length === 0;
  const chartData = data ? buildChartData(data.daily) : [];
  const activeServices = ALL_SERVICES.filter(
    (s) => data?.by_service[s] !== undefined || !isEmpty
  );

  return (
    <div className="sc-scroll h-full overflow-y-auto" style={{ background: COLORS.bg }}>
      <div className={`mx-auto w-full ${isMobile ? "px-4 py-4" : "px-6 py-6 max-w-[1200px]"}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: COLORS.ink }}>
              Costos de servicios
            </h1>
            <p className="text-sm" style={{ color: COLORS.sub }}>
              Consumo de WhatsApp, GCP e IA en tiempo real
            </p>
          </div>

          {/* Period selector */}
          <div
            className="flex gap-1 p-1 rounded-lg shrink-0"
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={{
                  background: days === p.value ? COLORS.panel2 : "transparent",
                  color: days === p.value ? COLORS.ink : COLORS.faint,
                  border: days === p.value ? `1px solid ${COLORS.line}` : "1px solid transparent",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-6 text-sm"
            style={{ background: "var(--sc-coral-a13)", color: COLORS.coral, border: "1px solid var(--sc-coral-a25)" }}
          >
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-24 rounded-xl animate-pulse" style={{ background: COLORS.panel }} />
            <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: COLORS.panel }} />
              ))}
            </div>
            <div className="h-64 rounded-xl animate-pulse" style={{ background: COLORS.panel }} />
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Total cost banner */}
            <div
              className="rounded-xl p-5 mb-6 flex items-center justify-between"
              style={{
                background: COLORS.panel,
                border: `1px solid ${COLORS.line}`,
              }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: COLORS.sub }}>
                  Costo total · ultimos {days} dias
                </p>
                <p className="text-4xl font-bold" style={{ color: COLORS.ink }}>
                  {fmtUSD(data.total_cost_usd)}
                </p>
              </div>
              <div
                className="p-4 rounded-2xl"
                style={{ background: "var(--sc-violet-a13)" }}
              >
                <DollarSign size={28} style={{ color: COLORS.violet }} />
              </div>
            </div>

            {/* Service cards */}
            {isEmpty ? (
              <EmptyState />
            ) : (
              <>
                <div className={`grid gap-3 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
                  {ALL_SERVICES.map((key) => (
                    <ServiceCard
                      key={key}
                      serviceKey={key}
                      data={data.by_service[key]}
                      total={data.total_cost_usd}
                    />
                  ))}
                </div>

                {/* Line chart */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
                >
                  <h3 className="text-sm font-semibold mb-4" style={{ color: COLORS.ink }}>
                    Evolucion diaria de costos (USD)
                  </h3>
                  {chartData.length === 0 ? (
                    <p className="text-xs text-center py-10" style={{ color: COLORS.faint }}>
                      Sin datos suficientes para el grafico
                    </p>
                  ) : (
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: COLORS.sub, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: COLORS.sub, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            formatter={(value) => (
                              <span style={{ color: COLORS.sub, fontSize: 11 }}>
                                {SERVICE_CONFIG[value]?.label ?? value}
                              </span>
                            )}
                          />
                          {activeServices.map((key) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              stroke={SERVICE_CONFIG[key].color}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
