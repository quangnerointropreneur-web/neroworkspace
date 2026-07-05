"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, X, Moon, Sun, CheckCheck, Clock, ListTodo, AlertCircle, Menu } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import TaskModal from "@/components/tasks/TaskModal";
import { Task } from "@/lib/types";
import { canAccessBrand } from "@/lib/permissions";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard/contacts": "Khách hàng",
  "/dashboard/pipeline": "Phễu bán hàng",
  "/dashboard/activity": "Hoạt động CRM",
  "/dashboard/crm-report": "Báo cáo CRM",
  "/dashboard": "Tổng quan",
  "/dashboard/tasks": "Quản lý Công việc",
  "/dashboard/hr": "Quản lý Nhân sự",
  "/dashboard/brands": "Brands & KPIs",
  "/dashboard/attendance": "Chấm công",
  "/dashboard/report": "Báo cáo tổng hợp",
  "/dashboard/kpi-log": "Nhập KPI hàng ngày",
};

const PAGE_TITLES_EN: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/contacts": "Customers",
  "/dashboard/pipeline": "Sales pipeline",
  "/dashboard/activity": "CRM activity",
  "/dashboard/crm-report": "CRM report",
  "/dashboard/tasks": "Tasks manager",
  "/dashboard/hr": "People",
  "/dashboard/brands": "Brand Management",
  "/dashboard/projects": "OKR / Project",
  "/dashboard/todolist": "Meeting note",
  "/dashboard/accounts": "Accounts",
  "/dashboard/settings": "Settings",
  "/dashboard/prompts": "Prompt AI",
  "/dashboard/attendance": "Attendance",
  "/dashboard/report": "General report",
  "/dashboard/kpi-log": "KPI log",
};

