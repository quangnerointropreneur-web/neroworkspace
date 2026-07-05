"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import {
  BarChart2,
  Briefcase,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Key,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Rocket,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  employeeLabel?: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  supervisorOnly?: boolean;
}

const SHOW_SALES_MANAGEMENT = false;

const NAV_GROUPS: { groupName: string; items: NavItem[] }[] = [
  {
    groupName: "Overview",
    items: [
      { href: "/dashboard", label: "Home", icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    groupName: "Sales",
    items: [
      { href: "/dashboard/pipeline", label: "Sales pipeline", icon: <Briefcase size={16} /> },
      { href: "/dashboard/contacts", label: "Customers", icon: <Users size={16} /> },
      { href: "/dashboard/activity", label: "CRM activity", icon: <Clock size={16} /> },
      { href: "/dashboard/crm-report", label: "CRM report", icon: <TrendingUp size={16} />, adminOnly: true },
    ],
  },
  {
    groupName: "Work",
    items: [
      { href: "/dashboard/brands", label: "Brand", icon: <Briefcase size={16} />, adminOnly: true },
      { href: "/dashboard/projects", label: "OKR / Project", icon: <Rocket size={16} /> },
      { href: "/dashboard/tasks", label: "Tasks manager", icon: <CheckSquare size={16} /> },
      { href: "/dashboard/todolist", label: "Meeting note", icon: <ListTodo size={16} /> },
    ],
  },
  {
    groupName: "People",
    items: [
      { href: "/dashboard/hr", label: "People", icon: <Users size={16} />, adminOnly: true },
    ],
  },
  {
    groupName: "System",
    items: [
      { href: "/dashboard/report", label: "General report", icon: <BarChart2 size={16} />, adminOnly: true },
      { href: "/dashboard/prompts", label: "Prompt AI", icon: <Sparkles size={16} />, supervisorOnly: true },
      { href: "/dashboard/accounts", label: "Accounts", icon: <Key size={16} />, adminOnly: true },
      { href: "/dashboard/settings", label: "Settings", icon: <Settings size={16} />, adminOnly: true },
    ],
  },
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Overview": true,
    "Sales": false,
    "Work": true,
    "People": true,
    "System": true,
  });

  const isAdmin = currentUser?.role === "admin";
  const isAssistant = currentUser?.role === "assistant";
  const isSupervisor = isAdmin || isAssistant;

  useEffect(() => {
    NAV_GROUPS.forEach((group) => {
      if (group.items.some((item) => item.href === pathname)) {
        setExpandedGroups((prev) => ({ ...prev, [group.groupName]: true }));
      }
    });
  }, [pathname]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile && setMobileOpen) setMobileOpen(false);
  }, [pathname, isMobile, setMobileOpen]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const sidebarContent = (
    <>
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand" : "Collapse"}
          style={{
            position: "absolute",
            top: 22,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            boxShadow: "var(--shadow)",
            transition: "all 0.15s ease",
          }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      )}

      <div
        style={{
          padding: collapsed && !isMobile ? "20px 0 16px" : "20px 16px 16px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !isMobile ? "center" : "flex-start",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
          }}
        >
          <Zap size={16} color="white" />
        </div>
        {(!collapsed || isMobile) && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap", flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Nero Ops</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>Management</div>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen?.(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginLeft: "auto", padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 8px" }}>
        {NAV_GROUPS.map((group, groupIndex) => {
          if (!SHOW_SALES_MANAGEMENT && group.groupName === "Sales") return null;

          const visibleItems = group.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.supervisorOnly && !isSupervisor) return false;
            return true;
          });
          if (!visibleItems.length) return null;

          const isExpanded = expandedGroups[group.groupName];

          return (
            <div key={group.groupName} style={{ marginBottom: collapsed && !isMobile ? 4 : 12 }}>
              {!collapsed || isMobile ? (
                <div
                  onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.groupName]: !prev[group.groupName] }))}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    userSelect: "none",
                    opacity: 0.85,
                  }}
                >
                  <span>{group.groupName}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              ) : (
                <div style={{ height: 1, background: "var(--border)", margin: "8px 12px", opacity: groupIndex === 0 ? 0 : 1 }} />
              )}

              {(isExpanded || (collapsed && !isMobile)) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed && !isMobile ? item.label : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                          gap: 9,
                          padding: collapsed && !isMobile ? "10px 0" : "8px 10px",
                          borderRadius: 8,
                          marginBottom: 1,
                          background: isActive ? "var(--sidebar-active-bg)" : "transparent",
                          border: isActive ? "1px solid var(--sidebar-active-border)" : "1px solid transparent",
                          color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                          fontWeight: isActive ? 600 : 400,
                          fontSize: 13.5,
                          textDecoration: "none",
                          transition: "all 0.12s ease",
                          position: "relative",
                        }}
                      >
                        {isActive && (
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: "22%",
                              bottom: "22%",
                              width: 2.5,
                              borderRadius: "0 2px 2px 0",
                              background: "var(--accent-blue)",
                            }}
                          />
                        )}
                        {item.icon}
                        {(!collapsed || isMobile) && (
                          <>
                            <span style={{ whiteSpace: "nowrap" }}>{!isSupervisor && item.employeeLabel ? item.employeeLabel : item.label}</span>
                            {(item.adminOnly || item.supervisorOnly) && (
                              <span
                                style={{
                                  marginLeft: "auto",
                                  fontSize: 9,
                                  fontWeight: 600,
                                  padding: "1px 6px",
                                  borderRadius: 100,
                                  background: item.adminOnly ? "var(--accent-purple-light)" : "var(--accent-blue-light)",
                                  color: item.adminOnly ? "var(--accent-purple)" : "var(--accent-blue)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.07em",
                                }}
                              >
                                {item.adminOnly ? "Admin" : "Staff"}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: 8, borderTop: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            gap: 8,
            padding: collapsed && !isMobile ? "8px 0" : "8px",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              flexShrink: 0,
              background: isAdmin
                ? "linear-gradient(135deg, #3B82F6, #8B5CF6)"
                : isAssistant
                  ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                  : "linear-gradient(135deg, #16A34A, #22C55E)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "white",
            }}
            title={currentUser?.fullName}
          >
            {currentUser?.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase() ?? "?"}
          </div>
          {(!collapsed || isMobile) && (
            <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser?.fullName.split(" ").slice(-2).join(" ")}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {isAdmin ? "Administrator" : isAssistant ? "Assistant" : currentUser?.department}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          title={collapsed && !isMobile ? "Log out" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: collapsed && !isMobile ? 0 : 6,
            padding: "7px",
            borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <LogOut size={13} />
          {(!collapsed || isMobile) && <span>Log out</span>}
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div
          onClick={() => setMobileOpen?.(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.3)",
            backdropFilter: "blur(2px)",
            zIndex: 900,
            opacity: mobileOpen ? 1 : 0,
            visibility: mobileOpen ? "visible" : "hidden",
            transition: "all 0.2s ease",
          }}
        />
        <aside
          style={{
            width: 256,
            background: "var(--sidebar-bg)",
            borderRight: "1px solid var(--sidebar-border)",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1000,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "var(--shadow-lg)",
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
        width: collapsed ? 68 : 220,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 50,
        boxShadow: "1px 0 0 var(--border)",
      }}
    >
      {sidebarContent}
    </aside>
  );
}
