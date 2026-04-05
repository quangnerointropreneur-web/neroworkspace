"use client";

import { useState } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { format } from "date-fns";
import { Plus, Send, TrendingUp, Calendar, Target, BarChart3, Trash2, Info } from "lucide-react";

const formatNumber = (n: number, unit: string) => {
  if (unit === "VNĐ") return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${unit !== "VNĐ" ? " " + unit : ""}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K${unit !== "VNĐ" ? " " + unit : ""}`;
  return `${n.toLocaleString("vi-VN")}${unit !== "VNĐ" ? " " + unit : ""}`;
};

const TODAY = new Date().toISOString().split("T")[0];

export default function KPILogPage() {
  const { currentUser } = useAuth();
  const { state, addKPILog } = useData();
  const uid = currentUser?.id ?? "";

  const [selectedBrandId, setSelectedBrandId] = useState(state.brands[0]?.id ?? "");
  const [selectedKpiId, setSelectedKpiId] = useState("");
  const [logValue, setLogValue] = useState<number | "">("");
  const [logNote, setLogNote] = useState("");
  const [logDate, setLogDate] = useState(TODAY);
  const [success, setSuccess] = useState(false);

  const selectedBrand = state.brands.find((b) => b.id === selectedBrandId);
  const kpisOfBrand = selectedBrand?.kpis ?? [];
  const selectedKpi = kpisOfBrand.find((k) => k.id === selectedKpiId);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    setSelectedKpiId("");
    setLogValue("");
  };

  const handleSubmit = () => {
    if (!selectedKpiId || logValue === "" || logValue === 0) return;
    addKPILog({
      kpiId: selectedKpiId,
      brandId: selectedBrandId,
      userId: uid,
      date: logDate,
      value: Number(logValue),
      note: logNote,
    });
    setSuccess(true);
    setLogValue("");
    setLogNote("");
    setLogDate(TODAY);
    setTimeout(() => setSuccess(false), 3000);
  };

  // My logs
  const myLogs = state.kpiLogs
    .filter((l) => l.userId === uid)
    .sort((a, b) => b.date.localeCompare(a.date));

  const inp: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 9,
    padding: "9px 13px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  const canSubmit = selectedKpiId && logValue !== "" && Number(logValue) !== 0;

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Nhập KPI hàng ngày</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Ghi nhận kết quả công việc thực tế theo từng ngày — {state.brands.length} brands · {state.brands.reduce((s, b) => s + b.kpis.length, 0)} KPIs
        </p>
      </div>

      {/* Entry form + brand selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
        {/* Brand cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Chọn Brand</div>
          {state.brands.map((brand) => (
            <div
              key={brand.id}
              onClick={() => handleBrandChange(brand.id)}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: `1.5px solid ${selectedBrandId === brand.id ? brand.color : "var(--border)"}`,
                background: selectedBrandId === brand.id ? `${brand.color}10` : "var(--bg-card)",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 12,
              }}
              onMouseEnter={(e) => selectedBrandId !== brand.id && (e.currentTarget.style.borderColor = brand.color + "60")}
              onMouseLeave={(e) => selectedBrandId !== brand.id && (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${brand.color}20`, border: `2px solid ${brand.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: brand.color, flexShrink: 0 }}>
                {brand.name.charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{brand.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{brand.kpis.length} KPIs</div>
              </div>
              {selectedBrandId === brand.id && (
                <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: brand.color, flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          {/* Brand header */}
          {selectedBrand && (
            <div style={{ padding: "16px 20px", background: `linear-gradient(135deg, ${selectedBrand.color}15, transparent)`, borderBottom: `1px solid ${selectedBrand.color}20`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${selectedBrand.color}20`, border: `2px solid ${selectedBrand.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: selectedBrand.color }}>
                {selectedBrand.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{selectedBrand.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{selectedBrand.description}</div>
              </div>
            </div>
          )}

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {success && (
              <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 9, fontSize: 13, color: "var(--accent-green)", fontWeight: 600 }}>
                ✅ Đã ghi nhận kết quả thành công!
              </div>
            )}

            {/* KPI selector */}
            <div>
              <label style={lbl}>Chọn KPI cần cập nhật</label>
              {kpisOfBrand.length === 0 ? (
                <div style={{ padding: "14px", background: "var(--bg-secondary)", borderRadius: 9, border: "1px solid var(--border)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                  Brand này chưa có KPI nào
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {kpisOfBrand.map((k) => {
                    const pct = Math.min(100, Math.round((k.current / (k.target || 1)) * 100));
                    const kpiColor = pct >= 80 ? "var(--accent-green)" : pct >= 50 ? "var(--accent-yellow)" : "var(--accent-red)";
                    const isSel = selectedKpiId === k.id;
                    return (
                      <div
                        key={k.id}
                        onClick={() => setSelectedKpiId(k.id)}
                        style={{ padding: "12px", borderRadius: 10, border: `1.5px solid ${isSel ? selectedBrand?.color ?? "var(--accent-blue)" : "var(--border)"}`, background: isSel ? `${selectedBrand?.color ?? "#3b82f6"}0d` : "var(--bg-secondary)", cursor: "pointer", transition: "all 0.15s" }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
                          Mục tiêu: <span style={{ fontWeight: 700, color: kpiColor }}>{formatNumber(k.target, k.unit)}</span>
                        </div>
                        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: kpiColor, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{pct}% mục tiêu</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected KPI info */}
            {selectedKpi && (
              <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 9, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <Target size={14} color="var(--accent-blue)" />
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>{selectedKpi.name}</strong>
                  {" — "}Hiện tại: <strong style={{ color: "var(--accent-blue)" }}>{formatNumber(selectedKpi.current, selectedKpi.unit)}</strong>
                  {" / "}Mục tiêu: <strong>{formatNumber(selectedKpi.target, selectedKpi.unit)}</strong>
                </div>
              </div>
            )}

            {/* Date + value + note */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Ngày</label>
                <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Giá trị đạt được{selectedKpi ? ` (${selectedKpi.unit})` : ""}</label>
                <input
                  type="number"
                  value={logValue}
                  onChange={(e) => setLogValue(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0"
                  style={inp}
                />
              </div>
            </div>
            <div>
              <label style={lbl}>Ghi chú (tuỳ chọn)</label>
              <input value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="Bổ sung thông tin nếu cần..." style={inp} />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px", borderRadius: 10,
                background: canSubmit ? (selectedBrand ? `linear-gradient(135deg, ${selectedBrand.color}, ${selectedBrand.color}cc)` : "linear-gradient(135deg, #3b82f6, #8b5cf6)") : "var(--bg-secondary)",
                border: canSubmit ? "none" : "1px solid var(--border)",
                color: canSubmit ? "white" : "var(--text-muted)",
                fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              <Send size={14} /> Ghi nhận kết quả
            </button>

            {/* Privacy note */}
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 9 }}>
              <Info size={14} color="var(--accent-yellow)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: "var(--accent-yellow)", lineHeight: 1.5 }}>
                Kết quả bạn nhập chỉ lưu dưới dạng nhật ký cá nhân. Admin sẽ xem xét và cập nhật KPI tổng thể của Brand.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* My log history */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={14} color="var(--accent-green)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Lịch sử nhập của tôi</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{myLogs.length} bản ghi</span>
        </div>

        {myLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: 13 }}>
            Chưa có bản ghi nào. Hãy nhập kết quả đầu tiên!
          </div>
        ) : (
          myLogs.map((log) => {
            const brand = state.brands.find((b) => b.id === log.brandId);
            const kpi = brand?.kpis.find((k) => k.id === log.kpiId);
            return (
              <div
                key={log.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${brand?.color ?? "#3b82f6"}18`, border: `1px solid ${brand?.color ?? "#3b82f6"}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: brand?.color ?? "#3b82f6", flexShrink: 0 }}>
                  {brand?.name.charAt(0) ?? "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {kpi?.name ?? "KPI không xác định"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {brand?.name} {log.note ? `· ${log.note}` : ""}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-blue)" }}>
                    {formatNumber(log.value, kpi?.unit ?? "")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                    <Calendar size={10} /> {log.date}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
