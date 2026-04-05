"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, X, Moon, Sun, CheckCheck, Clock, ListTodo, AlertCircle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/dashboard/tasks": "Quản lý Công việc",
  "/dashboard/hr": "Quản lý Nhân sự",
  "/dashboard/brands": "Brands & KPIs",
  "/dashboard/attendance": "Chấm công",
  "/dashboard/report": "Báo cáo tổng hợp",
  "/dashboard/kpi-log": "Nhập KPI hàng ngày",
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

export default function Topbar() {
  const { currentUser } = useAuth();
  const { state, theme, toggleTheme, markNotificationRead, markAllNotificationsRead, updateUser } = useData();
  const pathname = usePathname();
  const router = useRouter();

  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatar ?? "");
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
        const isVisible = currentUser?.role === "admin" || t.picIds?.includes(currentUser?.id ?? "");
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

  const handleNotifClick = (taskId?: string, notifId?: string) => {
    if (notifId) markNotificationRead(notifId);
    if (taskId) router.push("/dashboard/tasks");
    setShowNotif(false);
  };

  const title = PAGE_TITLES[pathname] ?? "Nero Ops";
  const initials = currentUser?.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase() ?? "?";
  const isAdmin = currentUser?.role === "admin";

  return (
    <>
      <header
        style={{
          height: 60,
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 24,
          paddingRight: 20,
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* Page title */}
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginRight: "auto" }}>
          {title}
        </span>

        {/* Search trigger */}
        <button
          onClick={() => setShowSearch(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 9,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 13,
            minWidth: 160,
          }}
        >
          <Search size={14} />
          <span>Tìm kiếm...</span>
          <span style={{ marginLeft: "auto", fontSize: 10, background: "var(--border)", borderRadius: 4, padding: "1px 6px" }}>Ctrl+K</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
            transition: "all 0.2s",
          }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotif((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--bg-secondary)",
              border: `1px solid ${showNotif ? "var(--accent-blue)" : "var(--border)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: showNotif ? "var(--accent-blue)" : "var(--text-secondary)",
              position: "relative",
            }}
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
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: 360,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                boxShadow: "0 20px 60px var(--shadow)",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setShowProfile(true)}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{currentUser?.fullName.split(" ").slice(-2).join(" ")}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{isAdmin ? "Quản trị viên" : currentUser?.department}</div>
          </div>
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isAdmin ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white" }}>
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* Profile Modal */}
      {showProfile && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowProfile(false)}
        >
          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 400, background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 32px 80px var(--shadow)", overflow: "hidden" }}>
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
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowSearch(false)}
        >
          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 580, background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 32px 80px var(--shadow)", overflow: "hidden" }}>
            {/* Search input */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: searchQuery ? "1px solid var(--border)" : "none" }}>
              <Search size={18} color="var(--accent-blue)" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm task, dự án..."
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
                    Không tìm thấy kết quả cho "{searchQuery}"
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
                Nhập ít nhất 2 ký tự để tìm kiếm...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
