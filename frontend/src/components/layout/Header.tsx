import { useEffect } from "react";
import { Siren, Sun, Moon } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { CLIENTS } from "@/lib/mockData";
import { formatTime } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAlertStats } from "@/hooks/useAlerts";
import StatCard from "@/components/shared/StatCard";

export default function Header() {
  const now = useAppStore((s) => s.now);
  const tickClock = useAppStore((s) => s.tickClock);
  const alerts = useAppStore((s) => s.alerts);
  const isMobile = useAppStore((s) => s.isMobile);
  const { theme, toggleTheme } = useThemeStore();
  const { data: alertStats } = useAlertStats();

  useEffect(() => {
    const id = setInterval(tickClock, 1000);
    return () => clearInterval(id);
  }, [tickClock]);

  // Usar stats de la API si están disponibles; sino, calcular desde el store local
  const activeAlerts =
    alertStats?.active ?? alerts.filter((a) => a.status !== "resuelta").length;
  const criticalAlerts =
    alertStats?.critical ??
    alerts.filter((a) => a.status === "nueva" && (a.type === "sos" || a.type === "caida")).length;
  const deviceCount = alertStats?.devices ?? CLIENTS.length;

  return (
    <header
      style={{
        height: 56,
        backgroundColor: COLORS.panel,
        borderBottom: `1px solid ${COLORS.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        flexShrink: 0,
      }}
    >
      {/* Left: logo + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${COLORS.coral}, ${COLORS.amber})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          SC
        </div>
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.2,
            }}
          >
            Siempre Cerca
          </div>
          {!isMobile && (
            <div
              style={{
                fontSize: 10,
                color: COLORS.faint,
                letterSpacing: 0.3,
              }}
            >
              Central de Teleasistencia &middot; 24/7
            </div>
          )}
        </div>
      </div>

      {/* Center: stats (desktop only) */}
      {!isMobile && (
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <StatCard
            label="Dispositivos"
            value={deviceCount}
            dot={COLORS.aqua}
          />
          <StatCard
            label="Alertas activas"
            value={activeAlerts}
            dot={COLORS.amber}
            blink={activeAlerts > 0}
          />
          <StatCard
            label="Críticas"
            value={criticalAlerts}
            dot={COLORS.coral}
            blink={criticalAlerts > 0}
          />
        </div>
      )}

      {/* Right: theme toggle + mobile badge + clock */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={toggleTheme}
          title={theme === "light" ? "Modo oscuro" : "Modo claro"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: COLORS.faint,
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {isMobile && activeAlerts > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "var(--sc-coral-a13)",
              padding: "4px 8px",
              borderRadius: 8,
            }}
          >
            <Siren size={14} style={{ color: COLORS.coral }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.coral,
              }}
            >
              {activeAlerts}
            </span>
          </div>
        )}

        {/* Live clock */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: COLORS.coral,
              animation: "blink 1.2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(now)}
          </span>
          {!isMobile && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: COLORS.coral,
                letterSpacing: 1,
                marginLeft: 2,
              }}
            >
              EN VIVO
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
