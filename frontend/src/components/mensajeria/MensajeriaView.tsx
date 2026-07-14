import { useState, useCallback } from "react";
import { COLORS } from "@/lib/constants";
import { CLIENTS, MESSAGE_TEMPLATES as MOCK_TEMPLATES } from "@/lib/mockData";
import { useAppStore } from "@/stores/useAppStore";
import { formatTime } from "@/lib/utils";
import { useTemplates, useMessages, useSendMessage } from "@/hooks/useMessages";
import {
  Send,
  Check,
  CheckCheck,
  Sun,
  Pill,
  Stethoscope,
  Navigation,
  Moon,
  MessageCircle,
  Zap,
  ChevronDown,
} from "lucide-react";
import type { MessageTemplate, SentMessage } from "@/lib/types";

/* ── Icon map ────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ElementType> = {
  Sun,
  Pill,
  Stethoscope,
  Navigation,
  Moon,
  MessageCircle,
};

/* ── API → MessageTemplate adapter ─────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptApiTemplate(raw: any): MessageTemplate {
  return {
    k: raw.key ?? raw.k ?? String(raw.id),
    icon: raw.icon ?? "MessageCircle",
    color: raw.color ?? COLORS.aqua,
    name: raw.name ?? raw.label ?? "",
    on: raw.is_active ?? raw.on ?? true,
    body: raw.body ?? raw.template ?? "",
  };
}

/* ── Tab switcher (mobile) ──────────────────────────────────── */

function TabSwitcher({
  tab,
  setTab,
}: {
  tab: "campanas" | "mensajes";
  setTab: (t: "campanas" | "mensajes") => void;
}) {
  return (
    <div className="flex border-b" style={{ borderColor: COLORS.line }}>
      {(["campanas", "mensajes"] as const).map((t) => (
        <button
          key={t}
          className="flex-1 py-2 text-sm font-medium transition-colors"
          style={{
            color: tab === t ? COLORS.ink : COLORS.sub,
            borderBottom: tab === t ? `2px solid ${COLORS.aqua}` : "2px solid transparent",
          }}
          onClick={() => setTab(t)}
        >
          {t === "campanas" ? "Campanas" : "Mensajes"}
        </button>
      ))}
    </div>
  );
}

/* ── Template card ──────────────────────────────────────────── */

function TemplateCard({
  tpl,
  toggled,
  onToggle,
}: {
  tpl: MessageTemplate;
  toggled: boolean;
  onToggle: () => void;
}) {
  const Icon = ICON_MAP[tpl.icon] ?? MessageCircle;

  return (
    <div className="sc-card rounded-xl p-3 mb-2" style={{ background: COLORS.panel2 }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} style={{ color: tpl.color }} />
        <span className="text-sm font-medium flex-1" style={{ color: COLORS.ink }}>
          {tpl.name}
        </span>
        {/* Toggle switch */}
        <button
          className="relative w-9 h-5 rounded-full transition-colors"
          style={{ background: toggled ? COLORS.aqua : COLORS.line }}
          onClick={onToggle}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ left: toggled ? 18 : 2 }}
          />
        </button>
      </div>
      <p className="text-xs" style={{ color: COLORS.sub }}>
        {tpl.body}
      </p>
    </div>
  );
}

/* ── Message bubble ─────────────────────────────────────────── */

