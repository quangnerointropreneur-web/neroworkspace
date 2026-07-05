"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Brand, Project, SubTask, Task, TaskPriority, TaskStatus, User } from "@/lib/types";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Circle,
  Clock,
  Edit3,
  Flag,
  MessageSquare,
  Plus,
  Send,
  Square,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  getNextAction,
  getTaskPriorityReason,
  getTaskUrgencyTone,
  isTaskInScope,
  sortSubtasks,
  sortTasksByActionPriority,
  TaskActionScope,
} from "./taskWorkflow";

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; bg: string }[] = [
  { value: "todo", label: "Chờ xử lý", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  { value: "inprogress", label: "Đang thực hiện", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { value: "review", label: "Chờ duyệt", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { value: "done", label: "Hoàn thành", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  { value: "cancelled", label: "Đã hủy", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "high", label: "Cao", color: "#dc2626" },
  { value: "medium", label: "Vừa", color: "#d97706" },
  { value: "low", label: "Thấp", color: "#6b7280" },
];

interface Props {
  tasks: Task[];
  brands: Brand[];
  users: User[];
  projects: Project[];
  onOpenTask: (task: Task) => void;
}

export default function TaskOperationsView({ tasks, brands, users, projects, onOpenTask }: Props) {
  const { currentUser } = useAuth();
  const {
    state,
    updateTask,
    updateTaskStatus,
    addSubTask,
    updateSubTask,
    submitSubTaskReview,
    approveSubTask,
  } = useData();
  const [selectedId, setSelectedId] = useState<string>(tasks[0]?.id ?? "");
  const [quickScope, setQuickScope] = useState<TaskActionScope>("action");
  const [newSubContent, setNewSubContent] = useState("");
  const [newSubDeadline, setNewSubDeadline] = useState("");

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "assistant";
  const todayKey = new Date().toISOString().split("T")[0];

  const scopedTasks = useMemo(() => {
    return sortTasksByActionPriority(
      tasks.filter((task) => isTaskInScope(task, quickScope, currentUser?.id))
    );
  }, [currentUser?.id, quickScope, tasks]);

  const effectiveSelectedId = scopedTasks.some((task) => task.id === selectedId) ? selectedId : scopedTasks[0]?.id ?? "";

  const selectedTask = useMemo(() => {
    return state.tasks.find((task) => task.id === effectiveSelectedId) ?? scopedTasks.find((task) => task.id === effectiveSelectedId) ?? scopedTasks[0];
  }, [effectiveSelectedId, state.tasks, scopedTasks]);

  const stats = useMemo(() => {
    return {
      action: tasks.filter((task) => isTaskInScope(task, "action", currentUser?.id)).length,
      overdue: tasks.filter((task) => isTaskInScope(task, "overdue", currentUser?.id)).length,
      today: tasks.filter((task) => isTaskInScope(task, "today", currentUser?.id)).length,
      review: tasks.filter((task) => isTaskInScope(task, "review", currentUser?.id)).length,
      unassigned: tasks.filter((task) => isTaskInScope(task, "unassigned", currentUser?.id)).length,
      mine: tasks.filter((task) => isTaskInScope(task, "mine", currentUser?.id)).length,
    };
  }, [currentUser?.id, tasks]);

  const addQuickSubTask = () => {
    if (!selectedTask || !newSubContent.trim()) return;
    addSubTask(selectedTask.id, {
      content: newSubContent.trim(),
      deadline: newSubDeadline || selectedTask.deadline || todayKey,
      status: "pending",
      acceptanceNotes: "",
      picIds: selectedTask.picIds ?? [],
    });
    setNewSubContent("");
    setNewSubDeadline("");
  };

  const toggleSubTask = (task: Task, subTask: SubTask) => {
    if (subTask.status === "done") {
      if (isAdmin) updateSubTask(task.id, subTask.id, { status: "pending", acceptanceNotes: "" });
      return;
    }

    if (isAdmin || subTask.status === "reviewing") {
      approveSubTask(task.id, subTask.id, "Đã xử lý nhanh");
      return;
    }

    submitSubTaskReview(task.id, subTask.id, "Gửi duyệt nhanh từ màn hình xử lý");
  };

  if (!tasks.length) {
    return (
      <div style={emptyStateStyle}>
        <AlertCircle size={38} style={{ opacity: 0.45, marginBottom: 10 }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Không có task phù hợp</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Thử đổi bộ lọc hoặc bật lịch sử để xem thêm task.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1.08fr) minmax(360px, 0.92fr)", gap: 14, alignItems: "start" }} className="task-ops-grid">
      <div style={surfaceStyle}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <QuickChip active={quickScope === "action"} label={`C\u1ea7n x\u1eed l\u00fd ${stats.action}`} onClick={() => setQuickScope("action")} />
          <QuickChip active={quickScope === "overdue"} label={`Qu\u00e1 h\u1ea1n ${stats.overdue}`} tone="#dc2626" onClick={() => setQuickScope("overdue")} />
          <QuickChip active={quickScope === "today"} label={`H\u00f4m nay ${stats.today}`} tone="#f59e0b" onClick={() => setQuickScope("today")} />
          <QuickChip active={quickScope === "review"} label={`C\u1ea7n duy\u1ec7t ${stats.review}`} tone="#8b5cf6" onClick={() => setQuickScope("review")} />
          <QuickChip active={quickScope === "unassigned"} label={`Ch\u01b0a giao ${stats.unassigned}`} tone="#64748b" onClick={() => setQuickScope("unassigned")} />
          <QuickChip active={quickScope === "mine"} label={`C\u1ee7a t\u00f4i ${stats.mine}`} tone="#3b82f6" onClick={() => setQuickScope("mine")} />
          <QuickChip active={quickScope === "all"} label={`T\u1ea5t c\u1ea3 ${tasks.length}`} tone="#6b7280" onClick={() => setQuickScope("all")} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.7fr) 96px 112px 96px 72px", gap: 10, padding: "10px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }} className="task-ops-header">
          <HeaderCell label="Task" />
          <HeaderCell label="Tiến độ" />
          <HeaderCell label="Xử lý" />
          <HeaderCell label="Hạn" />
          <HeaderCell label="Trạng thái" />
        </div>

        <div style={{ maxHeight: "calc(100vh - 315px)", minHeight: 420, overflowY: "auto" }}>
          {scopedTasks.map((task) => (
            <TaskQueueRow
              key={task.id}
              task={task}
              active={task.id === selectedTask?.id}
              brand={brands.find((brand) => brand.id === task.brandId)}
              users={users}
              onSelect={() => setSelectedId(task.id)}
            />
          ))}
          {!scopedTasks.length && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              {getEmptyStateText(quickScope)}
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <div style={{ ...surfaceStyle, position: "sticky", top: 104 }}>
          <TaskActionPanel
            task={selectedTask}
            brand={brands.find((brand) => brand.id === selectedTask.brandId)}
            project={projects.find((project) => project.id === selectedTask.projectId)}
            users={users}
            isAdmin={isAdmin}
            newSubContent={newSubContent}
            newSubDeadline={newSubDeadline}
            onNewSubContent={setNewSubContent}
            onNewSubDeadline={setNewSubDeadline}
            onAddSubTask={addQuickSubTask}
            onOpenTask={() => onOpenTask(selectedTask)}
            onTaskStatus={(status) => updateTaskStatus(selectedTask.id, status)}
            onTaskPriority={(priority) => updateTask(selectedTask.id, { priority })}
            onTaskDeadline={(deadline) => updateTask(selectedTask.id, { deadline })}
            onSubToggle={(subTask) => toggleSubTask(selectedTask, subTask)}
            onSubEdit={(subTask, updates) => updateSubTask(selectedTask.id, subTask.id, updates)}
          />
        </div>
      )}
    </div>
  );
}

function TaskQueueRow({
  task,
  active,
  brand,
  users,
  onSelect,
}: {
  task: Task;
  active: boolean;
  brand?: Brand;
  users: User[];
  onSelect: () => void;
}) {
  const doneCount = task.subTasks.filter((sub) => sub.status === "done").length;
  const progress = task.subTasks.length ? Math.round((doneCount / task.subTasks.length) * 100) : 0;
  const status = STATUS_OPTIONS.find((item) => item.value === task.status) ?? STATUS_OPTIONS[0];
  const priority = PRIORITY_OPTIONS.find((item) => item.value === task.priority) ?? PRIORITY_OPTIONS[1];
  const pics = getUsers(users, task.picIds ?? [task.picId ?? ""].filter(Boolean));
  const deadline = safeDate(task.deadline);
  const overdue = task.status !== "done" && !!deadline && isPast(deadline) && !isToday(deadline);
  const nextAction = getNextAction(task);
  const tone = getTaskUrgencyTone(task);
  const toneStyle = toneStyles[tone];

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "minmax(260px, 1.7fr) 96px 112px 96px 72px",
        gap: 10,
        alignItems: "center",
        border: "none",
        borderBottom: "1px solid var(--border)",
        background: active ? "var(--bg-active)" : tone === "red" ? "rgba(220,38,38,0.03)" : "var(--bg-card)",
        color: "inherit",
        cursor: "pointer",
        padding: "12px 16px",
        textAlign: "left",
      }}
      className="task-ops-row"
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: priority.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 760, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
          {overdue && <span style={dangerPillStyle}>Quá hạn</span>}
        </div>
        <div style={{ fontSize: 11, color: toneStyle.text, background: toneStyle.bg, marginTop: 5, fontWeight: 720, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "fit-content", maxWidth: "100%", padding: "2px 7px", borderRadius: 7 }}>
          {nextAction}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, minWidth: 0 }}>
          {brand && <MetaPill color={brand.color} label={brand.name} />}
          <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {task.subTasks.length ? `${doneCount}/${task.subTasks.length} sub-task` : "Chưa có sub-task"}
          </span>
        </div>
      </div>

      <div>
        <div style={{ height: 5, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginBottom: 5 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "var(--accent-green)" : "var(--accent-blue)" }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{progress}%</div>
      </div>

      <AvatarStack users={pics} />

      <div style={{ display: "flex", alignItems: "center", gap: 5, color: overdue ? "var(--accent-red)" : "var(--text-secondary)", fontSize: 12, fontWeight: overdue ? 700 : 500 }}>
        <Calendar size={13} />
        {deadline ? format(deadline, "dd/MM") : "--"}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ ...miniStatusStyle, color: status.color, background: status.bg }}>{status.label.split(" ").slice(-1)[0]}</span>
        <ChevronRight size={15} color="var(--text-muted)" />
      </div>
    </button>
  );
}

