import {
  LayoutDashboard,
  Users,
  HeartPulse,
  MessageCircle,
  CalendarClock,
  BarChart3,
  Shield,
  ShieldCheck,
  Siren,
  Zap,
  Trash2,
  LogOut,
  DollarSign,
} from "lucide-react";
import { COLORS, MODULES } from "@/lib/constants";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  HeartPulse,
  MessageCircle,
  CalendarClock,
  BarChart3,
  Shield,
  DollarSign,
};

export default function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const pushAlert = useAppStore((s) => s.pushAlert);
  const clearAlerts = useAppStore((s) => s.clearAlerts);
  const alerts = useAppStore((s) => s.alerts);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const activeAlerts = alerts.filter((a) => a.status !== "resuelta").length;

  return (
    <aside
      style={{
        width: 210,
        backgroundColor: COLORS.panel,
        borderRight: `1px solid ${COLORS.line}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Nav items */}
      <nav className="sc-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        {MODULES.map((mod) => {
          const Icon = ICON_MAP[mod.icon];
          const active = activeModule === mod.key;
          return (
            <button
              key={mod.key}
              onClick={() => setActiveModule(mod.key)}
              className="sc-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                backgroundColor: active ? COLORS.panel2 : "transparent",
                borderLeft: active ? `3px solid ${COLORS.line}` : "3px solid transparent",
                color: active ? COLORS.ink : COLORS.sub,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                marginBottom: 2,
                textAlign: "left",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {Icon && <Icon size={16} />}
              {mod.label}
              {mod.key === "monitoreo" && activeAlerts > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    backgroundColor: COLORS.coral,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 6,
                    padding: "1px 5px",
                    minWidth: 14,
                    textAlign: "center",
                  }}
                >
                  {activeAlerts}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operadora */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: `1px solid ${COLORS.line}`,
          borderBottom: `1px solid ${COLORS.line}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ShieldCheck size={16} style={{ color: COLORS.aqua, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 10, color: COLORS.faint, fontWeight: 500 }}>
            Operadora
          </div>
          <div style={{ fontSize: 12, color: COLORS.ink, fontWeight: 600 }}>
            {user?.name || "Operadora"}
          </div>
        </div>
      </div>

      {/* Demo controls — solo en desarrollo */}
      {import.meta.env.DEV && (
        <div style={{ padding: 12 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: COLORS.faint,
              marginBottom: 8,
            }}
          >
            Simular demo
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              className="sc-btn"
              onClick={() => pushAlert("sos")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "6px 0",
                borderRadius: 6,
                border: "none",
                backgroundColor: `${COLORS.coral}22`,
                color: COLORS.coral,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Siren size={12} />
              Alerta SOS
            </button>
            <button
              className="sc-btn"
              onClick={() => {
                pushAlert();
                setTimeout(() => pushAlert(), 200);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "6px 0",
                borderRadius: 6,
                border: "none",
                backgroundColor: `${COLORS.amber}22`,
                color: COLORS.amber,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Zap size={12} />
              Doble simultánea
            </button>
            <button
              className="sc-btn"
              onClick={clearAlerts}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "6px 0",
                borderRadius: 6,
                border: "none",
                backgroundColor: `${COLORS.sub}18`,
                color: COLORS.sub,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Trash2 size={12} />
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Cerrar sesión */}
      <div style={{ padding: "8px 12px 12px" }}>
        <button
          className="sc-btn"
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "7px 0",
            borderRadius: 6,
            border: "none",
            backgroundColor: `${COLORS.faint}18`,
            color: COLORS.sub,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <LogOut size={12} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
