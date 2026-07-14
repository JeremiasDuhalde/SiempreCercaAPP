import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useAlertSound } from "@/hooks/useAlertSound";
import { ALERT_TYPES } from "@/lib/constants";

const WS_RECONNECT_MS = 3000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const { playAlert } = useAlertSound();

  useEffect(() => {
    // Request notification permission on connect
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    function connect() {
      // En producción: ws va por el mismo host (nginx proxea /ws al backend)
      // En dev con Vite: va directo al backend en 8300
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = import.meta.env.DEV ? "8300" : "80";
      const token = localStorage.getItem("sc_token") || "";
      const url = `${proto}//${host}:${port}/ws?token=${token}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Conectado a", url);
        useAppStore.getState().addLog("WebSocket conectado al servidor");
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          console.log("[WS] Mensaje:", msg);

          if (msg.type === "alert_new") {
            const d = msg.data;
            const alertType = (d.type || "sos") as keyof typeof ALERT_TYPES;
            const priority = ALERT_TYPES[alertType]?.priority ?? 1;

            // Pushear alerta real al store
            useAppStore.getState().pushRealAlert({
              id: d.id || `ws-${Date.now()}`,
              clientId: d.client?.id || "unknown",
              type: alertType,
              ts: d.ts || Date.now(),
              status: "nueva",
              // Datos extra de FLIC
              latitude: d.latitude,
              longitude: d.longitude,
              buttonSerial: d.button_serial,
              clientName: d.client_name,
              source: d.source,
            });

            useAppStore
              .getState()
              .addLog(
                `ALERTA ${alertType.toUpperCase()} — ${d.client_name || d.button_serial || "desconocido"}`
              );

            // Sonido de alerta
            playAlert(priority);

            // Notificación del navegador para prioridad >= 3
            if (
              priority >= 3 &&
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            ) {
              const alertLabel = ALERT_TYPES[alertType]?.label ?? alertType.toUpperCase();
              const clientLabel = d.client_name || d.button_serial || "cliente desconocido";
              try {
                new Notification(`Siempre Cerca — ${alertLabel}`, {
                  body: clientLabel,
                  icon: "/favicon.ico",
                  tag: `alert-${d.id || Date.now()}`,
                });
              } catch {
                // Notification puede no estar disponible en todos los contextos
              }
            }
          }
        } catch (err) {
          console.warn("[WS] Error parseando mensaje:", err);
        }
      };

      ws.onclose = () => {
        console.log("[WS] Desconectado, reintentando en", WS_RECONNECT_MS, "ms");
        reconnectTimer.current = setTimeout(connect, WS_RECONNECT_MS);
      };

      ws.onerror = (err) => {
        console.warn("[WS] Error:", err);
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [playAlert]);
}
