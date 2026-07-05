"use client";

import { useMemo, useState } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { PersonalNote } from "@/lib/types";
import { Check, Edit2, Plus, Save, Trash2, X } from "lucide-react";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function MeetingNotePage() {
  const { currentUser } = useAuth();
  const { state, addPersonalNote, updatePersonalNote, deletePersonalNote } = useData();
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const notes = useMemo(() => {
    const uid = currentUser?.id ?? "";
    return state.personalNotes
      .filter((note) => note.userId === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentUser?.id, state.personalNotes]);

  const addNote = () => {
    if (!newNoteText.trim()) return;
    addPersonalNote({
      text: newNoteText.trim(),
      done: false,
      targetDate: new Date().toLocaleDateString("en-CA"),
    });
    setNewNoteText("");
  };

  const startEditing = (note: PersonalNote) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const saveEdit = (id: string) => {
    if (!editingText.trim()) return;
    updatePersonalNote(id, { text: editingText.trim() });
    setEditingNoteId(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingText("");
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 850, color: "var(--text-primary)", marginBottom: 4 }}>Meeting note</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ghi nhanh nội dung họp, checklist và ý việc phát sinh.</p>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>{notes.length} ghi chú</div>
      </div>

      <section style={surfaceStyle}>
        <textarea
          value={newNoteText}
          onChange={(event) => setNewNoteText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") addNote();
          }}
          placeholder="Nhập meeting note... Có thể xuống dòng thoải mái. Ctrl+Enter để lưu nhanh."
          rows={7}
          style={textareaStyle}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 10 }}>
          <button
            onClick={addNote}
            disabled={!newNoteText.trim()}
            style={{
              ...primaryButtonStyle,
              opacity: newNoteText.trim() ? 1 : 0.55,
              cursor: newNoteText.trim() ? "pointer" : "not-allowed",
            }}
          >
            <Plus size={16} />
            Thêm note
          </button>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notes.length === 0 ? (
          <div style={{ ...surfaceStyle, textAlign: "center", padding: 42, color: "var(--text-muted)", fontSize: 14 }}>
            Chưa có meeting note nào.
          </div>
        ) : (
          notes.map((note) => (
            <article key={note.id} style={{ ...surfaceStyle, padding: 14, opacity: note.done ? 0.62 : 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr) auto", gap: 12, alignItems: "start" }}>
                <button
                  onClick={() => updatePersonalNote(note.id, { done: !note.done })}
                  title={note.done ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    border: `2px solid ${note.done ? "var(--accent-green)" : "var(--text-muted)"}`,
                    background: note.done ? "var(--accent-green)" : "transparent",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    marginTop: 2,
                  }}
                >
                  {note.done && <Check size={15} strokeWidth={4} />}
                </button>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800, marginBottom: 8 }}>
                    {formatDateTime(note.createdAt)}
                  </div>
                  {editingNoteId === note.id ? (
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      rows={Math.max(4, editingText.split("\n").length + 1)}
                      style={{ ...textareaStyle, minHeight: 120 }}
                    />
                  ) : (
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        fontSize: 14,
                        lineHeight: 1.7,
                        color: "var(--text-primary)",
                        textDecoration: note.done ? "line-through" : "none",
                      }}
                    >
                      {note.text}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {editingNoteId === note.id ? (
                    <>
                      <IconButton title="Lưu" onClick={() => saveEdit(note.id)} tone="green">
                        <Save size={14} />
                      </IconButton>
                      <IconButton title="Hủy" onClick={cancelEdit}>
                        <X size={14} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton title="Sửa" onClick={() => startEditing(note)}>
                        <Edit2 size={14} />
                      </IconButton>
                      <IconButton title="Xóa" onClick={() => deletePersonalNote(note.id)} tone="red">
                        <Trash2 size={14} />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function IconButton({ children, onClick, title, tone = "neutral" }: { children: React.ReactNode; onClick: () => void; title: string; tone?: "neutral" | "green" | "red" }) {
  const color = tone === "green" ? "var(--accent-green)" : tone === "red" ? "var(--accent-red)" : "var(--text-secondary)";
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const surfaceStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  boxShadow: "var(--shadow)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 170,
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text-primary)",
  fontSize: 14,
  lineHeight: 1.7,
  outline: "none",
  padding: "12px 14px",
  resize: "vertical",
  fontFamily: "inherit",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  color: "white",
  fontSize: 13,
  fontWeight: 800,
};