const NOTIF_TYPE_ICON: Record<string, React.ReactNode> = {
  task: <ListTodo size={13} />,
  subtask: <CheckCheck size={13} />,
  kpi: <AlertCircle size={13} />,
  checkin: <Clock size={13} />,
  system: <Bell size={13} />,
};
const NOTIF_TYPE_COLOR: Record<string, string> = {
  task: "#3b82f6",
  subtask: "#10b981",
  kpi: "#f59e0b",
  checkin: "#8b5cf6",
  system: "#6b7280",
};

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { currentUser } = useAuth();
  const { state, theme, toggleTheme, markNotificationRead, markAllNotificationsRead, updateUser } = useData();
  const pathname = usePathname();
  const router = useRouter();

  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatar ?? "");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSaveProfile = () => {
    if (currentUser) {
      updateUser(currentUser.id, { avatar: editAvatarUrl });
    }
    setShowProfile(false);
  };

  const userNotifications = state.notifications?.filter((n) => n.userId === currentUser?.id) ?? [];
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const searchResults = searchQuery.trim().length >= 2
    ? state.tasks.filter((t) => {
        const uid = currentUser?.id ?? "";
        const isVisible = canAccessBrand(currentUser, t.brandId) && (currentUser?.role === "admin" || t.picIds?.includes(uid) || t.watcherIds?.includes(uid));
        return isVisible && (
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }).slice(0, 6)
    : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  const handleNotifClick = async (taskId?: string, notifId?: string) => {
    if (notifId) markNotificationRead(notifId);
    setShowNotif(false);
    if (!taskId) return;

    // Try local state first
    const localTask = state.tasks.find((t) => t.id === taskId && canAccessBrand(currentUser, t.brandId));
    if (localTask) {
      setSelectedTaskForModal(localTask);
      return;
    }

    // Fallback: fetch directly from Firestore
    try {
      const snap = await getDoc(doc(db, "tasks", taskId));
      if (snap.exists()) {
        const fetchedTask = snap.data() as Task;
        if (canAccessBrand(currentUser, fetchedTask.brandId)) {
          setSelectedTaskForModal(fetchedTask);
        } else {
          router.push(`/dashboard/tasks`);
        }
      } else {
        // Task truly not found, navigate as last resort
        router.push(`/dashboard/tasks`);
      }
    } catch {
      router.push(`/dashboard/tasks`);
    }
  };

  const title = PAGE_TITLES_EN[pathname] ?? PAGE_TITLES[pathname] ?? "Nero Ops";
  const initials = currentUser?.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase() ?? "?";
  const isAdmin = currentUser?.role === "admin";

  return (
    <>
      <header
        style={{
          height: 56,
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          paddingLeft: isMobile ? 12 : 24,
          paddingRight: isMobile ? 12 : 20,
          gap: 10,
          position: "sticky",
          top: 0,
          zIndex: 100,
          flexShrink: 0,
          boxShadow: "0 1px 0 var(--border)",
        }}
      >
        {isMobile && (
          <button
            onClick={onMenuClick}
            style={{ 
              width: 36, height: 36, borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
              color: "var(--text-muted)",
              transition: "all 0.15s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Menu size={18} />
          </button>
        )}

        {/* Page title */}
        {!isMobile && (
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginRight: "auto", letterSpacing: "-0.01em" }}>
            {title}
          </span>
        )}

        {/* Search trigger */}
        <button
          onClick={() => setShowSearch(true)}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: isMobile ? "center" : "flex-start",
            gap: 8, padding: "6px 12px",
            borderRadius: 8,
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            cursor: "pointer", fontSize: 13,
            minWidth: isMobile ? 36 : 160,
            width: isMobile ? 36 : "auto",
            marginLeft: isMobile ? "auto" : 0,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-blue)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <Search size={14} />
          {!isMobile && (
            <>
              <span>Search...</span>
              <span style={{ marginLeft: "auto", fontSize: 10, background: "var(--border)", borderRadius: 6, padding: "1px 6px", color: "var(--text-muted)" }}>Ctrl+K</span>
            </>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-muted)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotif((v) => !v)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: showNotif ? "var(--accent-blue-light)" : "transparent",
              border: `1px solid ${showNotif ? "var(--border-accent)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: showNotif ? "var(--accent-blue)" : "var(--text-muted)",
              position: "relative",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { if (!showNotif) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-strong)"; } }}
            onMouseLeave={e => { if (!showNotif) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; } }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--accent-red)",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid var(--bg-card)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotif && (
            <div
              className="animate-slideDown"
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: 360,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Thông báo {unreadCount > 0 && <span style={{ color: "var(--accent-red)", fontSize: 12 }}>({unreadCount} mới)</span>}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead(currentUser?.id ?? "")}
                    style={{ fontSize: 11, color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {userNotifications.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    🔔 Không có thông báo nào
                  </div>
                ) : (
                  userNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n.taskId, n.id)}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        background: n.read ? "transparent" : `${NOTIF_TYPE_COLOR[n.type]}08`,
                        borderLeft: n.read ? "3px solid transparent" : `3px solid ${NOTIF_TYPE_COLOR[n.type]}`,
                        transition: "background 0.15s",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? "transparent" : `${NOTIF_TYPE_COLOR[n.type]}08`)}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${NOTIF_TYPE_COLOR[n.type]}18`, border: `1px solid ${NOTIF_TYPE_COLOR[n.type]}44`, display: "flex", alignItems: "center", justifyContent: "center", color: NOTIF_TYPE_COLOR[n.type], flexShrink: 0, marginTop: 1 }}>
                        {NOTIF_TYPE_ICON[n.type]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: "var(--text-primary)", marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 4 }}>{n.body}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true, locale: vi })}
                        </div>
                      </div>
                      {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: NOTIF_TYPE_COLOR[n.type], flexShrink: 0, marginTop: 6 }} />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background 0.15s" }}
          onClick={() => setShowProfile(true)}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>{currentUser?.fullName.split(" ").slice(-2).join(" ")}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{isAdmin ? "Administrator" : currentUser?.department}</div>
          </div>
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt="avatar" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 8, background: isAdmin ? "linear-gradient(135deg, #3B82F6, #8B5CF6)" : "linear-gradient(135deg, #16A34A, #22C55E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "white" }}>
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* Profile Modal */}
      {showProfile && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,24,39,0.4)", backdropFilter: "blur(3px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowProfile(false)}
        >
          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 400, background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Hồ sơ cá nhân</h3>
              <button onClick={() => setShowProfile(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5 }}>Đổi URL Avatar</label>
                <input
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  onClick={handleSaveProfile}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 72, background: "rgba(17,24,39,0.4)", backdropFilter: "blur(3px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowSearch(false)}
        >
          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 560, background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            {/* Search input */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: searchQuery ? "1px solid var(--border)" : "none" }}>
              <Search size={18} color="var(--accent-blue)" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, projects..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 16, color: "var(--text-primary)", fontFamily: "inherit" }}
                onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
              />
              <button onClick={() => setShowSearch(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            {searchQuery.length >= 2 && (
              <div style={{ maxHeight: 380, overflowY: "auto" }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    No result for <span>{searchQuery}</span>
                  </div>
                ) : (
                  searchResults.map((task) => {
                    const brand = state.brands.find((b) => b.id === task.brandId);
                    const statusLabel: Record<string, string> = { todo: "Chờ xử lý", inprogress: "Đang thực hiện", review: "Chờ duyệt", done: "Hoàn thành" };
                    const statusColor: Record<string, string> = { todo: "#6b7280", inprogress: "#3b82f6", review: "#f59e0b", done: "#10b981" };
                    return (
                      <div
                        key={task.id}
                        onClick={() => { router.push("/dashboard/tasks"); setShowSearch(false); }}
                        style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 6, height: 36, borderRadius: 3, background: brand?.color ?? "#3b82f6", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {brand?.name} · {task.subTasks.length} sub-tasks · Deadline {task.deadline}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[task.status], background: `${statusColor[task.status]}18`, border: `1px solid ${statusColor[task.status]}44`, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
                          {statusLabel[task.status]}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {searchQuery.length < 2 && (
              <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: 12 }}>
                Type at least 2 characters to search...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Modal triggered from notification */}
      {selectedTaskForModal && (
        <TaskModal
          task={selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
        />
      )}
    </>
  );
}
