"use client";

import { useState, useMemo, useRef } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Task, SubTask, TaskStatus, TaskPriority, SubTaskStatus, User } from "@/lib/types";
import { canAccessBrand, getVisibleBrands } from "@/lib/permissions";
import { format, parseISO, isPast } from "date-fns";
import {
  X, Edit3, Save, Trash2, Plus, CheckSquare, Square,
  ChevronDown, ChevronUp, AlertCircle, Users, Flag,
  Calendar, Tag, Clock, MessageSquare, AtSign, Image as ImageIcon, Rocket
} from "lucide-react";

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "todo", label: "Chờ xử lý", color: "#6b7280" },
  { value: "inprogress", label: "Đang thực hiện", color: "#3b82f6" },
  { value: "review", label: "Chờ duyệt", color: "#f59e0b" },
  { value: "done", label: "Hoàn thành", color: "#10b981" },
  { value: "cancelled", label: "Đã hủy", color: "#ef4444" },
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
  const { 
    state, updateTaskStatus, updateTask, deleteTask, 
    addSubTask, updateSubTask, deleteSubTask,
    submitSubTaskReview, approveSubTask, rejectSubTask,
    addTaskComment, addSubTaskComment
  } = useData();
  const isAdmin = currentUser?.role === "admin";

  // Always use latest task state from context
  const task = state.tasks.find((t) => t.id === initialTask.id) ?? initialTask;
  const taskBrandId = task.brandId;
  const visibleBrands = useMemo(() => getVisibleBrands(state.brands, currentUser), [state.brands, currentUser]);
  const visibleProjects = useMemo(
    () => state.projects.filter((project) => canAccessBrand(currentUser, project.brandId)),
    [state.projects, currentUser]
  );
  const brand = state.brands.find((b) => b.id === task.brandId);
  const picUsers = (task.picIds ?? []).map((id) => state.users.find((u) => u.id === id)).filter(Boolean) as typeof state.users;
  const watcherUsers = (task.watcherIds ?? []).map((id) => state.users.find((u) => u.id === id)).filter(Boolean) as typeof state.users;

  // Edit mode for task header
  const [editingTask, setEditingTask] = useState(false);
  const [etTitle, setEtTitle] = useState(task.title);
  const [etDesc, setEtDesc] = useState(task.description);
  const [etStatus, setEtStatus] = useState<TaskStatus>(task.status);
  const [etPriority, setEtPriority] = useState<TaskPriority>(task.priority);
  const [etDeadline, setEtDeadline] = useState(task.deadline || "");
  const [etPicIds, setEtPicIds] = useState<string[]>(task.picIds ?? []);
  const [etWatcherIds, setEtWatcherIds] = useState<string[]>(task.watcherIds ?? []);
  const [etBrandId, setEtBrandId] = useState(task.brandId);
  const [etProjectId, setEtProjectId] = useState(task.projectId || "");
  const usersForEditedBrand = useMemo(
    () => state.users.filter((user) => canAccessBrand(user, etBrandId)),
    [state.users, etBrandId]
  );
  const allowedEditedBrandUserIds = useMemo(
    () => new Set(usersForEditedBrand.map((user) => user.id)),
    [usersForEditedBrand]
  );
  // Sub-task states
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [addingSubTask, setAddingSubTask] = useState(false);
  const [newStContent, setNewStContent] = useState("");
  const [newStDeadline, setNewStDeadline] = useState("");
  const [newStPicIds, setNewStPicIds] = useState<string[]>([]);

  // Edit sub-task
  const [estContent, setEstContent] = useState("");
  const [estDeadline, setEstDeadline] = useState("");
  const [estPicIds, setEstPicIds] = useState<string[]>([]);
  const [estNotes, setEstNotes] = useState("");
  const [estStatus, setEstStatus] = useState<SubTaskStatus>("pending");

  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<string | null>(null);

  // Sub-task review states
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showStComments, setShowStComments] = useState<string | null>(null);

  // Discussion state
  const [taskMsg, setTaskMsg] = useState("");
  const [stMsg, setStMsg] = useState("");
  const [taskImg, setTaskImg] = useState<string | null>(null);
  const [stImg, setStImg] = useState<string | null>(null);
  const taskFileRef = useRef<HTMLInputElement>(null);
  const stFileRef = useRef<HTMLInputElement>(null);
  
  // Mentions State
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionActive, setMentionActive] = useState<{ type: "task" | "st"; subTaskId?: string } | null>(null);
  const filteredMentionUsers = useMemo(() => {
    const brandUsers = state.users.filter((user) => canAccessBrand(user, taskBrandId));
    if (!mentionQuery) return brandUsers;
    return brandUsers.filter(u => u.fullName.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [mentionQuery, state.users, taskBrandId]);

  const handleAddTaskComment = () => {
    if (!taskMsg.trim() && !taskImg) return;
    if (!currentUser) return;
    addTaskComment(task.id, { userId: currentUser.id, content: taskMsg.trim(), ...(taskImg ? { imageUrl: taskImg } : {}) });
    setTaskMsg("");
    setTaskImg(null);
    setMentionActive(null);
  };

  // Compress image client-side with Canvas — instant, no network upload needed
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 900;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageSelect = async (file: File, type: "task" | "st") => {
    const dataUrl = await compressImage(file);
    if (type === "task") setTaskImg(dataUrl); else setStImg(dataUrl);
  };

  const handlePaste = async (e: React.ClipboardEvent, type: "task" | "st") => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleImageSelect(file, type);
        break;
      }
    }
  };

  const handleAddStComment = (stId: string) => {
    if (!stMsg.trim() && !stImg) return;
    if (!currentUser) return;
    addSubTaskComment(task.id, stId, { userId: currentUser.id, content: stMsg.trim(), ...(stImg ? { imageUrl: stImg } : {}) });
    setStMsg("");
    setStImg(null);
    setMentionActive(null);
  };

  const handleInputChange = (val: string, type: "task" | "st", stId?: string) => {
    if (type === "task") setTaskMsg(val); else setStMsg(val);
    
    const words = val.split(" ");
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1));
      setMentionActive({ type, subTaskId: stId });
    } else {
      setMentionActive(null);
    }
  };

  const selectMention = (user: User) => {
    if (!mentionActive) return;
    const currentMsg = mentionActive.type === "task" ? taskMsg : stMsg;
    const words = currentMsg.split(" ");
    words[words.length - 1] = `@${user.fullName} `;
    const newMsg = words.join(" ");
    if (mentionActive.type === "task") setTaskMsg(newMsg); else setStMsg(newMsg);
    setMentionActive(null);
  };

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
      picIds: estPicIds.filter((id) => allowedEditedBrandUserIds.has(id)),
      acceptanceNotes: estNotes,
      status: estStatus,
    });
    setEditingSubId(null);
  };
  const saveTask = () => {
    if (!canAccessBrand(currentUser, etBrandId)) return;
    updateTask(task.id, { 
      title: etTitle, 
      description: etDesc, 
      status: etStatus, 
      priority: etPriority, 
      deadline: etDeadline, 
      picIds: etPicIds.filter((id) => allowedEditedBrandUserIds.has(id)), 
      picId: etPicIds.find((id) => allowedEditedBrandUserIds.has(id)),
      watcherIds: etWatcherIds.filter((id) => allowedEditedBrandUserIds.has(id)),
      brandId: etBrandId,
      projectId: etProjectId || "" 
    });
    setEditingTask(false);
  };

  const handleAddSubTask = () => {
    if (!newStContent.trim() || !newStDeadline) return;
    addSubTask(task.id, { content: newStContent, deadline: newStDeadline, status: "pending", acceptanceNotes: "", picIds: newStPicIds.filter((id) => allowedEditedBrandUserIds.has(id)) });
    setNewStContent("");
    setNewStDeadline("");
    setNewStPicIds([]);
    setAddingSubTask(false);
  };

  const togglePic = (userId: string, current: string[], setFn: (ids: string[]) => void) => {
    setFn(current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  };

  const doneSubCount = task.subTasks.filter((s) => s.status === "done").length;
  const allSubDone = task.subTasks.length === 0 || task.subTasks.every((s) => s.status === "done" && s.acceptanceNotes.trim());
  const isOverdue = task.status !== "done" && task.deadline && isPast(parseISO(task.deadline));

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

  const UserPicker = ({ selected, onChange, disabledIds = [] }: { selected: string[]; onChange: (ids: string[]) => void; disabledIds?: string[] }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {usersForEditedBrand.map((u) => {
        const sel = selected.includes(u.id);
        const disabled = disabledIds.includes(u.id);
        return (
          <button key={u.id} onClick={() => !disabled && togglePic(u.id, selected, onChange)} disabled={disabled}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 7,
              background: sel ? `${u.role === "admin" ? "#3b82f6" : "#10b981"}22` : disabled ? "rgba(156,163,175,0.08)" : "var(--bg-secondary)",
              border: `1px solid ${sel ? (u.role === "admin" ? "#3b82f620" : "#10b98120") : "var(--border)"}`,
              color: sel ? (u.role === "admin" ? "var(--accent-blue)" : "var(--accent-green)") : disabled ? "var(--text-muted)" : "var(--text-secondary)",
              cursor: disabled ? "not-allowed" : "pointer", fontSize: 12, fontWeight: sel ? 700 : 400, transition: "all 0.15s", opacity: disabled ? 0.6 : 1,
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 5, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>
              {u.fullName.split(" ").slice(-1)[0].charAt(0)}
            </div>
            {u.fullName.split(" ").slice(-2).join(" ")}
            {disabled ? " Đang xử lý" : sel ? " ✓" : ""}
          </button>
        );
      })}
    </div>
  );

  const MentionList = () => {
    if (!mentionActive) return null;
    return (
      <div style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        width: 220,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        zIndex: 50,
        overflow: "hidden",
        maxHeight: 200,
        overflowY: "auto"
      }}>
        <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
          <AtSign size={11} /> Nhắc tên đồng nghiệp
        </div>
        {filteredMentionUsers.map(u => (
          <div
            key={u.id}
            onClick={() => selectMention(u)}
            style={{
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              transition: "background 0.15s"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: 24, height: 24, borderRadius: 6, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
              {u.fullName.split(" ").slice(-1)[0].charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{u.fullName}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{u.department}</div>
            </div>
          </div>
        ))}
        {filteredMentionUsers.length === 0 && (
          <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Không thấy ai khớp</div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: 500, 
        display: "flex", 
        alignItems: "center", // Changed from flex-start to center
        justifyContent: "center", 
        padding: "20px", 
        background: "rgba(0,0,0,0.75)", // Darker backdrop
        backdropFilter: "blur(10px)", // More blur
        WebkitBackdropFilter: "blur(10px)", // Safari support
        overflowY: "auto" 
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="animate-scaleIn" style={{ 
        width: "100%", 
        maxWidth: 720, 
        maxHeight: "90vh", // Prevent overflow
        background: "var(--bg-card)", 
        borderRadius: 24, 
        border: "1px solid var(--border)", 
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)", 
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>

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

        {/* Body (Scrollable) */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", flex: 1 }}>

          {/* Meta fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Status */}
            <div>
              <label style={lbl}><Flag size={12} style={{ display: "inline", marginRight: 4 }} />Trạng thái</label>
              <select 
                value={editingTask ? etStatus : task.status} 
                onChange={(e) => {
                  const val = e.target.value as TaskStatus;
                  if (editingTask) setEtStatus(val);
                  else updateTaskStatus(task.id, val);
                }} 
                style={{ 
                  ...inp, 
                  cursor: "pointer",
                  background: `${STATUS_OPTIONS.find(o=>o.value===(editingTask ? etStatus : task.status))?.color}15`,
                  color: STATUS_OPTIONS.find(o=>o.value===(editingTask ? etStatus : task.status))?.color,
                  fontWeight: 700,
                  border: `1px solid ${STATUS_OPTIONS.find(o=>o.value===(editingTask ? etStatus : task.status))?.color}40`,
                }}
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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

            {/* Brand */}
            <div>
              <label style={lbl}><Tag size={12} style={{ display: "inline", marginRight: 4 }} />Brand</label>
              {editingTask ? (
                <select value={etBrandId} onChange={(e) => setEtBrandId(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  {visibleBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              ) : (
                <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
                  {brand?.name || "N/A"}
                </span>
              )}
            </div>

            {/* Deadline */}
            <div>
              <label style={lbl}><Calendar size={12} style={{ display: "inline", marginRight: 4 }} />Hạn chót</label>
              {editingTask ? (
                <input type="datetime-local" value={etDeadline} onChange={(e) => setEtDeadline(e.target.value)} style={inp} />
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: isPast(parseISO(task.deadline || "")) && task.status !== "done" ? "#ef4444" : "var(--text-primary)" }}>
                  {task.deadline ? (task.deadline.includes("T") ? format(parseISO(task.deadline), "HH:mm dd/MM/yyyy") : format(parseISO(task.deadline), "dd/MM/yyyy")) : "Chưa đặt"}
                </span>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label style={lbl}><Clock size={12} style={{ display: "inline", marginRight: 4 }} />Bắt đầu</label>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{task.startDate ? format(parseISO(task.startDate), "dd/MM/yyyy") : "—"}</span>
            </div>

            {/* Project */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={lbl}><Rocket size={12} style={{ display: "inline", marginRight: 4 }} />Thuộc Dự án (Ngắn hạn)</label>
              {editingTask ? (
                <select value={etProjectId} onChange={(e) => setEtProjectId(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="">Không thuộc dự án nào</option>
                  {visibleProjects.filter(p => p.brandId === etBrandId && p.status !== "archived").map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--accent-blue)", fontSize: 13, fontWeight: 700 }}>
                  {visibleProjects.find(p => p.id === task.projectId)?.name || "Chưa gắn vào dự án"}
                </span>
              )}
            </div>
          </div>

          {/* PICs */}
          <div>
            <label style={lbl}><Users size={12} style={{ display: "inline", marginRight: 4 }} />Người xử lý</label>
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

          {/* Watchers */}
          <div>
            <label style={lbl}><Users size={12} style={{ display: "inline", marginRight: 4 }} />Người theo dõi</label>
            {editingTask ? (
              <>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 7 }}>
                  Admin sẽ tự theo dõi và không bị tính là người xử lý.
                </div>
                <UserPicker
                  selected={etWatcherIds}
                  onChange={(ids) => setEtWatcherIds(ids.filter((id) => !etPicIds.includes(id)))}
                  disabledIds={etPicIds}
                />
              </>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {watcherUsers.length === 0 ? <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Admin tự theo dõi task này</span> : watcherUsers.map((u) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : u.role === "assistant" ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
                      {u.fullName.split(" ").slice(-1)[0].charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{u.fullName}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{u.role === "admin" ? "Admin" : u.department}</span>
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
                    <input type="datetime-local" value={newStDeadline} onChange={(e) => setNewStDeadline(e.target.value)} style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Người xử lý</div>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {task.subTasks.map((st) => {
                  const isEditing = editingSubId === st.id;
                  const stPics = (st.picIds ?? []).map((id) => state.users.find((u) => u.id === id)).filter(Boolean) as typeof state.users;
                  const stOverdue = st.status === "pending" && st.deadline && isPast(parseISO(st.deadline));

                  return (
                    <div
                      key={st.id}
                      style={{
                        background: st.status === "done" ? "rgba(16,185,129,0.05)" : "var(--bg-secondary)",
                        border: `1px solid ${st.status === "done" ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                        borderRadius: 12,
                        padding: "12px",
                      }}
                    >
                      {isEditing ? (
                        // Edit mode
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input value={estContent} onChange={(e) => setEstContent(e.target.value)} style={inp} placeholder="Nội dung..." />
                          <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Deadline</div>
                              <input type="datetime-local" value={estDeadline} onChange={(e) => setEstDeadline(e.target.value)} style={inp} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Trạng thái</div>
                              <select value={estStatus} onChange={(e) => setEstStatus(e.target.value as any)} style={{ ...inp, cursor: "pointer" }}>
                                <option value="pending">Chưa xong</option>
                                <option value="reviewing">Chờ duyệt</option>
                                <option value="done">Hoàn thành</option>
                              </select>
                            </div>
                          </div>
                          <div>
                             <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Người xử lý</div>
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
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: st.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: st.status === "done" ? "line-through" : "none", lineHeight: 1.4 }}>
                                {st.content}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, color: stOverdue ? "var(--accent-red)" : "var(--text-muted)", fontWeight: stOverdue ? 700 : 400, display: "flex", alignItems: "center", gap: 3 }}>
                                  <Calendar size={11} />
                                  {st.deadline ? (st.deadline.includes("T") ? format(parseISO(st.deadline), "HH:mm dd/MM/yyyy") : format(parseISO(st.deadline), "dd/MM/yyyy")) : "—"}
                                </span>
                                
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {stPics.map((u) => (
                                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 6px", background: "var(--bg-card)", borderRadius: 5, border: "1px solid var(--border)" }}>
                                      <div style={{ width: 14, height: 14, borderRadius: 4, background: u.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white" }}>
                                        {u.fullName.split(" ").slice(-1)[0].charAt(0)}
                                      </div>
                                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)" }}>{u.fullName.split(" ").slice(-1)[0]}</span>
                                    </div>
                                  ))}
                                </div>
                                
                                <button 
                                  onClick={() => setShowStComments(showStComments === st.id ? null : st.id)}
                                  style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                                >
                                  <MessageSquare size={12} /> {st.comments?.length || 0}
                                </button>

                                {st.status === "done" && (
                                  <span style={{ fontSize: 10, color: "var(--accent-green)", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 5, padding: "2px 8px", fontWeight: 700 }}>✅ Đã nghiệm thu</span>
                                )}
                                {st.status === "reviewing" && (
                                  <span style={{ fontSize: 10, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 5, padding: "2px 8px", fontWeight: 700 }}>⏳ Chờ duyệt</span>
                                )}
                              </div>

                              {/* Rejection / Approval Notes */}
                              {st.rejectReason && st.status === "pending" && (
                                <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, fontSize: 11, color: "#f87171", fontStyle: "italic" }}>
                                  Yêu cầu làm lại: {st.rejectReason}
                                </div>
                              )}
                              {st.submissionNote && st.status !== "pending" && (
                                <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, fontSize: 11, color: "#f59e0b", fontStyle: "italic" }}>
                                  Ghi chú nộp: {st.submissionNote}
                                  {st.submittedAt && <span style={{ display: "block", fontSize: 10, marginTop: 4, color: "#d97706", fontWeight: 600 }}>Gửi lúc: {format(parseISO(st.submittedAt), "HH:mm dd/MM/yyyy")}</span>}
                                </div>
                              )}
                              {st.acceptanceNotes && st.status === "done" && (
                                <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 11, color: "var(--accent-green)", fontStyle: "italic" }}>
                                  📝 {st.acceptanceNotes}
                                </div>
                              )}

                              {/* Flow Actions */}
                              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {st.status === "pending" && (
                                  <div style={{ display: "flex", gap: 6, width: "100%" }}>
                                    {submittingId === st.id ? (
                                      <div style={{ flex: 1 }}>
                                        <textarea value={submitNote} onChange={e => setSubmitNote(e.target.value)} placeholder="Ghi chú kết quả..." style={{ ...inp, fontSize: 12, padding: "8px 12px", minHeight: 60, marginBottom: 6 }} />
                                        <div style={{ display: "flex", gap: 6 }}>
                                          <button onClick={() => { submitSubTaskReview(task.id, st.id, submitNote); setSubmittingId(null); setSubmitNote(""); }} style={{ flex: 1, padding: "6px 0", background: "#f59e0b", color: "white", borderRadius: 8, fontWeight: 700, border: "none", fontSize: 11, cursor: "pointer" }}> Gửi duyệt</button>
                                          <button onClick={() => setSubmittingId(null)} style={{ padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Hủy</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setSubmittingId(st.id); setSubmitNote(""); }} style={{ padding: "5px 12px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>📤 Gửi nghiệm thu</button>
                                    )}
                                  </div>
                                )}

                                {isAdmin && st.status === "reviewing" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                                    {rejectingId === st.id ? (
                                      <>
                                        <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Lý do làm lại..." style={{ ...inp, fontSize: 12, padding: "8px 12px", minHeight: 60, marginBottom: 6 }} />
                                        <div style={{ display: "flex", gap: 6 }}>
                                          <button onClick={() => { rejectSubTask(task.id, st.id, rejectNote); setRejectingId(null); setRejectNote(""); }} style={{ flex: 1, padding: "6px 0", background: "#ef4444", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>↩️ Yêu cầu sửa</button>
                                          <button onClick={() => setRejectingId(null)} style={{ padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Hủy</button>
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => approveSubTask(task.id, st.id, "")} style={{ padding: "5px 12px", background: "rgba(16,185,129,0.1)", color: "var(--accent-green)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>✅ Duyệt</button>
                                        <button onClick={() => { setRejectingId(st.id); setRejectNote(""); }} style={{ padding: "5px 12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>↩️ Từ chối</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                              <button onClick={() => openEditSub(st)} style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Edit3 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Subtask Discussion */}
                          {showStComments === st.id && (
                            <div style={{ marginTop: 15, paddingTop: 15, borderTop: "1px dashed var(--border)", position: "relative" }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Trao đổi Sub-task</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 180, overflowY: "auto", paddingRight: 6 }}>
                                {(st.comments || []).map((c) => {
                                  const cmter = state.users.find(u => u.id === c.userId);
                                  const isMe = c.userId === currentUser?.id;
                                  return (
                                    <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{cmter?.fullName}</span>
                                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{format(parseISO(c.createdAt), "HH:mm")}</span>
                                      </div>
                                      <div style={{ padding: c.imageUrl && !c.content ? "4px" : "6px 10px", background: isMe ? "rgba(59,130,246,0.15)" : "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--text-primary)", maxWidth: "90%", lineHeight: 1.4 }}>
                                        {c.content && <div>{c.content}</div>}
                                        {c.imageUrl && <img src={c.imageUrl} alt="img" style={{ maxWidth: 200, maxHeight: 160, borderRadius: 6, marginTop: c.content ? 6 : 0, display: "block", cursor: "pointer" }} onClick={() => window.open(c.imageUrl, "_blank")} />}
                                      </div>
                                    </div>
                                  );
                                })}
                                {(st.comments || []).length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>Chưa có tin nhắn</div>}
                              </div>
                              <div style={{ position: "relative" }}>
                                {mentionActive?.type === "st" && mentionActive.subTaskId === st.id && <MentionList />}
                              <div style={{ display: "flex", gap: 6 }}>
                                  <input ref={stFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleImageSelect(f, "st"); e.target.value = ""; }} />
                                  <div style={{ position: "relative", flex: 1 }}>
                                    {mentionActive?.type === "st" && mentionActive.subTaskId === st.id && <MentionList />}
                                    {stImg && (
                                      <div style={{ position: "relative", marginBottom: 6 }}>
                                        <img src={stImg} alt="preview" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, border: "1px solid var(--border)" }} />
                                        <button onClick={() => setStImg(null)} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>×</button>
                                      </div>
                                    )}
                                    <input 
                                      value={stMsg} 
                                      onChange={(e) => handleInputChange(e.target.value, "st", st.id)} 
                                      placeholder="Nhập tin nhắn... (Ctrl+V để dán ảnh)" 
                                      style={{ ...inp, fontSize: 12, padding: "6px 12px" }} 
                                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddStComment(st.id)} 
                                      onPaste={(e) => handlePaste(e, "st")}
                                    />
                                  </div>
                                  <button onClick={() => stFileRef.current?.click()} style={{ width: 32, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <ImageIcon size={14} />
                                  </button>
                                  <button onClick={() => handleAddStComment(st.id)} disabled={!stMsg.trim() && !stImg} style={{ width: 32, borderRadius: 8, background: "var(--accent-blue)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Task Discussion */}
          <div style={{ marginTop: 10, padding: "20px", background: "var(--bg-secondary)", borderRadius: 18, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-blue)" }}>
                <MessageSquare size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>Thảo luận chung</h3>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{task.comments?.length || 0} tin nhắn</p>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18, maxHeight: 350, overflowY: "auto", paddingRight: 8 }}>
              {(task.comments || []).map((c) => {
                const cmter = state.users.find(u => u.id === c.userId);
                const isMe = c.userId === currentUser?.id;
                return (
                  <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {!isMe && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{cmter?.fullName}</span>}
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{format(parseISO(c.createdAt), "HH:mm dd/MM")}</span>
                    </div>
                    <div style={{ 
                      padding: c.imageUrl && !c.content ? "4px" : "10px 14px", 
                      borderRadius: 14, 
                      borderTopRightRadius: isMe ? 2 : 14,
                      borderTopLeftRadius: isMe ? 14 : 2,
                      background: isMe ? "var(--accent-blue)" : "var(--bg-card)", 
                      color: isMe ? "white" : "var(--text-primary)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      border: isMe ? "none" : "1px solid var(--border)",
                      maxWidth: "85%",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.06)"
                    }}>
                      {c.content && <div>{c.content}</div>}
                      {c.imageUrl && <img src={c.imageUrl} alt="img" style={{ maxWidth: 260, maxHeight: 200, borderRadius: 8, marginTop: c.content ? 8 : 0, display: "block", cursor: "pointer" }} onClick={() => window.open(c.imageUrl, "_blank")} />}
                    </div>
                  </div>
                );
              })}
              {(task.comments || []).length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.5 }}>
                  <MessageSquare size={32} style={{ margin: "0 auto 12px", display: "block" }} />
                  <p style={{ fontSize: 13, fontWeight: 500 }}>Chưa có thảo luận nào. Bắt đầu ngay!</p>
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              {mentionActive?.type === "task" && <MentionList />}
              <input ref={taskFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleImageSelect(f, "task"); e.target.value = ""; }} />
              {taskImg && (
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <img src={taskImg} alt="preview" style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 10, border: "1px solid var(--border)" }} />
                  <button onClick={() => setTaskImg(null)} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>×</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <input 
                  value={taskMsg} 
                  onChange={(e) => handleInputChange(e.target.value, "task")} 
                  placeholder="Nhập nội dung... (Ctrl+V để dán ảnh)" 
                  style={{ ...inp, padding: "12px 16px", borderRadius: 12 }} 
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddTaskComment()}
                  onPaste={(e) => handlePaste(e, "task")}
                />
                <button
                  onClick={() => taskFileRef.current?.click()}
                  title="Đính kèm ảnh"
                  style={{ width: 46, borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <ImageIcon size={16} />
                </button>
                <button 
                  onClick={handleAddTaskComment} 
                  disabled={!taskMsg.trim() && !taskImg}
                  style={{ padding: "0 22px", borderRadius: 12, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)", opacity: (!taskMsg.trim() && !taskImg) ? 0.6 : 1, flexShrink: 0 }}
                >
                  Gửi
                </button>
              </div>
            </div>
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
