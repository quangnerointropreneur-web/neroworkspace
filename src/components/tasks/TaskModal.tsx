"use client";

import { useState, useMemo } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Task, SubTask, TaskStatus, TaskPriority } from "@/lib/types";
import { format, parseISO, isPast } from "date-fns";
import {
  X, Edit3, Save, Trash2, Plus, CheckSquare, Square,
  ChevronDown, ChevronUp, AlertCircle, Users, Flag,
  Calendar, Tag, Clock,
} from "lucide-react";

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "todo", label: "Chờ xử lý", color: "#6b7280" },
  { value: "inprogress", label: "Đang thực hiện", color: "#3b82f6" },
  { value: "review", label: "Chờ duyệt", color: "#f59e0b" },
  { value: "done", label: "Hoàn thành", color: "#10b981" },
];
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Thấp", color: "#6b7280" },
  { value: "medium", label: "Vừa", color: "#f59e0b" },
  { value: "high", label: "Cao", color: "#ef4444" },
];

interface Props {
  task: Task;
  onClose: () => void;
}

export default function TaskModal({ task: initialTask, onClose }: Props) {
  const { currentUser } = useAuth();
  const { state, updateTask, deleteTask, addSubTask, updateSubTask, deleteSubTask } = useData();
  const isAdmin = currentUser?.role === "admin";

  // Always use latest task state from context
  const task = state.tasks.find((t) => t.id === initialTask.id) ?? initialTask;
  const brand = state.brands.find((b) => b.id === task.brandId);
  const picUsers = (task.picIds ?? []).map((id) => state.users.find((u) => u.id === id)).filter(Boolean) as typeof state.users;

  // Edit mode for task header
  const [editingTask, setEditingTask] = useState(false);
  const [etTitle, setEtTitle] = useState(task.title);
  const [etDesc, setEtDesc] = useState(task.description);
  const [etStatus, setEtStatus] = useState<TaskStatus>(task.status);
  const [etPriority, setEtPriority] = useState<TaskPriority>(task.priority);
  const [etDeadline, setEtDeadline] = useState(task.deadline);
  const [etPicIds, setEtPicIds] = useState<string[]>(task.picIds ?? []);

  // Sub-task states
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [addingSubTask, setAddingSubTask] = useState(false);
  const [newStContent, setNewStContent] = useState("");
  const [newStDeadline, setNewStDeadline] = useState("");
  const [newStPicIds, setNewStPicIds] = useState<string[]>([]);
  const [showSubNotes, setShowSubNotes] = useState<string | null>(null);

  // Edit sub-task
  const [estContent, setEstContent] = useState("");
  const [estDeadline, setEstDeadline] = useState("");
  const [estPicIds, setEstPicIds] = useState<string[]>([]);
  const [estNotes, setEstNotes] = useState("");
  const [estStatus, setEstStatus] = useState<"pending" | "done">("pending");

  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<string | null>(null);

  const openEditSub = (st: SubTask) => {
    setEditingSubId(st.id);
    setEstContent(st.content);
    setEstDeadline(st.deadline);
    setEstPicIds(st.picIds ?? []);
    setEstNotes(st.acceptanceNotes);
    setEstStatus(st.status);
  };

  const saveEditSub = (stId: string) => {
    updateSubTask(task.id, stId, {
      content: estContent,
      deadline: estDeadline,
      picIds: estPicIds,
      acceptanceNotes: estNotes,
      status: estStatus,
    });
    setEditingSubId(null);
  };

  const saveTask = () => {
    const canDone = task.subTasks.length === 0 || task.subTasks.every((st) => st.status === "done" && st.acceptanceNotes.trim());
    if (etStatus === "done" && !canDone) {
      alert("⚠️ Tất cả sub-tasks phải hoàn thành và có ghi chú nghiệm thu trước khi đóng task.");
      return;
    }
    updateTask(task.id, { title: etTitle, description: etDesc, status: etStatus, priority: etPriority, deadline: etDeadline, picIds: etPicIds, picId: etPicIds[0] });
    setEditingTask(false);
  };

  const handleAddSubTask = () => {
    if (!newStContent.trim() || !newStDeadline) return;
    addSubTask(task.id, { content: newStContent, deadline: newStDeadline, status: "pending", acceptanceNotes: "", picIds: newStPicIds });
    setNewStContent("");
    setNewStDeadline("");
    setNewStPicIds([]);
    setAddingSubTask(false);
  };

  const toggleSubStatus = (st: SubTask) => {
    if (st.status === "pending") {
      updateSubTask(task.id, st.id, { status: "done" });
    } else {
      updateSubTask(task.id, st.id, { status: "pending" });
    }
  };

  const togglePic = (userId: string, current: string[], setFn: (ids: string[]) => void) => {
    setFn(current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  };

  const doneSubCount = task.subTasks.filter((s) => s.status === "done").length;
  const allSubDone = task.subTasks.length === 0 || task.subTasks.every((s) => s.status === "done" && s.acceptanceNotes.trim());
  const isOverdue = task.status !== "done" && isPast(parseISO(task.deadline));

  const inp: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "7px 11px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  };

  const UserPicker = ({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {state.users.map((u) => {
        const sel = selected.includes(u.id);
        return (
          <button key={u.id} onClick={() => togglePic(u.id, selected, onChange)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 7,
              background: sel ? `${u.role === "admin" ? "#3b82f6" : "#10b981"}22` : "var(--bg-secondary)",
              border: `1px solid ${sel ? (u.role === "admin" ? "#3b82f620" : "#10b98120") : "var(--border)"}`,
              color: sel ? (u.role === "admin" ? "var(--accent-blue)" : "var(--accent-green)") : "var(--text-secondary)",
              cursor: "pointer", fontSize: 12, fontWeight: sel ? 700 : 400, transition: "all 0.15s",
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 5, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>
              {u.fullName.split(" ").slice(-1)[0].charAt(0)}
            </div>
            {u.fullName.split(" ").slice(-2).join(" ")}
            {sel && " ✓"}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)", overflowY: "auto" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 720, background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", overflow: "hidden" }}>

        {/* Brand accent bar */}
        <div style={{ height: 4, background: brand?.color ?? "#3b82f6" }} />

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTask ? (
              <input value={etTitle} onChange={(e) => setEtTitle(e.target.value)} style={{ ...inp, fontSize: 17, fontWeight: 700 }} />
            ) : (
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>{task.title}</h2>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {brand && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: `${brand.color}18`, border: `1px solid ${brand.color}40`, color: brand.color, fontWeight: 600 }}>
                  {brand.name}
                </span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>#{task.id.slice(-6)}</span>
              {isOverdue && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
                  <AlertCircle size={11} /> Quá hạn
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {isAdmin && !editingTask && (
              <button onClick={() => setEditingTask(true)} style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", cursor: "pointer", color: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Edit3 size={14} />
              </button>
            )}
            {editingTask && (
              <>
                <button onClick={saveTask} style={{ padding: "6px 14px", borderRadius: 9, background: "var(--accent-green)", border: "none", cursor: "pointer", color: "white", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <Save size={13} /> Lưu
                </button>
                <button onClick={() => setEditingTask(false)} style={{ padding: "6px 12px", borderRadius: 9, background: "var(--bg-hover)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 12 }}>
                  Hủy
                </button>
              </>
            )}
            {isAdmin && !editingTask && (
              <>
                {!confirmDeleteTask ? (
                  <button onClick={() => setConfirmDeleteTask(true)} style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }} title="Xóa task">
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>Chắc chắn xóa?</span>
                    <button onClick={() => { deleteTask(task.id); onClose(); }} style={{ padding: "4px 8px", background: "#f87171", color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Có</button>
                    <button onClick={() => setConfirmDeleteTask(false)} style={{ padding: "4px 8px", background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Hủy</button>
                  </div>
                )}
              </>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: "var(--bg-hover)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Meta fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Status */}
            <div>
              <label style={lbl}><Flag size={12} style={{ display: "inline", marginRight: 4 }} />Trạng thái</label>
              {editingTask ? (
                <select value={etStatus} onChange={(e) => setEtStatus(e.target.value as TaskStatus)} style={{ ...inp, cursor: "pointer" }}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 8, background: `${STATUS_OPTIONS.find(o=>o.value===task.status)?.color}18`, border: `1px solid ${STATUS_OPTIONS.find(o=>o.value===task.status)?.color}40`, color: STATUS_OPTIONS.find(o=>o.value===task.status)?.color, fontSize: 13, fontWeight: 600 }}>
                  {STATUS_OPTIONS.find(o => o.value === task.status)?.label}
                </span>
              )}
            </div>

            {/* Priority */}
            <div>
              <label style={lbl}><AlertCircle size={12} style={{ display: "inline", marginRight: 4 }} />Ưu tiên</label>
              {editingTask ? (
                <select value={etPriority} onChange={(e) => setEtPriority(e.target.value as TaskPriority)} style={{ ...inp, cursor: "pointer" }}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 8, background: `${PRIORITY_OPTIONS.find(o=>o.value===task.priority)?.color}18`, border: `1px solid ${PRIORITY_OPTIONS.find(o=>o.value===task.priority)?.color}40`, color: PRIORITY_OPTIONS.find(o=>o.value===task.priority)?.color, fontSize: 13, fontWeight: 600 }}>
                  {PRIORITY_OPTIONS.find(o => o.value === task.priority)?.label}
                </span>
              )}
            </div>

            {/* Deadline */}
            <div>
              <label style={lbl}><Calendar size={12} style={{ display: "inline", marginRight: 4 }} />Deadline</label>
              {editingTask ? (
                <input type="date" value={etDeadline} onChange={(e) => setEtDeadline(e.target.value)} style={inp} />
              ) : (
                <span style={{ fontSize: 13, color: isOverdue ? "var(--accent-red)" : "var(--text-primary)", fontWeight: isOverdue ? 700 : 500 }}>
                  {format(parseISO(task.deadline), "dd/MM/yyyy")}
                </span>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label style={lbl}><Clock size={12} style={{ display: "inline", marginRight: 4 }} />Bắt đầu</label>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{task.startDate ? format(parseISO(task.startDate), "dd/MM/yyyy") : "—"}</span>
            </div>
          </div>

          {/* PICs */}
          <div>
            <label style={lbl}><Users size={12} style={{ display: "inline", marginRight: 4 }} />Người phụ trách (PIC)</label>
            {editingTask ? (
              <UserPicker selected={etPicIds} onChange={setEtPicIds} />
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {picUsers.length === 0 ? <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Chưa giao cho ai</span> : picUsers.map((u) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
                      {u.fullName.split(" ").slice(-1)[0].charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{u.fullName}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{u.department}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={lbl}><Tag size={12} style={{ display: "inline", marginRight: 4 }} />Mô tả</label>
            {editingTask ? (
              <textarea value={etDesc} onChange={(e) => setEtDesc(e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{task.description || "Chưa có mô tả."}</p>
            )}
          </div>

          {/* ── Sub-tasks ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ ...lbl, margin: 0 }}>Sub-tasks</label>
                {task.subTasks.length > 0 && (
                  <>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{doneSubCount}/{task.subTasks.length}</span>
                    <div style={{ height: 6, width: 80, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${task.subTasks.length > 0 ? (doneSubCount / task.subTasks.length) * 100 : 0}%`, background: allSubDone ? "var(--accent-green)" : "var(--accent-blue)", borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setAddingSubTask(true)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "var(--accent-blue)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                <Plus size={12} /> Thêm sub-task
              </button>
            </div>

            {/* Add subtask form */}
            {addingSubTask && (
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>Sub-task mới</div>
                <input value={newStContent} onChange={(e) => setNewStContent(e.target.value)} placeholder="Nội dung sub-task..." style={{ ...inp, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Deadline</div>
                    <input type="date" value={newStDeadline} onChange={(e) => setNewStDeadline(e.target.value)} style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>PIC</div>
                  <UserPicker selected={newStPicIds} onChange={setNewStPicIds} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleAddSubTask} disabled={!newStContent.trim() || !newStDeadline} style={{ padding: "6px 16px", borderRadius: 8, background: "var(--accent-blue)", border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Thêm</button>
                  <button onClick={() => setAddingSubTask(false)} style={{ padding: "6px 12px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>Hủy</button>
                </div>
              </div>
            )}

            {task.subTasks.length === 0 && !addingSubTask ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 10 }}>
                Chưa có sub-task nào
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {task.subTasks.map((st) => {
                  const isEditing = editingSubId === st.id;
                  const stPics = (st.picIds ?? []).map((id) => state.users.find((u) => u.id === id)).filter(Boolean) as typeof state.users;
                  const stOverdue = st.status === "pending" && isPast(parseISO(st.deadline));

                  return (
                    <div
                      key={st.id}
                      style={{
                        background: st.status === "done" ? "rgba(16,185,129,0.05)" : "var(--bg-secondary)",
                        border: `1px solid ${st.status === "done" ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      {isEditing ? (
                        // Edit mode
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input value={estContent} onChange={(e) => setEstContent(e.target.value)} style={inp} placeholder="Nội dung..." />
                          <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Deadline</div>
                              <input type="date" value={estDeadline} onChange={(e) => setEstDeadline(e.target.value)} style={inp} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Trạng thái</div>
                              <select value={estStatus} onChange={(e) => setEstStatus(e.target.value as "pending" | "done")} style={{ ...inp, cursor: "pointer" }}>
                                <option value="pending">Chưa xong</option>
                                <option value="done">Hoàn thành</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>PIC</div>
                            <UserPicker selected={estPicIds} onChange={setEstPicIds} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Ghi chú nghiệm thu</div>
                            <textarea value={estNotes} onChange={(e) => setEstNotes(e.target.value)} rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} placeholder="Ghi chú khi hoàn thành..." />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => saveEditSub(st.id)} style={{ padding: "5px 14px", borderRadius: 7, background: "var(--accent-green)", border: "none", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Save size={12} /> Lưu
                            </button>
                            <button onClick={() => setEditingSubId(null)} style={{ padding: "5px 10px", borderRadius: 7, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>Hủy</button>
                            
                            {confirmDeleteSub !== st.id ? (
                              <button onClick={() => setConfirmDeleteSub(st.id)} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 12, cursor: "pointer" }}>Xóa</button>
                            ) : (
                              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>Chắc chắn?</span>
                                <button onClick={() => deleteSubTask(task.id, st.id)} style={{ padding: "4px 8px", background: "#f87171", color: "white", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Có</button>
                                <button onClick={() => setConfirmDeleteSub(null)} style={{ padding: "4px 8px", background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Hủy</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <button onClick={() => toggleSubStatus(st)} style={{ background: "none", border: "none", cursor: "pointer", color: st.status === "done" ? "var(--accent-green)" : "var(--text-muted)", paddingTop: 1, flexShrink: 0 }}>
                              {st.status === "done" ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: st.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: st.status === "done" ? "line-through" : "none", lineHeight: 1.4 }}>
                                {st.content}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, color: stOverdue ? "var(--accent-red)" : "var(--text-muted)", fontWeight: stOverdue ? 700 : 400, display: "flex", alignItems: "center", gap: 3 }}>
                                  {stOverdue && <AlertCircle size={10} />}
                                  {format(parseISO(st.deadline), "dd/MM/yyyy")}
                                </span>
                                {stPics.map((u) => (
                                  <div key={u.id} style={{ width: 18, height: 18, borderRadius: 5, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }} title={u.fullName}>
                                    {u.fullName.split(" ").slice(-1)[0].charAt(0)}
                                  </div>
                                ))}
                                {st.status === "done" && (
                                  <span style={{ fontSize: 10, color: "var(--accent-green)", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 5, padding: "1px 6px", fontWeight: 600 }}>✓ Hoàn thành</span>
                                )}
                              </div>
                              {/* Acceptance notes */}
                              {st.acceptanceNotes && (
                                <div style={{ marginTop: 5, padding: "5px 8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, fontSize: 11, color: "var(--accent-green)", lineHeight: 1.4 }}>
                                  📝 {st.acceptanceNotes}
                                </div>
                              )}
                            </div>
                            <button onClick={() => openEditSub(st)} style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Edit3 size={11} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completion warning */}
            {!allSubDone && task.subTasks.length > 0 && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 9, fontSize: 12, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={13} />
                Task chỉ có thể hoàn thành khi tất cả sub-tasks được hoàn thành và có ghi chú nghiệm thu.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 7,
};
