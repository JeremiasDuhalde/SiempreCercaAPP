import { useState, useEffect } from "react";
import { COLORS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppStore } from "@/stores/useAppStore";
import {
  MessageSquareText,
  Shield,
  Plus,
  X,
  Send,
  Sparkles,
  RefreshCw,
  Pencil,
  Trash2,
  Check,
  Info,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */

interface TemplateComponent {
  type: string;
  text?: string;
  example?: { body_text?: string[][] };
}

interface MetaTemplate {
  id: string;
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  category: string;
  language: string;
  components: TemplateComponent[];
}

interface MetaTemplatesResponse {
  data: MetaTemplate[];
  paging?: { cursors?: { before?: string; after?: string } };
}

interface LocalTemplate {
  key: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  active: boolean;
}

/* ── Category mapping ───────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  emergencia: COLORS.coral,
  recordatorio: COLORS.amber,
  familia: COLORS.violet,
  bienvenida: COLORS.aqua,
  general: COLORS.blue,
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? COLORS.blue;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    emergencia: "Emergencia",
    recordatorio: "Recordatorio",
    familia: "Familia",
    bienvenida: "Bienvenida",
    general: "General",
  };
  return map[cat.toLowerCase()] ?? cat;
}

function categoryFromMetaName(name: string): { label: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes("emergencia") || n.includes("sos") || n.includes("alerta"))
    return { label: "Emergencia", color: COLORS.coral };
  if (n.includes("recordatorio") || n.includes("med") || n.includes("turno"))
    return { label: "Recordatorio", color: COLORS.amber };
  if (n.includes("familiar") || n.includes("parte") || n.includes("familia"))
    return { label: "Familia", color: COLORS.violet };
  if (n.includes("bienvenida") || n.includes("welcome"))
    return { label: "Bienvenida", color: COLORS.aqua };
  return { label: "General", color: COLORS.blue };
}

/* ── Highlight placeholders ─────────────────────────────────── */

/** Resalta {{N}} (Meta) y {N} (locales) en azul */
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/({{?\d+}?})/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^{{?\d+}?}$/.test(part) ? (
          <span
            key={i}
            style={{
              color: COLORS.blue,
              fontWeight: 600,
              background: `${COLORS.blue}15`,
              borderRadius: 3,
              padding: "0 3px",
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/* ── Status badge (Meta) ────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "APPROVED"
      ? { label: "Aprobado", bg: `${COLORS.aqua}22`, color: COLORS.aqua }
      : status === "PENDING"
      ? { label: "Pendiente", bg: `${COLORS.amber}22`, color: COLORS.amber }
      : { label: "Rechazado", bg: `${COLORS.coral}22`, color: COLORS.coral };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function getBodyText(components: TemplateComponent[]): string {
  const body = components.find((c) => c.type === "BODY");
  return body?.text ?? "";
}

/* ── Smart formatter for description → template ─────────────── */

function formatDescriptionToTemplate(description: string): {
  body: string;
  name: string;
  variables: string[];
} {
  const varRegex = /\[([^\]]+)\]/g;
  const variables: string[] = [];
  let idx = 0;
  const body = description.replace(varRegex, (_match, varName) => {
    idx++;
    variables.push(varName);
    return `{{${idx}}}`;
  });
  const name = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("_");
  return { body, name, variables };
}

/* ════════════════════════════════════════════════════════════════
   META TAB — modal de nuevo template para Meta API
   ════════════════════════════════════════════════════════════════ */

function NewMetaTemplateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [generated, setGenerated] = useState<{
    body: string;
    name: string;
    variables: string[];
  } | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = () => {
    if (!description.trim()) return;
    const result = formatDescriptionToTemplate(description.trim());
    setGenerated(result);
    setTemplateName(result.name);
  };

  const handleSend = async () => {
    if (!generated || !templateName.trim()) return;
    setSending(true);
    setError(null);
    try {
      const exampleValues = generated.variables.map((v) => v);
      await api.post("/api/templates/create", {
        name: templateName.trim(),
        language: "es_AR",
        category: "UTILITY",
        components: [
          {
            type: "BODY",
            text: generated.body,
            ...(generated.variables.length > 0
              ? { example: { body_text: [exampleValues] } }
              : {}),
          },
        ],
      });
      setSuccess(true);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1500);
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? "Error al enviar template";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col"
        style={{ background: COLORS.panel, maxHeight: "90vh", overflow: "hidden" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: COLORS.line }}
        >
          <div className="flex items-center gap-2">
            <MessageSquareText size={18} style={{ color: COLORS.violet }} />
            <span className="font-semibold text-sm" style={{ color: COLORS.ink }}>
              Nuevo template de WhatsApp (Meta)
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: COLORS.sub }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.sub }}>
              Describí el mensaje en lenguaje natural
            </label>
            <p className="text-xs mb-2" style={{ color: COLORS.faint }}>
              Usá corchetes para las variables. Ej: "Hola [nombre], su turno es el [fecha] a las [hora]."
            </p>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setGenerated(null);
              }}
              placeholder="Hola [nombre], le recordamos que mañana tiene turno con [especialista]..."
              rows={4}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border resize-none"
              style={{ background: COLORS.panel2, color: COLORS.ink, borderColor: COLORS.line }}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!description.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              background: COLORS.violet,
              color: "#fff",
              opacity: !description.trim() ? 0.4 : 1,
            }}
          >
            <Sparkles size={15} />
            Generar con IA
          </button>

          {generated && (
            <div className="space-y-3">
              <div
                className="rounded-xl p-4"
                style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}` }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: COLORS.sub }}>
                  Vista previa del template
                </p>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: COLORS.ink, whiteSpace: "pre-wrap", fontFamily: "monospace" }}
                >
                  <HighlightedText text={generated.body} />
                </div>
                {generated.variables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {generated.variables.map((v, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${COLORS.blue}15`, color: COLORS.blue }}
                      >
                        {`{{${i + 1}}}`} = {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.sub }}>
                  Nombre del template (snake_case)
                </label>
                <input
                  value={templateName}
                  onChange={(e) =>
                    setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
                  }
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                  style={{
                    background: COLORS.panel2,
                    color: COLORS.ink,
                    borderColor: COLORS.line,
                    fontFamily: "monospace",
                  }}
                />
              </div>

              {error && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ background: `${COLORS.coral}15`, color: COLORS.coral }}
                >
                  {error}
                </p>
              )}
              {success && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ background: `${COLORS.aqua}15`, color: COLORS.aqua }}
                >
                  Template enviado a Meta. Quedara en estado Pendiente hasta su aprobacion.
                </p>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !templateName.trim() || success}
                className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                style={{
                  background: COLORS.aqua,
                  color: "#fff",
                  opacity: sending || !templateName.trim() || success ? 0.5 : 1,
                }}
              >
                <Send size={15} />
                {sending ? "Enviando..." : "Enviar a Meta"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Meta template card ─────────────────────────────────────── */

function MetaTemplateCard({ tpl }: { tpl: MetaTemplate }) {
  const bodyText = getBodyText(tpl.components);
  const cat = categoryFromMetaName(tpl.name);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold leading-snug truncate"
            style={{ color: COLORS.ink, fontFamily: "monospace" }}
          >
            {tpl.name}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: COLORS.faint }}>
            {tpl.language}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${cat.color}18`, color: cat.color }}
          >
            {cat.label}
          </span>
          <StatusBadge status={tpl.status} />
        </div>
      </div>

      {bodyText ? (
        <div
          className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
          style={{
            background: COLORS.panel2,
            color: COLORS.sub,
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
          }}
        >
          <HighlightedText text={bodyText} />
        </div>
      ) : (
        <p className="text-xs italic" style={{ color: COLORS.faint }}>
          Sin cuerpo de texto.
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   LOCAL TEMPLATES TAB
   ════════════════════════════════════════════════════════════════ */

const LOCAL_CATEGORIES = ["emergencia", "recordatorio", "familia", "bienvenida", "general"];

interface LocalTemplateCardProps {
  tpl: LocalTemplate;
  onEdit: (tpl: LocalTemplate) => void;
  onDelete: (key: string) => void;
}

function LocalTemplateCard({ tpl, onEdit, onDelete }: LocalTemplateCardProps) {
  const color = categoryColor(tpl.category);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold leading-snug"
            style={{ color: COLORS.ink }}
          >
            {tpl.name}
          </h3>
          <p
            className="text-xs mt-0.5 font-mono"
            style={{ color: COLORS.faint }}
          >
            {tpl.key}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${color}18`, color }}
          >
            {categoryLabel(tpl.category)}
          </span>
          {!tpl.active && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: `${COLORS.faint}15`, color: COLORS.faint }}
            >
              Inactivo
            </span>
          )}
        </div>
      </div>

      {/* Body preview */}
      <div
        className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
        style={{
          background: COLORS.panel2,
          color: COLORS.sub,
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          maxHeight: 120,
          overflow: "hidden",
        }}
      >
        <HighlightedText text={tpl.body} />
      </div>

      {/* Variables */}
      {tpl.variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tpl.variables.map((v, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${COLORS.blue}15`, color: COLORS.blue }}
            >
              {`{${i}}`} = {v}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onEdit(tpl)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: `${COLORS.violet}18`, color: COLORS.violet }}
        >
          <Pencil size={12} />
          Editar
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs" style={{ color: COLORS.coral }}>
              Confirmar?
            </span>
            <button
              onClick={() => onDelete(tpl.key)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: COLORS.coral, color: "#fff" }}
            >
              <Check size={12} />
              Si
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: COLORS.panel2, color: COLORS.sub }}
            >
              <X size={12} />
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: `${COLORS.coral}15`, color: COLORS.coral }}
          >
            <Trash2 size={12} />
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Local template editor modal ────────────────────────────── */

interface LocalEditorModalProps {
  initial: LocalTemplate | null; // null = nuevo
  onClose: () => void;
  onSaved: () => void;
}

function LocalEditorModal({ initial, onClose, onSaved }: LocalEditorModalProps) {
  // AI generator state
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(!initial); // show AI panel by default for new

  // Form state
  const [form, setForm] = useState<LocalTemplate>(
    initial ?? {
      key: "",
      name: "",
      category: "general",
      body: "",
      variables: [],
      active: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { data } = await api.post<LocalTemplate>("/api/local-templates/generate", {
        description: aiDescription.trim(),
      });
      setForm(data);
      setShowAi(false);
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? "Error al generar template";
      setAiError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(`/api/local-templates/${form.key}`, form);
      onSaved();
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? "Error al guardar";
      setSaveError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof LocalTemplate>(k: K, v: LocalTemplate[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl flex flex-col"
        style={{ background: COLORS.panel, maxHeight: "92vh", overflow: "hidden" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: COLORS.line }}
        >
          <div className="flex items-center gap-2">
            <MessageSquareText size={18} style={{ color: COLORS.aqua }} />
            <span className="font-semibold text-sm" style={{ color: COLORS.ink }}>
              {initial ? "Editar template local" : "Nuevo template local"}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: COLORS.sub }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* AI generator toggle */}
          {!initial && (
            <div>
              <button
                onClick={() => setShowAi((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
                style={{
                  background: showAi ? `${COLORS.violet}18` : COLORS.panel2,
                  color: showAi ? COLORS.violet : COLORS.sub,
                  border: `1px solid ${showAi ? COLORS.violet + "33" : COLORS.line}`,
                }}
              >
                <Sparkles size={13} />
                Asistente IA — generador de templates
              </button>
            </div>
          )}

          {/* AI panel */}
          {showAi && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}` }}
            >
              <p className="text-xs font-semibold" style={{ color: COLORS.violet }}>
                Describí el mensaje en lenguaje natural
              </p>
              <p className="text-xs" style={{ color: COLORS.faint }}>
                Usa [corchetes] para las variables. Ej: "Hola [nombre], te recordamos que
                mañana tienes turno con [especialista] a las [hora]."
              </p>
              <textarea
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                rows={4}
                placeholder="Hola [nombre_paciente], le informamos que [enfermera] lo visitara hoy a las [hora]..."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border resize-none"
                style={{
                  background: COLORS.panel,
                  color: COLORS.ink,
                  borderColor: COLORS.line,
                }}
              />
              {aiError && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ background: `${COLORS.coral}15`, color: COLORS.coral }}
                >
                  {aiError}
                </p>
              )}
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiDescription.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity"
                style={{
                  background: COLORS.violet,
                  color: "#fff",
                  opacity: aiLoading || !aiDescription.trim() ? 0.4 : 1,
                }}
              >
                {aiLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {aiLoading ? "Generando..." : "Generar template"}
              </button>
            </div>
          )}

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.sub }}>
                Nombre visible
              </label>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Alerta de emergencia SOS"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                style={{ background: COLORS.panel2, color: COLORS.ink, borderColor: COLORS.line }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.sub }}>
                Clave interna (snake_case)
              </label>
              <input
                value={form.key}
                onChange={(e) =>
                  setField("key", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
                }
                placeholder="alerta_emergencia"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none border font-mono"
                style={{ background: COLORS.panel2, color: COLORS.ink, borderColor: COLORS.line }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.sub }}>
                Categoria
              </label>
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                style={{
                  background: COLORS.panel2,
                  color: COLORS.ink,
                  borderColor: COLORS.line,
                }}
              >
                {LOCAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.sub }}>
              Cuerpo del mensaje
            </label>
            <p className="text-xs mb-1.5" style={{ color: COLORS.faint }}>
              Usa {"{0}"}, {"{1}"}, {"{2}"}... para las variables posicionales.
            </p>
            <textarea
              value={form.body}
              onChange={(e) => setField("body", e.target.value)}
              rows={7}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border resize-none font-mono"
              style={{ background: COLORS.panel2, color: COLORS.ink, borderColor: COLORS.line }}
            />
          </div>

          {/* Preview */}
          {form.body && (
            <div
              className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
              style={{
                background: `${COLORS.blue}08`,
                border: `1px solid ${COLORS.blue}22`,
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                color: COLORS.sub,
              }}
            >
              <HighlightedText text={form.body} />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.sub }}>
              Variables (una por linea, en orden)
            </label>
            <textarea
              value={form.variables.join("\n")}
              onChange={(e) =>
                setField(
                  "variables",
                  e.target.value.split("\n").map((v) => v.trim()).filter(Boolean)
                )
              }
              rows={3}
              placeholder={"nombre_paciente\nubicacion\ntelefono_central"}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border resize-none font-mono"
              style={{ background: COLORS.panel2, color: COLORS.ink, borderColor: COLORS.line }}
            />
            {form.variables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.variables.map((v, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${COLORS.blue}15`, color: COLORS.blue }}
                  >
                    {`{${i}}`} = {v}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField("active", e.target.checked)}
              className="rounded"
            />
            <span className="text-xs font-semibold" style={{ color: COLORS.sub }}>
              Template activo
            </span>
          </label>

          {saveError && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{ background: `${COLORS.coral}15`, color: COLORS.coral }}
            >
              {saveError}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !form.key.trim() || !form.name.trim() || !form.body.trim()}
            className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              background: COLORS.aqua,
              color: "#fff",
              opacity:
                saving || !form.key.trim() || !form.name.trim() || !form.body.trim() ? 0.5 : 1,
            }}
          >
            <Check size={15} />
            {saving ? "Guardando..." : "Guardar template"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Local templates tab content ────────────────────────────── */

function LocalTemplatesTab() {
  const isMobile = useAppStore((s) => s.isMobile);
  const [templates, setTemplates] = useState<LocalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LocalTemplate | null | "new">(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ templates: LocalTemplate[] }>("/api/local-templates/");
      setTemplates(data.templates ?? []);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Error al cargar templates locales");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await api.delete(`/api/local-templates/${key}`);
      fetchTemplates();
    } catch (err: any) {
      console.error("Error al eliminar template:", err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Info banner */}
      <div
        className="flex items-start gap-2 mx-4 mt-4 px-4 py-3 rounded-xl text-xs"
        style={{
          background: `${COLORS.aqua}13`,
          border: `1px solid ${COLORS.aqua}33`,
          color: COLORS.aqua,
        }}
      >
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          Los templates locales no requieren aprobacion de Meta y se pueden editar
          libremente. Los placeholders son posicionales:{" "}
          <code
            className="px-1 py-0.5 rounded"
            style={{ background: `${COLORS.aqua}20`, fontFamily: "monospace" }}
          >
            {"{0}"}
          </code>
          ,{" "}
          <code
            className="px-1 py-0.5 rounded"
            style={{ background: `${COLORS.aqua}20`, fontFamily: "monospace" }}
          >
            {"{1}"}
          </code>
          , etc.
        </span>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs" style={{ color: COLORS.faint }}>
          {!loading && `${templates.length} templates`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="p-2 rounded-lg"
            style={{ background: COLORS.panel2, color: COLORS.sub, opacity: loading ? 0.5 : 1 }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: COLORS.aqua, color: "#fff" }}
          >
            <Plus size={13} />
            {!isMobile && "Nuevo template"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto sc-scroll px-4 pb-4">
        {loading && (
          <div
            className="flex items-center justify-center h-40 gap-2"
            style={{ color: COLORS.faint }}
          >
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Cargando templates locales...</span>
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: `${COLORS.coral}15`, color: COLORS.coral }}
          >
            <p className="font-semibold mb-1">Error al cargar templates</p>
            <p className="text-xs opacity-80">{error}</p>
            <button
              onClick={fetchTemplates}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: COLORS.coral, color: "#fff" }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            {templates.map((tpl) => (
              <LocalTemplateCard
                key={tpl.key}
                tpl={tpl}
                onEdit={(t) => setEditing(t)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing !== null && (
        <LocalEditorModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   META TEMPLATES TAB CONTENT
   ════════════════════════════════════════════════════════════════ */

function MetaTemplatesTab() {
  const isMobile = useAppStore((s) => s.isMobile);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<MetaTemplatesResponse>("/api/templates/status");
      setTemplates(data.data ?? []);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Error al cargar templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs" style={{ color: COLORS.faint }}>
          {!loading && `${templates.length} templates en Meta`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="p-2 rounded-lg"
            style={{ background: COLORS.panel2, color: COLORS.sub, opacity: loading ? 0.5 : 1 }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: COLORS.violet, color: "#fff" }}
          >
            <Plus size={13} />
            {!isMobile && "Nuevo template"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto sc-scroll px-4 pb-4">
        {loading && (
          <div
            className="flex items-center justify-center h-40 gap-2"
            style={{ color: COLORS.faint }}
          >
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Cargando templates desde Meta...</span>
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ background: `${COLORS.coral}15`, color: COLORS.coral }}
          >
            <p className="font-semibold mb-1">Error al cargar templates</p>
            <p className="text-xs opacity-80">{error}</p>
            <button
              onClick={fetchTemplates}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: COLORS.coral, color: "#fff" }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-40 gap-2"
            style={{ color: COLORS.faint }}
          >
            <MessageSquareText size={36} strokeWidth={1} />
            <p className="text-sm">No hay templates creados todavia.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold mt-1"
              style={{ background: COLORS.violet, color: "#fff" }}
            >
              Crear primer template
            </button>
          </div>
        )}

        {!loading && !error && templates.length > 0 && (
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            {templates.map((tpl) => (
              <MetaTemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewMetaTemplateModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN VIEW
   ════════════════════════════════════════════════════════════════ */

type Tab = "locales" | "meta";

export default function TemplatesView() {
  const user = useAuthStore((s) => s.user);

  // Detect active WhatsApp provider to set default tab
  const [provider, setProvider] = useState<string>("mock");
  const [activeTab, setActiveTab] = useState<Tab>("locales");

  useEffect(() => {
    api
      .get<{ provider: string }>("/api/config/whatsapp-status")
      .then(({ data }) => {
        setProvider(data.provider);
        setActiveTab(data.provider === "meta" ? "meta" : "locales");
      })
      .catch(() => {});
  }, []);

  // Guard: admin only
  if (user?.role !== "admin") {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: COLORS.faint }}
      >
        <Shield size={40} strokeWidth={1} />
        <p className="text-sm">Solo administradores pueden acceder a esta seccion.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: "locales", label: "Locales", color: COLORS.aqua },
    { key: "meta", label: "Meta API", color: COLORS.violet },
  ];

  return (
    <div className="flex flex-col h-full w-full" style={{ background: COLORS.bg }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: COLORS.line, background: COLORS.panel }}
      >
        <div className="flex items-center gap-2.5">
          <MessageSquareText size={18} style={{ color: COLORS.violet }} />
          <h1 className="text-sm font-bold" style={{ color: COLORS.ink }}>
            Templates de WhatsApp
          </h1>
          {provider !== "mock" && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${COLORS.violet}18`,
                color: COLORS.violet,
              }}
            >
              {provider}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 px-4 py-2 border-b shrink-0"
        style={{ borderColor: COLORS.line, background: COLORS.panel }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: isActive ? `${tab.color}18` : "transparent",
                color: isActive ? tab.color : COLORS.sub,
                border: isActive ? `1px solid ${tab.color}33` : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "locales" ? <LocalTemplatesTab /> : <MetaTemplatesTab />}
      </div>
    </div>
  );
}
