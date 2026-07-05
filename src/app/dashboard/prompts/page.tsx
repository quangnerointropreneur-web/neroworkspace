"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { PromptCard } from "@/lib/types";
import { Search, Plus, Sparkles, X, Edit2, Trash2, Copy, Image as ImageIcon, Check } from "lucide-react";
import { format } from "date-fns";

// --- Image Compression Utility ---
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        // Convert to WebP for better compression
        resolve(canvas.toDataURL("image/webp", 0.7));
      };
    };
  });
};

export default function PromptsPage() {
  const { currentUser } = useAuth();
  const { state, addPromptCard, updatePromptCard, deletePromptCard } = useData();
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPromptText, setFPromptText] = useState("");
  const [fImageUrl, setFImageUrl] = useState("");

  const [viewingCard, setViewingCard] = useState<PromptCard | null>(null);
  const [copied, setCopied] = useState(false);

  // Protection
  const isAdmin = currentUser?.role === "admin";
  const isAssistant = currentUser?.role === "assistant";
  const canEdit = isAdmin || isAssistant;

  const cards = useMemo(() => {
    let list = state.promptCards ?? [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(s) || c.description?.toLowerCase().includes(s) || c.promptText.toLowerCase().includes(s));
    }
    return list;
  }, [state.promptCards, search]);

  if (!canEdit) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: "var(--text-primary)" }}>Bạn không có quyền truy cập trang này.</h2>
      </div>
    );
  }

  const resetForm = () => {
    setFTitle("");
    setFDesc("");
    setFPromptText("");
    setFImageUrl("");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (card: PromptCard, e: React.MouseEvent) => {
    e.stopPropagation();
    setFTitle(card.title);
    setFDesc(card.description ?? "");
    setFPromptText(card.promptText);
    setFImageUrl(card.imageUrl ?? "");
    setEditingId(card.id);
    setShowCreate(true);
  };

  const handleSave = () => {
    if (!fTitle.trim() || !fPromptText.trim()) return;
    const data = {
      title: fTitle.trim(),
      description: fDesc.trim(),
      promptText: fPromptText.trim(),
      imageUrl: fImageUrl,
    };
    if (editingId) {
      updatePromptCard(editingId, data);
    } else {
      addPromptCard(data);
    }
    setShowCreate(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa Prompt này?")) {
      deletePromptCard(id);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const compressed = await compressImage(file);
          setFImageUrl(compressed);
        }
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setFImageUrl(compressed);
    }
  };

  const inpStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14 };

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        {/* Styles for Masonry */}
      <style dangerouslySetInnerHTML={{__html: `
        .masonry-grid {
          column-count: 3;
          column-gap: 20px;
        }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 20px;
        }
        @media (max-width: 1024px) { .masonry-grid { column-count: 2; } }
        @media (max-width: 640px) { .masonry-grid { column-count: 1; } }
        
        .prompt-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
        }
        .prompt-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          border-color: var(--accent-blue);
        }
      `}} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles style={{ color: "#8b5cf6" }} /> Master Prompt AI
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Thư viện lưu trữ và quản lý các câu lệnh AI chất lượng cao
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            borderRadius: 12, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            border: "none", color: "white", fontSize: 14, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 18px rgba(139,92,246,0.35)"
          }}
        >
          <Plus size={16} /> Thêm Prompt
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-card)", padding: "12px 16px", borderRadius: 14, border: "1px solid var(--border)" }}>
        <Search size={16} color="var(--text-muted)" />
        <input 
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm prompt..." 
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 14 }}
        />
        {search && <X size={16} color="var(--text-muted)" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
      </div>

      {/* Masonry Grid */}
      {cards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 18, border: "1px dashed var(--border)" }}>
          <Sparkles size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 16, marginBottom: 4 }}>Chưa có lệnh Prompt nào</p>
          <p style={{ fontSize: 13 }}>Bấm &quot;+ Thêm Prompt&quot; để tạo thư viện AI của bạn</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {cards.map(card => (
            <div key={card.id} className="masonry-item prompt-card" onClick={() => setViewingCard(card)}>
              {card.imageUrl && (
                <div style={{ width: "100%", maxHeight: 250, overflow: "hidden", borderBottom: "1px solid var(--border)", background: "#000" }}>
                  <img src={card.imageUrl} alt={card.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                </div>
              )}
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>{card.title}</h3>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={(e) => openEdit(card, e)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={(e) => handleDelete(card.id, e)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {card.description && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                    {card.description}
                  </p>
                )}
                <div style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8, fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {card.promptText}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div className="animate-fadeIn" style={{ background: "var(--bg-primary)", width: "100%", maxWidth: 600, borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{editingId ? "Sửa Prompt" : "Thêm Prompt mới"}</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tiêu đề <span style={{ color: "red" }}>*</span></label>
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Vd: Prompt tạo kịch bản Tiktok..." style={inpStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Mô tả ngắn</label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Tác dụng của prompt này..." style={inpStyle} />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nội dung Prompt <span style={{ color: "red" }}>*</span></label>
                <textarea 
                  value={fPromptText} onChange={e => setFPromptText(e.target.value)} 
                  placeholder="Đóng vai chuyên gia..." 
                  style={{ ...inpStyle, minHeight: 150, resize: "vertical", fontFamily: "monospace", lineHeight: 1.5 }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ảnh minh họa (Tùy chọn)</label>
                <div 
                  onPaste={handlePaste}
                  style={{ 
                    border: "2px dashed var(--border)", borderRadius: 12, padding: "24px", textAlign: "center", 
                    background: "var(--bg-secondary)", cursor: "pointer", position: "relative", overflow: "hidden"
                  }}
                >
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                  {fImageUrl ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <img src={fImageUrl} alt="Preview" style={{ maxHeight: 150, borderRadius: 8, border: "1px solid var(--border)" }} />
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Nhấn hoặc Paste ảnh khác để thay thế</span>
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <ImageIcon size={32} style={{ opacity: 0.5 }} />
                      <div style={{ fontSize: 13 }}>Click để chọn ảnh hoặc <b>Ctrl+V</b> để paste ảnh vào đây</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12, background: "var(--bg-card)", borderRadius: "0 0 20px 20px" }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>
                Hủy
              </button>
              <button onClick={handleSave} disabled={!fTitle.trim() || !fPromptText.trim()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: fTitle.trim() && fPromptText.trim() ? "var(--accent-blue)" : "var(--border)", color: "white", fontWeight: 600, cursor: fTitle.trim() && fPromptText.trim() ? "pointer" : "not-allowed" }}>
                Lưu Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingCard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }} onClick={() => setViewingCard(null)}>
          <div className="animate-fadeIn" style={{ background: "var(--bg-primary)", width: "100%", maxWidth: 700, borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 25px 50px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            {viewingCard.imageUrl && (
              <div style={{ width: "100%", maxHeight: 300, background: "#000", borderBottom: "1px solid var(--border)" }}>
                <img src={viewingCard.imageUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            )}
            <div style={{ padding: 24, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>{viewingCard.title}</h2>
                  {viewingCard.description && <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{viewingCard.description}</p>}
                </div>
                <button onClick={() => setViewingCard(null)} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)", cursor: "pointer", flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Nội dung Prompt</span>
                  <button 
                    onClick={() => handleCopy(viewingCard.promptText)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: copied ? "#10b98122" : "var(--bg-primary)", border: `1px solid ${copied ? "#10b98155" : "var(--border)"}`, color: copied ? "#10b981" : "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  >
                    {copied ? <><Check size={14} /> Đã Copy</> : <><Copy size={14} /> Copy Prompt</>}
                  </button>
                </div>
                <div style={{ padding: 16, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, fontFamily: "monospace", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                  {viewingCard.promptText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
