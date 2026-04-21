"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Task, TaskView, TaskFilters, TaskStatus, TaskPriority } from "@/lib/types";
import TaskListView from "@/components/tasks/TaskListView";
import TaskBoardView from "@/components/tasks/TaskBoardView";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";
import TaskModal from "@/components/tasks/TaskModal";
import { List, Columns, Calendar, Plus, X, Filter, History } from "lucide-react";

const DEFAULT_FILTERS: TaskFilters = {
  brandId: "",
  picId: "",
  status: "",
  priority: "",
  search: "",
  dateFrom: "",
  dateTo: "",
  showHistory: false,
};

export default function TasksPage() {
  const { currentUser } = useAuth();
  const { state, addTask, updateTaskStatus } = useData();
  const isAdmin = currentUser?.role === "admin";

  const [view, setView] = useState<TaskView>("board");
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  // Add task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBrandId, setNewBrandId] = useState(state.brands[0]?.id ?? "");
  const [newPicIds, setNewPicIds] = useState<string[]>([currentUser?.id ?? ""]);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");

  const handleAddTask = () => {
    if (!newTitle.trim() || !newDeadline) return;
    const task = addTask({
      title: newTitle.trim(),
      description: newDesc,
      brandId: newBrandId,
      picId: newPicIds[0] ?? "",
      picIds: newPicIds,
      startDate: newStartDate,
      deadline: newDeadline,
      status: "todo",
      priority: newPriority,
    });
    setSelectedTask(task);
    setShowAddTask(false);
    resetAddForm();
  };

  const togglePicId = (id: string) =>
    setNewPicIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const resetAddForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewBrandId(state.brands[0]?.id ?? "");
    setNewPicIds([currentUser?.id ?? ""]);
    setNewStartDate(new Date().toISOString().split("T")[0]);
    setNewDeadline("");
    setNewPriority("medium");
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const uid = currentUser?.id ?? "";
    let tasks = isAdmin
      ? state.tasks
      : state.tasks.filter((t) => t.picIds?.includes(uid) || t.picId === uid);

    if (filters.brandId) tasks = tasks.filter((t) => t.brandId === filters.brandId);
    if (filters.picId) tasks = tasks.filter((t) => t.picIds?.includes(filters.picId) || t.picId === filters.picId);
    if (filters.status) tasks = tasks.filter((t) => t.status === filters.status);
    if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority);
    if (filters.search)
      tasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    if (filters.dateFrom)
      tasks = tasks.filter((t) => t.deadline && t.deadline >= filters.dateFrom);
    if (filters.dateTo)
      tasks = tasks.filter((t) => t.deadline && t.deadline <= filters.dateTo);

    // Filter out completed tasks unless History mode is active
    if (!filters.showHistory) {
      tasks = tasks.filter((t) => t.status !== "done");
    }
    return [...tasks].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }, [state.tasks, filters, currentUser, isAdmin]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  // Add mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // Deep linking for specific task via URL query (?id=xxx)
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("id");
    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        // Clear param to avoid re-opening on manual refresh if desired, 
        // or keep it for link sharing.
      }
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [state.tasks]);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const setFilter = (key: keyof TaskFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const viewButtons = [
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
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 20 }}>
        {/* Sticky Header Container */}
        <div style={{ position: "sticky", top: -16, zIndex: 50, background: "var(--bg-primary)", padding: isMobile ? "0 0 10px 0" : "0 0 16px 0", margin: "0 0 -4px 0", display: "flex", flexDirection: "column", gap: isMobile ? 12 : 20 }}>
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

            <div style={{ display: "flex", gap: 8, alignItems: "center", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end" }}>
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
            <div className="animate-fadeIn" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", background: "var(--bg-card)", padding: isMobile ? "12px" : "12px 16px", borderRadius: 16, border: "1px solid var(--border)", boxShadow: isMobile ? "0 10px 40px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", marginRight: 5 }}>
                <Filter size={14} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Lọc</span>
              </div>

              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                style={{ ...inputStyle, flex: isMobile ? "1 0 100%" : 1, minWidth: isMobile ? "100%" : 150 }}
              />

              <select value={filters.brandId} onChange={(e) => setFilter("brandId", e.target.value)} style={{ ...inputStyle, cursor: "pointer", flex: isMobile ? 1 : "initial" }}>
                <option value="">Brand</option>
                {state.brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {isAdmin && (
                <select value={filters.picId} onChange={(e) => setFilter("picId", e.target.value)} style={{ ...inputStyle, cursor: "pointer", flex: isMobile ? 1 : "initial" }}>
                  <option value="">PIC</option>
                  {state.users.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              )}

              <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} style={{ ...inputStyle, cursor: "pointer", flex: isMobile ? 1 : "initial" }}>
                <option value="">Trạng thái</option>
                <option value="todo">Chờ xử lý</option>
                <option value="inprogress">Đang thực hiện</option>
                <option value="review">Chờ duyệt</option>
                <option value="done">Hoàn thành</option>
              </select>

              <select value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)} style={{ ...inputStyle, cursor: "pointer", flex: isMobile ? 1 : "initial" }}>
                <option value="">Ưu tiên</option>
                <option value="high">Cao</option>
                <option value="medium">Vừa</option>
                <option value="low">Thấp</option>
              </select>

              <div style={{ display: "flex", gap: 5, alignItems: "center", width: isMobile ? "100%" : "auto" }}>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)} style={{ ...inputStyle, flex: 1 }} title="Từ ngày" />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
                <input type="date" value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)} style={{ ...inputStyle, flex: 1 }} title="Đến ngày" />
              </div>

              <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
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
        {view === "list" && (
          <TaskListView
            tasks={filteredTasks}
            brands={state.brands}
            users={state.users}
            onTaskClick={setSelectedTask}
          />
        )}
        {view === "board" && (
          <TaskBoardView
            tasks={filteredTasks}
            brands={state.brands}
            users={state.users}
            onTaskClick={setSelectedTask}
            onStatusChange={(id, status) => updateTaskStatus(id, status)}
            isAdmin={isAdmin}
            showHistory={filters.showHistory}
          />
        )}
        {view === "calendar" && (
          <TaskCalendarView
            tasks={filteredTasks}
            brands={state.brands}
            users={state.users}
            onTaskClick={setSelectedTask}
            showHistory={filters.showHistory}
          />
        )}
      </div>

      {/* Task Detail Modal - Outside animation div */}
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
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
                  <select value={newBrandId} onChange={(e) => setNewBrandId(e.target.value)} style={{ ...inputStyle, width: "100%", cursor: "pointer" }}>
                    {state.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                  <label style={formLabel}>PIC (có thể chọn nhiều)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {state.users.map((u) => {
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
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button onClick={() => { setShowAddTask(false); resetAddForm(); }} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>
                Hủy
              </button>
              <button onClick={handleAddTask} disabled={!newTitle.trim() || !newDeadline} style={{ padding: "10px 24px", borderRadius: 10, background: !newTitle.trim() || !newDeadline ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", cursor: !newTitle.trim() || !newDeadline ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}>
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
