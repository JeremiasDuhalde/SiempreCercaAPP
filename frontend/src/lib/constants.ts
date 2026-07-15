export const COLORS = {
  bg: "#15131C",
  panel: "#1E1B29",
  panel2: "#262232",
  line: "#352F45",
  ink: "#F3EFE9",
  sub: "#9A93AD",
  faint: "#6A6480",
  coral: "#FF5A5F",
  coralDeep: "#D43F45",
  amber: "#F7A23B",
  gold: "#E7B45A",
  aqua: "#37C8A0",
  violet: "#9B7BE8",
  blue: "#5AA9FF",
} as const;

export const ALERT_TYPES = {
  sos: {
    label: "SOS — Botón de pánico",
    color: "coral",
    hex: COLORS.coral,
    priority: 3,
    icon: "Siren",
    suggestion:
      "Llamá al cliente por el reloj. Sin respuesta en 30s → despachá móvil y avisá al contacto primario.",
  },
  caida: {
    label: "Caída detectada",
    color: "amber",
    hex: COLORS.amber,
    priority: 3,
    icon: "TriangleAlert",
    suggestion:
      "El acelerómetro detectó impacto + inmovilidad. Confirmá conciencia por voz antes de despachar.",
  },
  geo: {
    label: "Salió de la geocerca",
    color: "blue",
    hex: COLORS.blue,
    priority: 2,
    icon: "MapPinOff",
    suggestion:
      "Posible desorientación. Llamá para ubicar y guiá el regreso. Avisá al familiar.",
  },
  bateria: {
    label: "Batería baja",
    color: "gold",
    hex: COLORS.gold,
    priority: 1,
    icon: "BatteryLow",
    suggestion:
      "Recordale al cliente poner el reloj a cargar. Si no carga en 2h, reprogramá llamada.",
  },
  inactiv: {
    label: "Inactividad prolongada",
    color: "violet",
    hex: COLORS.violet,
    priority: 2,
    icon: "Footprints",
    suggestion:
      "Sin movimiento hace varias horas. Llamada de verificación de bienestar.",
  },
  compania: {
    label: "Pedido de compañía",
    color: "aqua",
    hex: COLORS.aqua,
    priority: 1,
    icon: "Smile",
    suggestion:
      "Llamada de acompañamiento. Tono cálido, sin apuro.",
  },
} as const;

export type AlertType = keyof typeof ALERT_TYPES;

export const ALERT_STATUSES = {
  nueva: { label: "Nueva", color: "coral" },
  atendiendo: { label: "En atención", color: "amber" },
  resuelta: { label: "Resuelta", color: "aqua" },
} as const;

export type AlertStatus = keyof typeof ALERT_STATUSES;

export const CRITICAL_CONDITIONS = [
  "Insuf",
  "ACV",
  "EPOC",
  "Parkinson",
  "Demencia",
  "Caidas",
  "Diabetes",
  "cardiaca",
];

export const BARRIOS = [
  "Santa Teresita",
  "Mar del Tuyú",
  "Las Toninas",
  "San Clemente",
  "Mar de Ajó",
  "San Bernardo",
  "Costa del Este",
  "Aguas Verdes",
] as const;

export const AGENDA_TYPE_COLORS = {
  med: "coral",
  remis: "amber",
  turno: "blue",
  noche: "violet",
} as const;

export const MODULES = [
  { key: "monitoreo", label: "Monitoreo", icon: "LayoutDashboard" },
  { key: "clientes", label: "Clientes", icon: "Users" },
  { key: "bienestar", label: "Bienestar", icon: "HeartPulse" },
  { key: "mensajeria", label: "Mensajería", icon: "MessageCircle" },
  { key: "agenda", label: "Agenda", icon: "CalendarClock" },
  { key: "reportes", label: "Reportes", icon: "BarChart3" },
  { key: "admin", label: "Usuarios", icon: "Shield" },
] as const;
