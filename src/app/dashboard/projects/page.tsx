"use client";

import { useState, useMemo } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Project } from "@/lib/types";
import { canAccessBrand, getVisibleBrands } from "@/lib/permissions";
import { 
  Plus, Rocket, Calendar, 
  Edit2, Trash2, 
  X, Save, CheckCircle2, Clock, Archive
} from "lucide-react";

export default function ProjectsPage() {
  const { currentUser } = useAuth();
  const { state, addProject, updateProject, deleteProject } = useData();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "assistant";

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "archived">("active");

  // Form state
  const [fName, setFName] = useState("");
  const [fBrandId, setFBrandId] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fStatus, setFStatus] = useState<"active" | "completed" | "archived">("active");

  const visibleBrands = useMemo(() => getVisibleBrands(state.brands, currentUser), [state.brands, currentUser]);
  const scopedProjects = useMemo(
    () => state.projects.filter((project) => canAccessBrand(currentUser, project.brandId)),
    [state.projects, currentUser]
  );

  const projects = useMemo(() => {
    return scopedProjects.filter(p => p.status === statusFilter);
  }, [scopedProjects, statusFilter]);

  const projectsByBrand = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach(p => {
      if (!map[p.brandId]) map[p.brandId] = [];
      map[p.brandId].push(p);
    });
    return map;
  }, [projects]);

  const getProjectStats = (projectId: string) => {
    const projectTasks = state.tasks.filter(t => t.projectId === projectId);
    const total = projectTasks.length;
    const done = projectTasks.filter(t => t.status === "done").length;
    const today = new Date().toISOString().split("T")[0];
    const overdue = projectTasks.filter(t => t.status !== "done" && t.status !== "cancelled" && t.deadline < today).length;
    const review = projectTasks.filter(t => t.status === "review" || t.subTasks.some(st => st.status === "reviewing")).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, review, progress };
  };

  const getDaysLeft = (endDate?: string) => {
    if (!endDate) return null;
    const today = new Date(new Date().toISOString().split("T")[0]);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - today.getTime()) / 86400000);
  };

  const openCreate = () => {
    setEditingProject(null);
    setFName(""); setFBrandId(visibleBrands[0]?.id ?? ""); setFDesc("");
    setFStart(""); setFEnd(""); setFStatus("active");
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setFName(p.name); setFBrandId(p.brandId); setFDesc(p.description ?? "");
    setFStart(p.startDate ?? ""); setFEnd(p.endDate ?? ""); setFStatus(p.status);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!fName.trim() || !fBrandId || !canAccessBrand(currentUser, fBrandId)) return;
    const data = {
      name: fName.trim(),
      brandId: fBrandId,
      description: fDesc,
      startDate: fStart,
      endDate: fEnd,
      status: fStatus
    };
    if (editingProject) updateProject(editingProject.id, data);
    else addProject(data);
    setShowModal(false);
  };

  const handleDelete = (p: Project) => {
    if (confirm(`Xóa dự án "${p.name}"? Dữ liệu các task trong dự án vẫn sẽ được giữ lại.`)) {
      deleteProject(p.id);
    }
  };

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Quản lý Dự án
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Gom nhóm công việc theo các chiến dịch ngắn hạn
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {(["active", "completed", "archived"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "8px 14px", border: "none",
                  background: statusFilter === s ? "rgba(59,130,246,0.15)" : "transparent",
                  color: statusFilter === s ? "#60a5fa" : "var(--text-secondary)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s",
                  textTransform: "capitalize"
                }}
              >
                {s === "active" ? "Đang chạy" : s === "completed" ? "Đã xong" : "Lưu trữ"}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>
              <Plus size={15} /> Thêm Dự án
            </button>
          )}
        </div>
      </div>

      {scopedProjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "var(--bg-card)", borderRadius: 20, border: "1px dashed var(--border)" }}>
          <Rocket size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
          <h3 style={{ fontSize: 18, color: "var(--text-primary)", fontWeight: 600 }}>Chưa có dự án nào</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 400, margin: "8px auto" }}>
            Dự án giúp bạn gom nhóm các Task theo chiến dịch để theo dõi tiến độ tổng quát dễ dàng hơn.
          </p>
          {isAdmin && (
            <button onClick={openCreate} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, background: "var(--accent-blue)", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}>
              Tạo dự án đầu tiên
            </button>
          )}
        </div>
      ) : (
        <>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 850, color: "var(--text-primary)" }}>Project portfolio</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Track timeline, task progress, blocked items, and review work in one table.</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  {["Project", "Brand", "Timeline", "Days left", "Progress", "Tasks", "Overdue", "Review", "Status", ""].map((label) => (
                    <th key={label} style={projectThStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const brand = visibleBrands.find((item) => item.id === project.brandId);
                  const stats = getProjectStats(project.id);
                  const daysLeft = getDaysLeft(project.endDate);
                  const isLate = daysLeft !== null && daysLeft < 0 && project.status === "active";
                  return (
                    <tr key={project.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={projectTdStyle}>
                        <div style={{ fontSize: 13, fontWeight: 850, color: "var(--text-primary)", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.description || "No description"}</div>
                      </td>
                      <td style={projectTdStyle}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: brand?.color ?? "var(--text-secondary)", fontWeight: 750 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: brand?.color ?? "var(--text-muted)" }} />
                          {brand?.name ?? "No brand"}
                        </span>
                      </td>
                      <td style={projectTdStyle}>{project.startDate || "--"} {"->"} {project.endDate || "--"}</td>
                      <td style={{ ...projectTdStyle, color: isLate ? "var(--accent-red)" : "var(--text-secondary)", fontWeight: 800 }}>
                        {daysLeft === null ? "--" : daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`}
                      </td>
                      <td style={projectTdStyle}><ProjectProgress percent={stats.progress} /></td>
                      <td style={projectTdStyle}>{stats.done}/{stats.total}</td>
                      <td style={{ ...projectTdStyle, color: stats.overdue ? "var(--accent-red)" : "var(--text-muted)", fontWeight: 800 }}>{stats.overdue}</td>
                      <td style={{ ...projectTdStyle, color: stats.review ? "#f59e0b" : "var(--text-muted)", fontWeight: 800 }}>{stats.review}</td>
                      <td style={projectTdStyle}>
                        <span style={{ ...projectStatusStyle, color: project.status === "completed" ? "var(--accent-green)" : project.status === "archived" ? "var(--text-muted)" : "#f59e0b" }}>
                          {project.status === "active" ? "Active" : project.status === "completed" ? "Done" : "Archived"}
                        </span>
                      </td>
                      <td style={{ ...projectTdStyle, textAlign: "right" }}>
                        {isAdmin && (
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                            <button onClick={() => openEdit(project)} title="Edit project" style={projectIconButtonStyle}><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(project)} title="Delete project" style={{ ...projectIconButtonStyle, color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}><Trash2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!projects.length && (
                  <tr>
                    <td colSpan={10} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No project in this status.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "none", flexDirection: "column", gap: 32 }}>
          {visibleBrands.map(brand => {
            const brandProjects = projectsByBrand[brand.id] || [];
            if (brandProjects.length === 0 && statusFilter !== "active") return null;
            if (brandProjects.length === 0 && scopedProjects.filter(p => p.brandId === brand.id).length === 0) return null;

            return (
              <div key={brand.id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: brand.color }} />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{brand.name}</h2>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{brandProjects.length} dự án</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18, alignItems: "stretch" }}>
                  {brandProjects.map(project => {
                    const stats = getProjectStats(project.id);
                    return (
                      <div 
                        key={project.id}
                        style={{ 
                          background: "var(--bg-card)", 
                          border: "1px solid var(--border)", 
                          borderRadius: 18, 
                          padding: 24,
                          position: "relative",
                          transition: "transform 0.2s, box-shadow 0.2s",
                          cursor: "pointer",
                          minHeight: 280,
                          display: "flex",
                          flexDirection: "column",
                          gap: 18,
                          overflow: "hidden",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "48px minmax(0, 1fr) auto" : "48px minmax(0, 1fr)", gap: 14, alignItems: "start", minWidth: 0 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${brand.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: brand.color, flexShrink: 0 }}>
                            <Rocket size={20} />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <h3
                              title={project.name}
                              style={{
                                fontSize: 17,
                                fontWeight: 800,
                                color: "var(--text-primary)",
                                lineHeight: 1.35,
                                marginBottom: 6,
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {project.name}
                            </h3>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", minWidth: 0 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                                <Calendar size={12} /> {project.endDate || "No deadline"}
                              </span>
                            </div>
                          </div>

                          {isAdmin && (
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
                              <button onClick={(e) => { e.stopPropagation(); openEdit(project); }} title="Sửa dự án" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(project); }} title="Xóa dự án" style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, minHeight: 42, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere" }}>
                          {project.description || "Chưa có mô tả cho dự án này."}
                        </p>

                        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: stats.progress === 100 ? "var(--accent-green)" : "var(--text-primary)", whiteSpace: "nowrap" }}>
                              {stats.progress}% hoàn thành
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {stats.done}/{stats.total} tasks
                            </span>
                          </div>

                          <div style={{ height: 7, background: "var(--bg-secondary)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${stats.progress}%`, height: "100%", background: stats.progress === 100 ? "var(--accent-green)" : "linear-gradient(90deg, #3b82f6, #8b5cf6)", transition: "width 0.5s ease" }} />
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div style={{ padding: "5px 11px", borderRadius: 9, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6, width: "fit-content" }}>
                            {project.status === "active" ? <Clock size={12} color="#f59e0b" /> : project.status === "completed" ? <CheckCircle2 size={12} color="#10b981" /> : <Archive size={12} color="var(--text-muted)" />}
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                              {project.status === "active" ? "Đang chạy" : project.status === "completed" ? "Đã xong" : "Lưu trữ"}
                            </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>

      {/* Project Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 440, background: "var(--bg-card)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{editingProject ? "Chỉnh sửa dự án" : "Tạo dự án mới"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Tên dự án *</label>
                <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="VD: Chiến dịch hè 2026..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Thuộc Brand *</label>
                <select value={fBrandId} onChange={(e) => setFBrandId(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  {visibleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Mô tả ngắn</label>
                <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Mục tiêu dự án..." rows={3} style={{ ...inp, resize: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Bắt đầu</label>
                  <input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Kết thúc (Deadline)</label>
                  <input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Trạng thái</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["active", "completed", "archived"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFStatus(s)}
                      style={{
                        flex: 1, padding: "8px", borderRadius: 8, border: "1px solid var(--border)",
                        background: fStatus === s ? "rgba(59,130,246,0.1)" : "var(--bg-secondary)",
                        color: fStatus === s ? "var(--accent-blue)" : "var(--text-secondary)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      {s === "active" ? "Đang chạy" : s === "completed" ? "Đã xong" : "Lưu trữ"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>Hủy</button>
                <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <Save size={14} /> {editingProject ? "Cập nhật" : "Lưu dự án"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 6,
};

const inp: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
};

function ProjectProgress({ percent }: { percent: number }) {
  const color = percent >= 100 ? "var(--accent-green)" : percent >= 70 ? "#f59e0b" : "var(--accent-blue)";
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ fontSize: 12, fontWeight: 850, color, marginBottom: 5 }}>{percent}%</div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, percent)}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

const projectThStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  color: "var(--text-muted)",
  fontSize: 10,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const projectTdStyle: React.CSSProperties = {
  padding: "12px",
  color: "var(--text-secondary)",
  fontSize: 12,
  verticalAlign: "middle",
};

const projectStatusStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 850,
};

const projectIconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
