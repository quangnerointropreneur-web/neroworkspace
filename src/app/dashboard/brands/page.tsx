"use client";

import { Fragment, useState, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Brand, BrandMonthlyPerformance, KPI, KPILogEntry } from "@/lib/types";
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  BarChart3,
} from "lucide-react";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const formatNumber = (n: number, unit: string) => {
  if (unit === "VND") return formatVND(n);
  if (unit === "VNĐ") return formatVND(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
};

const BRAND_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

const currentMonthKey = () => new Date().toLocaleDateString("en-CA").slice(0, 7);

const parseNumberInput = (value: string) => Number(value.replace(/[^\d.-]/g, "")) || 0;
const formatPlainNumber = (value: number) => value ? value.toLocaleString("en-US") : "";

const splitIntoThreePhases = (targetTotal: number) => {
  const base = Math.floor(targetTotal / 3);
  const rest = targetTotal - base * 3;
  return [
    { phase: 1 as const, target: base + rest, actual: 0 },
    { phase: 2 as const, target: base, actual: 0 },
    { phase: 3 as const, target: base, actual: 0 },
  ];
};

const getPhasePct = (actual: number, target: number) =>
  target > 0 ? Math.round((actual / target) * 100) : 0;

const getMonthlyRecord = (brand: Brand, month: string) =>
  (brand.monthlyPhases ?? []).find((item) => item.month === month);

const getMonthRange = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDate = new Date(year, monthIndex, 0).getDate();
  return { start, end: `${month}-${String(endDate).padStart(2, "0")}`, endDate };
};

const taskTouchesMonth = (task: { startDate?: string; deadline?: string; completedAt?: string; createdAt?: string }, month: string) => {
  const { start, end } = getMonthRange(month);
  const taskStart = task.startDate || task.createdAt?.slice(0, 10) || task.deadline || start;
  const taskEnd = task.completedAt?.slice(0, 10) || task.deadline || taskStart;
  return taskStart <= end && taskEnd >= start;
};

const getPhaseRange = (month: string, phase: 1 | 2 | 3) => {
  const { endDate } = getMonthRange(month);
  const startDay = phase === 1 ? 1 : phase === 2 ? 11 : 21;
  const endDay = phase === 1 ? 10 : phase === 2 ? 20 : endDate;
  return {
    start: `${month}-${String(startDay).padStart(2, "0")}`,
    end: `${month}-${String(endDay).padStart(2, "0")}`,
  };
};

