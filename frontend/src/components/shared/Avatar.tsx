import { initials } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface AvatarProps {
  client: Client;
  size?: number;
}

export default function Avatar({ client, size = 40 }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: `${client.color}22`,
        color: client.color,
        fontSize: size * 0.34,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {initials(client.name)}
    </div>
  );
}
