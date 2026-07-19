import { useState, useEffect } from "react";
import { COLORS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppStore } from "@/stores/useAppStore";
import { MessageSquareText, Shield, Plus, X, Send, Sparkles, RefreshCw } from "lucide-react";

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

/* ── Category mapping ───────────────────────────────────────── */

function categoryFromName(name: string): { label: string; color: string } {
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

/* ── Status badge ───────────────────────────────────────────── */

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

/* ── Template body text extractor ───────────────────────────── */

function getBodyText(components: TemplateComponent[]): string {
  const body = components.find((c) => c.type === "BODY");
  return body?.text ?? "";
}

/* ── Highlight {{vars}} in blue ─────────────────────────────── */

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/({{[^}]+}})/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^{{[^}]+}}$/.test(part) ? (
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

/* ── Smart template formatter ───────────────────────────────── */

function formatDescriptionToTemplate(description: string): {
  body: string;
  name: string;
  variables: string[];
} {
  // Extract anything in [brackets] as variables
  const varRegex = /\[([^\]]+)\]/g;
  const variables: string[] = [];
  let idx = 0;
  const body = description.replace(varRegex, (_match, varName) => {
    idx++;
    variables.push(varName);
    return `{{${idx}}}`;
  });

  // Auto-generate snake_case name from first ~5 words
  const name = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("_");

  return { body, name, variables };
}

/* ── New template modal ─────────────────────────────────────── */

function NewTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [description, setDescription] = useState("");
  const [generated, setGenerated] = useState<{ body: string; name: string; variables: string[] } | null>(null);
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
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: COLORS.line }}
        >
          <div className="flex items-center gap-2">
            <MessageSquareText size={18} style={{ color: COLORS.violet }} />
            <span className="font-semibold text-sm" style={{ color: COLORS.ink }}>
              Nuevo template de WhatsApp
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg"
            style={{ color: COLORS.sub }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Description input */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.sub }}>
              Describí el mensaje en lenguaje natural
            </label>
            <p className="text-xs mb-2" style={{ color: COLORS.faint }}>
              Usá corchetes para las variables. Ej: "Hola [nombre], su turno es el [fecha] a las [hora]."
            </p>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setGenerated(null); }}
              placeholder="Hola [nombre], le recordamos que mañana tiene turno con [especialista]..."
              rows={4}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border resize-none"
              style={{
                background: COLORS.panel2,
                color: COLORS.ink,
                borderColor: COLORS.line,
              }}
            />
          </div>

          {/* Generate button */}
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

          {/* Preview */}
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

              {/* Template name */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: COLORS.sub }}>
                  Nombre del template (snake_case)
                </label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none border"
                  style={{
                    background: COLORS.panel2,
                    color: COLORS.ink,
                    borderColor: COLORS.line,
                    fontFamily: "monospace",
                  }}
                />
              </div>

              {/* Errors / success */}
              {error && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: `${COLORS.coral}15`, color: COLORS.coral }}>
                  {error}
                </p>
              )}
              {success && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: `${COLORS.aqua}15`, color: COLORS.aqua }}>
                  Template enviado a Meta. Quedara en estado Pendiente hasta su aprobacion.
                </p>
              )}

              {/* Send button */}
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

/* ── Template card ──────────────────────────────────────────── */

function TemplateCard({ tpl }: { tpl: MetaTemplate }) {
  const bodyText = getBodyText(tpl.components);
  const cat = categoryFromName(tpl.name);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.line}`,
      }}
    >
      {/* Top row */}
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

      {/* Body preview */}
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

/* ── Main view ──────────────────────────────────────────────── */

export default function TemplatesView() {
  const user = useAuthStore((s) => s.user);
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

  // Guard: admin only
  if (user?.role !== "admin") {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: COLORS.faint }}
      >
        <Shield size={40} strokeWidth={1} />
        <p className="text-sm">Solo administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: COLORS.bg }}
    >
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
          {!loading && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${COLORS.violet}18`, color: COLORS.violet }}
            >
              {templates.length} templates
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            title="Recargar"
            className="p-2 rounded-lg transition-opacity"
            style={{
              background: COLORS.panel2,
              color: COLORS.sub,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: COLORS.violet, color: "#fff" }}
          >
            <Plus size={14} />
            {!isMobile && "Nuevo template"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto sc-scroll p-4">
        {loading && (
          <div className="flex items-center justify-center h-40 gap-2" style={{ color: COLORS.faint }}>
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
            <p className="text-sm">No hay templates creados todavía.</p>
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
          <div
            className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {templates.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </div>
        )}
      </div>

      {/* New template modal */}
      {showModal && (
        <NewTemplateModal
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
