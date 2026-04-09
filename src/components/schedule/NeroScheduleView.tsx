"use client";

import { useState, useMemo } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { ScheduleSlot } from "@/lib/types";
import {
  format, addDays, startOfMonth, endOfMonth,
  startOfWeek as sowFn, endOfWeek as eowFn,
  eachDayOfInterval, isSameMonth, isToday,
  addMonths, subMonths, addWeeks, subWeeks,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Edit3, Trash2,
  AlertCircle, Clock, CalendarDays, Save,
} from "lucide-react";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAY_FULL = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function NeroScheduleView() {
  const { currentUser } = useAuth();
  const { state, addScheduleSlot, updateScheduleSlot, deleteScheduleSlot, confirmBooking, rejectBooking } = useData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");

  const [selectedIdx, setSelectedIdx] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [mDate, setMDate] = useState("");
  const [mStart, setMStart] = useState("09:00");
  const [mEnd, setMEnd] = useState("10:00");
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mType, setMType] = useState<"busy" | "available">("available");

  // View days
  const days = useMemo(() => {
    if (view === "month") {
      const start = sowFn(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = eowFn(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = sowFn(currentDate, { weekStartsOn: 1 });
      const end = eowFn(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, view]);

  // Week days for mobile (always week view on mobile is usually better, but we'll use `days` and restrict it in mobile view later if needed - actually on mobile we can just show the current week of `currentDate`)
  const mobileWeekDays = useMemo(() => {
      const start = sowFn(currentDate, { weekStartsOn: 1 });
      const end = eowFn(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const visibleSlots = useMemo(() => {
    const start = days[0];
    const end = addDays(days[days.length - 1], 1);
    return state.schedules
      .filter((s) => {
        const d = new Date(s.date + "T00:00:00");
        return d >= start && d < end;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [state.schedules, days]);

  const pendingBookings = visibleSlots.filter((s) => s.bookingStatus === "pending");
  const selectedDate = format(mobileWeekDays[selectedIdx], "yyyy-MM-dd");
  const daySlots = state.schedules.filter((s) => s.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const goBack = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };
  const goForward = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const getUser = (id?: string) => state.users.find((u) => u.id === id);

  const openAdd = (date?: string) => {
    setEditSlot(null);
    setMDate(date || selectedDate);
    setMStart("09:00"); setMEnd("10:00"); setMTitle(""); setMDesc(""); setMType("available");
    setShowModal(true);
  };
  const openEdit = (slot: ScheduleSlot) => {
    setEditSlot(slot);
    setMDate(slot.date); setMStart(slot.startTime); setMEnd(slot.endTime);
    setMTitle(slot.title); setMDesc(slot.description || ""); setMType(slot.type);
    setShowModal(true);
  };
  const handleSave = () => {
    if (!mTitle.trim() || !mDate) return;
    if (editSlot) {
      updateScheduleSlot(editSlot.id, { date: mDate, startTime: mStart, endTime: mEnd, title: mTitle, description: mDesc, type: mType });
    } else {
      addScheduleSlot({ date: mDate, startTime: mStart, endTime: mEnd, title: mTitle, description: mDesc, type: mType });
    }
    setShowModal(false);
  };

  const slotColors = (slot: ScheduleSlot) => {
    if (slot.type === "busy") return { border: "rgba(239,68,68,0.3)", bg: "rgba(239,68,68,0.05)" };
    if (slot.bookingStatus === "pending") return { border: "rgba(245,158,11,0.4)", bg: "rgba(245,158,11,0.08)" };
    if (slot.bookingStatus === "confirmed") return { border: "rgba(59,130,246,0.3)", bg: "rgba(59,130,246,0.05)" };
    return { border: "rgba(16,185,129,0.3)", bg: "rgba(16,185,129,0.05)" };
  };
  const dotColor = (slot: ScheduleSlot) => {
    if (slot.type === "busy") return "#ef4444";
    if (slot.bookingStatus === "pending") return "#f59e0b";
    if (slot.bookingStatus === "confirmed") return "#3b82f6";
    return "#10b981";
  };
  const badgeText = (slot: ScheduleSlot) => {
    if (slot.type === "busy") return { label: "Bận", bg: "rgba(239,68,68,0.15)", color: "#ef4444" };
    if (slot.bookingStatus === "pending") return { label: "Chờ duyệt", bg: "rgba(245,158,11,0.15)", color: "#f59e0b", animate: true };
    if (slot.bookingStatus === "confirmed") return { label: "Đã đặt", bg: "rgba(59,130,246,0.15)", color: "#3b82f6" };
    if (slot.bookingStatus === "rejected") return { label: "Đã từ chối", bg: "rgba(107,114,128,0.15)", color: "#9ca3af" };
    return { label: "Trống", bg: "rgba(16,185,129,0.15)", color: "#10b981" };
  };

  const SlotCard = ({ slot, isCompact, isGrid }: { slot: ScheduleSlot; isCompact?: boolean, isGrid?: boolean }) => {
    const booker = getUser(slot.bookingUserId);
    const badge = badgeText(slot);
    const colors = slotColors(slot);
    
    // In compact month view, we show a simplified bar
    if (isCompact) {
      return (
        <div onClick={() => openEdit(slot)} style={{ 
          background: colors.bg, borderLeft: `3px solid ${colors.border}`, 
          padding: "4px 6px", borderRadius: 4, cursor: "pointer",
          display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: dotColor(slot) }}>{slot.startTime}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slot.title}</div>
        </div>
      );
    }

    // Weekly Grid Card (more condensed than full list)
    if (isGrid) {
      return (
        <div style={{ borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.bg, padding: "10px 10px", marginBottom: 8, transition: "all 0.2s" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {slot.startTime} – {slot.endTime}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => openEdit(slot)} style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Edit3 size={11} />
                </button>
                <button onClick={() => deleteScheduleSlot(slot.id)} style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
            <div>
              <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 6px", borderRadius: 8, background: badge.bg, color: badge.color, display: "inline-block" }}>
                {badge.label}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{slot.title}</div>
          
          {booker && (
             <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "white", flexShrink: 0, background: booker.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)" }}>
                  {booker.fullName.split(" ").slice(-1)[0].charAt(0)}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{booker.fullName}</span>
             </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.bg, padding: 16, marginBottom: 16, transition: "all 0.2s" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor(slot), flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {slot.startTime} – {slot.endTime}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 12, background: badge.bg, color: badge.color, display: "inline-block" }}>
              {badge.label}
            </span>
            <button onClick={() => openEdit(slot)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Edit3 size={13} />
            </button>
            <button onClick={() => deleteScheduleSlot(slot.id)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: slot.description ? 6 : 0, lineHeight: 1.3 }}>{slot.title}</div>
        {slot.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{slot.description}</p>}

        {booker && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 12, marginTop: 12, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: slot.bookingRequest ? 10 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0, background: booker.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)" }}>
                {booker.fullName.split(" ").slice(-1)[0].charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{booker.fullName}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>{booker.department}</div>
              </div>
            </div>
            {slot.bookingRequest && (
              <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)", lineHeight: 1.5, borderLeft: "2px solid var(--border)", paddingLeft: 10, margin: 0, marginBottom: slot.bookingStatus === "pending" ? 10 : 0 }}>
                "{slot.bookingRequest}"
              </p>
            )}
            {slot.bookingStatus === "pending" && (
              <div style={{ display: "flex", gap: 8, paddingTop: slot.bookingRequest ? 0 : 10 }}>
                <button onClick={() => confirmBooking(slot.id)} style={{ flex: 1, height: 36, borderRadius: 10, background: "var(--accent-green)", color: "white", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                  <Check size={14} /> Xác nhận
                </button>
                <button onClick={() => rejectBooking(slot.id)} style={{ flex: 1, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                  <X size={14} /> Từ chối
                </button>
              </div>
            )}
            {slot.bookingStatus === "confirmed" && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent-green)", display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>✅ Đã xác nhận lịch hẹn</div>}
            {slot.bookingStatus === "rejected" && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>⛔ Đã từ chối, slot mở lại</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
            <CalendarDays color="var(--accent-blue)" size={24} /> Lịch của Nero
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500, margin: "4px 0 0" }}>Quản lý lịch trình & yêu cầu đặt lịch</p>
        </div>
        <button onClick={() => openAdd()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 14, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.25)" }}>
          <Plus size={18} /> Thêm slot
        </button>
      </div>

      {/* Week navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "space-between", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
        
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 10, padding: 4 }}>
            {(["month", "week"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", background: view === v ? "var(--bg-card)" : "transparent", color: view === v ? "var(--accent-blue)" : "var(--text-secondary)", boxShadow: view === v ? "0 2px 6px rgba(0,0,0,0.05)" : "none" }}>
                {v === "month" ? "Tháng" : "Tuần"}
              </button>
            ))}
          </div>
          <button onClick={goToday} style={{ padding: "0 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Hôm nay</button>
        </div>

        <div style={{ textAlign: "center", order: -1, width: "100%" }}>
           <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", textTransform: "capitalize" }}>
             {view === "month" ? format(currentDate, "MMMM yyyy", { locale: vi }) : `${format(days[0], "dd/MM")} – ${format(days[6], "dd/MM/yyyy")}`}
           </div>
           <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>
             {visibleSlots.length} slot · <span style={{ color: pendingBookings.length > 0 ? "#f59e0b" : "inherit" }}>{pendingBookings.length} chờ duyệt</span>
           </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={goBack} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}><ChevronLeft size={20} /></button>
          <button onClick={goForward} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Pending bookings alert panel */}
      {pendingBookings.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 16, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertCircle size={16} color="#f59e0b" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{pendingBookings.length} Yêu cầu đặt lịch chờ duyệt</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingBookings.map((slot) => {
              const booker = getUser(slot.bookingUserId);
              return (
                <div key={slot.id} style={{ background: "var(--bg-card)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{format(new Date(slot.date + "T00:00:00"), "EEE dd/MM", { locale: vi })} · {slot.startTime}–{slot.endTime}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4 }}>{booker?.fullName} — </div>
                    {slot.bookingRequest && <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4 }}>"{slot.bookingRequest}"</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => confirmBooking(slot.id)} style={{ height: 32, padding: "0 12px", borderRadius: 10, background: "var(--accent-green)", color: "white", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 4, border: "none", cursor: "pointer" }}><Check size={13} />OK</button>
                    <button onClick={() => rejectBooking(slot.id)} style={{ height: 32, padding: "0 12px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><X size={13} />Từ chối</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile: Day tab strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x lg:hidden">
        {mobileWeekDays.map((day, i) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const count = visibleSlots.filter(s => s.date === dayStr).length;
          const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
          return (
            <button key={i} onClick={() => setSelectedIdx(i)}
              className="flex-none snap-start flex flex-col items-center px-4 py-2.5 transition-all outline-none"
              style={{
                borderRadius: 16,
                border: selectedIdx === i ? "1px solid var(--accent-blue)" : "1px solid var(--border)",
                background: selectedIdx === i ? "var(--accent-blue)" : "var(--bg-card)",
                color: selectedIdx === i ? "white" : "var(--text-secondary)",
                boxShadow: selectedIdx === i ? "0 4px 12px rgba(59,130,246,0.25)" : "none",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{DAY_LABELS[i]}</span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, color: isToday && selectedIdx !== i ? "var(--accent-blue)" : "inherit" }}>{format(day, "dd")}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile: Day slot list */}
      <div className="lg:hidden" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 4 }}>
          {DAY_FULL[selectedIdx]}, {format(mobileWeekDays[selectedIdx], "dd/MM/yyyy")}
        </div>
        {daySlots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", borderRadius: 16, border: "2px dashed var(--border)", opacity: 0.4 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Không có lịch ngày này</div>
          </div>
        ) : (
          daySlots.map(slot => <SlotCard key={slot.id} slot={slot} />)
        )}
        <button onClick={() => openAdd(selectedDate)} style={{ width: "100%", padding: 12, borderRadius: 16, border: "2px dashed rgba(59,130,246,0.3)", background: "transparent", color: "var(--accent-blue)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
          <Plus size={16} /> Thêm slot cho ngày này
        </button>
      </div>

      {/* Desktop: Grid View (Month / Week) */}
      <div className="hidden lg:grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-[var(--border)]" style={{ background: "var(--border)" }}>
        {/* Header Days */}
        {DAY_LABELS.map((label) => (
          <div key={label} style={{ background: "var(--bg-secondary)", padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </div>
        ))}
        {/* Body Cells */}
        {days.map((day, i) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const slots = visibleSlots.filter((s) => s.date === dayStr);
          const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
          const isCurrentMonth = view === "week" || isSameMonth(day, currentDate);
          
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 6px", background: isToday ? "rgba(59,130,246,0.04)" : "var(--bg-card)", minHeight: view === "month" ? 100 : 200, opacity: isCurrentMonth ? 1 : 0.4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: isToday ? "var(--accent-blue)" : "transparent", color: isToday ? "white" : "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                  {format(day, "d")}
                </div>
                {(view === "week" || (isCurrentMonth && isToday)) && (
                   <button onClick={() => openAdd(dayStr)} style={{ width: 22, height: 22, borderRadius: 6, background: "transparent", border: "1px dashed rgba(59,130,246,0.3)", color: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.6 }} title="Thêm slot">
                     <Plus size={11} />
                   </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, overflowY: "auto" }}>
                {slots.slice(0, view === "month" ? 4 : 10).map((slot) => (
                  <SlotCard 
                    key={slot.id} 
                    slot={slot} 
                    isCompact={view === "month"} 
                    isGrid={view === "week"} 
                  />
                ))}
                {view === "month" && slots.length > 4 && (
                  <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-secondary)", textAlign: "center", padding: "2px 0", cursor: "pointer" }} onClick={() => setView("week")}>+{slots.length - 4} nữa</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Slot Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-card)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{editSlot ? "Cập nhật slot" : "Tạo slot mới"}</h3>
              <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Type Toggle */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Loại slot *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["available", "busy"] as const).map((t) => (
                    <button key={t} onClick={() => setMType(t)} style={{ padding: 14, borderRadius: 14, border: "1px solid", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.2s", background: mType === t ? (t === "available" ? "var(--accent-green)" : "#ef4444") : "var(--bg-secondary)", color: mType === t ? "white" : "var(--text-muted)", borderColor: mType === t ? (t === "available" ? "var(--accent-green)" : "#ef4444") : "var(--border)" }}>
                      {t === "available" ? "🟢 Mở đặt lịch" : "🔴 Bận riêng"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Tiêu đề *</label>
                <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="VD: Họp chiến lược Q2..." style={{ width: "100%", height: 46, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: "0 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Mô tả nội dung (ẩn với nhân viên)</label>
                <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={3} placeholder="Ghi chú nội dung chi tiết..." style={{ width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, fontSize: 14, color: "var(--text-primary)", outline: "none", resize: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Ngày</label>
                  <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} style={{ width: "100%", height: 46, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: "0 12px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Từ</label>
                  <input type="time" value={mStart} onChange={(e) => setMStart(e.target.value)} style={{ width: "100%", height: 46, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: "0 12px", fontSize: 14, fontWeight: 800, color: "var(--accent-blue)", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Đến</label>
                  <input type="time" value={mEnd} onChange={(e) => setMEnd(e.target.value)} style={{ width: "100%", height: 46, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: "0 12px", fontSize: 14, fontWeight: 800, color: "var(--accent-green)", outline: "none" }} />
                </div>
              </div>
            </div>

            <div style={{ padding: 24, background: "var(--bg-secondary)", borderTop: "1px solid var(--border)", display: "flex", gap: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, height: 48, borderRadius: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }}>Hủy</button>
              <button onClick={handleSave} disabled={!mTitle.trim()} style={{ flex: 2, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "white", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", opacity: !mTitle.trim() ? 0.5 : 1 }}>
                <Save size={18} /> {editSlot ? "Cập nhật" : "Tạo slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
