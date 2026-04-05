"use client";

import { useState, useMemo } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Clock, LogIn, LogOut, CheckCircle, Calendar, AlertCircle, Plus } from "lucide-react";

const TODAY = new Date().toISOString().split("T")[0];
const THIS_MONTH = new Date().toISOString().slice(0, 7);

export default function AttendancePage() {
  const { currentUser } = useAuth();
  const { state, addCheckIn, updateCheckIn, getTodayCheckIn } = useData();
  const isAdmin = currentUser?.role === "admin";

  const [selectedMonth, setSelectedMonth] = useState(THIS_MONTH);
  const [noteInput, setNoteInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState(TODAY);
  const [addCheckInTime, setAddCheckInTime] = useState("08:00");
  const [addCheckOutTime, setAddCheckOutTime] = useState("17:30");
  const [addNote, setAddNote] = useState("");
  const [addUserId, setAddUserId] = useState(currentUser?.id ?? "");

  const todayRecord = getTodayCheckIn(currentUser?.id ?? "");

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const calculateStatus = (userId: string, checkIn: string, checkOut?: string | null): "present" | "late" | "early_leave" | "absent" => {
    if (!checkIn) return "absent";
    const user = state.users.find((u) => u.id === userId);
    const expectedStart = user?.shiftStart || "08:30";
    const expectedEnd = user?.shiftEnd || "17:30";

    const [inH, inM] = checkIn.split(":").map(Number);
    const [expStartH, expStartM] = expectedStart.split(":").map(Number);
    
    // Nếu muộn hơn giờ ấn định thì tính là late
    let isLate = false;
    if (inH > expStartH || (inH === expStartH && inM > expStartM)) {
      isLate = true;
    }
    if (isLate) return "late";
    
    if (checkOut) {
      const [outH, outM] = checkOut.split(":").map(Number);
      const [expEndH, expEndM] = expectedEnd.split(":").map(Number);
      let isEarlyLeave = false;
      if (outH < expEndH || (outH === expEndH && outM < expEndM)) {
        isEarlyLeave = true;
      }
      if (isEarlyLeave) return "early_leave";
    }
    return "present";
  };

  const handleCheckIn = () => {
    if (todayRecord) return;
    const now = new Date();
    const checkInTime = format(now, "HH:mm");
    addCheckIn({
      userId: currentUser!.id,
      date: TODAY,
      checkIn: checkInTime,
      note: noteInput,
      status: calculateStatus(currentUser!.id, checkInTime),
    });
    setNoteInput("");
  };

  const handleCheckOut = () => {
    if (!todayRecord || todayRecord.checkOut) return;
    const now = new Date();
    const checkOutTime = format(now, "HH:mm");
    
    const user = state.users.find((u) => u.id === currentUser!.id);
    const expectedEnd = user?.shiftEnd || "17:30";
    const [expEndH, expEndM] = expectedEnd.split(":").map(Number);
    let isEarlyLeave = false;
    if (now.getHours() < expEndH || (now.getHours() === expEndH && now.getMinutes() < expEndM)) {
      isEarlyLeave = true;
    }
    
    updateCheckIn(todayRecord.id, {
      checkOut: checkOutTime,
      status: todayRecord.status === "late" ? "late" : isEarlyLeave ? "early_leave" : "present",
    });
  };

  const openAddForm = () => {
    setEditingRecordId(null);
    setAddUserId(currentUser?.id ?? "");
    setAddDate(TODAY);
    setAddCheckInTime("08:00");
    setAddCheckOutTime("17:30");
    setAddNote("");
    setShowAddForm(true);
  };

  const openEditForm = (rec: any) => {
    if (!isAdmin) return;
    setEditingRecordId(rec.id);
    setAddUserId(rec.userId);
    setAddDate(rec.date);
    setAddCheckInTime(rec.checkIn);
    setAddCheckOutTime(rec.checkOut || "");
    setAddNote(rec.note || "");
    setShowAddForm(true);
  };

  const handleAdminSave = () => {
    if (!addDate || !addCheckInTime) return;
    
    const newStatus = calculateStatus(addUserId, addCheckInTime, addCheckOutTime || undefined);

    if (editingRecordId) {
      // Check for duplicate on different record
      const existing = state.checkIns.find((c) => c.userId === addUserId && c.date === addDate && c.id !== editingRecordId);
      if (existing) { alert("Đã có bản ghi chấm công cho ngày này."); return; }

      updateCheckIn(editingRecordId, {
        userId: addUserId, date: addDate, checkIn: addCheckInTime, checkOut: addCheckOutTime || undefined, note: addNote, status: newStatus
      });
    } else {
      // Create new
      const existing = state.checkIns.find((c) => c.userId === addUserId && c.date === addDate);
      if (existing) { alert("Đã có bản ghi chấm công cho ngày này."); return; }

      addCheckIn({ userId: addUserId, date: addDate, checkIn: addCheckInTime, checkOut: addCheckOutTime || undefined, note: addNote, status: newStatus });
    }
    
    setShowAddForm(false);
  };

  // Filtered records for the selected month
  const displayUserId = isAdmin ? null : currentUser?.id;
  const monthRecords = useMemo(() =>
    state.checkIns
      .filter((c) => c.date.startsWith(selectedMonth) && (displayUserId ? c.userId === displayUserId : true))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [state.checkIns, selectedMonth, displayUserId]
  );

  const getUserName = (id: string) => state.users.find((u) => u.id === id)?.fullName ?? id;

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    present: { label: "Đúng giờ", color: "var(--accent-green)", bg: "rgba(16,185,129,0.1)" },
    late: { label: "Đi muộn", color: "var(--accent-yellow)", bg: "rgba(245,158,11,0.1)" },
    early_leave: { label: "Về sớm", color: "var(--accent-red)", bg: "rgba(239,68,68,0.1)" },
    absent: { label: "Vắng mặt", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  };

  const myStats = useMemo(() => {
    const uId = currentUser?.id ?? "";
    const recs = state.checkIns.filter((c) => c.date.startsWith(selectedMonth) && c.userId === uId);
    return {
      present: recs.filter((r) => r.status === "present").length,
      late: recs.filter((r) => r.status === "late").length,
      earlyLeave: recs.filter((r) => r.status === "early_leave").length,
      total: recs.length,
    };
  }, [state.checkIns, selectedMonth, currentUser?.id]);

  const inp: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "7px 11px",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Chấm công</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Hôm nay: {format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ ...inp, width: "auto" }} />
          {isAdmin && (
            <button onClick={openAddForm} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={14} /> Thêm bản ghi
            </button>
          )}
        </div>
      </div>

      {/* Check-in widget (for current user) */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
          Chấm công hôm nay
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Check-in card */}
          <div style={{ flex: 1, minWidth: 180, background: "var(--bg-secondary)", borderRadius: 12, padding: "16px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <LogIn size={16} color="var(--accent-blue)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Check-in</span>
            </div>
            {todayRecord ? (
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-blue)" }}>{todayRecord.checkIn}</div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Chưa chấm công</div>
            )}
            {!todayRecord && (
              <>
                <input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Ghi chú (tuỳ chọn)..." style={{ ...inp, marginBottom: 10, fontSize: 12 }} />
                <button onClick={handleCheckIn} style={{ width: "100%", padding: "9px", borderRadius: 9, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Check-in ngay
                </button>
              </>
            )}
          </div>

          {/* Check-out card */}
          <div style={{ flex: 1, minWidth: 180, background: "var(--bg-secondary)", borderRadius: 12, padding: "16px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <LogOut size={16} color="var(--accent-green)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Check-out</span>
            </div>
            {todayRecord?.checkOut ? (
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-green)" }}>{todayRecord.checkOut}</div>
            ) : todayRecord ? (
              <button onClick={handleCheckOut} style={{ width: "100%", padding: "9px", borderRadius: 9, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Check-out ngay
              </button>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Chưa check-in</div>
            )}
          </div>

          {/* Status card */}
          <div style={{ flex: 1, minWidth: 180, background: "var(--bg-secondary)", borderRadius: 12, padding: "16px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CheckCircle size={16} color="var(--accent-purple)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Trạng thái</span>
            </div>
            {todayRecord ? (
              <>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: STATUS_CONFIG[todayRecord.status].bg, color: STATUS_CONFIG[todayRecord.status].color, border: `1px solid ${STATUS_CONFIG[todayRecord.status].color}40` }}>
                  {STATUS_CONFIG[todayRecord.status].label}
                </span>
                {todayRecord.note && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>📝 {todayRecord.note}</div>}
              </>
            ) : (
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>—</span>
            )}
          </div>

          {/* Monthly stats */}
          <div style={{ flex: 1, minWidth: 180, background: "var(--bg-secondary)", borderRadius: 12, padding: "16px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase" }}>Thống kê tháng</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Đúng giờ", value: myStats.present, color: "var(--accent-green)" },
                { label: "Đi muộn", value: myStats.late, color: "var(--accent-yellow)" },
                { label: "Về sớm", value: myStats.earlyLeave, color: "var(--accent-red)" },
                { label: "Tổng ngày", value: myStats.total, color: "var(--accent-blue)" },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={14} color="var(--accent-blue)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Lịch sử chấm công — {selectedMonth}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{monthRecords.length} bản ghi</span>
        </div>

        {/* Headers */}
        <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1.5fr 1fr 1fr 1fr 1fr 1.5fr" : "1fr 1fr 1fr 1fr 1.5fr", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          {[...(isAdmin ? ["Nhân viên"] : []), "Ngày", "Check-in", "Check-out", "Trạng thái", "Ghi chú"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>

        {monthRecords.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)", fontSize: 13 }}>
            Chưa có bản ghi nào trong tháng {selectedMonth}
          </div>
        ) : (
          monthRecords.map((rec) => {
            const conf = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.present;
            return (
              <div
                key={rec.id}
                onClick={() => openEditForm(rec)}
                style={{ display: "grid", gridTemplateColumns: isAdmin ? "1.5fr 1fr 1fr 1fr 1fr 1.5fr" : "1fr 1fr 1fr 1fr 1.5fr", padding: "11px 20px", borderBottom: "1px solid var(--border)", alignItems: "center", transition: "background 0.15s", cursor: isAdmin ? "pointer" : "default" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {isAdmin && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{getUserName(rec.userId)}</div>
                )}
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {format(parseISO(rec.date), "dd/MM/yyyy")} ({format(parseISO(rec.date), "EEE", { locale: vi })})
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-blue)" }}>{rec.checkIn}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: rec.checkOut ? "var(--accent-green)" : "var(--text-muted)" }}>{rec.checkOut ?? "—"}</div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: conf.bg, color: conf.color, border: `1px solid ${conf.color}40` }}>
                    {conf.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.note ?? "—"}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin add form modal */}
      {showAddForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: 20 }} onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}>
          <div className="animate-scaleIn" style={{ width: "100%", maxWidth: 440, background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{editingRecordId ? "Sửa bản ghi chấm công" : "Thêm bản ghi chấm công"}</h3>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbl}>Nhân viên</label>
                <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} style={{ ...inp, cursor: "pointer" }} disabled={!!editingRecordId}>
                  {state.users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Ngày</label>
                  <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} style={inp} disabled={!!editingRecordId} />
                </div>
                <div>
                  <label style={lbl}>Check-in</label>
                  <input type="time" value={addCheckInTime} onChange={(e) => setAddCheckInTime(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Check-out</label>
                  <input type="time" value={addCheckOutTime} onChange={(e) => setAddCheckOutTime(e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Ghi chú</label>
                <input value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="..." style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setShowAddForm(false)} style={{ padding: "9px 18px", borderRadius: 10, background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}>Hủy</button>
                <button onClick={handleAdminSave} style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{editingRecordId ? "Lưu" : "Thêm"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
