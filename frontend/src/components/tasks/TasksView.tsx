import { useState } from "react";
import {
  ClipboardList,
  Bot,
  Cpu,
  TrendingUp,
  Plus,
  Check,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
} from "lucide-react";
import { COLORS, colorTint } from "@/lib/constants";
import { useAppStore } from "@/stores/useAppStore";
import { useClients } from "@/hooks/useClients";
import {
  useTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  type TaskItem,
  type CreateTaskParams,
} from "@/hooks/useTasks";

/* ── Constants ───────────────────────────────────────────────── */

const STATUS_TABS = [
  { key: "", label: "Todas" },
  { key: "pendiente", label: "Pendientes" },
  { key: "en_progreso", label: "En progreso" },
  { key: "completada", label: "Completadas" },
] as const;

const CATEGORY_OPTIONS = [
  { key: "", label: "Todas" },
  { key: "manual", label: "Manual" },
  { key: "agent", label: "Agente" },
  { key: "system", label: "Sistema" },
  { key: "pattern", label: "Patrón" },
] as const;

const PRIORITY_COLORS: Record<number, string> = {
  3: COLORS.coral,
  2: COLORS.amber,
  1: COLORS.aqua,
};

const PRIORITY_LABELS: Record<number, string> = {
  3: "Alta",
  2: "Media",
  1: "Baja",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  manual: ClipboardList,
  agent: Bot,
  system: Cpu,
  pattern: TrendingUp,
};

/* ── Helpers ─────────────────────────────────────────────────── */

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return new Date(due) < new Date();
}

/* ── Task Card ───────────────────────────────────────────────── */

interface TaskCardProps {
  task: TaskItem;
  clientName?: string;
  onComplete: () => void;
  onDelete: () => void;
}

