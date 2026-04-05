"use client";

import { useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Task, Brand, User, TaskStatus, SubTask } from "@/lib/types";
import { format, parseISO, isPast } from "date-fns";
import { AlertCircle, GripVertical, Lock, CheckSquare, Square } from "lucide-react";

const COLUMNS: { id: TaskStatus; label: string; color: string; accent: string }[] = [
  { id: "todo", label: "Chờ xử lý", color: "#6b7280", accent: "rgba(107,114,128,0.12)" },
  { id: "inprogress", label: "Đang thực hiện", color: "#3b82f6", accent: "rgba(59,130,246,0.12)" },
  { id: "review", label: "Chờ duyệt", color: "#f59e0b", accent: "rgba(245,158,11,0.12)" },
  { id: "done", label: "Hoàn thành", color: "#10b981", accent: "rgba(16,185,129,0.12)" },
];
const PRIORITY_COLOR: Record<string, string> = { low: "#6b7280", medium: "#f59e0b", high: "#ef4444" };

interface Props {
  tasks: Task[];
  brands: Brand[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  isAdmin: boolean;
}

export default function TaskBoardView({ tasks, brands, users, onTaskClick, onStatusChange, isAdmin }: Props) {
  const columns = useMemo(() => COLUMNS.map((col) => ({ ...col, tasks: tasks.filter((t) => t.status === col.id) })), [tasks]);

  const canMoveToDone = (task: Task) =>
    task.subTasks.length === 0 || task.subTasks.every((st) => st.status === "done" && st.acceptanceNotes.trim());

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;
    const newStatus = destination.droppableId as TaskStatus;
    if (newStatus === "done" && !canMoveToDone(task)) {
      alert("⚠️ Tất cả sub-tasks phải hoàn thành và có ghi chú nghiệm thu trước khi đóng task.");
      return;
    }
    onStatusChange(draggableId, newStatus);
  };

  const getBrand = (id: string) => brands.find((b) => b.id === id);
  const getPics = (ids: string[]) => (ids ?? []).map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, minHeight: 400 }}>
        {columns.map((col) => (
          <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Column header */}
            <div style={{ padding: "11px 14px", borderRadius: "12px 12px 0 0", background: col.accent, border: `1px solid ${col.color}33`, borderBottom: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, boxShadow: `0 0 8px ${col.color}66` }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
              </div>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: `${col.color}22`, border: `1px solid ${col.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: col.color }}>
                {col.tasks.length}
              </span>
            </div>

            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                    style={{
                      flex: 1,
                      minHeight: 100,
                      padding: "8px",
                      background: snapshot.isDraggingOver ? `${col.color}12` : "var(--bg-secondary)",
                      border: `1px solid ${snapshot.isDraggingOver ? col.color + "55" : "var(--border)"}`,
                    borderTop: "none",
                    borderRadius: "0 0 12px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    transition: "all 0.2s",
                  }}
                >
                  {col.tasks.map((task, index) => {
                    const brand = getBrand(task.brandId);
                    const pics = getPics(task.picIds ?? [task.picId ?? ""].filter(Boolean));
                    const isOverdue = task.status !== "done" && isPast(parseISO(task.deadline));
                    const doneSubCount = task.subTasks.filter((s) => s.status === "done").length;
                    const allDone = canMoveToDone(task);

                    return (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(drag, dsnap) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            style={{
                              background: dsnap.isDragging ? "var(--bg-hover)" : "var(--bg-card)",
                              border: `1px solid ${dsnap.isDragging ? col.color + "55" : "var(--border)"}`,
                              borderRadius: 10,
                              overflow: "hidden",
                              boxShadow: dsnap.isDragging ? `0 16px 40px rgba(0,0,0,0.35), 0 0 0 1px ${col.color}33` : "0 1px 3px rgba(0,0,0,0.1)",
                              ...drag.draggableProps.style,
                            }}
                          >
                            {/* Brand accent bar */}
                            <div style={{ height: 3, background: brand?.color ?? "#3b82f6" }} />

                            <div style={{ padding: "10px 12px" }}>
                              {/* Drag + title */}
                              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                <div {...drag.dragHandleProps} style={{ color: "var(--text-muted)", cursor: "grab", paddingTop: 2, flexShrink: 0 }}>
                                  <GripVertical size={14} />
                                </div>
                                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, cursor: "pointer" }} onClick={() => onTaskClick(task)}>
                                  {task.title}
                                </div>
                              </div>

                              {/* Brand badge */}
                              {brand && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 5, background: `${brand.color}18`, border: `1px solid ${brand.color}44`, fontSize: 10, color: brand.color, fontWeight: 600, marginBottom: 8 }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: brand.color, display: "inline-block" }} /> {brand.name}
                                </span>
                              )}

                              {/* Sub-tasks inline */}
                              {task.subTasks.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                      {doneSubCount}/{task.subTasks.length} sub-tasks
                                    </span>
                                    {col.id !== "done" && !allDone && (
                                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#f59e0b" }}>
                                        <Lock size={10} /> Khóa
                                      </span>
                                    )}
                                  </div>
                                  {/* Progress bar */}
                                  <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
                                    <div style={{ height: "100%", width: `${(doneSubCount / task.subTasks.length) * 100}%`, background: allDone ? "#10b981" : "#3b82f6", borderRadius: 2, transition: "width 0.4s" }} />
                                  </div>
                                  {/* Sub-task list */}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 90, overflowY: "auto" }}>
                                    {task.subTasks.map((st) => (
                                      <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                                        {st.status === "done"
                                          ? <CheckSquare size={11} color="#10b981" style={{ flexShrink: 0 }} />
                                          : <Square size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                        }
                                        <span style={{ flex: 1, color: st.status === "done" ? "var(--text-muted)" : "var(--text-secondary)", textDecoration: st.status === "done" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {st.content}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Footer */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 11, color: isOverdue ? "#ef4444" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 3, fontWeight: isOverdue ? 600 : 400 }}>
                                  {isOverdue && <AlertCircle size={10} />}
                                  {format(parseISO(task.deadline), "dd/MM")}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[task.priority], display: "inline-block" }} />
                                  {pics.slice(0, 3).map((p, i) => (
                                    <div key={p.id} style={{ width: 20, height: 20, borderRadius: 5, background: p.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", marginLeft: i > 0 ? -4 : 0, border: "1.5px solid var(--bg-card)", cursor: "default" }} title={p.fullName}>
                                      {p.fullName.split(" ").slice(-1)[0].charAt(0)}
                                    </div>
                                  ))}
                                  {pics.length > 3 && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+{pics.length - 3}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {col.tasks.length === 0 && !snapshot.isDraggingOver && (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: 12, opacity: 0.6 }}>
                      Kéo task vào đây
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
