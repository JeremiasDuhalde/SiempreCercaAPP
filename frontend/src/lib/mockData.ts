import { COLORS } from "./constants";
import type { Client, AgendaItem, MessageTemplate, SentMessage, WellbeingData } from "./types";

export const CLIENTS: Client[] = [
  {
    id: "c1", name: "Olga Fernández", age: 82, barrio: "Santa Teresita",
    dir: "Calle 4 N° 1832", entre: "e/ Av. 32 y Calle 33",
    gx: 0.3, gy: 0.34, color: COLORS.coral,
    device: "Reloj GEO-W3", bat: 74, sig: 4,
    cond: ["Hipertensión", "Artrosis"],
    meds: ["Losartán 50mg 08:00", "Enalapril 20:00"],
    contacts: [
      { ord: 1, n: "Mariela Fernández", rel: "Hija (vive a 3 cuadras)", p: "+54 9 2246 50-1042", acceso: true },
      { ord: 2, n: "Norma Díaz", rel: "Vecina de al lado", p: "+54 9 2246 51-3320", acceso: true },
      { ord: 3, n: "Dr. Suárez", rel: "Médico de cabecera", p: "+54 9 2246 48-7781", acceso: false },
    ],
    hr: 78, spo2: 97,
  },
  {
    id: "c2", name: "Héctor Domínguez", age: 79, barrio: "Mar del Tuyú",
    dir: "Calle 79 N° 245", entre: "e/ Calle 2 y Calle 3",
    gx: 0.58, gy: 0.46, color: COLORS.aqua,
    device: "Colgante GEO-P1", bat: 38, sig: 3,
    cond: ["EPOC", "Diabetes II"],
    meds: ["Metformina 850 08:00 / 20:00", "Salbutamol s/n"],
    contacts: [
      { ord: 1, n: "Raúl Domínguez", rel: "Hijo", p: "+54 9 2246 50-3390", acceso: true },
      { ord: 2, n: "Sala de 1° Auxilios", rel: "Emergencia · Mar del Tuyú", p: "2246 42-0140", acceso: false },
    ],
    hr: 84, spo2: 94,
  },
  {
    id: "c3", name: "Rosa Pereyra", age: 88, barrio: "Santa Teresita",
    dir: "Av. 32 N° 1455", entre: "e/ Calle 14 y Calle 15",
    gx: 0.46, gy: 0.55, color: COLORS.violet,
    device: "Reloj GEO-W3", bat: 91, sig: 4,
    cond: ["Insuf. cardíaca", "Glaucoma"],
    meds: ["Furosemida 08:00", "Atorvastatina 22:00"],
    contacts: [
      { ord: 1, n: "Ana Pereyra", rel: "Sobrina", p: "+54 9 2246 52-8820", acceso: true },
      { ord: 2, n: "Encargada del edificio", rel: "Portera (tiene llave)", p: "+54 9 2246 53-1190", acceso: true },
      { ord: 3, n: "SAME", rel: "Emergencia", p: "107", acceso: false },
    ],
    hr: 72, spo2: 96,
  },
  {
    id: "c4", name: "Antonio Gómez", age: 84, barrio: "Las Toninas",
    dir: "Calle 11 N° 380", entre: "e/ Av. 9 y Calle 10",
    gx: 0.7, gy: 0.3, color: COLORS.gold,
    device: "Reloj GEO-W3", bat: 62, sig: 2,
    cond: ["Parkinson"],
    meds: ["Levodopa 06:00 / 12:00 / 18:00"],
    contacts: [
      { ord: 1, n: "Liliana Ojeda", rel: "Cuidadora (turno día)", p: "+54 9 2246 50-2204", acceso: true },
      { ord: 2, n: "Sergio Gómez", rel: "Hijo (vive en La Plata)", p: "+54 9 221 55-7781", acceso: false },
      { ord: 3, n: "Neurología – CIC", rel: "Médico", p: "2246 43-2210", acceso: false },
    ],
    hr: 69, spo2: 97,
  },
  {
    id: "c5", name: "Nélida Sosa", age: 77, barrio: "Mar del Tuyú",
    dir: "Calle 3 N° 560", entre: "e/ Calle 68 y Calle 69",
    gx: 0.24, gy: 0.68, color: COLORS.blue,
    device: "Colgante GEO-P1", bat: 55, sig: 4,
    cond: ["Demencia leve"],
    meds: ["Donepecilo 21:00"],
    contacts: [
      { ord: 1, n: "Jorge Sosa", rel: "Hijo", p: "+54 9 2246 50-6611", acceso: true },
      { ord: 2, n: "Marta Vega", rel: "Vecina (tiene llave)", p: "+54 9 2246 51-7744", acceso: true },
      { ord: 3, n: "Policía local", rel: "Emergencia", p: "101", acceso: false },
    ],
    hr: 81, spo2: 98, geofence: true,
  },
  {
    id: "c6", name: "Raúl Iglesias", age: 81, barrio: "Santa Teresita",
    dir: "Calle 38 N° 2140", entre: "e/ Calle 1 y Av. Costanera",
    gx: 0.52, gy: 0.22, color: COLORS.amber,
    device: "Reloj GEO-W3", bat: 88, sig: 3,
    cond: ["Post-ACV", "Hipertensión"],
    meds: ["Aspirina 08:00", "Amlodipina 20:00"],
    contacts: [
      { ord: 1, n: "Silvia Iglesias", rel: "Esposa (convive)", p: "+54 9 2246 50-9034", acceso: true },
      { ord: 2, n: "Hospital Municipal", rel: "Emergencia", p: "2246 42-0107", acceso: false },
    ],
    hr: 76, spo2: 95,
  },
  {
    id: "c7", name: "Marta Quiroga", age: 90, barrio: "Las Toninas",
    dir: "Av. 1 N° 290", entre: "e/ Calle 9 y Calle 10",
    gx: 0.8, gy: 0.58, color: COLORS.aqua,
    device: "Reloj GEO-W3", bat: 43, sig: 4,
    cond: ["Osteoporosis"],
    meds: ["Calcio + Vit D 09:00"],
    contacts: [
      { ord: 1, n: "Pablo Quiroga", rel: "Nieto", p: "+54 9 2246 52-4471", acceso: true },
      { ord: 2, n: "Carlos Méndez", rel: "Vecino (tiene llave)", p: "+54 9 2246 53-2090", acceso: true },
    ],
    hr: 74, spo2: 97,
  },
  {
    id: "c8", name: "Carmen Ruiz", age: 86, barrio: "Mar del Tuyú",
    dir: "Calle 80 N° 410", entre: "e/ Calle 3 y Calle 4",
    gx: 0.4, gy: 0.8, color: COLORS.coral,
    device: "Colgante GEO-P1", bat: 67, sig: 3,
    cond: ["Hipotiroidismo", "Caídas previas"],
    meds: ["Levotiroxina 07:00"],
    contacts: [
      { ord: 1, n: "Elena Ruiz", rel: "Hija", p: "+54 9 2246 50-1199", acceso: true },
      { ord: 2, n: "Portera del edificio", rel: "Encargada (tiene llave)", p: "+54 9 2246 51-8865", acceso: true },
      { ord: 3, n: "Bomberos Voluntarios", rel: "Emergencia", p: "2246 42-0100", acceso: false },
    ],
    hr: 80, spo2: 96,
  },
];

