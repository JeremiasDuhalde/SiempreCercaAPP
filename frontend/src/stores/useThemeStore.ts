import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const stored = (typeof localStorage !== "undefined" && localStorage.getItem("sc-theme")) as Theme | null;
const initial: Theme = stored === "dark" || stored === "light" ? stored : "light";

// Apply theme immediately (before first render)
if (typeof document !== "undefined") {
  applyTheme(initial);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === "light" ? "dark" : "light";
      localStorage.setItem("sc-theme", next);
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (t) => {
    localStorage.setItem("sc-theme", t);
    applyTheme(t);
    set({ theme: t });
  },
}));