function TaskActionPanel({
  task,
  brand,
  project,
  users,
  isAdmin,
  newSubContent,
  newSubDeadline,
  onNewSubContent,
  onNewSubDeadline,
  onAddSubTask,
  onOpenTask,
  onTaskStatus,
  onTaskPriority,
  onTaskDeadline,
  onSubToggle,
  onSubEdit,
}: {
  task: Task;
  brand?: Brand;
  project?: Project;
  users: User[];
  isAdmin: boolean;
  newSubContent: string;
  newSubDeadline: string;
  onNewSubContent: (value: string) => void;
  onNewSubDeadline: (value: string) => void;
  onAddSubTask: () => void;
  onOpenTask: () => void;
  onTaskStatus: (status: TaskStatus) => void;
  onTaskPriority: (priority: TaskPriority) => void;
  onTaskDeadline: (deadline: string) => void;
  onSubToggle: (subTask: SubTask) => void;
  onSubEdit: (subTask: SubTask, updates: Partial<SubTask>) => void;
}) {
  const { currentUser } = useAuth();
  const { addTaskComment } = useData();
  const [taskMessage, setTaskMessage] = useState("");
  const [showDoneSubTasks, setShowDoneSubTasks] = useState(false);
  const subTaskInputRef = useRef<HTMLInputElement>(null);
  const deadlineInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const doneCount = task.subTasks.filter((sub) => sub.status === "done").length;
  const progress = task.subTasks.length ? Math.round((doneCount / task.subTasks.length) * 100) : 0;
  const pics = getUsers(users, task.picIds ?? [task.picId ?? ""].filter(Boolean));
  const watchers = getUsers(users, task.watcherIds ?? []);
  const deadline = safeDate(task.deadline);
  const overdue = task.status !== "done" && !!deadline && isPast(deadline) && !isToday(deadline);
  const taskComments = task.comments ?? [];
  const priorityReason = getTaskPriorityReason(task);
  const sortedSubTasks = sortSubtasks(task.subTasks);
  const openSubTasks = sortedSubTasks.filter((subTask) => subTask.status !== "done");
  const doneSubTasks = sortedSubTasks.filter((subTask) => subTask.status === "done");

  const sendTaskMessage = () => {
    if (!currentUser || !taskMessage.trim()) return;
    addTaskComment(task.id, { userId: currentUser.id, content: taskMessage.trim() });
    setTaskMessage("");
  };

  return (
    <>
      <div style={{ height: 4, background: brand?.color ?? "var(--accent-blue)" }} />
      <div style={{ padding: 18, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              {brand && <MetaPill color={brand.color} label={brand.name} />}
              {project && <span style={neutralPillStyle}>{project.name}</span>}
              {overdue && <span style={dangerPillStyle}>Quá hạn</span>}
            </div>
            <h2 style={{ fontSize: 18, lineHeight: 1.35, fontWeight: 820, color: "var(--text-primary)", marginBottom: 8 }}>{task.title}</h2>
            {task.description && <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>{task.description}</p>}
            <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 9, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.45 }}>
              Task này được ưu tiên vì: <strong style={{ color: "var(--text-primary)" }}>{priorityReason}</strong>.
            </div>
          </div>
          <button type="button" onClick={onOpenTask} title="Mở chi tiết đầy đủ" style={iconButtonStyle}>
            <Edit3 size={15} />
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <QuickActionButton label="Đánh dấu xong" tone="green" onClick={() => onTaskStatus("done")} />
          <QuickActionButton label="Thêm sub-task" onClick={() => subTaskInputRef.current?.focus()} />
          <QuickActionButton label="Giao người" icon={<UserPlus size={13} />} onClick={onOpenTask} />
          <QuickActionButton label="Đổi hạn" icon={<Calendar size={13} />} onClick={() => deadlineInputRef.current?.focus()} />
          <QuickActionButton label="Nhắn cập nhật" icon={<MessageSquare size={13} />} onClick={() => messageInputRef.current?.focus()} />
        </div>
      </div>

      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PanelField icon={<Flag size={13} />} label="Trạng thái">
          <select value={task.status} onChange={(event) => onTaskStatus(event.target.value as TaskStatus)} style={inputStyle}>
            {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </PanelField>
        <PanelField icon={<Clock size={13} />} label="Ưu tiên">
          <select value={task.priority} onChange={(event) => onTaskPriority(event.target.value as TaskPriority)} style={inputStyle}>
            {PRIORITY_OPTIONS.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
          </select>
        </PanelField>
        <PanelField icon={<Calendar size={13} />} label="Deadline">
          <input ref={deadlineInputRef} type="date" value={task.deadline} onChange={(event) => onTaskDeadline(event.target.value)} style={inputStyle} />
        </PanelField>
        <PanelField icon={<UserRound size={13} />} label="Người xử lý">
          <AvatarStack users={pics} showNames />
        </PanelField>
      </div>

      <div style={{ padding: "0 16px 14px", marginTop: -4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Theo dõi</span>
          <AvatarStack users={watchers} showNames emptyLabel="Admin tự theo dõi" />
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Sub-task</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{doneCount}/{task.subTasks.length} xong</div>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "var(--accent-green)" : "var(--accent-blue)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 560px)", minHeight: 155, overflowY: "auto", paddingRight: 4 }}>
          {!!openSubTasks.length && <SubTaskGroupLabel label={"C\u1ea7n l\u00e0m"} count={openSubTasks.length} />}
          {openSubTasks.map((subTask) => (
            <SubTaskLine
              key={subTask.id}
              taskId={task.id}
              subTask={subTask}
              users={users}
              isAdmin={isAdmin}
              onToggle={() => onSubToggle(subTask)}
              onEdit={(updates) => onSubEdit(subTask, updates)}
            />
          ))}
          {!!doneSubTasks.length && (
            <>
              <button type="button" onClick={() => setShowDoneSubTasks((open) => !open)} style={doneToggleStyle}>
                {showDoneSubTasks ? "\u1ea8n" : "\u0110\u00e3 xong"} {doneSubTasks.length} sub-task
                {showDoneSubTasks ? <ChevronRight size={13} style={{ transform: "rotate(90deg)" }} /> : <ChevronRight size={13} />}
              </button>
              {showDoneSubTasks && doneSubTasks.map((subTask) => (
                <SubTaskLine
                  key={subTask.id}
                  taskId={task.id}
                  subTask={subTask}
                  users={users}
                  isAdmin={isAdmin}
                  onToggle={() => onSubToggle(subTask)}
                  onEdit={(updates) => onSubEdit(subTask, updates)}
                />
              ))}
            </>
          )}
          {!task.subTasks.length && (
            <div style={{ padding: 18, border: "1px dashed var(--border)", borderRadius: 10, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Task n\u00e0y ch\u01b0a c\u00f3 sub-task.
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, padding: 10, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-secondary)", display: "grid", gridTemplateColumns: "1fr 132px 38px", gap: 8 }}>
          <input
            ref={subTaskInputRef}
            value={newSubContent}
            onChange={(event) => onNewSubContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAddSubTask();
            }}
            placeholder="Thêm sub-task nhanh..."
            style={inputStyle}
          />
          <input type="date" value={newSubDeadline} onChange={(event) => onNewSubDeadline(event.target.value)} style={inputStyle} title="Deadline sub-task" />
          <button type="button" onClick={onAddSubTask} disabled={!newSubContent.trim()} title="Thêm sub-task" style={{ ...iconButtonStyle, opacity: newSubContent.trim() ? 1 : 0.5 }}>
            <Plus size={16} />
          </button>
        </div>

        <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-secondary)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
              <MessageSquare size={14} />
              Trao đổi task
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{taskComments.length} tin</span>
          </div>

          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 170, overflowY: "auto" }}>
            {taskComments.slice(-4).map((comment) => (
              <CommentBubble key={comment.id} comment={comment} users={users} currentUserId={currentUser?.id} />
            ))}
            {!taskComments.length && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
                Chưa có trao đổi trong task này.
              </div>
            )}
          </div>

          <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 36px", gap: 8 }}>
            <input
              ref={messageInputRef}
              value={taskMessage}
              onChange={(event) => setTaskMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendTaskMessage();
              }}
              placeholder="Nhắn trong task..."
              style={inputStyle}
            />
            <button type="button" onClick={sendTaskMessage} disabled={!taskMessage.trim()} title="Gửi" style={{ ...iconButtonStyle, width: 36, height: 36, opacity: taskMessage.trim() ? 1 : 0.55 }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SubTaskLine({
  taskId,
  subTask,
  users,
  isAdmin,
  onToggle,
  onEdit,
}: {
  taskId: string;
  subTask: SubTask;
  users: User[];
  isAdmin: boolean;
  onToggle: () => void;
  onEdit: (updates: Partial<SubTask>) => void;
}) {
  const { currentUser } = useAuth();
  const { addSubTaskComment } = useData();
  const [editing, setEditing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [content, setContent] = useState(subTask.content);
  const [deadline, setDeadline] = useState(subTask.deadline);
  const pics = getUsers(users, subTask.picIds ?? []);
  const date = safeDate(subTask.deadline);
  const overdue = subTask.status !== "done" && !!date && isPast(date) && !isToday(date);
  const comments = subTask.comments ?? [];

  const save = () => {
    onEdit({ content: content.trim() || subTask.content, deadline: deadline || subTask.deadline });
    setEditing(false);
  };

  const startEditing = () => {
    setContent(subTask.content);
    setDeadline(subTask.deadline);
    setEditing(true);
  };

  const sendMessage = () => {
    if (!currentUser || !message.trim()) return;
    addSubTaskComment(taskId, subTask.id, { userId: currentUser.id, content: message.trim() });
    setMessage("");
    setChatOpen(true);
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: subTask.status === "done" ? "rgba(22,163,74,0.045)" : "var(--bg-card)", opacity: subTask.status === "done" ? 0.58 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <button type="button" onClick={onToggle} title={subTask.status === "done" && !isAdmin ? "Đã hoàn thành" : "Cập nhật trạng thái"} style={{ ...plainIconButtonStyle, marginTop: 1 }}>
          {subTask.status === "done" ? <CheckSquare size={16} color="var(--accent-green)" /> : subTask.status === "reviewing" ? <Send size={15} color="#d97706" /> : <Square size={16} color="var(--text-muted)" />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 132px", gap: 8 }}>
              <input value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => event.key === "Enter" && save()} style={inputStyle} />
              <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} style={inputStyle} />
            </div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.45, color: subTask.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: subTask.status === "done" ? "line-through" : "none", fontWeight: 620 }}>
              {subTask.content}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: overdue ? "var(--accent-red)" : "var(--text-muted)", fontWeight: overdue ? 700 : 500 }}>
              <Calendar size={11} /> {date ? format(date, "dd/MM/yyyy") : "Chưa có hạn"}
            </span>
            {subTask.status === "reviewing" && <span style={{ ...miniStatusStyle, color: "#d97706", background: "rgba(217,119,6,0.12)" }}>Chờ duyệt</span>}
            {subTask.status === "done" && <span style={{ ...miniStatusStyle, color: "var(--accent-green)", background: "rgba(22,163,74,0.12)" }}>Đã xong</span>}
            <button
              type="button"
              onClick={() => setChatOpen((open) => !open)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: chatOpen ? "var(--accent-blue)" : "var(--text-muted)", background: "transparent", border: "none", padding: 0, cursor: "pointer", fontWeight: chatOpen ? 800 : 600 }}
            >
              <MessageSquare size={11} /> {comments.length}
            </button>
            <AvatarStack users={pics} compact />
          </div>
        </div>
        {editing ? (
          <button type="button" onClick={save} style={{ ...iconButtonStyle, width: 30, height: 30 }} title="Lưu">
            <CheckCircle2 size={15} />
          </button>
        ) : (
          <button type="button" onClick={startEditing} style={{ ...plainIconButtonStyle, color: "var(--text-muted)" }} title="Sửa nhanh">
            <Edit3 size={14} />
          </button>
        )}
      </div>

      {chatOpen && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
            {comments.slice(-4).map((comment) => (
              <CommentBubble key={comment.id} comment={comment} users={users} currentUserId={currentUser?.id} compact />
            ))}
            {!comments.length && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "6px 0" }}>
                Chưa có trao đổi cho sub-task này.
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 32px", gap: 7 }}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="Nhắn trong sub-task..."
              style={{ ...inputStyle, fontSize: 12, padding: "7px 9px" }}
            />
            <button type="button" onClick={sendMessage} disabled={!message.trim()} title="Gửi" style={{ ...iconButtonStyle, width: 32, height: 32, opacity: message.trim() ? 1 : 0.55 }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentBubble({
  comment,
  users,
  currentUserId,
  compact = false,
}: {
  comment: { userId: string; content: string; imageUrl?: string; createdAt: string };
  users: User[];
  currentUserId?: string;
  compact?: boolean;
}) {
  const user = users.find((item) => item.id === comment.userId);
  const isMine = comment.userId === currentUserId;
  const createdAt = safeDate(comment.createdAt);

  return (
    <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "86%", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", gap: 5, marginBottom: 2 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>{user ? shortName(user.fullName) : "Người dùng"}</span>
          {createdAt && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{format(createdAt, compact ? "HH:mm" : "HH:mm dd/MM")}</span>}
        </div>
        <div
          style={{
            background: isMine ? "var(--accent-blue)" : "var(--bg-card)",
            border: isMine ? "none" : "1px solid var(--border)",
            color: isMine ? "white" : "var(--text-primary)",
            borderRadius: 10,
            padding: compact ? "6px 9px" : "8px 11px",
            fontSize: compact ? 12 : 13,
            lineHeight: 1.45,
            overflowWrap: "anywhere",
          }}
        >
          {comment.content}
          {comment.imageUrl && (
            <img src={comment.imageUrl} alt="attachment" style={{ display: "block", maxWidth: 180, maxHeight: 120, borderRadius: 7, marginTop: comment.content ? 6 : 0 }} />
          )}
        </div>
      </div>
    </div>
  );
}

function PanelField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
        {icon}
        {label}
      </div>
      {children}
    </label>
  );
}