export const AGENDA_ITEMS: AgendaItem[] = [
  { time: "08:00", type: "med", client: "c1", detail: "Losartán 50mg — recordatorio enviado" },
  { time: "09:30", type: "remis", client: "c7", detail: "Remis a control oftalmológico · Chofer Marcelo" },
  { time: "10:30", type: "turno", client: "c2", detail: "Dr. Suárez · Hospital Privado de Comunidad" },
  { time: "12:00", type: "med", client: "c4", detail: "Levodopa — dosis del mediodía" },
  { time: "15:00", type: "remis", client: "c4", detail: "Remis a kinesiología · ida y vuelta" },
  { time: "16:30", type: "turno", client: "c3", detail: "Cardiología · control trimestral" },
  { time: "20:00", type: "med", client: "c1", detail: "Enalapril — recordatorio nocturno" },
  { time: "21:00", type: "noche", client: "all", detail: "Saludo de buenas noches · todos los clientes" },
];

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  { k: "buendia", icon: "Sun", color: COLORS.gold, name: "Buen día", on: true, body: "¡Buen día, {nombre}! ☀️ Que tengas un lindo día. ¿Cómo amaneciste hoy?" },
  { k: "med", icon: "Pill", color: COLORS.coral, name: "Recordatorio de medicación", on: true, body: "Hola {nombre}, es hora de tu medicación: {med}. Avisanos si necesitás algo 💊" },
  { k: "turno", icon: "Stethoscope", color: COLORS.blue, name: "Recordatorio de turno", on: true, body: "{nombre}, te recordamos tu turno con {medico} mañana a las {hora} 🩺" },
  { k: "remis", icon: "Navigation", color: COLORS.amber, name: "Confirmación de remis", on: true, body: "Tu remis para {hora} ya está confirmado. Chofer {chofer} te pasa a buscar por {direccion} 🚗" },
  { k: "noche", icon: "Moon", color: COLORS.violet, name: "Buenas noches", on: true, body: "Buenas noches {nombre} 🌙 Acordate de dejar el reloj cargando. ¡Descansá lindo!" },
  { k: "custom", icon: "MessageCircle", color: COLORS.aqua, name: "Mensaje personalizado", on: false, body: "Hola {nombre}, te escribimos desde Siempre Cerca..." },
];

