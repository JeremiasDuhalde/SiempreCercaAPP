import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { AlertOctagon, X } from "lucide-react";

interface Props {
  onDismiss: () => void;
}

/**
 * Overlay de pantalla completa que se muestra cuando el canal de WhatsApp
 * esta bloqueado. No bloquea el sistema — solo informa al operador.
 * Al cerrar queda un banner rojo persistente en la parte superior.
 */
export default function BanOverlay({ onDismiss }: Props) {
  const [closing, setClosing] = useState(false);

  function handleDismiss() {
    setClosing(true);
    setTimeout(onDismiss, 150);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: closing ? 0 : 1,
        transition: "opacity 0.15s ease",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.panel,
          border: `1px solid ${COLORS.coral}`,
          borderRadius: 12,
          padding: "28px 32px",
          maxWidth: 460,
          width: "calc(100% - 32px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "color-mix(in srgb, var(--sc-coral) 15%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertOctagon size={22} style={{ color: COLORS.coral }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, marginBottom: 4 }}>
              Canal de WhatsApp bloqueado
            </div>
            <div style={{ fontSize: 13, color: COLORS.sub, lineHeight: 1.5 }}>
              El servicio de mensajeria fue suspendido por la plataforma.
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 1, backgroundColor: COLORS.line, margin: "0 0 16px" }} />

        {/* Details */}
        <div style={{ fontSize: 13, color: COLORS.ink, lineHeight: 1.6, marginBottom: 8 }}>
          <strong style={{ color: COLORS.coral }}>Contactar soporte:</strong>{" "}
          <a
            href="tel:+5492234973299"
            style={{ color: COLORS.aqua, textDecoration: "none", fontWeight: 600 }}
          >
            +54 9 2234 97-3299
          </a>
        </div>

        <div
          style={{
            fontSize: 12,
            color: COLORS.sub,
            backgroundColor: COLORS.panel2,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 8,
            padding: "10px 12px",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          El sistema de monitoreo sigue funcionando. Las alertas se reciben y registran
          normalmente, pero <strong>las notificaciones por WhatsApp no se envian</strong> mientras
          el canal este bloqueado.
        </div>

        {/* Action */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleDismiss}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 7,
              border: "none",
              backgroundColor: COLORS.coral,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <X size={14} />
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
