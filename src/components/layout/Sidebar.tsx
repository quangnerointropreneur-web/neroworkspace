"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import {
  LayoutDashboard, CheckSquare, Users, Briefcase, Zap,
  LogOut, Clock, BarChart2, TrendingUp, ChevronLeft, ChevronRight, CalendarDays, X, ListTodo
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  employeeLabel?: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} /> },
  { href: "/dashboard/todolist", label: "Todolist", icon: <ListTodo size={17} /> },
  { href: "/dashboard/tasks", label: "Công việc", icon: <CheckSquare size={17} /> },
  { href: "/dashboard/attendance", label: "Chấm công", icon: <Clock size={17} /> },
  { href: "/dashboard/schedule", label: "Lịch của Nero", employeeLabel: "Đặt lịch Nero", icon: <CalendarDays size={17} /> },
  { href: "/dashboard/kpi-log", label: "Nhập KPI", icon: <TrendingUp size={17} /> },
  { href: "/dashboard/report", label: "Báo cáo", icon: <BarChart2 size={17} />, adminOnly: true },
  { href: "/dashboard/hr", label: "Nhân sự", icon: <Users size={17} />, adminOnly: true },
  { href: "/dashboard/brands", label: "Brands & KPIs", icon: <Briefcase size={17} />, adminOnly: true },
];

interface Props {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: Props) {
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile menu on path change
  useEffect(() => {
    if (isMobile && setMobileOpen) setMobileOpen(false);
  }, [pathname, isMobile, setMobileOpen]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const sidebarContent = (
    <>
      {/* Toggle Button (Desktop only) */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: "absolute",
            top: 24,
            right: -13,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Logo */}
      <div style={{ padding: (collapsed && !isMobile) ? "20px 0 10px" : "20px 16px 10px", borderBottom: "1px solid var(--border)", marginBottom: 8, display: "flex", justifyContent: (collapsed && !isMobile) ? "center" : "flex-start", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={18} color="white" />
          </div>
          {(!collapsed || isMobile) && (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Nero Ops</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Management System</div>
            </div>
          )}
        </div>
        
        {isMobile && (
           <button onClick={() => setMobileOpen?.(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={20} />
           </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 10px" }}>
        {(!collapsed || isMobile) && (
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 8px 6px" }}>
            Menu
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={(collapsed && !isMobile) ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: (collapsed && !isMobile) ? "center" : "flex-start",
                gap: 10,
                padding: (collapsed && !isMobile) ? "12px 0" : "9px 10px",
                borderRadius: 10,
                marginBottom: 2,
                background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                textDecoration: "none",
                transition: "all 0.15s",
                position: "relative",
              }}
              onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = "transparent")}
            >
              {item.icon}
              {(!collapsed || isMobile) && (
                <>
                  <span style={{ whiteSpace: "nowrap" }}>{(!isAdmin && item.employeeLabel) ? item.employeeLabel : item.label}</span>
                  {item.adminOnly && (
                    <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "rgba(139,92,246,0.15)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      ADMIN
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 2px 2px 0", background: "var(--accent-blue)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: "10px", borderTop: "1px solid var(--border)" }}>
        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: (collapsed && !isMobile) ? "center" : "flex-start", gap: 10, padding: (collapsed && !isMobile) ? "10px 0" : "10px 8px", marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: isAdmin ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }} title={currentUser?.fullName}>
            {currentUser?.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase() ?? "?"}
          </div>
          {(!collapsed || isMobile) && (
            <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser?.fullName.split(" ").slice(-2).join(" ")}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {isAdmin ? "Quản trị viên" : currentUser?.department}
              </div>
            </div>
          )}
        </div>

        {/* Logout only */}
        <button
          onClick={handleLogout}
          title={(collapsed && !isMobile) ? "Đăng xuất" : undefined}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: (collapsed && !isMobile) ? 0 : 7, padding: "9px", borderRadius: 9, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.14)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
        >
          <LogOut size={14} /> {(!collapsed || isMobile) && "Đăng xuất"}
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div 
          onClick={() => setMobileOpen?.(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 900,
            opacity: mobileOpen ? 1 : 0,
            visibility: mobileOpen ? "visible" : "hidden",
            transition: "all 0.3s ease"
          }}
        />
        {/* Drawer */}
        <aside
          style={{
            width: 260,
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1000,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "10px 0 30px rgba(0,0,0,0.2)"
          }}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside
      style={{
        width: collapsed ? 72 : 220,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 50,
      }}
    >
      {sidebarContent}
    </aside>
  );
}
