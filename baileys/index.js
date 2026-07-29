/**
 * Microservicio Baileys para SiempreCerca
 *
 * Primer arranque: imprime QR en la consola y lo sirve via web.
 * Escanear con el telefono que tiene la linea de monitoreo.
 * La sesion queda guardada en /data/auth y se reutiliza en reinicios.
 *
 * Endpoints:
 *   GET  /status  → { connected: bool, banned: bool }
 *   GET  /qr      → Pagina web con QR en tiempo real
 *   GET  /qr.png  → QR como imagen PNG
 *   POST /send    → { to: "5492257653843", body: "Hola" } → { ok: bool, provider: "baileys" }
 */

import express from "express";
const baileys = await import("@whiskeysockets/baileys");
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
import pino from "pino";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";

const AUTH_DIR = "/data/auth";
const PORT = 3001;
const RECONNECT_DELAY = 5_000;
const MAX_RECONNECT_ATTEMPTS = 10;

const logger = pino({ level: "warn" });
const app = express();
app.use(express.json());

let sock = null;
let isConnected = false;
let isBanned = false;
let reconnectAttempts = 0;
let currentQR = null;

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
    printQRInTerminal: false,
    keepAliveIntervalMs: 30_000,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR = qr;
      console.log("=== Escanea este QR con el telefono de la eSIM ===");
      qrcode.generate(qr, { small: true });
      console.log("QR tambien disponible en: GET /qr");
    }

    if (connection === "open") {
      isConnected = true;
      currentQR = null;
      reconnectAttempts = 0;
      console.log("Baileys: conectado a WhatsApp");
    }

    if (connection === "close") {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (statusCode === 401 || loggedOut) {
        isBanned = true;
        currentQR = null;
        console.error(
          "Baileys: cuenta bloqueada o sesion invalida (codigo %s).",
          statusCode
        );
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        currentQR = null;
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

app.get("/status", (_req, res) => {
  res.json({ connected: isConnected, banned: isBanned, hasQR: !!currentQR });
});

/** GET /qr.png — QR como imagen PNG */
app.get("/qr.png", async (_req, res) => {
  if (isConnected) {
    return res.status(200).send("Ya conectado, no se necesita QR.");
  }
  if (!currentQR) {
    return res.status(404).send("No hay QR disponible. Reinicia el servicio.");
  }
  try {
    const png = await QRCode.toBuffer(currentQR, { width: 400, margin: 2 });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");
    res.send(png);
  } catch (err) {
    res.status(500).send("Error generando QR");
  }
});

/** GET /qr — Pagina web con QR auto-refresh */
app.get("/qr", (_req, res) => {
  res.set("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SiempreCerca — Vincular WhatsApp</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, system-ui, sans-serif;
    background: #0D1717;
    color: #E8F0EF;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card {
    background: #152222;
    border: 1px solid #1F3333;
    border-radius: 20px;
    padding: 32px;
    max-width: 420px;
    width: 90%;
    text-align: center;
  }
  .logo { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .logo span { color: #5BB5B0; }
  .sub { color: #5A7574; font-size: 13px; margin-bottom: 24px; }
  #qr-container {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 16px;
    margin: 0 auto 20px;
    width: 280px;
    height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #qr-container img { width: 248px; height: 248px; }
  #status {
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 20px;
    display: inline-block;
    margin-bottom: 16px;
  }
  .status-waiting { background: #1A3A3A; color: #5BB5B0; }
  .status-connected { background: #1A3D2A; color: #4ADE80; }
  .status-error { background: #3D1A1A; color: #F87171; }
  .instructions {
    color: #5A7574;
    font-size: 13px;
    line-height: 1.6;
    text-align: left;
    padding: 16px;
    background: #1A2C2C;
    border-radius: 12px;
    border: 1px solid #1F3333;
  }
  .instructions strong { color: #8FA8A7; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .dot-green { background: #4ADE80; }
  .dot-yellow { background: #FBBF24; }
  .dot-red { background: #F87171; }
  .no-qr { color: #5A7574; font-size: 15px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">Siempre<span>Cerca</span></div>
  <div class="sub">Vincular WhatsApp</div>

  <div id="status" class="status-waiting">
    <span class="dot dot-yellow"></span> Cargando...
  </div>

  <div id="qr-container">
    <div class="no-qr">Cargando QR...</div>
  </div>

  <div class="instructions">
    <strong>Instrucciones:</strong><br>
    1. Abri <strong>WhatsApp</strong> en el celular<br>
    2. Toca <strong>Configuracion > Dispositivos vinculados</strong><br>
    3. Toca <strong>Vincular un dispositivo</strong><br>
    4. Escanea el QR de arriba
  </div>
</div>

<script>
  const qrContainer = document.getElementById("qr-container");
  const statusEl = document.getElementById("status");
  let lastQRSrc = "";

  async function poll() {
    try {
      const res = await fetch("/baileys/status");
      const data = await res.json();

      if (data.connected) {
        statusEl.className = "status-connected";
        statusEl.innerHTML = '<span class="dot dot-green"></span> Conectado';
        qrContainer.innerHTML = '<div class="no-qr" style="color:#4ADE80;">WhatsApp vinculado correctamente</div>';
        return;
      }

      if (data.banned) {
        statusEl.className = "status-error";
        statusEl.innerHTML = '<span class="dot dot-red"></span> Cuenta bloqueada';
        qrContainer.innerHTML = '<div class="no-qr">Contacta al administrador</div>';
        return;
      }

      if (data.hasQR) {
        statusEl.className = "status-waiting";
        statusEl.innerHTML = '<span class="dot dot-yellow"></span> Esperando escaneo...';
        const src = "/baileys/qr.png?t=" + Date.now();
        if (src !== lastQRSrc) {
          qrContainer.innerHTML = '<img src="' + src + '" alt="QR">';
          lastQRSrc = src;
        }
      } else {
        statusEl.className = "status-error";
        statusEl.innerHTML = '<span class="dot dot-red"></span> Sin QR disponible';
        qrContainer.innerHTML = '<div class="no-qr">Reinicia el servicio Baileys</div>';
      }
    } catch (e) {
      statusEl.className = "status-error";
      statusEl.innerHTML = '<span class="dot dot-red"></span> Error de conexion';
    }
  }

  poll();
  setInterval(poll, 3000);
</script>
</body>
</html>`);
});

app.post("/send", async (req, res) => {
  const { to, body } = req.body ?? {};

  if (!to || !body) {
    return res.status(400).json({ ok: false, error: "Se requieren los campos 'to' y 'body'" });
  }

  if (isBanned) {
    return res
      .status(403)
      .json({ ok: false, provider: "baileys", banned: true, error: "Canal de WhatsApp bloqueado" });
  }

  if (!isConnected || !sock) {
    return res
      .status(503)
      .json({ ok: false, provider: "baileys", error: "WhatsApp no conectado" });
  }

  try {
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