function MessageBubble({ msg, templates }: { msg: SentMessage; templates: MessageTemplate[] }) {
  const client = CLIENTS.find((c) => c.id === msg.c);
  const tplName = templates.find((t) => t.k === msg.tpl)?.name ?? msg.tpl;
  const ts = new Date(msg.ts);

  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[85%]">
        <p className="text-[10px] text-right mb-0.5" style={{ color: COLORS.sub }}>
          {tplName} → {client?.name ?? msg.c}
        </p>
        <div
          className="px-3 py-2 rounded-xl rounded-br-sm text-sm"
          style={{ background: "#1f3b32", color: COLORS.ink, border: "1px solid #2a5446" }}
        >
          {msg.body}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px]" style={{ color: COLORS.faint }}>
              {formatTime(ts)}
            </span>
            {msg.st === "leido" ? (
              <CheckCheck size={13} style={{ color: COLORS.aqua }} />
            ) : (
              <Check size={13} style={{ color: COLORS.faint }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Campaigns panel ─────────────────────────────────────────── */

function CampaignsPanel() {
  const { addMessage, markRead, _nextMsgId } = useAppStore();

  // API templates with mock fallback
  const { data: templatesData } = useTemplates();
  const templates: MessageTemplate[] = templatesData?.items
    ? templatesData.items.map(adaptApiTemplate)
    : templatesData && Array.isArray(templatesData)
    ? templatesData.map(adaptApiTemplate)
    : MOCK_TEMPLATES;

  const sendMessageApi = useSendMessage();

  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK_TEMPLATES.map((t) => [t.k, t.on]))
  );
  const [selClient, setSelClient] = useState(CLIENTS[0].id);
  const [selTpl, setSelTpl] = useState(templates[0]?.k ?? MOCK_TEMPLATES[0].k);

  const activeCount = Object.values(toggles).filter(Boolean).length;

  const handleToggle = (k: string) => {
    setToggles((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handleSend = useCallback(() => {
    const tpl = templates.find((t) => t.k === selTpl);
    const client = CLIENTS.find((c) => c.id === selClient);
    if (!tpl || !client) return;

    const body = tpl.body
      .replace("{nombre}", client.name.split(" ")[0])
      .replace("{med}", client.meds[0] ?? "medicacion")
      .replace("{direccion}", client.dir)
      .replace("{medico}", "Dr. Suarez")
      .replace("{hora}", "10:30")
      .replace("{chofer}", "Marcelo");

    const clientNumericId = parseInt(selClient.replace(/\D/g, ""), 10);

    // Try API send if client has a numeric id
    if (!isNaN(clientNumericId)) {
      sendMessageApi.mutate({ client_id: clientNumericId, template_key: tpl.k, body });
    }

    // Always update local store for immediate UI feedback
    const id = _nextMsgId;
    const msg: SentMessage = {
      id,
      c: client.id,
      tpl: tpl.k,
      body,
      ts: Date.now(),
      st: "enviado",
    };

    addMessage(msg);

    // Mark as read after 2.2s
    setTimeout(() => {
      markRead(id);
    }, 2200);
  }, [selClient, selTpl, templates, addMessage, markRead, _nextMsgId, sendMessageApi]);

  return (
    <div className="sc-scroll flex-1 overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-bold tracking-wider" style={{ color: COLORS.sub }}>
          CAMPANAS AUTOMATICAS
        </p>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ background: `${COLORS.aqua}22`, color: COLORS.aqua }}
        >
          {activeCount} activas
        </span>
      </div>

      {templates.map((tpl) => (
        <TemplateCard
          key={tpl.k}
          tpl={tpl}
          toggled={toggles[tpl.k] ?? tpl.on}
          onToggle={() => handleToggle(tpl.k)}
        />
      ))}

      {/* Enviar ahora */}
      <div className="sc-card rounded-xl p-4 mt-4" style={{ background: COLORS.panel2 }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} style={{ color: COLORS.amber }} />
          <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
            Enviar ahora
          </span>
        </div>

        {/* Client select */}
        <div className="relative mb-2">
          <select
            className="w-full appearance-none px-3 py-2 rounded-lg text-sm pr-8"
            style={{ background: COLORS.panel, color: COLORS.ink, border: `1px solid ${COLORS.line}` }}
            value={selClient}
            onChange={(e) => setSelClient(e.target.value)}
          >
            {CLIENTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: COLORS.sub }}
          />
        </div>

        {/* Template select */}
        <div className="relative mb-3">
          <select
            className="w-full appearance-none px-3 py-2 rounded-lg text-sm pr-8"
            style={{ background: COLORS.panel, color: COLORS.ink, border: `1px solid ${COLORS.line}` }}
            value={selTpl}
            onChange={(e) => setSelTpl(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.k} value={t.k}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: COLORS.sub }}
          />
        </div>

        <button
          className="sc-btn w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{
            background: `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.blue})`,
            color: "#fff",
          }}
          onClick={handleSend}
        >
          <Send size={14} /> Enviar por WhatsApp
        </button>
      </div>
    </div>
  );
}

/* ── Message log panel ──────────────────────────────────────── */

function MessageLogPanel() {
  const storeMessages = useAppStore((s) => s.messages);

  // API templates for display names
  const { data: templatesData } = useTemplates();
  const templates: MessageTemplate[] = templatesData?.items
    ? templatesData.items.map(adaptApiTemplate)
    : templatesData && Array.isArray(templatesData)
    ? templatesData.map(adaptApiTemplate)
    : MOCK_TEMPLATES;

  // API messages with store fallback
  const { data: apiMessagesData } = useMessages();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiMessages: SentMessage[] = apiMessagesData?.items
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (apiMessagesData.items as any[]).map((raw: any) => ({
        id: raw.id,
        c: String(raw.client_id ?? raw.c ?? ""),
        tpl: raw.template_key ?? raw.tpl ?? "",
        body: raw.body ?? "",
        ts: raw.sent_at ? new Date(raw.sent_at).getTime() : raw.ts ?? Date.now(),
        st: (raw.status === "read" || raw.st === "leido" ? "leido" : "enviado") as "enviado" | "leido",
      }))
    : [];

  // Merge: API messages take precedence; fall back to store if API is empty
  const messages = apiMessages.length > 0 ? apiMessages : storeMessages;

  return (
    <div className="sc-scroll flex-1 overflow-y-auto p-4" style={{ background: COLORS.bg }}>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>
          Mensajes enviados
        </p>
        <span className="text-xs" style={{ color: COLORS.sub }}>
          · integracion WhatsApp Business
        </span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ background: `${COLORS.aqua}22`, color: COLORS.aqua }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: COLORS.aqua }}
          />
          API conectada
        </span>
      </div>

      <div className="space-y-1">
        {messages
          .slice()
          .sort((a, b) => b.ts - a.ts)
          .map((msg) => (
            <MessageBubble key={msg.id} msg={msg} templates={templates} />
          ))}
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function MensajeriaView() {
  const isMobile = useAppStore((s) => s.isMobile);
  const [tab, setTab] = useState<"campanas" | "mensajes">("campanas");

  if (isMobile) {
    return (
      <div className="flex flex-col h-full" style={{ background: COLORS.panel }}>
        <TabSwitcher tab={tab} setTab={setTab} />
        {tab === "campanas" ? <CampaignsPanel /> : <MessageLogPanel />}
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: COLORS.bg }}>
      {/* Left panel */}
      <div
        className="flex flex-col border-r overflow-hidden"
        style={{
          width: 360,
          minWidth: 360,
          borderColor: COLORS.line,
          background: COLORS.panel,
        }}
      >
        <CampaignsPanel />
      </div>

      {/* Right panel */}
      <MessageLogPanel />
    </div>
  );
}