const getKpiPhaseTarget = (target: number, phase: 1 | 2 | 3) =>
  splitIntoThreePhases(target).find((item) => item.phase === phase)?.target ?? 0;

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
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [expandedKpiBrandIds, setExpandedKpiBrandIds] = useState<string[]>([]);

  // Brand form
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fColor, setFColor] = useState(BRAND_COLORS[0]);
  const [fBudget, setFBudget] = useState(0);

  // KPI form
  const [fKpiName, setFKpiName] = useState("");
  const [fKpiTarget, setFKpiTarget] = useState(0);
  const [fKpiCurrent, setFKpiCurrent] = useState(0);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [phaseBrand, setPhaseBrand] = useState<Brand | null>(null);
  const [fMonth, setFMonth] = useState(currentMonthKey());
  const [fTargetTotal, setFTargetTotal] = useState(0);
  const [fPhaseActuals, setFPhaseActuals] = useState([0, 0, 0]);
  const [fPhaseTargets, setFPhaseTargets] = useState([0, 0, 0]);
  const [fPhaseNote, setFPhaseNote] = useState("");
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

  const openPhaseEditor = (brand: Brand, month = currentMonthKey()) => {
    const record = getMonthlyRecord(brand, month);
    const phases = record?.phases ?? splitIntoThreePhases(record?.targetTotal ?? 0);
    setPhaseBrand(brand);
    setFMonth(month);
    setFTargetTotal(record?.targetTotal ?? 0);
    setFPhaseTargets(phases.map((phase) => phase.target));
    setFPhaseActuals(phases.map((phase) => phase.actual));
    setFPhaseNote(record?.note ?? "");
    setShowPhaseModal(true);
  };

  const updateTargetTotal = (value: number) => {
    const phases = splitIntoThreePhases(value);
    setFTargetTotal(value);
    setFPhaseTargets(phases.map((phase) => phase.target));
  };

  const saveMonthlyPhase = () => {
    if (!phaseBrand) return;
    const now = new Date().toISOString();
    const existing = getMonthlyRecord(phaseBrand, fMonth);
    const record: BrandMonthlyPerformance = {
      id: existing?.id ?? `phase-${Date.now()}`,
      month: fMonth,
      targetTotal: fTargetTotal,
      actualTotal: fPhaseActuals.reduce((sum, value) => sum + value, 0),
      phases: [0, 1, 2].map((index) => ({
        phase: (index + 1) as 1 | 2 | 3,
        target: fPhaseTargets[index] ?? 0,
        actual: fPhaseActuals[index] ?? 0,
      })),
      note: fPhaseNote,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const monthlyPhases = [
      ...(phaseBrand.monthlyPhases ?? []).filter((item) => item.month !== fMonth),
      record,
    ].sort((a, b) => b.month.localeCompare(a.month));

    updateBrand(phaseBrand.id, { monthlyPhases });
    setShowPhaseModal(false);
  };

  const toggleKpiRows = (brandId: string) => {
    setExpandedKpiBrandIds((ids) => ids.includes(brandId) ? ids.filter((id) => id !== brandId) : [...ids, brandId]);
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
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Brand Management</h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{state.brands.length} active brands</p>
          </div>
          <button onClick={openCreateBrand} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>
            <Plus size={15} /> Add Brand
          </button>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 850, color: "var(--text-primary)" }}>Monthly brand table</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>One row per brand. Compare budget, target, actual, phases, tasks, and KPI count quickly.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Month</span>
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={{ ...inp, width: 150 }} />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  {["Brand", "Budget", "Target", "Actual", "Performance", "Phase 1", "Phase 2", "Phase 3", "Tasks this month", "KPIs", ""].map((label) => (
                    <th key={label} style={brandThStyle}><div style={resizableHeaderStyle}>{label}</div></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.brands.map((brand) => {
                  const brandTasks = state.tasks.filter((task) => task.brandId === brand.id && taskTouchesMonth(task, selectedMonth));
                  const doneTasks = brandTasks.filter((task) => task.status === "done").length;
                  const taskPct = brandTasks.length > 0 ? Math.round((doneTasks / brandTasks.length) * 100) : 0;
                  const monthly = getMonthlyRecord(brand, selectedMonth);
                  const monthlyPct = getPhasePct(monthly?.actualTotal ?? 0, monthly?.targetTotal ?? 0);
                  const phases = monthly?.phases ?? splitIntoThreePhases(0);

                  return (
                    <Fragment key={brand.id}>
                    <tr key={brand.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={brandTdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: brand.color, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 850, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{brand.description || "No description"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={brandTdStyle}>{formatVND(brand.budget)}</td>
                      <td style={brandTdStyle}>{formatNumber(monthly?.targetTotal ?? 0, "VND")}</td>
                      <td style={brandTdStyle}>{formatNumber(monthly?.actualTotal ?? 0, "VND")}</td>
                      <td style={brandTdStyle}>
                        <ProgressCell percent={monthlyPct} color={brand.color} />
                      </td>
                      {phases.map((phase) => {
                        const pct = getPhasePct(phase.actual, phase.target);
                        return (
                          <td key={phase.phase} style={brandTdStyle}>
                            <div style={{ fontSize: 12, fontWeight: 850, color: pct >= 100 ? "var(--accent-green)" : pct >= 70 ? "#f59e0b" : "var(--text-primary)" }}>{pct}%</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{formatNumber(phase.actual, "VND")} / {formatNumber(phase.target, "VND")}</div>
                          </td>
                        );
                      })}
                      <td style={brandTdStyle}>
                        <div style={{ fontSize: 12, fontWeight: 850, color: "var(--text-primary)" }}>{doneTasks}/{brandTasks.length}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{taskPct}% done</div>
                      </td>
                      <td style={brandTdStyle}>
                        <button onClick={() => toggleKpiRows(brand.id)} style={{ ...tableActionStyle, minWidth: 72 }}>
                          {expandedKpiBrandIds.includes(brand.id) ? "Hide" : "Show"} {brand.kpis.length}
                        </button>
                      </td>
                      <td style={{ ...brandTdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button onClick={() => openPhaseEditor(brand, selectedMonth)} style={tableActionStyle}>Phase</button>
                          <button onClick={() => openAddKpi(brand.id)} style={tableActionStyle}>Add KPI</button>
                          <button onClick={() => openEditBrand(brand)} style={{ ...tableIconStyle, color: brand.color }} title="Edit brand"><Edit3 size={13} /></button>
                          <button onClick={() => { if (confirm(`Delete brand "${brand.name}"?`)) deleteBrand(brand.id); }} style={{ ...tableIconStyle, color: "#f87171" }} title="Delete brand"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandedKpiBrandIds.includes(brand.id) && (
                      <tr>
                        <td colSpan={11} style={{ padding: 0, background: "var(--bg-secondary)", borderTop: "1px solid var(--border)" }}>
                          <KpiPhaseTable
                            brand={brand}
                            month={selectedMonth}
                            logs={state.kpiLogs.filter((log) => log.brandId === brand.id && log.date.startsWith(selectedMonth))}
                            onEdit={(kpi) => openEditKpi(brand.id, kpi)}
                            onDelete={(kpi) => { if (confirm(`Delete KPI "${kpi.name}"?`)) deleteKPI(brand.id, kpi.id); }}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
                {!state.brands.length && (
                  <tr>
                    <td colSpan={11} style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No brands yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brand cards */}
        <div style={{ display: "none", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: 20 }}>
          {state.brands.map((brand) => {
            const brandTasks = state.tasks.filter((t) => t.brandId === brand.id);
            const doneTasks = brandTasks.filter((t) => t.status === "done").length;
            const taskPct = brandTasks.length > 0 ? Math.round((doneTasks / brandTasks.length) * 100) : 0;
            const currentMonth = currentMonthKey();
            const monthly = getMonthlyRecord(brand, currentMonth);
            const monthlyPct = getPhasePct(monthly?.actualTotal ?? 0, monthly?.targetTotal ?? 0);

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

                {/* Monthly phases */}
                <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>Phase tháng {currentMonth}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {monthly ? `${formatNumber(monthly.actualTotal, "VNÄ")} / ${formatNumber(monthly.targetTotal, "VNÄ")} (${monthlyPct}%)` : "Chưa nhập target tháng"}
                      </div>
                    </div>
                    <button onClick={() => openPhaseEditor(brand, currentMonth)} style={{ padding: "7px 11px", borderRadius: 8, border: `1px solid ${brand.color}35`, background: `${brand.color}12`, color: brand.color, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                      Nhập phase
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    {(monthly?.phases ?? splitIntoThreePhases(0)).map((phase) => {
                      const pct = getPhasePct(phase.actual, phase.target);
                      const color = pct >= 100 ? "#10b981" : pct >= 70 ? "#f59e0b" : brand.color;
                      return (
                        <div key={phase.phase} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)" }}>Phase {phase.phase}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color }}>{pct}%</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color }} />
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 7 }}>
                            {formatNumber(phase.actual, "VNÄ")} / {formatNumber(phase.target, "VNÄ")}
                          </div>
                        </div>
                      );
                    })}
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
                  <input inputMode="numeric" value={formatPlainNumber(fBudget)} onChange={(e) => setFBudget(parseNumberInput(e.target.value))} style={inp} />
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
                    <input inputMode="numeric" value={formatPlainNumber(fKpiTarget)} onChange={(e) => setFKpiTarget(parseNumberInput(e.target.value))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Thực tế</label>
                    <input inputMode="numeric" value={formatPlainNumber(fKpiCurrent)} onChange={(e) => setFKpiCurrent(parseNumberInput(e.target.value))} style={inp} />
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

        {showPhaseModal && phaseBrand && (
          <div style={{ position: "fixed", inset: 0, zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.68)", backdropFilter: "blur(4px)", padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowPhaseModal(false)}>
            <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 620, background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>Phase KPI - {phaseBrand.name}</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Target tháng tự chia thành 3 phase, mỗi phase khoảng 10 ngày.</p>
                </div>
                <button onClick={() => setShowPhaseModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
              </div>

              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Tháng</label>
                    <input type="month" value={fMonth} onChange={(e) => openPhaseEditor(phaseBrand, e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Target tổng tháng</label>
                    <input inputMode="numeric" value={formatPlainNumber(fTargetTotal)} onChange={(e) => updateTargetTotal(parseNumberInput(e.target.value))} style={inp} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  {[0, 1, 2].map((index) => {
                    const pct = getPhasePct(fPhaseActuals[index] ?? 0, fPhaseTargets[index] ?? 0);
                    return (
                      <div key={index} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--bg-secondary)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>Phase {index + 1}</div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: pct >= 100 ? "var(--accent-green)" : "var(--accent-blue)" }}>{pct}%</div>
                        </div>
                        <label style={lbl}>Target</label>
                        <input
                          inputMode="numeric"
                          value={formatPlainNumber(fPhaseTargets[index] ?? 0)}
                          onChange={(e) => setFPhaseTargets((values) => values.map((value, i) => i === index ? parseNumberInput(e.target.value) : value))}
                          style={{ ...inp, marginBottom: 10 }}
                        />
                        <label style={lbl}>Thực đạt</label>
                        <input
                          inputMode="numeric"
                          value={formatPlainNumber(fPhaseActuals[index] ?? 0)}
                          onChange={(e) => setFPhaseActuals((values) => values.map((value, i) => i === index ? parseNumberInput(e.target.value) : value))}
                          style={inp}
                        />
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label style={lbl}>Note</label>
                  <textarea value={fPhaseNote} onChange={(e) => setFPhaseNote(e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)", gap: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Tổng thực đạt: <strong style={{ color: "var(--text-primary)" }}>{formatVND(fPhaseActuals.reduce((sum, value) => sum + value, 0))}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowPhaseModal(false)} style={{ padding: "10px 18px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>Hủy</button>
                    <button onClick={saveMonthlyPhase} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, background: `linear-gradient(135deg, ${phaseBrand.color}, ${phaseBrand.color}cc)`, border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 800 }}>
                      <Save size={14} /> Lưu phase
                    </button>
                  </div>
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

function KpiPhaseTable({
  brand,
  month,
  logs,
  onEdit,
  onDelete,
}: {
  brand: Brand;
  month: string;
  logs: KPILogEntry[];
  onEdit: (kpi: KPI) => void;
  onDelete: (kpi: KPI) => void;
}) {
  if (!brand.kpis.length) {
    return (
      <div style={{ padding: 18, color: "var(--text-muted)", fontSize: 13 }}>
        No KPI configured for this brand.
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 18px 18px" }}>
      <div style={{ fontSize: 12, fontWeight: 850, color: "var(--text-primary)", marginBottom: 10 }}>
        KPI phase tracking - {month}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "var(--bg-secondary)" }}>
            {["KPI", "Target", "Actual", "Rate", "Phase 1", "Phase 2", "Phase 3", ""].map((label) => (
              <th key={label} style={brandThStyle}><div style={resizableHeaderStyle}>{label}</div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brand.kpis.map((kpi) => {
            const kpiLogs = logs.filter((log) => log.kpiId === kpi.id);
            const loggedActual = kpiLogs.reduce((sum, log) => sum + log.value, 0);
            const actual = kpiLogs.length ? loggedActual : kpi.current;
            const rate = getPhasePct(actual, kpi.target);

            return (
              <tr key={kpi.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={brandTdStyle}>
                  <div style={{ fontSize: 12, fontWeight: 850, color: "var(--text-primary)" }}>{kpi.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{kpi.unit}</div>
                </td>
                <td style={brandTdStyle}>{formatNumber(kpi.target, kpi.unit)}</td>
                <td style={brandTdStyle}>{formatNumber(actual, kpi.unit)}</td>
                <td style={brandTdStyle}><ProgressCell percent={rate} color={brand.color} /></td>
                {([1, 2, 3] as const).map((phase) => {
                  const range = getPhaseRange(month, phase);
                  const phaseActual = kpiLogs.length
                    ? kpiLogs.filter((log) => log.date >= range.start && log.date <= range.end).reduce((sum, log) => sum + log.value, 0)
                    : getKpiPhaseTarget(actual, phase);
                  const phaseTarget = getKpiPhaseTarget(kpi.target, phase);
                  const pct = getPhasePct(phaseActual, phaseTarget);
                  return (
                    <td key={phase} style={brandTdStyle}>
                      <div style={{ fontSize: 12, fontWeight: 850, color: pct >= 100 ? "var(--accent-green)" : pct >= 70 ? "#f59e0b" : "var(--text-primary)" }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                        {formatNumber(phaseActual, kpi.unit)} / {formatNumber(phaseTarget, kpi.unit)}
                      </div>
                    </td>
                  );
                })}
                <td style={{ ...brandTdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                    <button onClick={() => onEdit(kpi)} style={tableIconStyle} title="Edit KPI"><Edit3 size={13} /></button>
                    <button onClick={() => onDelete(kpi)} style={{ ...tableIconStyle, color: "#f87171" }} title="Delete KPI"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProgressCell({ percent, color }: { percent: number; color: string }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const tone = percent >= 100 ? "var(--accent-green)" : percent >= 70 ? "#f59e0b" : color;

  return (
    <div style={{ minWidth: 92 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 850, color: tone }}>{percent}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, overflow: "hidden", background: "var(--border)" }}>
        <div style={{ width: `${safePercent}%`, height: "100%", background: tone }} />
      </div>
    </div>
  );
}

const brandThStyle: React.CSSProperties = {
  padding: 0,
  color: "var(--text-muted)",
  fontSize: 10,
  fontWeight: 850,
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const resizableHeaderStyle: React.CSSProperties = {
  minWidth: 72,
  padding: "10px 12px",
  resize: "horizontal",
  overflow: "auto",
};

const brandTdStyle: React.CSSProperties = {
  padding: "12px",
  color: "var(--text-secondary)",
  fontSize: 12,
  verticalAlign: "middle",
};

const tableActionStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-secondary)",
  borderRadius: 8,
  padding: "6px 9px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

const tableIconStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
