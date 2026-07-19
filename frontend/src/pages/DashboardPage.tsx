import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { WifiOff } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MonitoreoView from "@/components/monitoreo/MonitoreoView";
import ClientesView from "@/components/clientes/ClientesView";
import BienestarView from "@/components/bienestar/BienestarView";
import MensajeriaView from "@/components/mensajeria/MensajeriaView";
import AgendaView from "@/components/agenda/AgendaView";
import TasksView from "@/components/tasks/TasksView";
import ReportesView from "@/components/reportes/ReportesView";
import UsersView from "@/components/admin/UsersView";
import CostsView from "@/components/admin/CostsView";
import TemplatesView from "@/components/admin/TemplatesView";
import ConfigView from "@/components/admin/ConfigView";
import BanOverlay from "@/components/shared/BanOverlay";

const VIEWS: Record<string, React.FC> = {
  monitoreo: MonitoreoView,
  clientes: ClientesView,
  bienestar: BienestarView,
  mensajeria: MensajeriaView,
  agenda: AgendaView,
  tareas: TasksView,
  reportes: ReportesView,
  admin: UsersView,
  costos: CostsView,
  templates: TemplatesView,
  config: ConfigView,
};

const WA_POLL_INTERVAL_MS = 60_000;

export default function DashboardPage() {
  useWebSocket();
  const activeModule = useAppStore((s) => s.activeModule);
  const View = VIEWS[activeModule] || MonitoreoView;

  const [waBanned, setWaBanned] = useState(false);
  const [showBanOverlay, setShowBanOverlay] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkWaStatus() {
      try {
        const { data } = await api.get<{ provider: string; connected: boolean; banned: boolean }>(
          "/api/config/whatsapp-status"
        );
        if (!cancelled && data.banned) {
          setWaBanned(true);
          setShowBanOverlay(true);
        }
      } catch {
        // No interrumpir el dashboard si el check falla
      }
    }

    checkWaStatus();
    const timer = setInterval(checkWaStatus, WA_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      {/* Banner persistente cuando WhatsApp esta bloqueado y el overlay fue cerrado */}
      {waBanned && !showBanOverlay && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 8000,
            backgroundColor: COLORS.coral,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <WifiOff size={13} />
          WhatsApp desconectado — las notificaciones no se envian
        </div>
      )}

      {showBanOverlay && (
        <BanOverlay onDismiss={() => setShowBanOverlay(false)} />
      )}

      <div style={{ paddingTop: waBanned && !showBanOverlay ? 30 : 0, height: "100%", boxSizing: "border-box" }}>
        <DashboardLayout>
          <View />
        </DashboardLayout>
      </div>
    </>
  );
}
