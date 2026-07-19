import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";

export default function App() {
  const { token, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--sc-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--sc-sub)",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        Cargando...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={token ? <DashboardPage /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