export const INITIAL_MESSAGES: SentMessage[] = [
  { id: 1, c: "c1", tpl: "buendia", body: "¡Buen día, Olga! ☀️ Que tengas un lindo día. ¿Cómo amaneciste hoy?", ts: Date.now() - 3600000, st: "leido" },
  { id: 2, c: "c3", tpl: "med", body: "Hola Rosa, es hora de tu medicación: Furosemida 08:00. Avisanos si necesitás algo 💊", ts: Date.now() - 3200000, st: "leido" },
  { id: 3, c: "c4", tpl: "turno", body: "Antonio, te recordamos tu turno con Neurología – CIC mañana a las 10:30 🩺", ts: Date.now() - 2800000, st: "leido" },
  { id: 4, c: "c7", tpl: "remis", body: "Tu remis para 09:30 ya está confirmado. Chofer Marcelo te pasa a buscar por Av. 1 N° 290 🚗", ts: Date.now() - 1800000, st: "enviado" },
];

export const WELLBEING_DATA: Record<string, WellbeingData> = {
  c1: {
    flag: true, sev: COLORS.coral, score: 68,
    prevent: "Sueño alterado 3 noches seguidas + ánimo bajo → sugerir control clínico",
    sleep: { base: 7.2, today: 5.1 },
    steps: { base: 2800, today: 1600 },
    rhr: { base: 74, today: 83 },
    mood: "Bajo",
    tags: ["Sueño alterado", "Ánimo bajo", "Respuesta lenta"],
    voice: "Tono más apagado y pausas largas respecto de su base habitual.",
    talk: [
      { who: "bot", t: "¡Buen día, Olga! ¿Cómo amaneciste hoy?" },
      { who: "cli", t: "Más o menos m'hija, no dormí bien otra vez…" },
      { who: "bot", t: "Es la tercera nochecita que me contás eso. ¿Querés que avise a Mariela y le pidamos un turno al Dr. Suárez?" },
    ],
    family: "Olga durmió 5.1 h (su base son 7.2). Está más cansada y con el ánimo bajo. La IA sugiere control clínico. Mariela fue notificada.",
  },
  c3: {
    flag: true, sev: COLORS.amber, score: 74,
    prevent: "Frecuencia cardíaca elevada 3 días + menor actividad → monitorear",
    sleep: { base: 6.8, today: 6.2 },
    steps: { base: 1800, today: 900 },
    rhr: { base: 72, today: 81 },
    mood: "Regular",
    tags: ["FC elevada", "Baja actividad"],
    voice: "Sin cambios significativos.",
    talk: [
      { who: "bot", t: "¡Buen día, Rosa! ¿Cómo estás hoy?" },
      { who: "cli", t: "Bien, un poco agitada nomás cuando subo la escalera." },
      { who: "bot", t: "Noto que tu corazón viene latiendo un poquito más rápido estos días. ¿Querés que le avise a Ana?" },
    ],
    family: "Rosa está estable pero con frecuencia cardíaca algo elevada (81 vs base 72). Se mueve menos. Sin alarma pero en seguimiento.",
  },
  c5: {
    flag: true, sev: COLORS.violet, score: 71,
    prevent: "Patrón de desorientación horaria + salida de geocerca reciente",
    sleep: { base: 7.5, today: 8.9 },
    steps: { base: 2200, today: 3100 },
    rhr: { base: 78, today: 76 },
    mood: "Variable",
    tags: ["Desorientación", "Geocerca", "Sueño excesivo"],
    voice: "Algunas frases inconexas detectadas en la llamada matutina.",
    talk: [
      { who: "bot", t: "¡Hola Nélida! ¿Dormiste bien anoche?" },
      { who: "cli", t: "Sí, sí… ¿Pero vos quién sos?" },
      { who: "bot", t: "Soy Sofía, de Siempre Cerca. Te llamo todos los días. ¿Estás en tu casa?" },
    ],
    family: "Nélida tuvo un episodio de desorientación en la llamada. Durmió más de lo habitual. Caminó más (posible vagabundeo). Jorge fue notificado.",
  },
};
