/**
 * Microservicio Baileys para SiempreCerca
 *
 * Primer arranque: imprime QR en la consola. Escanear con el telefono
 * que tiene la eSIM de la linea de monitoreo.
 * La sesion queda guardada en /data/auth y se reutiliza en reinicios.
 *
 * Endpoints:
 *   GET  /status  → { connected: bool }
 *   POST /send    → { to: "5492257653843", body: "Hola" } → { ok: bool, provider: "baileys" }
 */

import express from "express";
const baileys = await import("@whiskeysockets/baileys");
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
import pino from "pino";
import qrcode from "qrcode-terminal";

const AUTH_DIR = "/data/auth";
const PORT = 3001;
// Tiempo de espera entre reconexiones (ms)
const RECONNECT_DELAY = 5_000;
// Maximo de intentos de reconexion antes de rendirse
const MAX_RECONNECT_ATTEMPTS = 10;

const logger = pino({ level: "warn" });
const app = express();
app.use(express.json());

let sock = null;
let isConnected = false;
let reconnectAttempts = 0;

// ────────────────────────────────────────────────────────────────────────────
// Conexion WhatsApp
// ────────────────────────────────────────────────────────────────────────────

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    // Reducir tracing para produccion
    printQRInTerminal: false,
    // Mantener conexion activa con heartbeat
    keepAliveIntervalMs: 30_000,
  });

  // Persiste las credenciales cada vez que cambian
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("=== Escanea este QR con el telefono de la eSIM ===");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      isConnected = true;
      reconnectAttempts = 0;
      console.log("Baileys: conectado a WhatsApp");
    }

    if (connection === "close") {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.error(
          "Baileys: sesion cerrada (logout). Elimina /data/auth y reinicia para vincular de nuevo."
        );
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(
          "Baileys: maximo de reconexiones alcanzado (%d). Reinicia el contenedor.",
          MAX_RECONNECT_ATTEMPTS
        );
        return;
      }

      reconnectAttempts++;
      console.log(
        "Baileys: desconectado (codigo %s). Reconectando en %ds... (intento %d/%d)",
        statusCode,
        RECONNECT_DELAY / 1000,
        reconnectAttempts,
        MAX_RECONNECT_ATTEMPTS
      );
      setTimeout(connectWhatsApp, RECONNECT_DELAY);
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// API REST
// ────────────────────────────────────────────────────────────────────────────

/** GET /status — health check del servicio */
app.get("/status", (_req, res) => {
  res.json({ connected: isConnected });
});

/**
 * POST /send
 * Body: { to: "5492257653843", body: "Mensaje de texto" }
 *
 * `to` puede venir con o sin +, espacios o guiones; se normaliza antes de enviar.
 */
app.post("/send", async (req, res) => {
  const { to, body } = req.body ?? {};

  if (!to || !body) {
    return res.status(400).json({ ok: false, error: "Se requieren los campos 'to' y 'body'" });
  }

  if (!isConnected || !sock) {
    return res
      .status(503)
      .json({ ok: false, provider: "baileys", error: "WhatsApp no conectado" });
  }

  try {
    // Normalizar numero: quitar +, espacios y guiones, agregar sufijo de WhatsApp
    const normalized = String(to).replace(/\+/g, "").replace(/[\s\-]/g, "");
    const jid = `${normalized}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: String(body) });

    console.log("Baileys: mensaje enviado a %s", normalized);
    res.json({ ok: true, provider: "baileys" });
  } catch (err) {
    console.error("Baileys: error al enviar mensaje:", err.message);
    res.status(500).json({ ok: false, provider: "baileys", error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Arranque
// ────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("Baileys API escuchando en puerto %d", PORT);
  connectWhatsApp().catch((err) => {
    console.error("Error al iniciar conexion WhatsApp:", err);
  });
});
