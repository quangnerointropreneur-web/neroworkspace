"use client";

import { useState, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Brand, KPI } from "@/lib/types";
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
} from "lucide-react";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const formatNumber = (n: number, unit: string) => {
  if (unit === "VNĐ") return formatVND(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
};

const BRAND_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

export default function BrandsPage() {
  const { currentUser } = useAuth();
  const { state, addBrand, updateBrand, deleteBrand, addKPI, updateKPI, deleteKPI } = useData();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role !== "admin") router.replace("/dashboard");
  }, [currentUser, router]);

  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);

  // Brand form
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fColor, setFColor] = useState(BRAND_COLORS[0]);
  const [fBudget, setFBudget] = useState(0);

  // KPI form
  const [fKpiName, setFKpiName] = useState("");
  const [fKpiTarget, setFKpiTarget] = useState(0);
  const [fKpiCurrent, setFKpiCurrent] = useState(0);
  const [fKpiUnit, setFKpiUnit] = useState("VNĐ");

  const openCreateBrand = () => {
    setEditingBrand(null);
    setFName(""); setFDesc(""); setFColor(BRAND_COLORS[0]); setFBudget(0);
    setShowBrandModal(true);
  };

  const openEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setFName(b.name); setFDesc(b.description ?? ""); setFColor(b.color); setFBudget(b.budget);
    setShowBrandModal(true);
  };

  const handleSaveBrand = () => {
    if (!fName.trim()) return;
    const data = { name: fName.trim(), description: fDesc, color: fColor, budget: fBudget, kpis: editingBrand?.kpis ?? [] };
    if (editingBrand) updateBrand(editingBrand.id, data);
    else addBrand(data);
    setShowBrandModal(false);
  };

  const openAddKpi = (brandId: string) => {
    setSelectedBrandId(brandId);
    setEditingKpi(null);
    setFKpiName(""); setFKpiTarget(0); setFKpiCurrent(0); setFKpiUnit("VNĐ");
    setShowKpiModal(true);
  };

  const openEditKpi = (brandId: string, kpi: KPI) => {
    setSelectedBrandId(brandId);
    setEditingKpi(kpi);
    setFKpiName(kpi.name); setFKpiTarget(kpi.target); setFKpiCurrent(kpi.current); setFKpiUnit(kpi.unit);
    setShowKpiModal(true);
  };

  const handleSaveKpi = () => {
    if (!fKpiName.trim() || !selectedBrandId) return;
    const data = { name: fKpiName, target: fKpiTarget, current: fKpiCurrent, unit: fKpiUnit };
    if (editingKpi) updateKPI(selectedBrandId, editingKpi.id, data);
    else addKPI(selectedBrandId, data);
    setShowKpiModal(false);
  };

  if (currentUser?.role !== "admin") return null;

  const inp: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Brands & KPIs</h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{state.brands.length} thương hiệu đang quản lý</p>
          </div>
          <button onClick={openCreateBrand} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>
            <Plus size={15} /> Thêm Brand
          </button>
        </div>

        {/* Brand cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 20 }}>
          {state.brands.map((brand) => {
            const brandTasks = state.tasks.filter((t) => t.brandId === brand.id);
            const doneTasks = brandTasks.filter((t) => t.status === "done").length;
            const taskPct = brandTasks.length > 0 ? Math.round((doneTasks / brandTasks.length) * 100) : 0;

            return (
              <div
                key={brand.id}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${brand.color}30`,
                  borderRadius: 18,
                  overflow: "hidden",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 12px 40px ${brand.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Brand header */}
                <div style={{ padding: "20px 22px", background: `linear-gradient(135deg, ${brand.color}18, transparent)`, borderBottom: `1px solid ${brand.color}20` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${brand.color}22`, border: `2px solid ${brand.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: brand.color }}>
                        {brand.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>{brand.name}</h3>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{brand.description}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEditBrand(brand)} style={{ width: 30, height: 30, borderRadius: 8, background: `${brand.color}18`, border: `1px solid ${brand.color}44`, cursor: "pointer", color: brand.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => { if (confirm(`Xóa brand "${brand.name}"?`)) deleteBrand(brand.id); }} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Budget + Task progress */}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ngân sách</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 3 }}>{formatVND(brand.budget)}</div>
                    </div>
                    <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 12px", flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tiến độ Tasks</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: brand.color }}>{taskPct}%</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${taskPct}%`, background: brand.color, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{doneTasks}/{brandTasks.length} tasks hoàn thành</div>
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div style={{ padding: "16px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                      <BarChart3 size={13} /> KPIs ({brand.kpis.length})
                    </div>
                    <button onClick={() => openAddKpi(brand.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, background: `${brand.color}15`, border: `1px solid ${brand.color}35`, color: brand.color, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      <Plus size={11} /> Thêm KPI
                    </button>
                  </div>

                  {brand.kpis.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: 12 }}>Chưa có KPI nào. Thêm KPI để theo dõi hiệu quả.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {brand.kpis.map((kpi) => {
                        const pct = Math.min(100, Math.round((kpi.current / (kpi.target || 1)) * 100));
                        const isExceeded = pct >= 100;
                        const kpiColor = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
                        return (
                          <div key={kpi.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{kpi.name}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                  <span style={{ color: kpiColor, fontWeight: 700 }}>{formatNumber(kpi.current, kpi.unit)}</span>
                                  <span style={{ color: "var(--text-muted)" }}> / {formatNumber(kpi.target, kpi.unit)} {kpi.unit !== "VNĐ" ? kpi.unit : ""}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: kpiColor,
                                    background: `${kpiColor}18`,
                                    border: `1px solid ${kpiColor}44`,
                                    borderRadius: 8,
                                    padding: "3px 10px",
                                  }}
                                >
                                  {pct}%
                                  {isExceeded && " 🎉"}
                                </span>
                                <button onClick={() => openEditKpi(brand.id, kpi)} style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg-secondary)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Edit3 size={11} />
                                </button>
                                <button onClick={() => { if (confirm(`Xóa KPI "${kpi.name}"?`)) deleteKPI(brand.id, kpi.id); }} style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${kpiColor}, ${kpiColor}cc)`, borderRadius: 3, transition: "width 0.6s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Brand Modal - Outside animation div */}
        {showBrandModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowBrandModal(false)}>
            <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 460, background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{editingBrand ? "Sửa Brand" : "Thêm Brand mới"}</h3>
                <button onClick={() => setShowBrandModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={lbl}>Tên Brand *</label>
                  <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nero Coffee..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Mô tả</label>
                  <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Mô tả thương hiệu..." rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                </div>
                <div>
                  <label style={lbl}>Ngân sách nhân sự (VNĐ)</label>
                  <input type="number" value={fBudget} onChange={(e) => setFBudget(+e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Màu sắc Brand</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {BRAND_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setFColor(c)}
                        style={{ width: 32, height: 32, borderRadius: 8, background: c, border: fColor === c ? "3px solid white" : "2px solid transparent", cursor: "pointer", transition: "transform 0.15s", transform: fColor === c ? "scale(1.15)" : "scale(1)" }}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <button onClick={() => setShowBrandModal(false)} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>Hủy</button>
                  <button onClick={handleSaveBrand} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 10, background: `linear-gradient(135deg, ${fColor}, ${fColor}cc)`, border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                    <Save size={14} /> {editingBrand ? "Cập nhật" : "Tạo Brand"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Modal - Outside animation div */}
        {showKpiModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowKpiModal(false)}>
            <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 420, background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{editingKpi ? "Sửa KPI" : "Thêm KPI"}</h3>
                <button onClick={() => setShowKpiModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={lbl}>Tên KPI *</label>
                  <input value={fKpiName} onChange={(e) => setFKpiName(e.target.value)} placeholder="Doanh số tháng..." style={inp} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Mục tiêu</label>
                    <input type="number" value={fKpiTarget} onChange={(e) => setFKpiTarget(+e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Thực tế</label>
                    <input type="number" value={fKpiCurrent} onChange={(e) => setFKpiCurrent(+e.target.value)} style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Đơn vị</label>
                  <select value={fKpiUnit} onChange={(e) => setFKpiUnit(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                    <option value="VNĐ">VNĐ</option>
                    <option value="Lượt">Lượt</option>
                    <option value="%">%</option>
                    <option value="Follower">Follower</option>
                    <option value="Đơn">Đơn</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <button onClick={() => setShowKpiModal(false)} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>Hủy</button>
                  <button onClick={handleSaveKpi} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                    <Save size={14} /> {editingKpi ? "Cập nhật" : "Thêm KPI"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 5,
};
