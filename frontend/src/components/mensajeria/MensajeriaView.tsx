import { useState, useCallback, useRef, useEffect } from "react";
import { COLORS } from "@/lib/constants";
import { useAppStore } from "@/stores/useAppStore";
import { formatTime } from "@/lib/utils";
import { useTemplates, useMessages, useSendMessage } from "@/hooks/useMessages";
import { useClients } from "@/hooks/useClients";
import {
  Send,
  Check,
  CheckCheck,
  MessageCircle,
  Phone,
  Search,
  Wifi,
  WifiOff,
  User,
} from "lucide-react";
import type { MessageTemplate, SentMessage } from "@/lib/types";

/* ── WhatsApp-style colors ────────────────────────────────────── */

const WA = {
  green: "#25D366",
  greenDark: "#128C7E",
  greenLight: "#DCF8C6",
  tealDark: "#075E54",
  tealHeader: "#0b7a6c",
  chatBg: "#0b141a",
  chatBgLight: "#e5ddd5",
  outgoing: "#005c4b",
  outgoingLight: "#d9fdd3",
  incoming: "#1f2c34",
  incomingLight: "#ffffff",
  sidebarBg: "#111b21",
  sidebarBgLight: "#f0f2f5",
  headerBg: "#202c33",
  headerBgLight: "#008069",
  inputBg: "#2a3942",
  inputBgLight: "#f0f2f5",
  textPrimary: "#e9edef",
  textSecondary: "#8696a0",
  textLight: "#111b21",
  divider: "#222d34",
  dividerLight: "#e9edef",
  timestamp: "#8696a0",
  checkBlue: "#53bdeb",
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
    body: raw.body_template ?? raw.body ?? raw.template ?? "",
  };
}

/* ── WhatsApp status hook ────────────────────────────────────── */

function useWhatsAppStatus() {
  const [status, setStatus] = useState<{
    connected: boolean;
    banned: boolean;
  }>({ connected: false, banned: false });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/config/whatsapp-status");
        const data = await res.json();
        setStatus({ connected: data.connected, banned: data.banned ?? false });
      } catch {
        setStatus({ connected: false, banned: false });
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return status;
}

/* ── Contact list (left sidebar) ──────────────────────────────── */

