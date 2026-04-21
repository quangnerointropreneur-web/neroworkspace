"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Task, PersonalNote } from "@/lib/types";
import { Plus, Check, Calendar, Tag, Trash2, Edit2, X, Save } from "lucide-react";
import TaskModal from "@/components/tasks/TaskModal";

export default function TodolistPage() {
  const { currentUser } = useAuth();
  const { state, addTask, updateTaskStatus, addPersonalNote, updatePersonalNote, deletePersonalNote } = useData();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newBrandId, setNewBrandId] = useState(state.brands[0]?.id ?? "");
  const [newDeadline, setNewDeadline] = useState(new Date().toISOString().split("T")[0]);
  const [newPicIds, setNewPicIds] = useState<string[]>([currentUser?.id ?? ""]);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Local Notes Text State (for input only)
  const [newNoteText, setNewNoteText] = useState("");
  
  // Editing state for notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const uid = currentUser?.id ?? "";

  // The todolist focuses on tasks assigned to the current user, excluding done tasks
  const myTasks = useMemo(() => {
    const filtered = state.tasks.filter((t) => (t.picIds?.includes(uid) || t.picId === uid) && t.status !== "done");
    return filtered.sort((a, b) => {
      const dateA = a.deadline || "9999-12-31";
      const dateB = b.deadline || "9999-12-31";
      return dateA.localeCompare(dateB);
    });
  }, [state.tasks, uid]);

  // Personal Notes filtered by user and sorted by creation date
  const myNotes = useMemo(() => {
    return state.personalNotes
      .filter(n => n.userId === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.personalNotes, uid]);

  const togglePicId = (id: string) => {
    setNewPicIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleQuickAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim() || !newPicIds.length) return;

    addTask({
      title: newTaskTitle.trim(),
      description: "",
      brandId: newBrandId || (state.brands[0]?.id ?? ""),
      picId: newPicIds[0] ?? "",
      picIds: newPicIds,
      startDate: new Date().toISOString().split("T")[0],
      deadline: newDeadline,
      status: "todo",
      priority: "medium",
    });

    setNewTaskTitle("");
  };

  const toggleTaskStatus = (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    updateTaskStatus(task.id, newStatus);
  };

  const getBrandName = (brandId: string) => {
    return state.brands.find(b => b.id === brandId)?.name || "N/A";
  };

  // Cloud Notes Handlers
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    addPersonalNote({
      text: newNoteText.trim(),
      done: false
    });
    setNewNoteText("");
  };

  const toggleNote = (id: string, currentStatus: boolean) => {
    updatePersonalNote(id, { done: !currentStatus });
  };

  const handleDeleteNote = (id: string) => {
    deletePersonalNote(id);
  };

  const startEditing = (note: PersonalNote) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingText("");
  };

  const handleUpdateNote = (id: string) => {
    if (!editingText.trim()) return;
    updatePersonalNote(id, { text: editingText.trim() });
    cancelEditing();
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 12px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <>
      <div className="animate-fadeIn grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto py-2">
        {/* Left Column: Todolist */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              Todolist & Công việc
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Quản lý task và thêm nhanh. Các công việc hoàn thành sẽ tự động ẩn khỏi danh sách dưới đây.
            </p>
          </div>

          {/* Quick Add Form expanded */}
          <form onSubmit={handleQuickAdd} style={{ 
            background: "var(--bg-card)",
            padding: "20px",
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Thêm nhanh công việc..."
                style={{
                  width: "100%",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  fontWeight: 600,
                  outline: "none"
                }}
              />
            </div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <select value={newBrandId} onChange={(e) => setNewBrandId(e.target.value)} style={{ ...inputStyle, cursor: "pointer", flex: 1, minWidth: 120 }}>
                {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {state.users.map((u) => {
                  const sel = newPicIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => togglePicId(u.id)}
                      style={{ 
                        display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, 
                        background: sel ? "rgba(59,130,246,0.15)" : "var(--bg-hover)", 
                        border: `1px solid ${sel ? "rgba(59,130,246,0.4)" : "var(--border)"}`, 
                        color: sel ? "var(--accent-blue)" : "var(--text-secondary)", cursor: "pointer", fontSize: 11, fontWeight: sel ? 700 : 500 
                      }}
                    >
                      {u.fullName.split(" ").slice(-1)[0]} {sel && "✓"}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={!newTaskTitle.trim() || !newPicIds.length}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 20px",
                  borderRadius: 10,
                  background: (!newTaskTitle.trim() || !newPicIds.length) ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  border: "none",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: (!newTaskTitle.trim() || !newPicIds.length) ? "not-allowed" : "pointer",
                  marginLeft: "auto"
                }}
              >
                <Plus size={16} />
                <span>Thêm</span>
              </button>
            </div>
          </form>

          {/* Checklist View */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: 14, background: "var(--bg-card)", borderRadius: 16, border: "1px dashed var(--border)" }}>
                🎉 Bạn đã hoàn thành tất cả công việc!
              </div>
            ) : (
              myTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    padding: "16px",
                    background: "var(--bg-card)",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-blue)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  <button
                    onClick={() => toggleTaskStatus(task)}
                    title="Đánh dấu hoàn thành"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "2px solid var(--text-muted)",
                      background: "transparent",
                      color: "transparent",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginTop: 2,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#10b981"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--text-muted)"; e.currentTarget.style.color = "transparent"; }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  
                  <div 
                    onClick={() => setSelectedTask(task)}
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  >
                    <div style={{ 
                      fontSize: 15, 
                      fontWeight: 600, 
                      color: "var(--text-primary)", 
                      marginBottom: 6,
                      wordBreak: "break-word"
                    }}>
                      {task.title}
                    </div>
                    
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Tag size={12} />
                        <span>{getBrandName(task.brandId)}</span>
                      </div>
                      {task.deadline && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: task.deadline < new Date().toISOString().split("T")[0] ? "#ef4444" : "inherit" }}>
                          <Calendar size={12} />
                          <span>Hạn: {task.deadline}</span>
                        </div>
                      )}
                      {task.status === "review" && (
                        <div style={{ 
                          padding: "2px 8px", 
                          borderRadius: 12, 
                          background: "rgba(245,158,11,0.1)", 
                          color: "#f59e0b",
                          fontSize: 10,
                          fontWeight: 700
                        }}>
                          ĐANG CHỜ DUYỆT
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Personal Notes */}
        <div className="flex flex-col gap-4">
          <div style={{
            background: "var(--bg-card)",
            padding: "20px",
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid var(--border)",
            height: "fit-content",
            display: "flex",
            flexDirection: "column",
            maxHeight: "calc(100vh - 100px)",
            position: "sticky",
            top: 16
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Edit2 size={16} /> Ghi chú cá nhân
            </h2>

            <form onSubmit={handleAddNote} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Thêm ghi chú..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                style={{
                  background: !newNoteText.trim() ? "var(--bg-secondary)" : "rgba(16, 185, 129, 0.15)",
                  color: !newNoteText.trim() ? "var(--text-muted)" : "#10b981",
                  border: "none",
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: !newNoteText.trim() ? "not-allowed" : "pointer",
                }}
              >
                <Plus size={16} />
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", paddingRight: 4, flex: 1 }}>
              {myNotes.length === 0 ? (
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "20px 0" }}>
                  Chưa có ghi chú nào.
                </div>
              ) : (
                myNotes.map(note => (
                  <div 
                    key={note.id} 
                    className="group"
                    style={{ 
                      display: "flex", 
                      alignItems: "flex-start", 
                      gap: 10, 
                      padding: "8px 12px", 
                      background: note.done ? "transparent" : "var(--bg-secondary)", 
                      borderRadius: 12, 
                      opacity: note.done ? 0.5 : 1,
                      border: "1px solid transparent",
                      transition: "all 0.2s"
                    }}
                  >
                    <button
                      onClick={() => toggleNote(note.id, note.done)}
                      style={{
                        width: 18, height: 18, borderRadius: 6, marginTop: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        border: `2.5px solid ${note.done ? "#10b981" : "var(--text-muted)"}`,
                        background: note.done ? "#10b981" : "transparent",
                        color: "white", cursor: "pointer"
                      }}
                    >
                      {note.done && <Check size={12} strokeWidth={4} />}
                    </button>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingNoteId === note.id ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateNote(note.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            style={{
                              ...inputStyle,
                              padding: "4px 8px",
                              width: "100%",
                              fontSize: 13
                            }}
                          />
                          <button onClick={() => handleUpdateNote(note.id)} style={{ color: "#10b981", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                            <Check size={14} />
                          </button>
                          <button onClick={cancelEditing} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => !note.done && startEditing(note)}
                          style={{ 
                            fontSize: 13, 
                            color: "var(--text-primary)", 
                            wordBreak: "break-word", 
                            textDecoration: note.done ? "line-through" : "none",
                            cursor: note.done ? "default" : "pointer"
                          }}
                        >
                          {note.text}
                        </div>
                      )}
                    </div>

                    {!editingNoteId && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        {!note.done && (
                          <button onClick={() => startEditing(note)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}>
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button onClick={() => handleDeleteNote(note.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  );
}
