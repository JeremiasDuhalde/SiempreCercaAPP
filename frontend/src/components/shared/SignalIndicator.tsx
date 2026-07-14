import { COLORS } from "@/lib/constants";

interface SignalIndicatorProps {
  level: number;
}

const BAR_HEIGHTS = [6, 8, 10, 12];

export default function SignalIndicator({ level }: SignalIndicatorProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: h,
            marginLeft: i === 0 ? 0 : 1,
            borderRadius: 1,
            backgroundColor: i < level ? COLORS.aqua : COLORS.line,
          }}
        />
      ))}
    </div>
  );
}
