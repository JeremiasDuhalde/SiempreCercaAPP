import { COLORS } from "@/lib/constants";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

export default function SectionCard({ title, icon: Icon, children }: SectionCardProps) {
  return (
    <div
      className="sc-card"
      style={{
        backgroundColor: COLORS.panel,
        borderRadius: 12,
        padding: 16,
        border: `1px solid ${COLORS.line}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Icon size={16} style={{ color: COLORS.gold }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: COLORS.sub,
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
