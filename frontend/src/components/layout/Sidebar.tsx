import {
  LayoutDashboard,
  Users,
  HeartPulse,
  MessageCircle,
  CalendarClock,
  ClipboardCheck,
  BarChart3,
  Shield,
  ShieldCheck,
  Siren,
  Zap,
  Trash2,
  LogOut,
  DollarSign,
  MessageSquareText,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { COLORS, MODULES } from "@/lib/constants";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  HeartPulse,
  MessageCircle,
  CalendarClock,
  ClipboardCheck,
  BarChart3,
  Shield,
  DollarSign,
  MessageSquareText,
  Settings,
};

export default function Sidebar() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const isTablet = useAppStore((s) => s.isTablet);
  const pushAlert = useAppStore((s) => s.pushAlert);
  const clearAlerts = useAppStore((s) => s.clearAlerts);
  const alerts = useAppStore((s) => s.alerts);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const activeAlerts = alerts.filter((a) => a.status !== "resuelta").length;
  const { theme, toggleTheme } = useThemeStore();
  const collapsed = isTablet;

  return (
    <aside
      style={{
        width: collapsed ? 56 : 210,
        backgroundColor: COLORS.panel,
        borderRight: `1px solid ${COLORS.line}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.2s ease",
      }}
    >
      {/* Nav items */}
      <nav className="sc-scroll" style={{ flex: 1, overflowY: "auto", padding: collapsed ? "12px 4px" : "12px 8px" }}>
        {MODULES.filter((mod) => {
          const adminOnly = ["config", "costos", "templates", "admin"];
          if (adminOnly.includes(mod.key) && user?.role !== "admin") return false;
          return true;
        }).map((mod) => {
          const Icon = ICON_MAP[mod.icon];
          const active = activeModule === mod.key;
          return (
            <button
              key={mod.key}
              onClick={() => setActiveModule(mod.key)}
              className="sc-btn"
              title={collapsed ? mod.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 0 : 10,
                width: "100%",
                padding: collapsed ? "10px 0" : "9px 12px",
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
                position: "relative",
              }}
            >
              {Icon && <Icon size={collapsed ? 20 : 16} />}
              {!collapsed && mod.label}
              {mod.key === "monitoreo" && activeAlerts > 0 && (
                <span
                  style={{
                    ...(collapsed
                      ? { position: "absolute" as const, top: 4, right: 4 }
                      : { marginLeft: "auto" }),
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
          padding: collapsed ? "12px 0" : "12px 14px",
          borderTop: `1px solid ${COLORS.line}`,
          borderBottom: `1px solid ${COLORS.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
        }}
        title={collapsed ? (user?.name || "Operadora") : undefined}
      >
        <ShieldCheck size={16} style={{ color: COLORS.aqua, flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div style={{ fontSize: 10, color: COLORS.faint, fontWeight: 500 }}>
              Operadora
            </div>
            <div style={{ fontSize: 12, color: COLORS.ink, fontWeight: 600 }}>
              {user?.name || "Operadora"}
            </div>
          </div>
        )}
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
                backgroundColor: "var(--sc-coral-a13)",
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
                backgroundColor: "var(--sc-amber-a13)",
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
                backgroundColor: "var(--sc-sub-a09)",
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

      {/* Theme toggle */}
      <div style={{ padding: collapsed ? "4px 8px 0" : "4px 12px 0" }}>
        <button
          className="sc-btn"
          onClick={toggleTheme}
          title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: collapsed ? 0 : 6,
            width: "100%",
            padding: "7px 0",
            borderRadius: 6,
            border: "none",
            backgroundColor: "var(--sc-faint-a09)",
            color: COLORS.sub,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {theme === "light" ? <Moon size={12} /> : <Sun size={12} />}
          {!collapsed && (theme === "light" ? "Modo oscuro" : "Modo claro")}
        </button>
      </div>

      {/* Cerrar sesión */}
      <div style={{ padding: collapsed ? "8px 8px 12px" : "8px 12px 12px" }}>
        <button
          className="sc-btn"
          onClick={logout}
          title={collapsed ? "Cerrar sesión" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: collapsed ? 0 : 6,
            width: "100%",
            padding: "7px 0",
            borderRadius: 6,
            border: "none",
            backgroundColor: "var(--sc-faint-a09)",
            color: COLORS.sub,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <LogOut size={12} />
          {!collapsed && "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}