function TaskCard({ task, clientName, onComplete, onDelete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const priorityColor = PRIORITY_COLORS[task.priority] ?? COLORS.sub;
  const CategoryIcon = CATEGORY_ICONS[task.category] ?? ClipboardList;
  const overdue = task.status !== "completada" && isOverdue(task.due_date);

  return (
    <div
      style={{
        background: COLORS.panel,
        borderRadius: 10,
        borderLeft: `3px solid ${priorityColor}`,
        marginBottom: 8,
        overflow: "hidden",
      }}
    >
      {/* Main row */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Category icon */}
        <CategoryIcon size={15} style={{ color: COLORS.sub, flexShrink: 0, marginTop: 2 }} />

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: task.status === "completada" ? COLORS.faint : COLORS.ink,
              textDecoration: task.status === "completada" ? "line-through" : "none",
              marginBottom: 4,
              lineHeight: 1.3,
            }}
          >
            {task.title}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {/* Priority badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 4,
                background: colorTint(priorityColor, "light"),
                color: priorityColor,
              }}
            >
              {PRIORITY_LABELS[task.priority] ?? "Media"}
            </span>

            {/* Status badge */}
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: colorTint(COLORS.faint, "faint"),
                color: COLORS.sub,
              }}
            >
              {task.status === "pendiente"
                ? "Pendiente"
                : task.status === "en_progreso"
                ? "En progreso"
                : "Completada"}
            </span>

            {/* Client */}
            {clientName && (
              <span style={{ fontSize: 10, color: COLORS.sub }}>— {clientName}</span>
            )}

            {/* Due date */}
            {task.due_date && (
              <span
                style={{
                  fontSize: 10,
                  color: overdue ? COLORS.coral : COLORS.faint,
                  fontWeight: overdue ? 600 : 400,
                }}
              >
                Vence {formatDate(task.due_date)}
                {overdue && " (vencida)"}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <div style={{ color: COLORS.faint, flexShrink: 0 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded: description + actions */}
      {expanded && (
        <div
          style={{
            padding: "0 14px 12px 14px",
            borderTop: `1px solid ${COLORS.line}`,
          }}
        >
          {task.description && (
            <p
              style={{
                fontSize: 12,
                color: COLORS.sub,
                margin: "10px 0 12px",
                lineHeight: 1.5,
              }}
            >
              {task.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: task.description ? 0 : 10 }}>
            {task.status !== "completada" && (
              <button
                className="sc-btn"
                onClick={(e) => { e.stopPropagation(); onComplete(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: colorTint(COLORS.aqua, "light"),
                  color: COLORS.aqua,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                <Check size={12} />
                Completar
              </button>
            )}
            <button
              className="sc-btn"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                background: colorTint(COLORS.coral, "faint"),
                color: COLORS.coral,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create Form Panel ───────────────────────────────────────── */

interface CreateFormProps {
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clients: any[];
}

function CreateForm({ onClose, clients }: CreateFormProps) {
  const createTask = useCreateTask();
  const [form, setForm] = useState<CreateTaskParams>({
    title: "",
    description: "",
    category: "manual",
    priority: 2,
    client_id: undefined,
    due_date: undefined,
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    const payload: CreateTaskParams = {
      title: form.title.trim(),
      category: form.category,
      priority: form.priority,
    };
    if (form.description?.trim()) payload.description = form.description.trim();
    if (form.client_id) payload.client_id = form.client_id;
    if (form.due_date) payload.due_date = form.due_date;

    createTask.mutate(payload, {
      onSuccess: () => onClose(),
    });
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 7,
    border: `1px solid ${COLORS.line}`,
    background: COLORS.bg,
    color: COLORS.ink,
    fontSize: 13,
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.sub,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.panel,
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: 0 }}>
            Nueva tarea
          </h2>
          <button
            className="sc-btn"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: COLORS.sub,
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Titulo *</label>
            <input
              style={fieldStyle}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Descripcion breve de la tarea"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Descripcion</label>
            <textarea
              style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Detalle opcional..."
            />
          </div>

          {/* Priority + Category row */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Prioridad</label>
              <select
                style={fieldStyle}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
              >
                <option value={3}>Alta</option>
                <option value={2}>Media</option>
                <option value={1}>Baja</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Categoria</label>
              <select
                style={fieldStyle}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="manual">Manual</option>
                <option value="agent">Agente</option>
                <option value="system">Sistema</option>
                <option value="pattern">Patron</option>
              </select>
            </div>
          </div>

          {/* Client */}
          <div>
            <label style={labelStyle}>Cliente (opcional)</label>
            <select
              style={fieldStyle}
              value={form.client_id ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  client_id: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            >
              <option value="">Sin cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label style={labelStyle}>Fecha limite (opcional)</label>
            <input
              type="date"
              style={fieldStyle}
              value={form.due_date ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, due_date: e.target.value || undefined }))
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            className="sc-btn"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: `1px solid ${COLORS.line}`,
              background: "transparent",
              color: COLORS.sub,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Cancelar
          </button>
          <button
            className="sc-btn"
            onClick={handleSubmit}
            disabled={!form.title.trim() || createTask.isPending}
            style={{
              flex: 2,
              padding: "9px 0",
              borderRadius: 8,
              border: "none",
              background:
                form.title.trim()
                  ? `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.blue})`
                  : COLORS.faint,
              color: form.title.trim() ? "#fff" : COLORS.sub,
              fontSize: 13,
              fontWeight: 700,
              cursor: form.title.trim() ? "pointer" : "not-allowed",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {createTask.isPending ? "Guardando..." : "Crear tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main View ───────────────────────────────────────────────── */

export default function TasksView() {
  const isMobile = useAppStore((s) => s.isMobile);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: tasks = [], isLoading } = useTasks(
    statusFilter || undefined,
    categoryFilter || undefined,
  );
  const { data: stats } = useTaskStats();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: clientsData } = useClients({ is_active: true });

  const clientsList: Array<{ id: number; name: string }> =
    clientsData?.items ?? (Array.isArray(clientsData) ? clientsData : []);

  const clientMap = Object.fromEntries(clientsList.map((c) => [c.id, c.name]));

  const handleComplete = (task: TaskItem) => {
    updateTask.mutate({ id: task.id, status: "completada" });
  };

  const handleDelete = (id: number) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    deleteTask.mutate(id);
  };

  return (
    <div
      className="sc-scroll h-full overflow-y-auto"
      style={{ background: COLORS.bg }}
    >
      <div className={`mx-auto w-full ${isMobile ? "px-4 py-4" : "px-6 py-6 max-w-[1200px]"}`}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, margin: 0 }}
            >
              Tareas
            </h1>
            {stats && (
              <p style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>
                {stats.pending} pendiente{stats.pending !== 1 ? "s" : ""}
                {stats.high_priority > 0 && (
                  <span style={{ color: COLORS.coral, fontWeight: 600 }}>
                    {" "}· {stats.high_priority} urgente{stats.high_priority !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            className="sc-btn"
            onClick={() => setShowForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.blue})`,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <Plus size={14} />
            {!isMobile && "Nueva tarea"}
          </button>
        </div>

        {/* Status filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 12,
            background: COLORS.panel,
            borderRadius: 8,
            padding: 4,
          }}
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              className="sc-btn"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                flex: 1,
                padding: "6px 4px",
                borderRadius: 6,
                border: "none",
                background: statusFilter === tab.key ? COLORS.panel2 : "transparent",
                color: statusFilter === tab.key ? COLORS.ink : COLORS.sub,
                fontSize: 11,
                fontWeight: statusFilter === tab.key ? 700 : 400,
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {CATEGORY_OPTIONS.map((opt) => {
            const Icon = CATEGORY_ICONS[opt.key];
            const active = categoryFilter === opt.key;
            return (
              <button
                key={opt.key}
                className="sc-btn"
                onClick={() => setCategoryFilter(opt.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: `1px solid ${active ? COLORS.violet : COLORS.line}`,
                  background: active ? colorTint(COLORS.violet, "faint") : "transparent",
                  color: active ? COLORS.violet : COLORS.sub,
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {Icon && <Icon size={11} />}
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Task list */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: COLORS.faint, fontSize: 13 }}>
            Cargando tareas...
          </div>
        ) : tasks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background: COLORS.panel,
              borderRadius: 12,
            }}
          >
            <ClipboardCheck size={32} style={{ color: COLORS.faint, margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.sub, margin: 0 }}>
              Sin tareas
            </p>
            <p style={{ fontSize: 12, color: COLORS.faint, marginTop: 4 }}>
              {statusFilter || categoryFilter
                ? "No hay tareas para este filtro."
                : "Crea la primera tarea usando el boton superior."}
            </p>
          </div>
        ) : (
          <div>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                clientName={task.client_id ? clientMap[task.client_id] : undefined}
                onComplete={() => handleComplete(task)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create form modal */}
      {showForm && (
        <CreateForm onClose={() => setShowForm(false)} clients={clientsList} />
      )}
    </div>
  );
}
