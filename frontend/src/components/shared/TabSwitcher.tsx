import { COLORS } from "@/lib/constants";
import type { LucideIcon } from "lucide-react";

interface TabItem {
  k: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface TabSwitcherProps {
  items: TabItem[];
  value: string;
  onChange: (k: string) => void;
}

export default function TabSwitcher({ items, value, onChange }: TabSwitcherProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        backgroundColor: COLORS.panel,
        borderRadius: 10,
        overflowX: "auto",
      }}
    >
      {items.map((item) => {
        const active = item.k === value;
        const Icon = item.icon;
        return (
          <button
            key={item.k}
            onClick={() => onChange(item.k)}
            className="sc-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              backgroundColor: active ? COLORS.panel2 : "transparent",
              color: active ? COLORS.ink : COLORS.sub,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <Icon size={14} />
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span
                style={{
                  backgroundColor: COLORS.coral,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: "1px 5px",
                  minWidth: 14,
                  textAlign: "center",
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
