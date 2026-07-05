"use client";

import { useState, useMemo } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { StrategyCard, StrategyTag, StrategyStatus } from "@/lib/types";
import { format, parseISO } from "date-fns";
import {
  Plus, X, Edit3, Save, Trash2, Pin, PinOff,
  Lightbulb, Target, Zap, TrendingUp, FileText,
  Search, Bookmark, Clock
} from "lucide-react";

const TAG_OPTIONS: { value: StrategyTag; label: string; color: string; icon: React.ReactNode }[] = [
  { value: "idea", label: "Ý tưởng", color: "#8b5cf6", icon: <Lightbulb size={11} /> },
  { value: "plan", label: "Kế hoạch", color: "#3b82f6", icon: <FileText size={11} /> },
  { value: "campaign", label: "Campaign", color: "#f59e0b", icon: <Zap size={11} /> },
  { value: "okr", label: "OKR", color: "#10b981", icon: <Target size={11} /> },
  { value: "insight", label: "Insight", color: "#ec4899", icon: <TrendingUp size={11} /> },
];

const STATUS_OPTIONS: { value: StrategyStatus; label: string; color: string }[] = [
  { value: "draft", label: "Ý tưởng thô", color: "#6b7280" },
  { value: "researching", label: "Đang nghiên cứu", color: "#3b82f6" },
  { value: "executing", label: "Đang thực thi", color: "#f59e0b" },
  { value: "done", label: "Đã hoàn thành", color: "#10b981" },
];

const PRIORITY_OPTIONS = [
  { value: "normal", label: "Bình thường", color: "#6b7280" },
  { value: "important", label: "Quan trọng", color: "#f59e0b" },
  { value: "critical", label: "Cực kỳ quan trọng", color: "#ef4444" },
];

