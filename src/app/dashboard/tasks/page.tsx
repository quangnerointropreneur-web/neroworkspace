"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, useData } from "@/context/AppContext";
import { TaskView, TaskFilters, TaskPriority } from "@/lib/types";
import TaskListView from "@/components/tasks/TaskListView";
import TaskBoardView from "@/components/tasks/TaskBoardView";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";
import TaskOperationsView from "@/components/tasks/TaskOperationsView";
import TaskModal from "@/components/tasks/TaskModal";
import { canAccessBrand, getVisibleBrands } from "@/lib/permissions";
import { CheckSquare, List, Columns, Calendar, Plus, X, Filter, History, Search } from "lucide-react";

const DEFAULT_FILTERS: TaskFilters = {
  brandId: "",
  picId: "",
  status: "",
  priority: "",
  search: "",
  dateFrom: "",
  dateTo: "",
  showHistory: false,
  projectId: "",
};

export default function TasksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const { currentUser } = useAuth();
  const { state, addTask, updateTaskStatus } = useData();
  const searchParams = useSearchParams();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "assistant";

  const [view, setView] = useState<TaskView>("work");
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dismissedDeepLinkId, setDismissedDeepLinkId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const deepLinkTaskId = searchParams.get("taskId") ?? searchParams.get("id");
  const selectedModalTaskId = selectedTaskId ?? (deepLinkTaskId && dismissedDeepLinkId !== deepLinkTaskId ? deepLinkTaskId : null);
  const selectedTask = selectedModalTaskId ? state.tasks.find((task) => task.id === selectedModalTaskId && canAccessBrand(currentUser, task.brandId)) ?? null : null;

  // Deep linking and Actions from Telegram
  const { approveSubTask } = useData();
  useEffect(() => {
    const taskId = searchParams.get("taskId");
    const subTaskId = searchParams.get("subTaskId");
    const action = searchParams.get("action");

    if (taskId && state.tasks.length > 0) {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        // 1. Handle Automatic Actions (e.g. Approve from Telegram)
        if (action === "approve" && subTaskId && isAdmin) {
          approveSubTask(taskId, subTaskId, "Đã duyệt nhanh qua Telegram");
          // Remove action from URL to prevent re-approval on refresh
          const newUrl = window.location.pathname + window.location.search.replace(/[?&]action=approve/, '').replace(/[?&]subTaskId=[^&]+/, '');
          window.history.replaceState({}, '', newUrl);
        }

        // The modal is derived from the URL query, so deep links open without
        // forcing extra state updates during render synchronization.
      }
    }
  }, [searchParams, state.tasks, isAdmin, approveSubTask]);

  // Add task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBrandId, setNewBrandId] = useState(state.brands[0]?.id ?? "");
  const defaultAssigneeIds = currentUser?.role === "employee" ? [currentUser.id] : [];
  const [newPicIds, setNewPicIds] = useState<string[]>(defaultAssigneeIds);
  const [newWatcherIds, setNewWatcherIds] = useState<string[]>([]);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newProjectId, setNewProjectId] = useState("");

  const visibleBrands = useMemo(() => getVisibleBrands(state.brands, currentUser), [state.brands, currentUser]);
  const visibleProjects = useMemo(
    () => state.projects.filter((project) => canAccessBrand(currentUser, project.brandId)),
    [state.projects, currentUser]
  );

  const effectiveNewBrandId = canAccessBrand(currentUser, newBrandId)
    ? newBrandId
    : visibleBrands[0]?.id ?? "";

  const brandProjects = useMemo(() => {
    return visibleProjects.filter(p => p.brandId === effectiveNewBrandId && p.status !== "archived");
  }, [visibleProjects, effectiveNewBrandId]);

  const filterProjects = useMemo(() => {
    if (!filters.brandId) return visibleProjects.filter(p => p.status !== "archived");
    return visibleProjects.filter(p => p.brandId === filters.brandId && p.status !== "archived");
  }, [visibleProjects, filters.brandId]);

  const handleAddTask = () => {
    if (!newTitle.trim() || !newDeadline || !effectiveNewBrandId) return;
    const task = addTask({
      title: newTitle.trim(),
      description: newDesc,
      brandId: effectiveNewBrandId,
      picId: newPicIds[0] ?? "",
      picIds: newPicIds,
      watcherIds: newWatcherIds,
      startDate: newStartDate,
      deadline: newDeadline,
      status: "todo",
      priority: newPriority,
      projectId: newProjectId || undefined,
    });
    setSelectedTaskId(task.id);
    setShowAddTask(false);
    resetAddForm();
  };

  const togglePicId = (id: string) =>
    setNewPicIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleWatcherId = (id: string) =>
    setNewWatcherIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const resetAddForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewBrandId(visibleBrands[0]?.id ?? "");
    setNewPicIds(defaultAssigneeIds);
    setNewWatcherIds([]);
    setNewStartDate(new Date().toISOString().split("T")[0]);
    setNewDeadline("");
    setNewPriority("medium");
    setNewProjectId("");
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const uid = currentUser?.id ?? "";
    let tasks = state.tasks.filter((t) => canAccessBrand(currentUser, t.brandId));
    tasks = isAdmin
      ? state.tasks
      : state.tasks.filter((t) => t.picIds?.includes(uid) || t.picId === uid || t.watcherIds?.includes(uid));
    tasks = tasks.filter((t) => canAccessBrand(currentUser, t.brandId));

    if (filters.brandId) tasks = tasks.filter((t) => t.brandId === filters.brandId);
    if (filters.picId) tasks = tasks.filter((t) => t.picIds?.includes(filters.picId) || t.picId === filters.picId);
    if (filters.status) tasks = tasks.filter((t) => t.status === filters.status);
    if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority);
    if (filters.projectId) tasks = tasks.filter((t) => t.projectId === filters.projectId);
    if (filters.search)
      tasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.subTasks.some((subTask) => subTask.content.toLowerCase().includes(filters.search.toLowerCase()))
      );
    if (filters.dateFrom)
      tasks = tasks.filter((t) => t.deadline && t.deadline >= filters.dateFrom);
    if (filters.dateTo)
      tasks = tasks.filter((t) => t.deadline && t.deadline <= filters.dateTo);

    // Filter out completed and cancelled tasks unless History mode is active
    if (!filters.showHistory) {
      tasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
    }
    return [...tasks].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }, [state.tasks, filters, currentUser, isAdmin]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "showHistory") return value === true;
    return value !== "";
  });

  // Add mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const setFilter = (key: keyof TaskFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const viewButtons = [
    { id: "work" as TaskView, icon: CheckSquare, label: "Xử lý" },
    { id: "list" as TaskView, icon: List, label: "List" },
    { id: "board" as TaskView, icon: Columns, label: "Board" },
    { id: "calendar" as TaskView, icon: Calendar, label: "Lịch" },
  ];

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 12px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
  };

  return (    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 14 }}>
        {/* Sticky Header Container */}
        <div style={{ position: "sticky", top: -16, zIndex: 50, background: "var(--bg-primary)", padding: isMobile ? "0 0 10px 0" : "0 0 12px 0", margin: "0 0 -4px 0", display: "flex", flexDirection: "column", gap: isMobile ? 10 : 12 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>
                Công việc
              </h1>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {filteredTasks.length} task {hasActiveFilters ? "(đã lọc)" : ""}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: isMobile ? "1 0 100%" : "0 1 360px", minWidth: isMobile ? "100%" : 260 }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Tìm task, mô tả, sub-task..."
                  value={filters.search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  style={{ ...inputStyle, width: "100%", paddingLeft: 36, height: 40 }}
                />
              </div>

              {/* View toggle group */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  {viewButtons.map((btn) => {
                    const Icon = btn.icon;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => setView(btn.id)}
                        title={btn.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: isMobile ? "8px 10px" : "8px 14px",
                          border: "none",
                          background: view === btn.id ? "rgba(59,130,246,0.15)" : "transparent",
                          color: view === btn.id ? "#60a5fa" : "var(--text-secondary)",
                          fontSize: 13,
                          fontWeight: view === btn.id ? 600 : 400,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderRight: "1px solid var(--border)",
                        }}
                      >
                        <Icon size={14} />
                        {!isMobile && <span>{btn.label}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* History toggle next to views */}
                <button
                  onClick={() => setFilters(f => ({ ...f, showHistory: !f.showHistory }))}
                  title={filters.showHistory ? "Ẩn lịch sử" : "Xem lịch sử"}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10,
                    background: filters.showHistory ? "rgba(245,158,11,0.15)" : "var(--bg-card)",
                    border: `1px solid ${filters.showHistory ? "#f59e0b" : "var(--border)"}`,
                    color: filters.showHistory ? "#f59e0b" : "var(--text-secondary)", 
                    fontSize: 13, fontWeight: 600, cursor: "pointer", 
                    transition: "all 0.2s"
                  }}
                >
                  <History size={14} />
                  {!isMobile && <span>{filters.showHistory ? "History On" : "History Off"}</span>}
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {isMobile && (
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, 
                      background: hasActiveFilters ? "rgba(59,130,246,0.1)" : "var(--bg-card)",
                      border: `1px solid ${hasActiveFilters ? "var(--accent-blue)" : "var(--border)"}`,
                      color: hasActiveFilters ? "var(--accent-blue)" : "var(--text-secondary)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    <Filter size={14} />
                    <span>Lọc</span>
                  </button>
                )}

                <button
                  onClick={() => setShowAddTask(true)}
                  style={{ 
                    display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "8px 12px" : "9px 18px", 
                    borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", 
                    border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", 
                    boxShadow: "0 4px 16px rgba(59,130,246,0.3)" 
                  }}
                >
                  <Plus size={16} />
                  <span>Thêm</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          {(!isMobile || showFilters) && (
            <div className="animate-fadeIn" style={{ display: "flex", flexWrap: "nowrap", gap: 8, alignItems: "center", background: "var(--bg-card)", padding: isMobile ? "10px" : "10px 12px", borderRadius: 14, border: "1px solid var(--border)", boxShadow: isMobile ? "0 10px 40px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.08)", overflowX: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", marginRight: 5 }}>
                <Filter size={14} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Lọc</span>
              </div>

              <select value={filters.brandId} onChange={(e) => setFilter("brandId", e.target.value)} style={{ ...inputStyle, cursor: "pointer", minWidth: 140 }}>
                <option value="">Brand</option>
                {visibleBrands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {isAdmin && (
                <select value={filters.picId} onChange={(e) => setFilter("picId", e.target.value)} style={{ ...inputStyle, cursor: "pointer", minWidth: 140 }}>
                  <option value="">Người xử lý</option>
                  {state.users.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              )}

              <select value={filters.projectId} onChange={(e) => setFilter("projectId", e.target.value)} style={{ ...inputStyle, cursor: "pointer", minWidth: 180, flex: "1 0 180px" }}>
                <option value="">Dự án</option>
                {filterProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} style={{ ...inputStyle, cursor: "pointer", minWidth: 138 }}>
                <option value="">Trạng thái</option>
                <option value="todo">Chờ xử lý</option>
                <option value="inprogress">Đang thực hiện</option>
                <option value="review">Chờ duyệt</option>
                <option value="done">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>

              <select value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)} style={{ ...inputStyle, cursor: "pointer", minWidth: 110 }}>
                <option value="">Ưu tiên</option>
                <option value="high">Cao</option>
                <option value="medium">Vừa</option>
                <option value="low">Thấp</option>
              </select>

              <div style={{ display: "flex", gap: 5, alignItems: "center", flex: "0 0 auto" }}>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)} style={{ ...inputStyle, width: 140 }} title="Từ ngày" />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
                <input type="date" value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)} style={{ ...inputStyle, width: 140 }} title="Đến ngày" />
              </div>

              <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{ 
                      display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 10, 
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", 
                      color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer", 
                      flex: 1, justifyContent: "center" 
                    }}
                  >
                    <X size={12} /> Xóa lọc
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Views */}
        {view === "work" && (
          <TaskOperationsView
            tasks={filteredTasks}
            brands={visibleBrands}
            users={state.users}
            projects={visibleProjects}
            onOpenTask={(task) => setSelectedTaskId(task.id)}
          />
        )}
        {view === "list" && (
          <TaskListView
            tasks={filteredTasks}
            brands={visibleBrands}
            users={state.users}
            projects={visibleProjects}
            onTaskClick={(task) => setSelectedTaskId(task.id)}
          />
        )}
        {view === "board" && (
          <TaskBoardView
            tasks={filteredTasks}
            brands={visibleBrands}
            users={state.users}
            projects={visibleProjects}
            onTaskClick={(task) => setSelectedTaskId(task.id)}
            onStatusChange={(id, status) => updateTaskStatus(id, status)}
            isAdmin={isAdmin}
            showHistory={filters.showHistory}
          />
        )}
        {view === "calendar" && (
          <TaskCalendarView
            tasks={filteredTasks}
            brands={visibleBrands}
            users={state.users}
            projects={visibleProjects}
            onTaskClick={(task) => setSelectedTaskId(task.id)}
            showHistory={filters.showHistory}
          />
        )}
      </div>

      {/* Task Detail Modal - Outside animation div */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => {
            setSelectedTaskId(null);
            if (deepLinkTaskId) setDismissedDeepLinkId(deepLinkTaskId);
          }}
        />
      )}

      {/* Add Task Modal - Outside animation div */}
      {showAddTask && (
        <div
          style={{ 
            position: "fixed", 
            inset: 0, 
            zIndex: 600, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            background: "rgba(0,0,0,0.75)", 
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            padding: "20px", 
            overflowY: "auto" 
          }}
          onClick={(e) => e.target === e.currentTarget && setShowAddTask(false)}
        >
          <div className="animate-scaleIn" style={{ 
            width: "100%", 
            maxWidth: 560, 
            maxHeight: "90vh",
            background: "var(--bg-card)", 
            borderRadius: 24, 
            border: "1px solid var(--border)", 
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Tạo Task mới</h3>
              <button onClick={() => { setShowAddTask(false); resetAddForm(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
              <div>
                <label style={formLabel}>Tên task *</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nhập tên task..." style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div>
                <label style={formLabel}>Mô tả</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Mô tả chi tiết..." rows={3} style={{ ...inputStyle, width: "100%", resize: "vertical", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                  <label style={formLabel}>Brand *</label>
                  <select value={effectiveNewBrandId} onChange={(e) => setNewBrandId(e.target.value)} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
                    {visibleBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                  <label style={formLabel}>Người xử lý (có thể chọn nhiều)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {state.users.filter((u) => canAccessBrand(u, effectiveNewBrandId)).map((u) => {
                      const sel = newPicIds.includes(u.id);
                      return (
                        <button key={u.id} type="button" onClick={() => togglePicId(u.id)}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: sel ? (u.role === "admin" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)") : "var(--bg-hover)", border: `1px solid ${sel ? (u.role === "admin" ? "rgba(59,130,246,0.4)" : "rgba(16,185,129,0.4)") : "var(--border)"}`, color: sel ? (u.role === "admin" ? "var(--accent-blue)" : "var(--accent-green)") : "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontWeight: sel ? 700 : 400 }}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: 5, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>
                            {u.fullName.split(" ").slice(-1)[0].charAt(0)}
                          </div>
                          <span style={{ whiteSpace: "nowrap" }}>{u.fullName.split(" ").slice(-2).join(" ")}</span>
                          {sel && " ✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                  <label style={formLabel}>Người theo dõi thêm</label>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 7 }}>
                    Admin sẽ tự được thêm vào theo dõi, không tính là người xử lý.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {state.users.filter((u) => u.role !== "admin" && canAccessBrand(u, effectiveNewBrandId)).map((u) => {
                      const sel = newWatcherIds.includes(u.id);
                      const assigned = newPicIds.includes(u.id);
                      return (
                        <button key={u.id} type="button" onClick={() => !assigned && toggleWatcherId(u.id)}
                          disabled={assigned}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: sel ? "rgba(59,130,246,0.12)" : assigned ? "rgba(156,163,175,0.08)" : "var(--bg-hover)", border: `1px solid ${sel ? "rgba(59,130,246,0.35)" : "var(--border)"}`, color: sel ? "var(--accent-blue)" : assigned ? "var(--text-muted)" : "var(--text-secondary)", cursor: assigned ? "not-allowed" : "pointer", fontSize: 12, fontWeight: sel ? 700 : 400, opacity: assigned ? 0.6 : 1 }}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: 5, background: u.role === "assistant" ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>
                            {u.fullName.split(" ").slice(-1)[0].charAt(0)}
                          </div>
                          <span style={{ whiteSpace: "nowrap" }}>{u.fullName.split(" ").slice(-2).join(" ")}</span>
                          {assigned ? " Đang xử lý" : sel ? " ✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={formLabel}>Ngày bắt đầu</label>
                  <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </div>
                <div>
                  <label style={formLabel}>Deadline *</label>
                  <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </div>
                <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                  <label style={formLabel}>Ưu tiên</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
                    <option value="low">Thấp</option>
                    <option value="medium">Vừa</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
                <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                  <label style={formLabel}>Thuộc Dự án (ngắn hạn)</label>
                  <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
                    <option value="">Không thuộc dự án nào</option>
                    {brandProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button onClick={() => { setShowAddTask(false); resetAddForm(); }} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>
                Hủy
              </button>
              <button onClick={handleAddTask} disabled={!newTitle.trim() || !newDeadline || !effectiveNewBrandId} style={{ padding: "10px 24px", borderRadius: 10, background: !newTitle.trim() || !newDeadline || !effectiveNewBrandId ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", cursor: !newTitle.trim() || !newDeadline || !effectiveNewBrandId ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}>
                Tạo task
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const formLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
