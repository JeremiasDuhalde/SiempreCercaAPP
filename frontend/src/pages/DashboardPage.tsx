import { useAppStore } from "@/stores/useAppStore";
import { useWebSocket } from "@/hooks/useWebSocket";
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
