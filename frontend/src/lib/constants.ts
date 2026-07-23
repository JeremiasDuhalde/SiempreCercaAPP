export const COLORS = {
  bg: "var(--sc-bg)",
  panel: "var(--sc-panel)",
  panel2: "var(--sc-panel2)",
  line: "var(--sc-line)",
  ink: "var(--sc-ink)",
  sub: "var(--sc-sub)",
  faint: "var(--sc-faint)",
  coral: "var(--sc-coral)",
  coralDeep: "var(--sc-coral-deep)",
  amber: "var(--sc-amber)",
  gold: "var(--sc-gold)",
  aqua: "var(--sc-aqua)",
  violet: "var(--sc-violet)",
  blue: "var(--sc-blue)",
} as const;

/**
 * Maps a CSS color variable to its alpha-tinted CSS variable.
 * Level: "faint" (~8%), "light" (~13%), "medium" (~20%), "strong" (~25%)
 */
export function colorTint(cssVar: string, level: "faint" | "light" | "medium" | "strong" = "light"): string {
  const suffix = { faint: "08", light: "13", medium: "20", strong: "25" }[level];
  const map: Record<string, Record<string, string>> = {
    "var(--sc-coral)": { "08": "var(--sc-coral-a08)", "13": "var(--sc-coral-a13)", "20": "var(--sc-coral-a13)", "25": "var(--sc-coral-a25)" },
    "var(--sc-amber)": { "08": "var(--sc-amber-a07)", "13": "var(--sc-amber-a13)", "20": "var(--sc-amber-a20)", "25": "var(--sc-amber-a20)" },
    "var(--sc-aqua)":  { "08": "var(--sc-aqua-a08)",  "13": "var(--sc-aqua-a13)",  "20": "var(--sc-aqua-a20)",  "25": "var(--sc-aqua-a25)" },
    "var(--sc-violet)":{ "08": "var(--sc-violet-a08)","13": "var(--sc-violet-a13)","20": "var(--sc-violet-a20)","25": "var(--sc-violet-a20)" },
    "var(--sc-blue)":  { "08": "var(--sc-blue-a08)",  "13": "var(--sc-blue-a13)",  "20": "var(--sc-blue-a13)",  "25": "var(--sc-blue-a25)" },
    "var(--sc-gold)":  { "08": "var(--sc-gold-a13)",  "13": "var(--sc-gold-a13)",  "20": "var(--sc-gold-a13)",  "25": "var(--sc-gold-a13)" },
    "var(--sc-sub)":   { "08": "var(--sc-sub-a09)",   "13": "var(--sc-sub-a09)",   "20": "var(--sc-sub-a09)",   "25": "var(--sc-sub-a09)" },
    "var(--sc-faint)": { "08": "var(--sc-faint-a09)", "13": "var(--sc-faint-a09)", "20": "var(--sc-faint-a09)", "25": "var(--sc-faint-a09)" },
  };
  return map[cssVar]?.[suffix] ?? `color-mix(in srgb, ${cssVar} ${Math.round(parseInt(suffix, 16) / 255 * 100)}%, transparent)`;
}

/**
 * Returns a CSS variable name for an alpha-tinted version of a color.
 * Maps the most common hex-alpha combinations used throughout the app.
 * For unlisted combos, falls back to color-mix (requires modern browser).
 */
export function colorAlpha(cssVar: string, opacityHex: string): string {
  const key = `${cssVar}__${opacityHex}`;
  const map: Record<string, string> = {
    "var(--sc-coral)__12": "var(--sc-coral-a08)",
    "var(--sc-coral)__15": "var(--sc-coral-a08)",
    "var(--sc-coral)__22": "var(--sc-coral-a13)",
    "var(--sc-coral)__40": "var(--sc-coral-a25)",
    "var(--sc-coral)__44": "var(--sc-coral-a25)",
    "var(--sc-amber)__12": "var(--sc-amber-a07)",
    "var(--sc-amber)__22": "var(--sc-amber-a13)",
    "var(--sc-amber)__33": "var(--sc-amber-a20)",
    "var(--sc-aqua)__15": "var(--sc-aqua-a08)",
    "var(--sc-aqua)__22": "var(--sc-aqua-a13)",
    "var(--sc-aqua)__33": "var(--sc-aqua-a20)",
    "var(--sc-aqua)__44": "var(--sc-aqua-a25)",
    "var(--sc-violet)__15": "var(--sc-violet-a08)",
    "var(--sc-violet)__22": "var(--sc-violet-a13)",
    "var(--sc-violet)__33": "var(--sc-violet-a20)",
    "var(--sc-blue)__15": "var(--sc-blue-a08)",
    "var(--sc-blue)__22": "var(--sc-blue-a13)",
    "var(--sc-blue)__44": "var(--sc-blue-a25)",
    "var(--sc-gold)__22": "var(--sc-gold-a13)",
    "var(--sc-sub)__18": "var(--sc-sub-a09)",
    "var(--sc-faint)__18": "var(--sc-faint-a09)",
    "var(--sc-faint)__22": "var(--sc-faint-a09)",
    "var(--sc-line)__33": "var(--sc-line-a20)",
    "var(--sc-panel)__ee": "var(--sc-panel-a93)",
  };
  return map[key] ?? `color-mix(in srgb, ${cssVar} ${Math.round(parseInt(opacityHex, 16) / 255 * 100)}%, transparent)`;
}

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

export const AGENDA_TYPE_COLORS: Record<string, string> = {
  med: "coral",
  remis: "violet",
  turno: "blue",
  noche: "violet",
  llamada: "aqua",
  otro: "sub",
} as const;

export const MODULES = [
  { key: "monitoreo", label: "Monitoreo", icon: "LayoutDashboard" },
  { key: "clientes", label: "Clientes", icon: "Users" },
  { key: "bienestar", label: "Bienestar", icon: "HeartPulse" },
  { key: "mensajeria", label: "Mensajería", icon: "MessageCircle" },
  { key: "agenda", label: "Agenda", icon: "CalendarClock" },
  { key: "tareas", label: "Tareas", icon: "ClipboardCheck" },
  { key: "reportes", label: "Reportes", icon: "BarChart3" },
  { key: "admin", label: "Usuarios", icon: "Shield" },
  { key: "costos", label: "Costos", icon: "DollarSign" },
  { key: "templates", label: "Templates", icon: "MessageSquareText" },
  { key: "config", label: "Configuración", icon: "Settings" },
] as const;