function QuickChip({ active, label, tone = "#3b82f6", onClick }: { active: boolean; label: string; tone?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? tone : "var(--border)"}`,
        background: active ? `${tone}18` : "var(--bg-secondary)",
        color: active ? tone : "var(--text-secondary)",
        borderRadius: 999,
        padding: "7px 11px",
        fontSize: 12,
        fontWeight: 750,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function QuickActionButton({ label, onClick, icon, tone = "blue" }: { label: string; onClick: () => void; icon?: React.ReactNode; tone?: "blue" | "green" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${tone === "green" ? "rgba(22,163,74,0.3)" : "rgba(59,130,246,0.3)"}`,
        background: tone === "green" ? "rgba(22,163,74,0.1)" : "rgba(59,130,246,0.1)",
        color: tone === "green" ? "var(--accent-green)" : "var(--accent-blue)",
        borderRadius: 9,
        padding: "7px 10px",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SubTaskGroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px", color: "var(--text-muted)", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      <span>{label}</span>
      <span>{count}</span>
    </div>
  );
}

function getEmptyStateText(scope: TaskActionScope) {
  if (scope === "action") return "Không có task cần xử lý ngay.";
  if (scope === "overdue") return "Không có task quá hạn.";
  if (scope === "today") return "Không có task đến hạn hôm nay.";
  if (scope === "review") return "Không có task cần duyệt.";
  if (scope === "unassigned") return "Không có task chưa giao người.";
  if (scope === "mine") return "Không có task nào của bạn trong bộ lọc này.";
  return "Không có task trong nhóm này.";
}

