"use client";

import { useState, useMemo, useEffect } from "react";
import { useData, useAuth } from "@/context/AppContext";
import { SocialContent, ContentStatus, ContentPlatform, Brand, User, Task } from "@/lib/types";
import { 
  Calendar as CalendarIcon, List, Plus, ChevronLeft, ChevronRight, 
  ExternalLink, FileText, Image as ImageIcon, Video, MessageCircle, 
  Camera, Play, MoreVertical, Edit2, Trash2, CheckCircle2,
  Clock, AlertCircle, Rocket, Save, Search, Layout, User as UserIcon, Palette
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, isToday, 
  addMonths, subMonths, parseISO 
} from "date-fns";
import { vi } from "date-fns/locale";

const PLATFORM_ICONS: Record<ContentPlatform, React.ReactNode> = {
  facebook: <MessageCircle size={14} />,
  tiktok: <Video size={14} />,
  instagram: <Camera size={14} />,
  youtube: <Play size={14} />,
  other: <FileText size={14} />
};

const STATUS_CONFIG: Record<ContentStatus, { label: string, color: string, icon: any }> = {
  draft: { label: "Bản thảo", color: "#6b7280", icon: FileText },
  writing: { label: "Đang viết", color: "#3b82f6", icon: Edit2 },
  designing: { label: "Thiết kế", color: "#8b5cf6", icon: ImageIcon },
  pending: { label: "Chờ duyệt", color: "#f59e0b", icon: Clock },
  approved: { label: "Đã duyệt", color: "#10b981", icon: CheckCircle2 },
  scheduled: { label: "Đã lên lịch", color: "#06b6d4", icon: CalendarIcon },
  posted: { label: "Đã đăng", color: "#111827", icon: Rocket }
};

