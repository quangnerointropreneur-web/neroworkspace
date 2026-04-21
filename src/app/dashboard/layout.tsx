"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isAuthInitialized } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthInitialized && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isAuthInitialized, router]);

  if (!isAuthInitialized) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main style={{ flex: 1, padding: "16px 16px", overflowX: "hidden", overflowY: "auto", background: "var(--bg-primary)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
