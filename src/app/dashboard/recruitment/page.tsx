"use client";

import { useState, useMemo } from "react";
import { useData, useAuth } from "@/context/AppContext";
import { RecruitmentLog, Brand } from "@/lib/types";
import { canAccessBrand, getVisibleBrands } from "@/lib/permissions";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from "recharts";
import { 
  Plus, Calendar, ExternalLink, Trash2, TrendingUp, Users, 
  Filter, Download, ChevronRight, BarChart3, List, Link as LinkIcon, Search, ArrowRight
} from "lucide-react";
import { format, subDays, parseISO, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import { vi } from "date-fns/locale";

export default function RecruitmentPage() {
  const { state, addRecruitmentLog, deleteRecruitmentLog } = useData();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs">("dashboard");
  const [filterBrandId, setFilterBrandId] = useState<string>("");
  
  // Date Range State
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchLinks, setBatchLinks] = useState("");
  const [newLog, setNewLog] = useState({
    brandId: state.brands[0]?.id || "",
    groupName: "",
    postLink: "",
    cvCount: 0,
    date: new Date().toISOString().split("T")[0],
    note: ""
  });

  const isAdmin = currentUser?.role === "admin";
  const visibleBrands = useMemo(() => getVisibleBrands(state.brands, currentUser), [state.brands, currentUser]);
  const effectiveNewLogBrandId = canAccessBrand(currentUser, newLog.brandId)
    ? newLog.brandId
    : visibleBrands[0]?.id ?? "";

  // Filtered Logs based on Brand AND Date Range
  const filteredLogs = useMemo(() => {
    let logs = state.recruitmentLogs.filter((log) => canAccessBrand(currentUser, log.brandId));
    
    // Brand Filter
    if (filterBrandId) {
      logs = logs.filter(l => l.brandId === filterBrandId);
    }
    
    // Date Range Filter
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));
    
    return logs.filter(l => {
      const logDate = parseISO(l.date);
      return logDate >= start && logDate <= end;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.recruitmentLogs, filterBrandId, startDate, endDate, currentUser]);

  // Overall Stats for the selected combination
  const stats = useMemo(() => {
    return {
      totalPosts: filteredLogs.filter(l => l.postLink).length,
      totalCVs: filteredLogs.reduce((sum, l) => sum + (l.cvCount || 0), 0)
    };
  }, [filteredLogs]);

  // Chart Data (Daily breakdown within the selected range)
  const chartData = useMemo(() => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const days = eachDayOfInterval({ start, end });

      return days.map(day => {
        const dStr = format(day, "yyyy-MM-dd");
        const dayLogs = filteredLogs.filter(l => l.date === dStr);
        return {
          date: format(day, "dd/MM"),
          "Bài đăng": dayLogs.filter(l => l.postLink).length,
          "CV": dayLogs.reduce((sum, l) => sum + (l.cvCount || 0), 0)
        };
      });
    } catch (e) {
      return [];
    }
  }, [filteredLogs, startDate, endDate]);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveNewLogBrandId) return;
    addRecruitmentLog({
      ...newLog,
      brandId: effectiveNewLogBrandId,
      userId: currentUser?.id || "",
      commentCount: 0
    });
    setShowAddForm(false);
    setNewLog(prev => ({ ...prev, postLink: "", cvCount: 0, groupName: "" }));
  };

  const handleBatchAdd = () => {
    const links = batchLinks.split("\n").map(l => l.trim()).filter(l => l.startsWith("http"));
    if (!effectiveNewLogBrandId) return;
    if (links.length === 0) return alert("Vui lòng dán link!");
    
    links.forEach(link => {
      addRecruitmentLog({
        brandId: effectiveNewLogBrandId,
        date: newLog.date,
        postLink: link,
        groupName: "Hàng loạt",
        cvCount: 0,
        commentCount: 0,
        userId: currentUser?.id || ""
      });
    });
    setBatchLinks("");
    setShowBatchModal(false);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: 24,
    boxShadow: "var(--shadow-sm)"
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 12,
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    fontWeight: 600
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-blue)", marginBottom: 8 }}>
            <TrendingUp size={20} />
            <span style={{ fontWeight: 600, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tuyển dụng Social</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Báo cáo Tuyển dụng</h1>
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          <button 
            onClick={() => setShowBatchModal(true)}
            style={{ 
              display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", 
              borderRadius: 12, background: "var(--bg-secondary)", color: "var(--text-primary)", 
              border: "1px solid var(--border)", fontWeight: 700, cursor: "pointer"
            }}
          >
            <List size={18} /> Nhập link hàng loạt
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            style={{ 
              display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", 
              borderRadius: 12, background: "var(--accent-blue)", color: "white", 
              border: "none", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" 
            }}
          >
            <Plus size={18} /> Nhập báo cáo mới
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div style={{ ...cardStyle, padding: "16px 24px", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(59,130,246,0.03)", flexWrap: "wrap", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={16} style={{ color: "var(--accent-blue)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>BRAND:</span>
            <select 
              value={filterBrandId} 
              onChange={(e) => setFilterBrandId(e.target.value)}
              style={{ ...inputStyle, minWidth: 150 }}
            >
              <option value="">Tất cả Brand</option>
              {visibleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={16} style={{ color: "var(--accent-blue)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>KHOẢNG THỜI GIAN:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
              <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>TỔNG BÀI ĐĂNG</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent-blue)" }}>{stats.totalPosts}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>TỔNG CV</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent-green)" }}>{stats.totalCVs}</div>
          </div>
        </div>
      </div>

      {/* Charts & Navigation */}
      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        <button 
          onClick={() => setActiveTab("dashboard")}
          style={{ 
            padding: "10px 24px", borderRadius: 12, border: "none", 
            background: activeTab === "dashboard" ? "var(--accent-blue)" : "var(--bg-secondary)",
            color: activeTab === "dashboard" ? "white" : "var(--text-muted)",
            fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
          }}
        >
          <BarChart3 size={18} /> Biểu đồ hiệu suất
        </button>
        <button 
          onClick={() => setActiveTab("logs")}
          style={{ 
            padding: "10px 24px", borderRadius: 12, border: "none", 
            background: activeTab === "logs" ? "var(--accent-blue)" : "var(--bg-secondary)",
            color: activeTab === "logs" ? "white" : "var(--text-muted)",
            fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
          }}
        >
          <List size={18} /> Nhật ký chi tiết
        </button>
      </div>

      {activeTab === "dashboard" ? (
        <div style={cardStyle}>
          <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {filterBrandId ? `Phân tích Brand: ${state.brands.find(b => b.id === filterBrandId)?.name}` : "Phân tích Tuyển dụng tổng thể"}
            </h3>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--accent-blue)" }} /> Bài đăng
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--accent-green)" }} /> CV
              </div>
            </div>
          </div>
          
          <div style={{ height: 400, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }}
                  itemStyle={{ fontWeight: 700 }}
                />
                <Bar dataKey="Bài đăng" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="CV" fill="var(--accent-green)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>Ngày</th>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>Brand</th>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>Chi tiết / Link</th>
                  <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>CV</th>
                  <th style={{ textAlign: "right", padding: "16px", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const brand = state.brands.find(b => b.id === log.brandId);
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "16px", fontSize: 14, fontWeight: 600 }}>{format(parseISO(log.date), "dd/MM/yyyy")}</td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 6, background: `${brand?.color}15`, color: brand?.color, fontSize: 12, fontWeight: 700 }}>{brand?.name}</span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        {log.postLink ? (
                          <a href={log.postLink} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-blue)", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
                            <LinkIcon size={14} /> Bài đăng Tuyển dụng
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Báo cáo CV định kỳ</span>
                        )}
                      </td>
                      <td style={{ padding: "16px", fontSize: 15, fontWeight: 800, color: log.cvCount > 0 ? "var(--accent-green)" : "var(--text-muted)" }}>
                        {log.cvCount > 0 ? `+${log.cvCount}` : "0"}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <button onClick={() => deleteRecruitmentLog(log.id)} style={{ color: "var(--accent-red)", background: "none", border: "none", cursor: "pointer" }}>
                          <Trash2 size={18} />
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

      {/* Modals - Same as before but updated for layout consistency */}
      {showAddForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: 500, borderRadius: 24, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-2xl)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Báo cáo Tuyển dụng</h2>
              <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <form onSubmit={handleAddLog} style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Brand</label>
                <select required value={effectiveNewLogBrandId} onChange={e => setNewLog({...newLog, brandId: e.target.value})} style={{ ...inputStyle, width: "100%" }}>
                  {visibleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Ngày báo cáo</label>
                <input type="date" required value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Link bài đăng (Nếu có)</label>
                <input placeholder="https://..." value={newLog.postLink} onChange={e => setNewLog({...newLog, postLink: e.target.value})} style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Số lượng CV (Nếu có)</label>
                <input type="number" value={newLog.cvCount || ""} onChange={e => setNewLog({...newLog, cvCount: parseInt(e.target.value) || 0})} style={{ ...inputStyle, width: "100%", fontSize: 20, fontWeight: 800, textAlign: "center" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: "14px", borderRadius: 14, background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer" }}>Hủy</button>
                <button type="submit" style={{ flex: 1, padding: "14px", borderRadius: 14, background: "var(--accent-blue)", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}>Lưu báo cáo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Links Modal */}
      {showBatchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: 600, borderRadius: 24, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-2xl)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Nhập link hàng loạt</h2>
              <button onClick={() => setShowBatchModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>Brand & Ngày</label>
                <div style={{ display: "flex", gap: 12 }}>
                  <select value={effectiveNewLogBrandId} onChange={e => setNewLog({...newLog, brandId: e.target.value})} style={{ ...inputStyle, flex: 1 }}>
                    {visibleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <textarea 
                rows={10} placeholder="Dán các link bài đăng, mỗi dòng 1 link..."
                value={batchLinks} onChange={e => setBatchLinks(e.target.value)}
                style={{ ...inputStyle, width: "100%", resize: "none", fontFamily: "monospace", marginBottom: 20 }}
              />
              <button 
                onClick={handleBatchAdd}
                style={{ width: "100%", padding: "14px", borderRadius: 14, background: "var(--accent-blue)", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}
              >
                Lưu tất cả bài đăng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
