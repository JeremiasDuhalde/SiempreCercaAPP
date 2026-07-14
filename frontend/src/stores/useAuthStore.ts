import { create } from "zustand";
import { api } from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("sc_token"),
  user: JSON.parse(localStorage.getItem("sc_user") || "null"),
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ error: null, isLoading: true });
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("sc_token", data.access_token);
      // Fetch user info
      const me = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      localStorage.setItem("sc_user", JSON.stringify(me.data));
      set({ token: data.access_token, user: me.data, isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Error de autenticacion";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("sc_token");
    localStorage.removeItem("sc_user");
    set({ token: null, user: null });
    window.location.href = "/login";
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get("/api/auth/me");
      localStorage.setItem("sc_user", JSON.stringify(data));
      set({ user: data, isLoading: false });
    } catch {
      localStorage.removeItem("sc_token");
      localStorage.removeItem("sc_user");
      set({ token: null, user: null, isLoading: false });
    }
  },
}));
