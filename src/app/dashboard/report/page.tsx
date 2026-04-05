"use client";

import { useState, useMemo } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  BarChart2, Users, Calendar, Clock, CheckCircle, TrendingUp,
  AlertCircle, ChevronDown, ChevronUp, CheckSquare, Square,
} from "lucide-react";
import TaskModal from "@/components/tasks/TaskModal";
import { Task } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  todo: "#6b7280", inprogress: "#3b82f6", review: "#f59e0b", done: "#10b981",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "Chờ xử lý", inprogress: "Đang thực hiện", review: "Chờ duyệt", done: "Hoàn thành",
};
const CHECKIN_STATUS: Record<string, { label: string; color: string }> = {
  present: { label: "Đúng giờ", color: "var(--accent-green)" },
  late: { label: "Đi muộn", color: "var(--accent-yellow)" },
  early_leave: { label: "Về sớm", color: "var(--accent-red)" },
  absent: { label: "Vắng mặt", color: "#6b7280" },
};

const THIS_MONTH = new Date().toISOString().slice(0, 7);

export default function ReportPage() {
  const { currentUser } = useAuth();
  const { state } = useData();
  const router = useRouter();

  const isAdmin = currentUser?.role === "admin";

  // Redirect non-admins
  if (!isAdmin) {
    router.replace("/dashboard");
    return null;
  }

  return <AdminReport state={state} />;
}

