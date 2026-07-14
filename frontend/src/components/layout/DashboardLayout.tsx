import { useEffect, type ReactNode } from "react";
import { COLORS } from "@/lib/constants";
import { useAppStore } from "@/stores/useAppStore";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useAppStore((s) => s.isMobile);
  const setIsMobile = useAppStore((s) => s.setIsMobile);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setIsMobile]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: COLORS.bg,
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <Header />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {!isMobile && <Sidebar />}
        <main
          className="sc-scroll"
          style={{
            flex: 1,
            overflow: "auto",
            padding: isMobile ? 12 : 20,
          }}
        >
          {children}
        </main>
      </div>
      {isMobile && <MobileNav />}
    </div>
  );
}