const inp: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export default function StrategyPage() {
  const { currentUser } = useAuth();
  const { state, addStrategyCard, updateStrategyCard, deleteStrategyCard } = useData();
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "assistant";

  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<StrategyTag | "">("");
  const [filterStatus, setFilterStatus] = useState<StrategyStatus | "">("");
  const [filterBrand, setFilterBrand] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fContent, setFContent] = useState("");
  const [fTag, setFTag] = useState<StrategyTag>("idea");
  const [fStatus, setFStatus] = useState<StrategyStatus>("draft");
  const [fPriority, setFPriority] = useState<"normal" | "important" | "critical">("normal");
  const [fBrandId, setFBrandId] = useState("");
  const [fTimeline, setFTimeline] = useState("");
  const [fPinned, setFPinned] = useState(false);

  const resetOverlay = () => {
    setShowOverlay(false);
    setIsEditing(false);
    setViewingId(null);
  };

  const openCreate = () => {
    setFTitle(""); setFContent(""); setFTag("idea"); setFStatus("draft");
    setFPriority("normal"); setFBrandId(""); setFTimeline(""); setFPinned(false);
    setViewingId(null);
    setIsEditing(true);
    setShowOverlay(true);
  };

  const openView = (card: StrategyCard) => {
    setFTitle(card.title);
    setFContent(card.content);
    setFTag(card.tag);
    setFStatus(card.status);
    setFPriority(card.priority);
    setFBrandId(card.brandId ?? "");
    setFTimeline(card.timeline ?? "");
    setFPinned(card.pinned);
    setViewingId(card.id);
    setIsEditing(false);
    setShowOverlay(true);
  };

  const handleSave = () => {
    if (!fTitle.trim()) return;
    const data: Partial<StrategyCard> = {
      title: fTitle.trim(),
      content: fContent,
      tag: fTag,
      status: fStatus,
      priority: fPriority,
      pinned: fPinned,
    };
    if (fBrandId) data.brandId = fBrandId;
    if (fTimeline) data.timeline = fTimeline;

    if (viewingId) {
      updateStrategyCard(viewingId, data);
      setIsEditing(false);
    } else {
      addStrategyCard(data as any);
      setShowOverlay(false);
    }
  };

  const cards = useMemo(() => {
    let list = state.strategyCards ?? [];
    if (search) list = list.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.content.toLowerCase().includes(search.toLowerCase()));
    if (filterTag) list = list.filter(c => c.tag === filterTag);
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterBrand) list = list.filter(c => c.brandId === filterBrand);
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [state.strategyCards, search, filterTag, filterStatus, filterBrand]);

  const getTagConfig = (tag: StrategyTag) => TAG_OPTIONS.find(t => t.value === tag)!;
  const getStatusConfig = (s: StrategyStatus) => STATUS_OPTIONS.find(o => o.value === s)!;
  const getPriorityConfig = (p: string) => PRIORITY_OPTIONS.find(o => o.value === p) ?? PRIORITY_OPTIONS[0];
  const getBrand = (id?: string) => id ? state.brands.find(b => b.id === id) : null;

  const stats = useMemo(() => ({
    total: (state.strategyCards ?? []).length,
    pinned: (state.strategyCards ?? []).filter(c => c.pinned).length,
    executing: (state.strategyCards ?? []).filter(c => c.status === "executing").length,
    done: (state.strategyCards ?? []).filter(c => c.status === "done").length,
  }), [state.strategyCards]);

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            🧭 Strategy Board
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Không gian lưu trữ chiến lược, ý tưởng và kế hoạch thực thi
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
              borderRadius: 12, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
              border: "none", color: "white", fontSize: 14, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 18px rgba(139,92,246,0.35)"
            }}
          >
            <Plus size={16} /> Thêm chiến lược
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Tổng cộng", value: stats.total, color: "#8b5cf6", icon: <Bookmark size={16} /> },
          { label: "Đã ghim", value: stats.pinned, color: "#f59e0b", icon: <Pin size={16} /> },
          { label: "Đang thực thi", value: stats.executing, color: "#3b82f6", icon: <Zap size={16} /> },
          { label: "Hoàn thành", value: stats.done, color: "#10b981", icon: <Target size={16} /> },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 16px" }}>
        <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm chiến lược..." style={{ ...inp, flex: 1, minWidth: 140, padding: "6px 10px" }} />
        <select value={filterTag} onChange={e => setFilterTag(e.target.value as any)} style={{ ...inp, width: "auto", padding: "6px 10px", cursor: "pointer" }}>
          <option value="">Tất cả loại</option>
          {TAG_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={{ ...inp, width: "auto", padding: "6px 10px", cursor: "pointer" }}>
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px", cursor: "pointer" }}>
          <option value="">Tất cả Brand</option>
          {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {(search || filterTag || filterStatus || filterBrand) && (
          <button onClick={() => { setSearch(""); setFilterTag(""); setFilterStatus(""); setFilterBrand(""); }}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 12, cursor: "pointer" }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 18, border: "1px dashed var(--border)" }}>
          <Lightbulb size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 16, marginBottom: 4 }}>Chưa có chiến lược nào</p>
          <p style={{ fontSize: 13 }}>Bấm &quot;+ Thêm chiến lược&quot; để ghi lại ý tưởng đầu tiên</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {cards.map(card => {
            const tagConf = getTagConfig(card.tag);
            const statusConf = getStatusConfig(card.status);
            const prioConf = getPriorityConfig(card.priority);
            const brand = getBrand(card.brandId);

            return (
              <div
                key={card.id}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${card.pinned ? "#f59e0b44" : "var(--border)"}`,
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: card.pinned ? "0 0 0 2px #f59e0b22, 0 4px 20px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.08)",
                  transition: "all 0.2s",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ height: 3, background: prioConf.color === "#6b7280" ? "var(--border)" : prioConf.color }} />
                <div style={{ padding: "16px 18px", flex: 1 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, background: `${tagConf.color}18`, border: `1px solid ${tagConf.color}40`, color: tagConf.color, fontSize: 10, fontWeight: 700 }}>
                      {tagConf.icon} {tagConf.label}
                    </span>
                    <span style={{ padding: "2px 8px", borderRadius: 5, background: `${statusConf.color}15`, border: `1px solid ${statusConf.color}35`, color: statusConf.color, fontSize: 10, fontWeight: 600 }}>
                      {statusConf.label}
                    </span>
                    {card.priority !== "normal" && (
                      <span style={{ padding: "2px 8px", borderRadius: 5, background: `${prioConf.color}15`, color: prioConf.color, fontSize: 10, fontWeight: 700 }}>
                        {card.priority === "critical" ? "🔥 Cực kỳ quan trọng" : "⭐ Quan trọng"}
                      </span>
                    )}
                  </div>
                  <div style={{ cursor: "pointer" }} onClick={() => openView(card)}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 8 }}>
                      {card.pinned && <span style={{ marginRight: 5 }}>📌</span>}
                      {card.title}
                    </h3>
                    {card.content && (
                      <p style={{
                        fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65,
                        display: "-webkit-box", WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                        whiteSpace: "pre-wrap", marginBottom: 6
                      }}>
                        {card.content}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {brand && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: `${brand.color}15`, border: `1px solid ${brand.color}35`, color: brand.color, fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: brand.color, display: "inline-block" }} />
                        {brand.name}
                      </span>
                    )}
                    {card.timeline && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                        <Clock size={10} /> {format(parseISO(card.timeline), "dd/MM/yyyy")}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>
                      {format(parseISO(card.createdAt), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 6, background: "var(--bg-secondary)" }}>
                    <button onClick={() => updateStrategyCard(card.id, { pinned: !card.pinned })}
                      style={{ padding: "5px 10px", borderRadius: 7, background: card.pinned ? "rgba(245,158,11,0.1)" : "var(--bg-card)", border: `1px solid ${card.pinned ? "#f59e0b44" : "var(--border)"}`, color: card.pinned ? "#f59e0b" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
                      {card.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                      {card.pinned ? "Bỏ ghim" : "Ghim"}
                    </button>
                    <button onClick={() => { openView(card); setIsEditing(true); }}
                      style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--accent-blue)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
                      <Edit3 size={12} /> Sửa
                    </button>
                    <button onClick={() => deleteStrategyCard(card.id)}
                      style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}>
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Full-Page Overlay (Read/Edit) */}
      {showOverlay && (
        <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "var(--bg-primary)", overflowY: "auto", display: "flex", flexDirection: "column" }} className="animate-fadeIn">
          {/* Top Navbar */}
          <div style={{ position: "sticky", top: 0, background: "rgba(var(--bg-primary-rgb), 0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={resetOverlay} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                <X size={18} /> Đóng
              </button>
            </div>
            {canEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isEditing ? (
                  <>
                    <button onClick={() => viewingId ? setIsEditing(false) : setShowOverlay(false)} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      Hủy
                    </button>
                    <button onClick={handleSave} disabled={!fTitle.trim()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 8, background: !fTitle.trim() ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg,#8b5cf6,#3b82f6)", border: "none", color: "white", cursor: !fTitle.trim() ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
                      <Save size={14} /> Lưu lại
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--accent-blue)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    <Edit3 size={14} /> Chỉnh sửa
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Document Content */}
          <div style={{ flex: 1, padding: "40px 20px 80px 20px", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 1000 }}>
              
              {isEditing ? (
                // --- EDITING MODE ---
                <div className="animate-fadeIn">
                  <input
                    value={fTitle}
                    onChange={e => setFTitle(e.target.value)}
                    placeholder="Tiêu đề chiến lược..."
                    style={{ fontSize: 36, fontWeight: 900, color: "var(--text-primary)", background: "transparent", border: "none", outline: "none", width: "100%", marginBottom: 20 }}
                  />
                  
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16, marginBottom: 32, padding: "16px 20px", background: "var(--bg-secondary)", borderRadius: 16, border: "1px solid var(--border)" }}>
                    <div style={{ flex: "1 1 120px" }}>
                      <label style={lbl}>Loại</label>
                      <select value={fTag} onChange={e => setFTag(e.target.value as StrategyTag)} style={{ ...inp, cursor: "pointer" }}>
                        {TAG_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: "1 1 120px" }}>
                      <label style={lbl}>Trạng thái</label>
                      <select value={fStatus} onChange={e => setFStatus(e.target.value as StrategyStatus)} style={{ ...inp, cursor: "pointer" }}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: "1 1 140px" }}>
                      <label style={lbl}>Mức độ ưu tiên</label>
                      <select value={fPriority} onChange={e => setFPriority(e.target.value as any)} style={{ ...inp, cursor: "pointer" }}>
                        {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: "1 1 160px" }}>
                      <label style={lbl}>Brand liên quan</label>
                      <select value={fBrandId} onChange={e => setFBrandId(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                        <option value="">Không chọn</option>
                        {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: "1 1 140px" }}>
                      <label style={lbl}>Timeline</label>
                      <input type="date" value={fTimeline} onChange={e => setFTimeline(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <button onClick={() => setFPinned(!fPinned)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: fPinned ? "rgba(245,158,11,0.12)" : "var(--bg-card)", border: `1px solid ${fPinned ? "#f59e0b44" : "var(--border)"}`, color: fPinned ? "#f59e0b" : "var(--text-muted)", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                        <Pin size={13} /> {fPinned ? "Đang ghim" : "Ghim card"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={fContent}
                    onChange={e => setFContent(e.target.value)}
                    placeholder="Mô tả chi tiết chiến lược, insight, hoặc lên kế hoạch thực thi..."
                    style={{ fontSize: 17, color: "var(--text-primary)", lineHeight: 1.8, background: "transparent", border: "none", outline: "none", width: "100%", minHeight: "50vh", resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
              ) : (
                // --- READING MODE ---
                <div className="animate-fadeIn">
                  {/* Meta Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: `${getTagConfig(fTag).color}15`, border: `1px solid ${getTagConfig(fTag).color}30`, color: getTagConfig(fTag).color, fontSize: 13, fontWeight: 700 }}>
                      {getTagConfig(fTag).icon} {getTagConfig(fTag).label}
                    </span>
                    <span style={{ padding: "6px 12px", borderRadius: 8, background: `${getStatusConfig(fStatus).color}15`, border: `1px solid ${getStatusConfig(fStatus).color}30`, color: getStatusConfig(fStatus).color, fontSize: 13, fontWeight: 600 }}>
                      {getStatusConfig(fStatus).label}
                    </span>
                    {fPriority !== "normal" && (
                      <span style={{ padding: "6px 12px", borderRadius: 8, background: `${getPriorityConfig(fPriority).color}15`, color: getPriorityConfig(fPriority).color, fontSize: 13, fontWeight: 700 }}>
                        {fPriority === "critical" ? "🔥 Cực kỳ quan trọng" : "⭐ Quan trọng"}
                      </span>
                    )}
                    {fBrandId && getBrand(fBrandId) && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: `${getBrand(fBrandId)!.color}15`, border: `1px solid ${getBrand(fBrandId)!.color}30`, color: getBrand(fBrandId)!.color, fontSize: 13, fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: getBrand(fBrandId)!.color, display: "inline-block" }} />
                        {getBrand(fBrandId)!.name}
                      </span>
                    )}
                    {fTimeline && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", padding: "6px 12px", borderRadius: 8, background: "var(--bg-secondary)" }}>
                        <Clock size={14} /> Deadline: {format(parseISO(fTimeline), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 style={{ fontSize: 36, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.2, marginBottom: 32 }}>
                    {fPinned && <span style={{ marginRight: 12 }}>📌</span>}
                    {fTitle}
                  </h1>

                  {/* Content */}
                  {fContent ? (
                    <div style={{ fontSize: 17, color: "var(--text-primary)", lineHeight: 1.8, whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                      {fContent}
                    </div>
                  ) : (
                    <div style={{ fontStyle: "italic", color: "var(--text-muted)", fontSize: 15 }}>Không có nội dung chi tiết.</div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
