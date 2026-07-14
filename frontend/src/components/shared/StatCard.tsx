import { COLORS } from "@/lib/constants";

interface StatCardProps {
  label: string;
  value: string | number;
  dot: string;
  blink?: boolean;
}

export default function StatCard({ label, value, dot, blink = false }: StatCardProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: dot,
          animation: blink ? "blink 1.2s ease-in-out infinite" : undefined,
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: COLORS.faint,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: COLORS.ink,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