function HeaderCell({ label }: { label: string }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>;
}

function MetaPill({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, maxWidth: 160, padding: "3px 8px", borderRadius: 7, background: `${color}14`, border: `1px solid ${color}33`, color, fontSize: 11, fontWeight: 750 }}>
      <Circle size={7} fill={color} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </span>
  );
}

function AvatarStack({ users, showNames = false, compact = false, emptyLabel = "Chưa giao" }: { users: User[]; showNames?: boolean; compact?: boolean; emptyLabel?: string }) {
  if (!users.length) {
    return <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{emptyLabel}</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: showNames ? 7 : 0, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {users.slice(0, compact ? 2 : 3).map((user, index) => (
          <div
            key={user.id}
            title={user.fullName}
            style={{
              width: compact ? 20 : 24,
              height: compact ? 20 : 24,
              borderRadius: 7,
              background: user.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: compact ? 8 : 10,
              fontWeight: 800,
              marginLeft: index ? -5 : 0,
              border: "1.5px solid var(--bg-card)",
            }}
          >
            {user.fullName.split(" ").slice(-1)[0]?.charAt(0)}
          </div>
        ))}
      </div>
      {users.length > (compact ? 2 : 3) && <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>+{users.length - (compact ? 2 : 3)}</span>}
      {showNames && <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{users.map((user) => shortName(user.fullName)).join(", ")}</span>}
    </div>
  );
}

