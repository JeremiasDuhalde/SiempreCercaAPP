import { COLORS } from "@/lib/constants";

interface BatteryIndicatorProps {
  value: number;
}

export default function BatteryIndicator({ value }: BatteryIndicatorProps) {
  const color =
    value > 50 ? COLORS.aqua : value > 25 ? COLORS.gold : COLORS.coral;
  const fillWidth = Math.max(0, Math.min(100, value));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div
        style={{
          position: "relative",
          width: 20,
          height: 11,
          borderRadius: 3,
          border: `1.5px solid ${color}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 1,
            top: 1,
            bottom: 1,
            width: `${fillWidth}%`,
            maxWidth: "calc(100% - 2px)",
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 500 }}>
        {value}%
      </span>
    </div>
  );
}
