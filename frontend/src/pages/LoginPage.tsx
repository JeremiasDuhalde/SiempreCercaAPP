import { useState, FormEvent } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { COLORS } from "@/lib/constants";

export default function LoginPage() {
  const { login, error, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      // error ya se setea en el store
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 16,
          padding: "48px 40px",
          width: 380,
          maxWidth: "90vw",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.aqua})`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            SC
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: COLORS.ink,
              letterSpacing: -0.5,
            }}
          >
            SiempreCerca
          </h1>
          <p style={{ fontSize: 13, color: COLORS.sub, marginTop: 4 }}>
            Central de teleasistencia
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.sub,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="operador@siemprecerca.app"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${COLORS.line}`,
                background: COLORS.panel2,
                color: COLORS.ink,
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.sub,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${COLORS.line}`,
                background: COLORS.panel2,
                color: COLORS.ink,
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "var(--sc-coral-a08)",
                border: "1px solid var(--sc-coral-a25)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 13,
                color: COLORS.coral,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              border: "none",
              background: isLoading
                ? COLORS.faint
                : `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.aqua})`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              letterSpacing: 0.5,
            }}
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