export default function ContentPage() {
  const { state, addSocialContent, updateSocialContent, deleteSocialContent, addTask, addSubTask } = useData();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<ContentPlatform | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingContent, setEditingContent] = useState<SocialContent | null>(null);
  
  // Form/Modal state
  const [formData, setFormData] = useState({
    brandId: state.brands[0]?.id || "",
    title: "",
    description: "",
    platform: "facebook" as ContentPlatform,
    status: "draft" as ContentStatus,
    postDate: new Date().toISOString().slice(0, 16),
    pillar: "",
    contentLink: "",
    assetLink: "",
    contentPicId: "",
    designPicId: ""
  });

  // Quick Row State (for Grid view)
  const [quickRow, setQuickRow] = useState({
    brandId: state.brands[0]?.id || "",
    platform: "facebook" as ContentPlatform,
    title: "",
    description: "",
    pillar: "",
    postDate: new Date().toISOString().slice(0, 16),
    assetLink: "",
    contentPicId: "",
    designPicId: ""
  });

  const filteredContents = useMemo(() => {
    let items = state.socialContents;
    if (selectedBrand) items = items.filter(c => c.brandId === selectedBrand);
    if (selectedPlatform !== "all") items = items.filter(c => c.platform === selectedPlatform);
    return items.sort((a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime());
  }, [state.socialContents, selectedBrand, selectedPlatform]);

  // Calendar logic
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const contentsByDate = useMemo(() => {
    const map: Record<string, SocialContent[]> = {};
    filteredContents.forEach(c => {
      const d = c.postDate.split("T")[0];
      if (!map[d]) map[d] = [];
      map[d].push(c);
    });
    return map;
  }, [filteredContents]);

  // Automation Logic
  const handleAutomation = (content: { title: string, description?: string, assetLink?: string, contentPicId?: string, designPicId?: string, brandId: string }) => {
    // 1. Content Automation
    if (!content.description && content.contentPicId) {
      let contentTask = state.tasks.find(t => t.title === "Content Social");
      if (!contentTask) {
        contentTask = addTask({
          title: "Content Social",
          description: "Nhiệm vụ soạn thảo nội dung cho Social bài đăng",
          status: "todo",
          priority: "medium",
          picIds: [content.contentPicId],
          brandId: content.brandId,
          startDate: new Date().toISOString().split("T")[0],
          deadline: ""
        });
      }
      addSubTask(contentTask.id, {
        content: `[Content] ${content.title}`,
        status: "pending",
        deadline: "",
        acceptanceNotes: "",
        picIds: [content.contentPicId]
      });
    }

    // 2. Media Automation
    if (!content.assetLink && content.designPicId) {
      let mediaTask = state.tasks.find(t => t.title === "Media Social");
      if (!mediaTask) {
        mediaTask = addTask({
          title: "Media Social",
          description: "Nhiệm vụ sản xuất hình ảnh/video cho Social bài đăng",
          status: "todo",
          priority: "high",
          picIds: [content.designPicId],
          brandId: content.brandId,
          startDate: new Date().toISOString().split("T")[0],
          deadline: ""
        });
      }
      addSubTask(mediaTask.id, {
        content: `[Design] ${content.title}`,
        status: "pending",
        deadline: "",
        acceptanceNotes: "",
        picIds: [content.designPicId]
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingContent(null);
    setFormData({
      brandId: selectedBrand || state.brands[0]?.id || "",
      title: "",
      description: "",
      platform: selectedPlatform !== "all" ? selectedPlatform : "facebook",
      status: "draft",
      postDate: new Date().toISOString().slice(0, 16),
      pillar: "",
      contentLink: "",
      assetLink: "",
      contentPicId: "",
      designPicId: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (content: SocialContent) => {
    setEditingContent(content);
    setFormData({
      brandId: content.brandId,
      title: content.title,
      description: content.description || "",
      platform: content.platform,
      status: content.status,
      postDate: content.postDate.slice(0, 16),
      pillar: content.pillar || "",
      contentLink: content.contentLink || "",
      assetLink: content.assetLink || "",
      contentPicId: content.contentPicId || "",
      designPicId: content.designPicId || ""
    });
    setShowModal(true);
  };

  const handleAddFromCalendar = (date: Date) => {
    const dStr = format(date, "yyyy-MM-dd") + "T09:00";
    setEditingContent(null);
    setFormData({
      brandId: selectedBrand || state.brands[0]?.id || "",
      title: "",
      description: "",
      platform: selectedPlatform !== "all" ? selectedPlatform : "facebook",
      status: "draft",
      postDate: dStr,
      pillar: "",
      contentLink: "",
      assetLink: "",
      contentPicId: "",
      designPicId: ""
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContent) {
      updateSocialContent(editingContent.id, formData);
    } else {
      addSocialContent({
        ...formData,
        authorId: currentUser?.id || ""
      });
      handleAutomation(formData);
    }
    setShowModal(false);
  };

  const handleQuickAdd = () => {
    if (!quickRow.title) return;
    addSocialContent({
      ...quickRow,
      status: "draft",
      contentLink: "",
      authorId: currentUser?.id || ""
    });
    handleAutomation(quickRow);
    setQuickRow(prev => ({
      ...prev,
      title: "",
      description: "",
      pillar: "",
      assetLink: ""
    }));
  };

  const handleUpdateField = (id: string, field: keyof SocialContent, value: any) => {
    updateSocialContent(id, { [field]: value });
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "var(--shadow-sm)"
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    transition: "border-color 0.2s"
  };

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-purple)", marginBottom: 8 }}>
            <CalendarIcon size={20} />
            <span style={{ fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>Content Planner</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Lịch nội dung Social</h1>
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, background: "var(--bg-secondary)", padding: 6, borderRadius: 12, border: "1px solid var(--border)" }}>
            <select 
              value={selectedBrand} 
              onChange={(e) => setSelectedBrand(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}
            >
              <option value="">Tất cả Brand</option>
              {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button 
            onClick={handleOpenAdd}
            style={{ 
              display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", 
              borderRadius: 12, background: "var(--accent-purple)", color: "white", 
              border: "none", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(139,92,246,0.3)" 
            }}
          >
            <Plus size={18} /> Lên lịch bài mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 24, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <button 
          onClick={() => setActiveTab("calendar")}
          style={{ 
            padding: "12px 4px", border: "none", background: "none", 
            color: activeTab === "calendar" ? "var(--accent-purple)" : "var(--text-muted)",
            fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            borderBottom: activeTab === "calendar" ? "2px solid var(--accent-purple)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          <CalendarIcon size={18} /> Lịch nội dung
        </button>
        <button 
          onClick={() => setActiveTab("list")}
          style={{ 
            padding: "12px 4px", border: "none", background: "none", 
            color: activeTab === "list" ? "var(--accent-purple)" : "var(--text-muted)",
            fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            borderBottom: activeTab === "list" ? "2px solid var(--accent-purple)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          <List size={18} /> Danh sách bài viết (Grid Editor)
        </button>
      </div>

      {/* Main Content */}
      {activeTab === "calendar" ? (
        <div style={cardStyle}>
          {/* Calendar Header */}
          <div style={{ padding: "16px 24px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)", fontWeight: 700 }}>
              {format(currentDate, "MMMM yyyy", { locale: vi })}
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", color: "var(--text-primary)" }}><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date())} style={{ padding: "0 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Hôm nay</button>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", color: "var(--text-primary)" }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--bg-secondary)" }}>
            {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map(d => (
              <div key={d} style={{ padding: "12px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", tableLayout: "fixed", width: "100%" }}>
            {days.map((day, idx) => {
              const dStr = format(day, "yyyy-MM-dd");
              const dayContents = contentsByDate[dStr] || [];
              const isCurrMonth = isSameMonth(day, currentDate);
              const isTodayDay = isToday(day);

              return (
                <div 
                  key={dStr} 
                  style={{ 
                    minHeight: 160, padding: "8px 12px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                    background: isTodayDay ? "rgba(139,92,246,0.03)" : isCurrMonth ? "transparent" : "rgba(0,0,0,0.02)",
                    opacity: isCurrMonth ? 1 : 0.4,
                    minWidth: 0, overflow: "hidden"
                  }}
                >
                  <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ 
                      fontSize: 13, fontWeight: isTodayDay ? 800 : 600, 
                      width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "50%", background: isTodayDay ? "var(--accent-purple)" : "transparent",
                      color: isTodayDay ? "white" : "var(--text-muted)"
                    }}>
                      {format(day, "d")}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAddFromCalendar(day); }}
                      style={{ 
                        padding: "2px 8px", borderRadius: 6, background: "rgba(139,92,246,0.1)", 
                        color: "var(--accent-purple)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(139,92,246,0.1)"}
                      title="Thêm bài đăng cho ngày này"
                    >
                      +
                    </button>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dayContents.map(content => (
                      <div 
                        key={content.id}
                        onClick={() => handleOpenEdit(content)}
                        style={{ 
                          padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, 
                          background: `${STATUS_CONFIG[content.status].color}12`,
                          border: `1px solid ${STATUS_CONFIG[content.status].color}25`,
                          color: STATUS_CONFIG[content.status].color,
                          cursor: "pointer", overflow: "hidden", 
                          display: "flex", flexDirection: "column", gap: 2,
                          transition: "transform 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                          <span style={{ flexShrink: 0 }}>{PLATFORM_ICONS[content.platform]}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{content.title}</span>
                        </div>
                        {content.pillar && (
                          <div style={{ 
                            fontSize: 9, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.02em",
                            padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)",
                            width: "fit-content", border: "1px solid currentColor", marginTop: 2
                          }}>
                            {content.pillar}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", width: 200 }}>Tiêu đề / Pillar</th>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", width: 140 }}>Người xử lý Content / Design</th>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", width: 180 }}>Ngày giờ đăng</th>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", width: 120 }}>Trạng thái</th>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", width: 220 }}>Link Drive / Media</th>
                  <th style={{ textAlign: "right", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", width: 80 }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {/* QUICK ADD ROW */}
                <tr style={{ background: "rgba(139,92,246,0.05)", borderBottom: "2px solid var(--accent-purple)" }}>
                  <td style={{ padding: "12px" }}>
                    <input 
                      id="quick-add-title"
                      placeholder="Tiêu đề..." 
                      value={quickRow.title} 
                      onChange={e => setQuickRow({...quickRow, title: e.target.value})}
                      style={{ ...inputStyle, marginBottom: 8, fontWeight: 700 }} 
                    />
                    <input 
                      placeholder="Pillar..." 
                      value={quickRow.pillar}
                      onChange={e => setQuickRow({...quickRow, pillar: e.target.value})}
                      style={{ ...inputStyle, fontSize: 12 }}
                    />
                  </td>
                  <td style={{ padding: "12px" }}>
                    <select 
                      value={quickRow.contentPicId}
                      onChange={e => setQuickRow({...quickRow, contentPicId: e.target.value})}
                      style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }}
                    >
                      <option value="">Người xử lý Content</option>
                      {state.users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                    <select 
                      value={quickRow.designPicId}
                      onChange={e => setQuickRow({...quickRow, designPicId: e.target.value})}
                      style={{ ...inputStyle, fontSize: 12 }}
                    >
                      <option value="">Người xử lý Design</option>
                      {state.users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <input 
                      type="datetime-local" 
                      value={quickRow.postDate}
                      onChange={e => setQuickRow({...quickRow, postDate: e.target.value})}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: "12px" }}>
                    <select 
                      value={quickRow.platform}
                      onChange={e => setQuickRow({...quickRow, platform: e.target.value as ContentPlatform})}
                      style={{ ...inputStyle, fontSize: 12 }}
                    >
                      <option value="facebook">Facebook</option>
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="other">Khác</option>
                    </select>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <input 
                      placeholder="Link Drive/Media..." 
                      value={quickRow.assetLink}
                      onChange={e => setQuickRow({...quickRow, assetLink: e.target.value})}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <button 
                      onClick={handleQuickAdd}
                      style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-purple)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Plus size={20} />
                    </button>
                  </td>
                </tr>

                {filteredContents.map(content => {
                  const status = STATUS_CONFIG[content.status];
                  return (
                    <tr key={content.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                      <td style={{ padding: "12px" }}>
                        <input 
                          defaultValue={content.title}
                          onBlur={e => handleUpdateField(content.id, "title", e.target.value)}
                          style={{ ...inputStyle, marginBottom: 8, border: "none", background: "transparent", fontWeight: 700 }}
                        />
                        <input 
                          defaultValue={content.pillar}
                          onBlur={e => handleUpdateField(content.id, "pillar", e.target.value)}
                          style={{ ...inputStyle, border: "none", background: "transparent", fontSize: 12, color: "var(--text-muted)" }}
                        />
                      </td>
                      <td style={{ padding: "12px" }}>
                        <select 
                          value={content.contentPicId}
                          onChange={e => handleUpdateField(content.id, "contentPicId", e.target.value)}
                          style={{ ...inputStyle, marginBottom: 8, border: "none", background: "transparent", fontSize: 12 }}
                        >
                          <option value="">Người xử lý Content</option>
                          {state.users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                        <select 
                          value={content.designPicId}
                          onChange={e => handleUpdateField(content.id, "designPicId", e.target.value)}
                          style={{ ...inputStyle, border: "none", background: "transparent", fontSize: 12 }}
                        >
                          <option value="">Người xử lý Design</option>
                          {state.users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <input 
                          type="datetime-local"
                          defaultValue={content.postDate}
                          onBlur={e => handleUpdateField(content.id, "postDate", e.target.value)}
                          style={{ ...inputStyle, border: "none", background: "transparent" }}
                        />
                      </td>
                      <td style={{ padding: "12px" }}>
                        <select 
                          value={content.status}
                          onChange={e => handleUpdateField(content.id, "status", e.target.value as any)}
                          style={{ ...inputStyle, border: "none", background: "transparent", color: status.color, fontWeight: 700 }}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input 
                            defaultValue={content.assetLink}
                            onBlur={e => handleUpdateField(content.id, "assetLink", e.target.value)}
                            style={{ ...inputStyle, border: "none", background: "transparent" }}
                          />
                          {content.assetLink && (
                            <a href={content.assetLink} target="_blank" rel="noopener noreferrer" style={{ padding: 8, color: "var(--accent-purple)" }}>
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <button onClick={() => deleteSocialContent(content.id)} style={{ padding: 8, color: "var(--accent-red)", background: "none", border: "none", cursor: "pointer" }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Popup Editor */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: 650, borderRadius: 24, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-2xl)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                {editingContent ? "Cập nhật nội dung" : "Lên lịch bài mới"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 0, display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
              <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Brand *</label>
                    <select 
                      required
                      value={formData.brandId} 
                      onChange={e => setFormData({...formData, brandId: e.target.value})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    >
                      {state.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Kênh đăng *</label>
                    <select 
                      required
                      value={formData.platform} 
                      onChange={e => setFormData({...formData, platform: e.target.value as ContentPlatform})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    >
                      <option value="facebook">Facebook</option>
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Tiêu đề nội dung *</label>
                  <input 
                    required
                    placeholder="Tiêu đề bài viết..."
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    style={{ ...inputStyle, padding: "12px", borderRadius: 12, fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Người xử lý Content</label>
                    <select 
                      value={formData.contentPicId} 
                      onChange={e => setFormData({...formData, contentPicId: e.target.value})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    >
                      <option value="">Chọn người viết bài</option>
                      {state.users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Người xử lý Design</label>
                    <select 
                      value={formData.designPicId} 
                      onChange={e => setFormData({...formData, designPicId: e.target.value})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    >
                      <option value="">Chọn người thiết kế</option>
                      {state.users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Nội dung chi tiết</label>
                  <textarea 
                    placeholder="Mô tả nội dung bài đăng... (Nếu để trống sẽ tạo sub-task cho Người xử lý Content)"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    style={{ ...inputStyle, padding: "12px", borderRadius: 12, minHeight: 80, resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Pillar (Chủ đề)</label>
                    <input 
                      placeholder="Ví dụ: Branding, Sales..."
                      value={formData.pillar}
                      onChange={e => setFormData({...formData, pillar: e.target.value})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Ngày giờ đăng</label>
                    <input 
                      type="datetime-local"
                      value={formData.postDate}
                      onChange={e => setFormData({...formData, postDate: e.target.value})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Trạng thái</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value as ContentStatus})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Link tài nguyên (Nếu trống sẽ tạo sub-task cho Design)</label>
                    <input 
                      placeholder="https://..."
                      value={formData.assetLink}
                      onChange={e => setFormData({...formData, assetLink: e.target.value})}
                      style={{ ...inputStyle, padding: "12px", borderRadius: 12 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 12, background: "var(--bg-secondary)" }}>
                {editingContent && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
                        deleteSocialContent(editingContent.id);
                        setShowModal(false);
                      }
                    }}
                    style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.2)", fontWeight: 700, cursor: "pointer" }}
                    title="Xóa bài viết"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: "14px", borderRadius: 14, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  style={{ 
                    flex: 2, padding: "14px", borderRadius: 14, background: "var(--accent-purple)", 
                    color: "white", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(139,92,246,0.2)"
                  }}
                >
                  {editingContent ? "Cập nhật" : "Lưu kế hoạch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
