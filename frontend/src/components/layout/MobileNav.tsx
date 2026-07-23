import {
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
  ClipboardCheck,
  BarChart3,
  Shield,
  DollarSign,
  MessageSquareText,
  Settings,
};

export default function MobileNav() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const alerts = useAppStore((s) => s.alerts);
  const user = useAuthStore((s) => s.user);

  const activeAlerts = alerts.filter((a) => a.status !== "resuelta").length;

  return (
    <nav
      style={{
        height: 60,
        backgroundColor: COLORS.panel,
        borderTop: `1px solid ${COLORS.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
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
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              background: "none",
              border: "none",
              color: active ? COLORS.coral : COLORS.faint,
              fontSize: 9,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              position: "relative",
              padding: "4px 8px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {Icon && <Icon size={18} />}
            {mod.label}
            {mod.key === "monitoreo" && activeAlerts > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 2,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: COLORS.coral,
                  animation: "blink 1.2s ease-in-out infinite",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
