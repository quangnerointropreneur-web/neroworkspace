"use client";

import { useState, useEffect } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { User, AttendanceRecord } from "@/lib/types";
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Users,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const THIS_MONTH = new Date().toISOString().slice(0, 7);

export default function HRPage() {
  const { currentUser } = useAuth();
  const { state, addUser, updateUser, deleteUser } = useData();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.role !== "admin") router.replace("/dashboard");
  }, [currentUser, router]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(THIS_MONTH);

  // Form state
  const [fUsername, setFUsername] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fFullName, setFFullName] = useState("");
  const [fDept, setFDept] = useState("");
  const [fRole, setFRole] = useState<User["role"]>("employee");
  const [fBaseSalary, setFBaseSalary] = useState(0);
  const [fBonus, setFBonus] = useState(0);
  const [fPenalty, setFPenalty] = useState(0);
  const [fShiftStart, setFShiftStart] = useState("08:30");
  const [fShiftEnd, setFShiftEnd] = useState("17:30");
  const [fBrandIds, setFBrandIds] = useState<string[]>([]);

  const openCreate = () => {
    setEditingUser(null);
    setFUsername(""); setFPassword(""); setFFullName(""); setFDept("");
    setFRole("employee"); setFBaseSalary(0); setFBonus(0); setFPenalty(0);
    setFShiftStart("08:30"); setFShiftEnd("17:30");
    setFBrandIds([]);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setFUsername(u.username); setFPassword(u.password); setFFullName(u.fullName);
    setFDept(u.department ?? ""); setFRole(u.role);
    setFBaseSalary(u.baseSalary); setFBonus(u.bonus); setFPenalty(u.penalty);
    setFShiftStart(u.shiftStart ?? "08:30"); setFShiftEnd(u.shiftEnd ?? "17:30");
    setFBrandIds(u.brandIds ?? []);
    setShowModal(true);
  };

  const toggleBrandId = (brandId: string) => {
    setFBrandIds((prev) => prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]);
  };

  const handleSave = () => {
    if (!fFullName.trim() || !fUsername.trim()) return;
    if (fRole === "manager" && fBrandIds.length === 0) return;
    const data = {
      username: fUsername,
      password: fPassword || "pass123",
      fullName: fFullName,
      department: fDept,
      role: fRole,
      baseSalary: fBaseSalary,
      bonus: fBonus,
      penalty: fPenalty,
      shiftStart: fShiftStart,
      shiftEnd: fShiftEnd,
      brandIds: fRole === "admin" ? [] : fBrandIds,
      attendance: editingUser?.attendance ?? [],
    };
    if (editingUser) updateUser(editingUser.id, data);
    else addUser(data);
    setShowModal(false);
  };

  const handleDelete = (u: User) => {
    if (confirm(`Xóa nhân viên "${u.fullName}"?`)) deleteUser(u.id);
  };

  const updateAttendance = (userId: string, field: "workDays" | "leaveDays", value: number) => {
    const user = state.users.find((u) => u.id === userId)!;
    const existing = user.attendance.find((a) => a.month === selectedMonth);
    const updatedAttendance: AttendanceRecord[] = existing
      ? user.attendance.map((a) =>
          a.month === selectedMonth ? { ...a, [field]: value } : a
        )
      : [
          ...user.attendance,
          {
            month: selectedMonth,
            workDays: field === "workDays" ? value : 0,
            leaveDays: field === "leaveDays" ? value : 0,
            totalWorkingDays: 26,
          },
        ];
    updateUser(userId, { attendance: updatedAttendance });
  };

  const calcIncome = (u: User) => u.baseSalary + u.bonus - u.penalty;

  const exportToExcel = () => {
    const data = state.users.map(user => {
      const uid = user.id;
      const myTasks = state.tasks.filter(t => t.picIds?.includes(uid) || t.picId === uid);
      const checkins = state.checkIns.filter(c => c.userId === uid && c.date.startsWith(selectedMonth));
      
      const done = myTasks.filter(t => t.status === "done").length;
      const cancelled = myTasks.filter(t => t.status === "cancelled").length;
      const pending = myTasks.filter(t => ["todo", "inprogress", "review"].includes(t.status)).length;
      const late = myTasks.filter(t => {
        if (!t.deadline) return false;
        if (t.status === "done") return t.completedAt ? t.completedAt > t.deadline : false;
        return new Date().toISOString() > t.deadline;
      }).length;

      const att = user.attendance.find(a => a.month === selectedMonth);

      return {
        "Họ tên": user.fullName,
        "Phòng ban": user.department || "N/A",
        "Tháng": selectedMonth,
        "Tổng Task": myTasks.length,
        "Hoàn thành": done,
        "Đã hủy": cancelled,
        "Trễ deadline": late,
        "Số ngày công": checkins.length,
        "Đi muộn": checkins.filter(c => c.status === "late").length,
        "Lương cứng": user.baseSalary,
        "Thưởng": user.bonus,
        "Phạt": user.penalty,
        "Thực lĩnh": user.baseSalary + user.bonus - user.penalty
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KPI_NhanSu");
    
    const maxWidths = Object.keys(data[0] || {}).map(key => {
      const lengths = data.map(row => String(row[key as keyof typeof row]).length);
      return Math.max(key.length, ...lengths) + 2;
    });
    ws["!cols"] = maxWidths.map(w => ({ wch: w }));

    XLSX.writeFile(wb, `Chot_Luong_KPI_${selectedMonth}.xlsx`);
  };

  if (currentUser?.role !== "admin") return null;

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              Quản lý Nhân sự
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {state.users.length} nhân viên
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 12px" }}>
              <Calendar size={14} color="var(--text-secondary)" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}
              />
            </div>
            <button 
              onClick={exportToExcel}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              <FileSpreadsheet size={15} /> Xuất Excel KPI
            </button>
            <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>
              <Plus size={15} /> Thêm nhân viên
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { label: "Tổng nhân sự", value: state.users.length, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
            { label: "Tổng lương tháng", value: formatVND(state.users.reduce((s, u) => s + calcIncome(u), 0)), color: "#10b981", bg: "rgba(16,185,129,0.1)" },
            { label: "Manager", value: state.users.filter((u) => u.role === "manager").length, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          ].map((c) => (
            <div key={c.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Employee table */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          {/* Table head */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 100px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            {["Nhân viên", "Phòng ban", "Lương cứng", "Thưởng", "Phạt", "Thực lĩnh", "Thao tác"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {h}
              </div>
            ))}
          </div>

          {state.users.map((u, i) => {
            const att = u.attendance.find((a) => a.month === selectedMonth);
            const income = calcIncome(u);
            const isExpanded = expandedId === u.id;
            const tasks = state.tasks.filter((t) => t.picId === u.id);
            const doneTasks = tasks.filter((t) => t.status === "done").length;
            const scopedBrands = state.brands.filter((brand) => u.brandIds?.includes(brand.id));

            return (
              <div key={u.id}>
                {/* Main row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 100px",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--bg-secondary)",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: getRoleGradient(u.role), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>
                      {u.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{u.fullName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        @{u.username} · {getRoleLabel(u.role)}
                      </div>
                      {u.role !== "admin" && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                          {scopedBrands.length > 0 ? scopedBrands.map((brand) => (
                            <span key={brand.id} style={{ fontSize: 10, color: brand.color, background: `${brand.color}14`, border: `1px solid ${brand.color}35`, borderRadius: 999, padding: "1px 7px", fontWeight: 700 }}>
                              {brand.name}
                            </span>
                          )) : (
                            <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 999, padding: "1px 7px" }}>
                              Tat ca brand
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: 10, display: "flex", gap: 8, marginTop: 2 }}>
                        <span style={{ color: "var(--accent-green)" }}>Xong: {doneTasks}</span>
                        <span style={{ color: "var(--accent-red)" }}>Hủy: {tasks.filter(t => t.status === "cancelled").length}</span>
                        <span style={{ color: "#f59e0b" }}>Trễ: {tasks.filter(t => t.status !== "done" && t.deadline && new Date().toISOString() > t.deadline).length}</span>
                        <span style={{ color: "var(--text-muted)" }}>Tổng: {tasks.length}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{u.department ?? "—"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{formatVND(u.baseSalary)}</div>
                  <div style={{ fontSize: 13, color: "#10b981", fontWeight: 500 }}>+{formatVND(u.bonus)}</div>
                  <div style={{ fontSize: 13, color: u.penalty > 0 ? "#ef4444" : "var(--text-muted)", fontWeight: u.penalty > 0 ? 500 : 400 }}>
                    {u.penalty > 0 ? `-${formatVND(u.penalty)}` : "—"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>{formatVND(income)}</div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setExpandedId(isExpanded ? null : u.id)} style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button onClick={() => openEdit(u)} style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", cursor: "pointer", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Edit3 size={13} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u)} style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: "16px 20px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                      Chốt công & Lương tháng {selectedMonth}
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                        {(() => {
                          const recs = state.checkIns.filter((c) => c.userId === u.id && c.date.startsWith(selectedMonth));
                          const present = recs.filter((r) => r.status === "present").length;
                          const late = recs.filter((r) => r.status === "late").length;
                          const early = recs.filter((r) => r.status === "early_leave").length;
                          return (
                            <>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)" }}>{recs.length}</div>
                                <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase" }}>Chấm công</div>
                              </div>
                              <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-green)" }}>{present}</div>
                                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Đúng giờ</div>
                              </div>
                              <div style={{ textAlign: "center", marginLeft: 4 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: late > 0 ? "var(--accent-yellow)" : "var(--text-secondary)" }}>{late}</div>
                                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Đi muộn</div>
                              </div>
                              <div style={{ textAlign: "center", marginLeft: 4 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: early > 0 ? "var(--accent-red)" : "var(--text-secondary)" }}>{early}</div>
                                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Về sớm</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ width: 1, background: "var(--bg-card)", margin: "0 8px" }} />
                      <div>
                        <label style={subLbl}>Chốt ngày đi làm</label>
                        <input type="number" min={0} max={31} value={att?.workDays ?? 0} onChange={(e) => updateAttendance(u.id, "workDays", +e.target.value)} style={subInp} />
                      </div>
                      <div>
                        <label style={subLbl}>Nghỉ phép</label>
                        <input type="number" min={0} max={31} value={att?.leaveDays ?? 0} onChange={(e) => updateAttendance(u.id, "leaveDays", +e.target.value)} style={subInp} />
                      </div>
                      <div>
                        <label style={subLbl}>Tổng chuẩn</label>
                        <input type="number" value={att?.totalWorkingDays ?? 26} readOnly style={{ ...subInp, opacity: 0.5 }} />
                      </div>
                      <div style={{ marginLeft: "auto", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "10px 16px" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Bảng tính lương</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Lương cứng: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatVND(u.baseSalary)}</span></div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>+ Thưởng: <span style={{ color: "#10b981", fontWeight: 600 }}>+{formatVND(u.bonus)}</span></div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>- Phạt: <span style={{ color: "#ef4444", fontWeight: 600 }}>-{formatVND(u.penalty)}</span></div>
                        <div style={{ fontSize: 14, color: "var(--accent-blue)", fontWeight: 800, borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6 }}>Thực lĩnh: {formatVND(income)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Modal - Outside animated container */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 440, background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{editingUser ? "Sửa thông tin" : "Thêm nhân sự mới"}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbl}>Họ và tên *</label>
                <input value={fFullName} onChange={(e) => setFFullName(e.target.value)} placeholder="Nguyễn Văn A..." style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Tên đăng nhập *</label>
                  <input value={fUsername} onChange={(e) => setFUsername(e.target.value)} placeholder="username..." style={inp} disabled={!!editingUser} />
                </div>
                <div>
                  <label style={lbl}>Mật khẩu</label>
                  <input type="password" value={fPassword} onChange={(e) => setFPassword(e.target.value)} placeholder="••••••••" style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Phòng ban</label>
                  <input value={fDept} onChange={(e) => setFDept(e.target.value)} placeholder="VD: Marketing..." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Chức danh</label>
                  <select value={fRole} onChange={(e) => setFRole(e.target.value as User["role"])} style={{ ...inp, cursor: "pointer" }}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="assistant">Assistant</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {fRole !== "admin" && (
                <div>
                  <label style={lbl}>Brand duoc xem</label>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                    {fRole === "manager"
                      ? "Manager will manage all tasks inside selected brands. Select at least one brand."
                      : "Select one or more brands. Leave empty if this account can see all brands."}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {state.brands.map((brand) => {
                      const selected = fBrandIds.includes(brand.id);
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => toggleBrandId(brand.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: selected ? `${brand.color}18` : "var(--bg-secondary)",
                            border: `1px solid ${selected ? `${brand.color}55` : "var(--border)"}`,
                            color: selected ? brand.color : "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: selected ? 700 : 500,
                          }}
                        >
                          {brand.name}{selected ? " ✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Lương cứng</label>
                  <input type="number" value={fBaseSalary} onChange={(e) => setFBaseSalary(+e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Thưởng</label>
                  <input type="number" value={fBonus} onChange={(e) => setFBonus(+e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Phạt</label>
                  <input type="number" value={fPenalty} onChange={(e) => setFPenalty(+e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Vào ca</label>
                  <input type="time" value={fShiftStart} onChange={(e) => setFShiftStart(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Hết ca</label>
                  <input type="time" value={fShiftEnd} onChange={(e) => setFShiftEnd(e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>Hủy</button>
                <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <Save size={14} /> {editingUser ? "Cập nhật" : "Tạo mới"}
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
  marginBottom: 5,
};

const inp: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
};

const subLbl: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-secondary)",
  display: "block",
  marginBottom: 5,
};

const subInp: React.CSSProperties = {
  ...inp,
  width: 80,
};

function getRoleLabel(role: User["role"]) {
  if (role === "admin") return "Admin";
  if (role === "assistant") return "Assistant";
  if (role === "manager") return "Manager";
  return "Employee";
}

function getRoleGradient(role: User["role"]) {
  if (role === "admin") return "linear-gradient(135deg, #3b82f6, #8b5cf6)";
  if (role === "assistant") return "linear-gradient(135deg,#6366f1,#8b5cf6)";
  if (role === "manager") return "linear-gradient(135deg,#f59e0b,#d97706)";
  return "linear-gradient(135deg, #10b981, #059669)";
}
