import { useAppStore } from "@/stores/useAppStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MonitoreoView from "@/components/monitoreo/MonitoreoView";
import ClientesView from "@/components/clientes/ClientesView";
import BienestarView from "@/components/bienestar/BienestarView";
import MensajeriaView from "@/components/mensajeria/MensajeriaView";
import AgendaView from "@/components/agenda/AgendaView";
import ReportesView from "@/components/reportes/ReportesView";

const VIEWS: Record<string, React.FC> = {
  monitoreo: MonitoreoView,
  clientes: ClientesView,
  bienestar: BienestarView,
  mensajeria: MensajeriaView,
  agenda: AgendaView,
  reportes: ReportesView,
};

export default function DashboardPage() {
  useWebSocket();
  const activeModule = useAppStore((s) => s.activeModule);
  const View = VIEWS[activeModule] || MonitoreoView;

  return (
    <DashboardLayout>
      <View />
    </DashboardLayout>
  );
}