function AdminReport({ state }: { state: ReturnType<typeof useData>["state"] }) {
  const [filterMode, setFilterMode] = useState<"month" | "day">("month");
  const [selectedMonth, setSelectedMonth] = useState(THIS_MONTH);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split("T")[0]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const isMatchDate = (dateStr: string) => filterMode === "month" ? dateStr.startsWith(selectedMonth) : dateStr.startsWith(selectedDay);

  // Overall stats
  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter((t) => t.status === "done").length;
  const totalCheckins = state.checkIns.filter((c) => isMatchDate(c.date)).length;
  const lateCheckins = state.checkIns.filter((c) => isMatchDate(c.date) && c.status === "late").length;

  // Per-user stats
  const userStats = useMemo(() =>
    state.users.map((user) => {
      const uid = user.id;
      const myTasks = state.tasks.filter((t) => t.picIds?.includes(uid) || t.picId === uid);
      const mySubTasks = state.tasks.flatMap((t) =>
        t.subTasks.filter((st) => st.picIds?.includes(uid)).map((st) => ({ ...st, taskTitle: t.title, taskId: t.id }))
      );
      const checkins = state.checkIns.filter((c) => c.userId === uid && isMatchDate(c.date));
      return {
        user,
        tasks: myTasks,
        subTasks: mySubTasks,
        taskDone: myTasks.filter((t) => t.status === "done").length,
        taskInProgress: myTasks.filter((t) => t.status === "inprogress").length,
        checkinDays: checkins.length,
        checkinLate: checkins.filter((c) => c.status === "late").length,
        checkinPresent: checkins.filter((c) => c.status === "present").length,
        checkins,
        subDone: mySubTasks.filter((s) => s.status === "done").length,
      };
    }),
    [state.users, state.tasks, state.checkIns, filterMode, selectedMonth, selectedDay]
  );

  const getBrand = (id: string) => state.brands.find((b) => b.id === id);

  const inp: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "7px 11px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Báo cáo tổng hợp
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Theo dõi hiệu suất toàn bộ nhân sự
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as any)} style={{ ...inp, cursor: "pointer" }}>
            <option value="month">Theo tháng</option>
            <option value="day">Theo ngày</option>
          </select>
          {filterMode === "month" ? (
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={inp} />
          ) : (
            <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} style={inp} />
          )}
        </div>
      </div>

      {/* Overall stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Tổng tasks", value: totalTasks, sub: `${doneTasks} hoàn thành`, color: "#3b82f6", icon: <CheckCircle size={18} /> },
          { label: "Nhân sự", value: state.users.length, sub: "đang hoạt động", color: "#8b5cf6", icon: <Users size={18} /> },
          { label: "Ngày công tháng này", value: totalCheckins, sub: `${lateCheckins} đi muộn`, color: "#10b981", icon: <Calendar size={18} /> },
          { label: "KPI Logs", value: state.kpiLogs.filter((k) => k.date.startsWith(selectedMonth)).length, sub: "bản ghi trong tháng", color: "#f59e0b", icon: <TrendingUp size={18} /> },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: `1px solid ${s.color}30`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Per-employee table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={15} color="var(--accent-blue)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Chi tiết từng nhân viên — {selectedMonth}</span>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 40px", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          {["Nhân viên", "Tasks", "Xong", "Sub-tasks", "Ngày công", "Đi muộn", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>

        {userStats.map((us) => {
          const isExpanded = expandedUser === us.user.id;
          const taskDonePct = us.tasks.length > 0 ? Math.round((us.taskDone / us.tasks.length) * 100) : 0;
          return (
            <div key={us.user.id}>
              {/* User row */}
              <div
                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 40px", padding: "14px 20px", borderBottom: "1px solid var(--border)", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => setExpandedUser(isExpanded ? null : us.user.id)}
              >
                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: us.user.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }}>
                    {us.user.fullName.split(" ").slice(-1)[0].charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{us.user.fullName}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{us.user.department}</div>
                  </div>
                </div>
                {/* Tasks */}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{us.tasks.length}</div>
                {/* Done */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-green)" }}>{us.taskDone}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{taskDonePct}%</div>
                </div>
                {/* Sub-tasks */}
                <div style={{ fontSize: 13, color: "var(--accent-purple)", fontWeight: 700 }}>
                  {us.subDone}/{us.subTasks.length}
                </div>
                {/* Attendance */}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-blue)" }}>{us.checkinDays}</div>
                {/* Late */}
                <div style={{ fontSize: 13, fontWeight: 700, color: us.checkinLate > 0 ? "var(--accent-yellow)" : "var(--text-muted)" }}>
                  {us.checkinLate > 0 ? `⚠ ${us.checkinLate}` : "—"}
                </div>
                {/* Expand */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", padding: "16px 20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* Tasks detail */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                        Công việc được giao
                      </div>
                      {us.tasks.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Chưa có task nào.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {us.tasks.map((task) => {
                            const brand = getBrand(task.brandId);
                            return (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer", transition: "border-color 0.15s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-blue)")}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                              >
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[task.status], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                                {brand && <span style={{ fontSize: 10, color: brand.color, fontWeight: 600, flexShrink: 0 }}>{brand.name}</span>}
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: `${STATUS_COLOR[task.status]}15`, color: STATUS_COLOR[task.status], border: `1px solid ${STATUS_COLOR[task.status]}40`, flexShrink: 0 }}>
                                  {STATUS_LABELS[task.status]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Sub-tasks */}
                      {us.subTasks.length > 0 && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 14, marginBottom: 8 }}>
                            Sub-tasks ({us.subDone}/{us.subTasks.length} xong)
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {us.subTasks.map((st) => (
                              <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-secondary)" }}>
                                {st.status === "done"
                                  ? <CheckSquare size={12} color="var(--accent-green)" />
                                  : <Square size={12} color="var(--text-muted)" />
                                }
                                <span style={{ textDecoration: st.status === "done" ? "line-through" : "none", opacity: st.status === "done" ? 0.6 : 1 }}>{st.content}</span>
                                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>↳ {st.taskTitle}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Attendance detail */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                        Chấm công — {selectedMonth}
                      </div>
                      {/* Mini stats */}
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        {[
                          { label: "Đúng giờ", val: us.checkinPresent, color: "var(--accent-green)" },
                          { label: "Đi muộn", val: us.checkinLate, color: "var(--accent-yellow)" },
                          { label: "Tổng", val: us.checkinDays, color: "var(--accent-blue)" },
                        ].map((s) => (
                          <div key={s.label} style={{ flex: 1, background: "var(--bg-card)", borderRadius: 8, padding: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* Records list */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                        {us.checkins.sort((a, b) => b.date.localeCompare(a.date)).map((rec) => {
                          const conf = CHECKIN_STATUS[rec.status] ?? CHECKIN_STATUS.present;
                          return (
                            <div key={rec.id} style={{ display: "flex", gap: 10, padding: "5px 8px", background: "var(--bg-card)", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12, alignItems: "center" }}>
                              <span style={{ color: "var(--text-secondary)", minWidth: 70 }}>{format(parseISO(rec.date), "dd/MM EEE", { locale: vi })}</span>
                              <span style={{ color: "var(--accent-blue)", fontWeight: 700, minWidth: 40 }}>{rec.checkIn}</span>
                              <span style={{ color: rec.checkOut ? "var(--accent-green)" : "var(--text-muted)", minWidth: 40 }}>{rec.checkOut ?? "—"}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: conf.color, marginLeft: "auto" }}>{conf.label}</span>
                            </div>
                          );
                        })}
                        {us.checkins.length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>Chưa có bản ghi chấm công.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