function ContactList({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const { data } = useClients();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients: any[] = data?.items ?? [];
  const [search, setSearch] = useState("");
  const waStatus = useWhatsAppStatus();

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: WA.headerBg }}
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={20} color={WA.textSecondary} />
          <span
            className="text-base font-semibold"
            style={{ color: WA.textPrimary }}
          >
            Chats
          </span>
        </div>
        <div className="flex items-center gap-2">
          {waStatus.connected ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#0d3025" }}>
              <Wifi size={12} color={WA.green} />
              <span className="text-[10px] font-medium" style={{ color: WA.green }}>
                Conectado
              </span>
            </div>
          ) : waStatus.banned ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#3d1a1a" }}>
              <WifiOff size={12} color="#f87171" />
              <span className="text-[10px] font-medium" style={{ color: "#f87171" }}>
                Bloqueado
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#3d351a" }}>
              <WifiOff size={12} color="#fbbf24" />
              <span className="text-[10px] font-medium" style={{ color: "#fbbf24" }}>
                Desconectado
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2" style={{ background: WA.sidebarBg }}>
        <div
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
          style={{ background: WA.inputBg }}
        >
          <Search size={15} color={WA.textSecondary} />
          <input
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: WA.textPrimary }}
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Client list */}
      <div className="flex-1 overflow-y-auto" style={{ background: WA.sidebarBg }}>
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <User size={32} color={WA.textSecondary} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: WA.textSecondary }}>
              {clients.length === 0 ? "Sin pacientes" : "Sin resultados"}
            </p>
          </div>
        ) : (
          filtered.map((client) => (
            <button
              key={client.id}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
              style={{
                background: selectedId === client.id ? "#2a3942" : "transparent",
                borderBottom: `1px solid ${WA.divider}`,
              }}
              onClick={() => onSelect(client.id)}
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: client.color || WA.tealDark }}
              >
                {client.name?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[15px] font-medium truncate"
                    style={{ color: WA.textPrimary }}
                  >
                    {client.name}
                  </span>
                </div>
                <p
                  className="text-sm truncate"
                  style={{ color: WA.textSecondary }}
                >
                  {client.phone ?? "Sin telefono"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Chat view (right panel) ──────────────────────────────────── */

function ChatView({ clientId }: { clientId: number | null }) {
  const { data: clientsData } = useClients();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients: any[] = clientsData?.items ?? [];
  const client = clients.find((c) => c.id === clientId);

  const { data: templatesData } = useTemplates();
  const templates: MessageTemplate[] = Array.isArray(templatesData)
    ? templatesData.map(adaptApiTemplate)
    : templatesData?.items
    ? templatesData.items.map(adaptApiTemplate)
    : [];

  const { data: apiMessagesData, refetch: refetchMessages } = useMessages(clientId ?? undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: SentMessage[] = apiMessagesData?.items
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (apiMessagesData.items as any[]).map((raw: any) => ({
        id: raw.id,
        c: String(raw.client_id ?? raw.c ?? ""),
        tpl: raw.template_key ?? raw.tpl ?? "",
        body: raw.body ?? "",
        ts: raw.sent_at ? new Date(raw.sent_at).getTime() : raw.ts ?? Date.now(),
        st: (raw.status === "read" || raw.st === "leido" ? "leido" : "enviado") as
          | "enviado"
          | "leido",
      }))
    : apiMessagesData && Array.isArray(apiMessagesData)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (apiMessagesData as any[]).map((raw: any) => ({
        id: raw.id,
        c: String(raw.client_id ?? ""),
        tpl: raw.template_key ?? "",
        body: raw.body ?? "",
        ts: raw.sent_at ? new Date(raw.sent_at).getTime() : Date.now(),
        st: "enviado" as const,
      }))
    : [];

  const sendMessageApi = useSendMessage();
  const [selTpl, setSelTpl] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<SentMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMessages([]);
    setCustomMsg("");
    setSelTpl("");
  }, [clientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, localMessages]);

  const allMessages = [...messages, ...localMessages].sort((a, b) => a.ts - b.ts);

  const handleSend = useCallback(() => {
    if (!client || !clientId) return;

    let body = customMsg.trim();

    if (selTpl && !body) {
      const tpl = templates.find((t) => t.k === selTpl);
      if (tpl) {
        body = tpl.body
          .replace(/\{nombre\}/g, client.name?.split(" ")[0] ?? "")
          .replace(/\{med\}/g, "medicacion")
          .replace(/\{direccion\}/g, client.barrio ?? "")
          .replace(/\{medico\}/g, "Dr. Suarez")
          .replace(/\{hora\}/g, "10:30")
          .replace(/\{chofer\}/g, "Marcelo");
      }
    }

    if (!body) return;

    setSending(true);

    const localMsg: SentMessage = {
      id: Date.now(),
      c: String(clientId),
      tpl: selTpl || "custom",
      body,
      ts: Date.now(),
      st: "enviado",
    };
    setLocalMessages((prev) => [...prev, localMsg]);
    setCustomMsg("");
    setSelTpl("");

    sendMessageApi.mutate(
      { client_id: clientId, template_key: selTpl || undefined, body },
      {
        onSuccess: () => {
          setSending(false);
          setTimeout(() => {
            setLocalMessages((prev) =>
              prev.map((m) => (m.id === localMsg.id ? { ...m, st: "leido" as const } : m))
            );
            refetchMessages();
          }, 2000);
        },
        onError: () => {
          setSending(false);
        },
      }
    );
  }, [client, clientId, customMsg, selTpl, templates, sendMessageApi, refetchMessages]);

  // Empty state
  if (!clientId || !client) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ background: WA.chatBg }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ background: WA.headerBg }}
        >
          <MessageCircle size={36} color={WA.textSecondary} />
        </div>
        <p className="text-lg font-light mb-1" style={{ color: WA.textPrimary }}>
          SiempreCerca WhatsApp
        </p>
        <p className="text-sm" style={{ color: WA.textSecondary }}>
          Selecciona un paciente para enviar mensajes
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: WA.chatBg }}>
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ background: WA.headerBg }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{ background: client.color || WA.tealDark }}
        >
          {client.name?.[0] ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium truncate" style={{ color: WA.textPrimary }}>
            {client.name}
          </p>
          <p className="text-xs" style={{ color: WA.textSecondary }}>
            {client.phone ?? "Sin telefono"}
          </p>
        </div>
        <Phone size={18} color={WA.textSecondary} />
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='20' cy='20' r='1' fill='%2315202b' /%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='%230b141a' /%3E%3Crect width='200' height='200' fill='url(%23p)' /%3E%3C/svg%3E")`,
        }}
      >
        {allMessages.length === 0 && (
          <div className="text-center py-12">
            <div
              className="inline-block px-4 py-2 rounded-lg text-sm"
              style={{ background: WA.incoming, color: WA.textSecondary }}
            >
              No hay mensajes. Envia el primero.
            </div>
          </div>
        )}

        {allMessages.map((msg) => {
          const ts = new Date(msg.ts);
          const tpl = templates.find((t) => t.k === msg.tpl);
          return (
            <div key={msg.id} className="flex justify-end mb-1.5">
              <div
                className="max-w-[75%] px-2.5 py-1.5 rounded-lg relative"
                style={{
                  background: WA.outgoing,
                  borderTopRightRadius: "2px",
                }}
              >
                {tpl && (
                  <p className="text-[11px] font-medium mb-0.5" style={{ color: WA.green }}>
                    {tpl.name}
                  </p>
                )}
                <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap" style={{ color: WA.textPrimary }}>
                  {msg.body}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                  <span className="text-[11px]" style={{ color: WA.timestamp }}>
                    {formatTime(ts)}
                  </span>
                  {msg.st === "leido" ? (
                    <CheckCheck size={16} color={WA.checkBlue} />
                  ) : (
                    <Check size={16} color={WA.timestamp} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Template selector */}
      {templates.length > 0 && (
        <div
          className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0"
          style={{ background: WA.headerBg, borderTop: `1px solid ${WA.divider}` }}
        >
          {templates.map((tpl) => (
            <button
              key={tpl.k}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0"
              style={{
                background: selTpl === tpl.k ? WA.greenDark : WA.inputBg,
                color: selTpl === tpl.k ? "#fff" : WA.textSecondary,
                border: `1px solid ${selTpl === tpl.k ? WA.greenDark : WA.divider}`,
              }}
              onClick={() => setSelTpl(selTpl === tpl.k ? "" : tpl.k)}
            >
              {tpl.name}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className="flex items-end gap-2 px-3 py-2.5 shrink-0"
        style={{ background: WA.headerBg }}
      >
        <div
          className="flex-1 flex items-end rounded-xl px-3 py-2 min-h-[42px]"
          style={{ background: WA.inputBg }}
        >
          <textarea
            className="flex-1 bg-transparent outline-none text-sm resize-none max-h-[100px]"
            style={{ color: WA.textPrimary }}
            rows={1}
            placeholder={
              selTpl
                ? `Enviar template: ${templates.find((t) => t.k === selTpl)?.name ?? selTpl}`
                : "Escribe un mensaje..."
            }
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>
        <button
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: WA.greenDark,
            opacity: sending ? 0.5 : 1,
          }}
          onClick={handleSend}
          disabled={sending}
        >
          <Send size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export default function MensajeriaView() {
  const isMobile = useAppStore((s) => s.isMobile);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  if (isMobile) {
    if (selectedClient) {
      return (
        <div className="flex flex-col h-full">
          <button
            className="px-4 py-2 text-left text-sm font-medium"
            style={{ background: WA.headerBg, color: WA.textPrimary }}
            onClick={() => setSelectedClient(null)}
          >
            ← Volver
          </button>
          <ChatView clientId={selectedClient} />
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full">
        <ContactList selectedId={selectedClient} onSelect={setSelectedClient} />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className="flex flex-col border-r overflow-hidden"
        style={{
          width: 350,
          minWidth: 350,
          borderColor: WA.divider,
          background: WA.sidebarBg,
        }}
      >
        <ContactList selectedId={selectedClient} onSelect={setSelectedClient} />
      </div>

      {/* Chat */}
      <ChatView clientId={selectedClient} />
    </div>
  );
}