function getUsers(users: User[], ids: string[]) {
  return ids.map((id) => users.find((user) => user.id === id)).filter(Boolean) as User[];
}

function shortName(name: string) {
  return name.split(" ").slice(-2).join(" ");
}

function safeDate(value?: string) {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const surfaceStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "var(--shadow)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
  padding: "8px 10px",
  fontFamily: "inherit",
};

const iconButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const plainIconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 2,
  flexShrink: 0,
};

const miniStatusStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 10,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const dangerPillStyle: React.CSSProperties = {
  ...miniStatusStyle,
  background: "rgba(220,38,38,0.12)",
  color: "var(--accent-red)",
};

const neutralPillStyle: React.CSSProperties = {
  ...miniStatusStyle,
  background: "var(--bg-hover)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
};

const toneStyles: Record<string, { text: string; bg: string }> = {
  red: { text: "#dc2626", bg: "rgba(220,38,38,0.1)" },
  orange: { text: "#d97706", bg: "rgba(245,158,11,0.12)" },
  purple: { text: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  blue: { text: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  green: { text: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  gray: { text: "var(--text-muted)", bg: "var(--bg-secondary)" },
};

const doneToggleStyle: React.CSSProperties = {
  width: "100%",
  border: "1px dashed var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-muted)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const emptyStateStyle: React.CSSProperties = {
  minHeight: 360,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text-muted)",
};
