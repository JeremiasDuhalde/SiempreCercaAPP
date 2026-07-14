import axios from "axios";

const API_BASE = import.meta.env.DEV ? "http://localhost:8300" : "";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
});

// Agregar Bearer token a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → limpiar token y redirigir a login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config.url?.includes("/auth/login")) {
      localStorage.removeItem("sc_token");
      localStorage.removeItem("sc_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
