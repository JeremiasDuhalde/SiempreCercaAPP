import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { COLORS, ALERT_TYPES } from "@/lib/constants";
import { useThemeStore } from "@/stores/useThemeStore";
import type { Alert, Client } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Coordinate helpers                                                 */
/* ------------------------------------------------------------------ */

// Partido de la Costa bounding box (approx)
// lat: -36.35 (north/San Clemente) to -36.75 (south/Mar de Ajó)
// lng: -56.55 (east/coast) to -56.85 (west)
const LAT_MIN = -36.75;
const LAT_MAX = -36.35;
const LNG_MIN = -56.85;
const LNG_MAX = -56.55;

/** Convert mock gx/gy (0-1) to real lat/lng in Partido de la Costa */
function gxyToLatLng(gx: number, gy: number): [number, number] {
  // gx 0→1 maps west→east (lng min→max)
  // gy 0→1 maps north→south (lat max→min)
  const lng = LNG_MIN + gx * (LNG_MAX - LNG_MIN);
  const lat = LAT_MAX - gy * (LAT_MAX - LAT_MIN);
  return [lng, lat];
}

/** Generate a GeoJSON polygon approximating a circle (no turf needed) */
function circleGeoJSON(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const earthRadius = 6371;
  const d = radiusKm / earthRadius;
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const bearing = (i * 2 * Math.PI) / steps;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
        Math.cos(latRad) * Math.sin(d) * Math.cos(bearing)
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(lat2)
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

/** Determine marker color based on active alert type */
function markerColor(alert: Alert | undefined): string {
  if (!alert) return COLORS.aqua;
  const type = alert.type;
  if (type === "sos" || type === "caida") return COLORS.coral;
  if (type === "geo") return COLORS.blue;
  if (type === "bateria") return COLORS.gold;
  if (type === "inactiv") return COLORS.violet;
  return COLORS.aqua;
}

/* ------------------------------------------------------------------ */
/*  CSS for pulse animation (injected once)                           */
/* ------------------------------------------------------------------ */

const PULSE_CSS = `
  @keyframes realmap-pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(2.2); opacity: 0; }
  }
  .realmap-marker {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.35);
    cursor: pointer;
    position: relative;
    transition: transform 0.15s ease;
  }
  .realmap-marker:hover {
    transform: scale(1.3);
  }
  .realmap-marker.selected {
    border-color: #fff;
    border-width: 2.5px;
    transform: scale(1.4);
  }
  .realmap-pulse {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    animation: realmap-pulse 2s ease-in-out infinite;
    pointer-events: none;
  }
`;

let pulseCssInjected = false;
function ensurePulseCSS() {
  if (pulseCssInjected) return;
  const style = document.createElement("style");
  style.textContent = PULSE_CSS;
  document.head.appendChild(style);
  pulseCssInjected = true;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RealMapProps {
  clients: Client[];
  alerts: Map<string, Alert>;
  allAlerts: Alert[];
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RealMap({
  clients,
  alerts,
  allAlerts,
  selectedAlertId,
  onSelectAlert,
}: RealMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { el: HTMLDivElement; marker: maplibregl.Marker }>>(
    new Map()
  );
  const theme = useThemeStore((s) => s.theme);

  // Initialize map
  useEffect(() => {
    ensurePulseCSS();
    if (!containerRef.current) return;

    const styleUrl =
      theme === "dark"
        ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [-56.70, -36.56],
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap map tile style when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const styleUrl =
      theme === "dark"
        ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
    // Clear cached markers before style swap (they'll re-render in the marker effects)
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();
    map.setStyle(styleUrl);
  }, [theme]);

  // Add/update geofence circles when map loads and clients change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addGeofences = () => {
      clients.forEach((client) => {
        if (!client.geofence) return;

        const [lng, lat] = gxyToLatLng(client.gx, client.gy);
        const sourceId = `geofence-${client.id}`;
        const fillId = `geofence-fill-${client.id}`;
        const lineId = `geofence-line-${client.id}`;

        if (map.getSource(sourceId)) return; // already added

        const geoJson = circleGeoJSON(lng, lat, 0.35); // 350m radius

        map.addSource(sourceId, { type: "geojson", data: geoJson });

        map.addLayer({
          id: fillId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": COLORS.blue,
            "fill-opacity": 0.08,
          },
        });

        map.addLayer({
          id: lineId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": COLORS.blue,
            "line-opacity": 0.5,
            "line-width": 1.5,
            "line-dasharray": [4, 3],
          },
        });
      });
    };

    if (map.isStyleLoaded()) {
      addGeofences();
    } else {
      map.once("style.load", addGeofences);
    }
  }, [clients]);

  // Add/update markers whenever clients or alerts change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      // Remove markers for clients no longer in list
      const clientIds = new Set(clients.map((c) => c.id));
      markersRef.current.forEach(({ marker }, id) => {
        if (!clientIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });

      clients.forEach((client) => {
        const [lng, lat] = gxyToLatLng(client.gx, client.gy);
        const activeAlert = alerts.get(client.id);
        const color = markerColor(activeAlert);
        const isSelected = activeAlert?.id === selectedAlertId;

        const existing = markersRef.current.get(client.id);

        if (existing) {
          // Update style in place
          existing.el.style.backgroundColor = color;
          existing.el.style.boxShadow = `0 0 0 3px ${color}44`;
          existing.el.classList.toggle("selected", isSelected);

          // Update pulse visibility
          let pulse = existing.el.querySelector(".realmap-pulse") as HTMLDivElement | null;
          if (activeAlert && !pulse) {
            pulse = document.createElement("div");
            pulse.className = "realmap-pulse";
            pulse.style.backgroundColor = color;
            existing.el.appendChild(pulse);
          } else if (!activeAlert && pulse) {
            pulse.remove();
          } else if (pulse) {
            pulse.style.backgroundColor = color;
          }
        } else {
          // Create new marker element
          const el = document.createElement("div");
          el.className = `realmap-marker${isSelected ? " selected" : ""}`;
          el.style.backgroundColor = color;
          el.style.boxShadow = `0 0 0 3px ${color}44`;

          if (activeAlert) {
            const pulse = document.createElement("div");
            pulse.className = "realmap-pulse";
            pulse.style.backgroundColor = color;
            el.appendChild(pulse);
          }

          // Tooltip
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 16,
            className: "realmap-popup",
          }).setHTML(
            `<div style="font-family:inherit;font-size:12px;padding:4px 8px;background:${COLORS.panel2};color:${COLORS.ink};border-radius:6px;border:1px solid ${COLORS.line};">
              <strong>${client.name}</strong>
              ${activeAlert ? `<br/><span style="color:${color}">${ALERT_TYPES[activeAlert.type].label}</span>` : ""}
            </div>`
          );

          el.addEventListener("mouseenter", () => {
            popup.addTo(map);
          });
          el.addEventListener("mouseleave", () => {
            popup.remove();
          });

          el.addEventListener("click", () => {
            if (activeAlert) onSelectAlert(activeAlert.id);
          });

          const marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);

          markersRef.current.set(client.id, { el, marker });
        }
      });
    };

    if (map.isStyleLoaded()) {
      addMarkers();
    } else {
      map.once("style.load", addMarkers);
    }
  }, [clients, alerts, selectedAlertId, onSelectAlert]);

  // Add/update markers for FLIC alerts with real GPS (not linked to a seed client)
  const flicMarkersRef = useRef<Map<string, { el: HTMLDivElement; marker: maplibregl.Marker }>>(
    new Map()
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addFlicMarkers = () => {
      const clientIds = new Set(clients.map((c) => c.id));
      // Find alerts with GPS that don't belong to a known client
      const flicAlerts = allAlerts.filter(
        (a) =>
          a.latitude &&
          a.longitude &&
          parseFloat(a.latitude) !== 0 &&
          !clientIds.has(a.clientId)
      );

      // Remove stale flic markers
      const activeFlicIds = new Set(flicAlerts.map((a) => a.id));
      flicMarkersRef.current.forEach(({ marker }, id) => {
        if (!activeFlicIds.has(id)) {
          marker.remove();
          flicMarkersRef.current.delete(id);
        }
      });

      flicAlerts.forEach((alert) => {
        const lng = parseFloat(alert.longitude!);
        const lat = parseFloat(alert.latitude!);
        if (isNaN(lng) || isNaN(lat)) return;

        const color = markerColor(alert);
        const isSelected = alert.id === selectedAlertId;
        const existing = flicMarkersRef.current.get(alert.id);

        if (existing) {
          existing.el.style.backgroundColor = color;
          existing.el.classList.toggle("selected", isSelected);
          existing.marker.setLngLat([lng, lat]);
        } else {
          const el = document.createElement("div");
          el.className = `realmap-marker${isSelected ? " selected" : ""}`;
          el.style.backgroundColor = color;
          el.style.boxShadow = `0 0 0 3px ${color}44`;
          el.style.width = "18px";
          el.style.height = "18px";

          const pulse = document.createElement("div");
          pulse.className = "realmap-pulse";
          pulse.style.backgroundColor = color;
          el.appendChild(pulse);

          const label = alert.clientName || `FLIC ${alert.buttonSerial || ""}`;
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 16,
          }).setHTML(
            `<div style="font-family:inherit;font-size:12px;padding:4px 8px;background:${COLORS.panel2};color:${COLORS.ink};border-radius:6px;border:1px solid ${COLORS.line};">
              <strong>${label}</strong>
              <br/><span style="color:${color}">${ALERT_TYPES[alert.type]?.label ?? alert.type.toUpperCase()}</span>
              <br/><span style="color:${COLORS.sub};font-size:10px">GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>`
          );

          el.addEventListener("mouseenter", () => popup.addTo(map));
          el.addEventListener("mouseleave", () => popup.remove());
          el.addEventListener("click", () => onSelectAlert(alert.id));

          const marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);

          flicMarkersRef.current.set(alert.id, { el, marker });
        }
      });
    };

    if (map.isStyleLoaded()) addFlicMarkers();
    else map.once("style.load", addFlicMarkers);
  }, [allAlerts, clients, selectedAlertId, onSelectAlert]);

  // Pan to selected alert (seed client OR flic GPS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedAlertId) return;

    // First check FLIC markers (real GPS)
    const flicMarker = flicMarkersRef.current.get(selectedAlertId);
    if (flicMarker) {
      const lngLat = flicMarker.marker.getLngLat();
      map.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });
      return;
    }

    // Then check seed client markers
    const alertEntry = Array.from(alerts.entries()).find(
      ([, a]) => a.id === selectedAlertId
    );
    if (!alertEntry) return;
    const client = clients.find((c) => c.id === alertEntry[0]);
    if (!client) return;
    const [lng, lat] = gxyToLatLng(client.gx, client.gy);
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 600 });
  }, [selectedAlertId, alerts, clients]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: COLORS.panel2,
        position: "relative",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Legend overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 12,
          backgroundColor: "var(--sc-panel-a93)",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {[
          { color: COLORS.coral, label: "Crítica (SOS / Caída)" },
          { color: COLORS.blue, label: "Geocerca" },
          { color: COLORS.gold, label: "Batería baja" },
          { color: COLORS.violet, label: "Inactividad" },
          { color: COLORS.aqua, label: "Cliente OK" },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: COLORS.sub }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
