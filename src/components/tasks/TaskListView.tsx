"use client";

import { useState, useEffect } from "react";
import { Task, Brand, User, TaskPriority, TaskStatus } from "@/lib/types";
import { format, parseISO, isPast } from "date-fns";
import { AlertCircle, Calendar, ChevronDown, ChevronRight, CheckSquare, Square, Edit3 } from "lucide-react";

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  todo: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
  inprogress: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  review: { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  done: { bg: "rgba(16,185,129,0.12)", text: "#34d399", border: "rgba(16,185,129,0.3)" },
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Chờ xử lý", inprogress: "Đang thực hiện", review: "Chờ duyệt", done: "Hoàn thành",
};
const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: "#6b7280", label: "Thấp" },
  medium: { color: "#f59e0b", label: "Vừa" },
  high: { color: "#ef4444", label: "Cao" },
};

interface Props {
  tasks: Task[];
  brands: Brand[];
  users: User[];
  onTaskClick: (task: Task) => void;
}

export default function TaskListView({ tasks, brands, users, onTaskClick }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const columnWidths = isMobile ? "28px 1fr 70px 80px" : "28px 2.5fr 1fr 1.2fr 1fr 1fr 90px";

  const getBrand = (id: string) => brands.find((b) => b.id === id);
  const getPics = (ids: string[]) => (ids ?? []).map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];
  const toggleExpand = (id: string) => setExpandedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)" }}>
        <AlertCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 16, marginBottom: 6 }}>Không có công việc nào</p>
        <p style={{ fontSize: 13 }}>Hãy tạo công việc mới hoặc thay đổi bộ lọc</p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: columnWidths, padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        {isMobile ? (
          ["", "Công việc", "Hạn", "Trạng thái"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))
        ) : (
          ["", "Tên công việc", "Brand", "PIC", "Deadline", "Ưu tiên", "Trạng thái"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))
        )}
      </div>

      {tasks.map((task, i) => {
        const brand = getBrand(task.brandId);
        const pics = getPics(task.picIds ?? [task.picId ?? ""].filter(Boolean));
        const isOverdue = task.status !== "done" && task.deadline && isPast(parseISO(task.deadline));
        const doneSubCount = task.subTasks.filter((s) => s.status === "done").length;
        const isExpanded = expandedIds.has(task.id);
        const statusConf = STATUS_COLORS[task.status];

        return (
          <div key={task.id}>
            {/* Main row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: columnWidths,
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                transition: "background 0.15s",
                alignItems: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Expand toggle */}
              <div onClick={() => toggleExpand(task.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}>
                {task.subTasks.length > 0 ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span style={{ width: 13 }} />}
              </div>

              {/* Title */}
              <div onClick={() => onTaskClick(task)}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_CONFIG[task.priority].color, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "nowrap" : "normal" }}>{task.title}</span>
                </div>
                {task.subTasks.length > 0 && !isMobile && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {doneSubCount}/{task.subTasks.length} sub-tasks hoàn thành
                  </div>
                )}
              </div>

              {/* Brand (Desktop) */}
              {!isMobile && (
                <div>
                  {brand && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6, background: `${brand.color}18`, border: `1px solid ${brand.color}40`, fontSize: 11, color: brand.color, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: brand.color }} />
                      {brand.name}
                    </span>
                  )}
                </div>
              )}

              {/* PICs (Desktop) */}
              {!isMobile && (
                <div style={{ display: "flex", gap: 3 }}>
                  {pics.slice(0, 3).map((p, idx) => (
                    <div key={p.id} style={{ width: 26, height: 26, borderRadius: 7, background: p.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", marginLeft: idx > 0 ? -5 : 0, border: "1.5px solid var(--bg-card)" }} title={p.fullName}>
                      {p.fullName.split(" ").slice(-1)[0].charAt(0)}
                    </div>
                  ))}
                  {pics.length > 3 && <span style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "center" }}>+{pics.length - 3}</span>}
                </div>
              )}

              {/* Deadline */}
              <div style={{ fontSize: 12, color: isOverdue ? "var(--accent-red)" : "var(--text-secondary)", fontWeight: isOverdue ? 700 : 400, display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={12} />
                {isMobile ? format(parseISO(task.deadline), "dd/MM") : format(parseISO(task.deadline), "dd/MM/yyyy")}
                {isOverdue && <AlertCircle size={11} />}
              </div>

              {/* Priority (Desktop) */}
              {!isMobile && (
                <div>
                  <span style={{ fontSize: 11, color: PRIORITY_CONFIG[task.priority].color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: PRIORITY_CONFIG[task.priority].color }} />
                    {PRIORITY_CONFIG[task.priority].label}
                  </span>
                </div>
              )}

              {/* Status */}
              <div>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: statusConf.bg, color: statusConf.text, border: `1px solid ${statusConf.border}`, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {isMobile ? STATUS_LABELS[task.status].split(" ").pop() : STATUS_LABELS[task.status]}
                </span>
              </div>
            </div>

            {/* Expanded sub-tasks */}
            {isExpanded && task.subTasks.length > 0 && (
              <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                {task.subTasks.map((st) => {
                  const stPics = getPics(st.picIds ?? []);
                  const stOverdue = st.status === "pending" && isPast(parseISO(st.deadline));
                  return (
                    <div
                      key={st.id}
                      style={{ display: "grid", gridTemplateColumns: columnWidths, padding: "8px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}
                    >
                      {/* Checkbox icon */}
                      <div style={{ display: "flex", justifyContent: "center", paddingLeft: 8 }}>
                        {st.status === "done" ? <CheckSquare size={13} color="var(--accent-green)" /> : <Square size={13} color="var(--text-muted)" />}
                      </div>

                      {/* Content */}
                      <div>
                        <div style={{ fontSize: 12, color: st.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: st.status === "done" ? "line-through" : "none" }}>
                          {st.content}
                        </div>
                        {st.acceptanceNotes && (
                          <div style={{ fontSize: 10, color: "var(--accent-green)", marginTop: 2 }}>📝 {st.acceptanceNotes}</div>
                        )}
                      </div>

                      {/* Empty brand col */}
                      <div />

                      {/* Sub PIC */}
                      <div style={{ display: "flex", gap: 3 }}>
                        {stPics.map((p) => (
                          <div key={p.id} style={{ width: 20, height: 20, borderRadius: 5, background: p.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }} title={p.fullName}>
                            {p.fullName.split(" ").slice(-1)[0].charAt(0)}
                          </div>
                        ))}
                      </div>

                      {/* Sub deadline */}
                      <div style={{ fontSize: 11, color: stOverdue ? "var(--accent-red)" : "var(--text-muted)", fontWeight: stOverdue ? 600 : 400 }}>
                        {format(parseISO(st.deadline), "dd/MM/yyyy")}
                      </div>

                      {/* Empty priority col */}
                      <div />

                      {/* Sub status */}
                      <div>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: st.status === "done" ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.12)", color: st.status === "done" ? "var(--accent-green)" : "var(--text-muted)", border: `1px solid ${st.status === "done" ? "rgba(16,185,129,0.3)" : "var(--border)"}`, fontWeight: 600 }}>
                          {st.status === "done" ? "Xong" : "Chưa xong"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
