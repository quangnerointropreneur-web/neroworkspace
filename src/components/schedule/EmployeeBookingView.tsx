"use client";

import { useState, useMemo } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { ScheduleSlot } from "@/lib/types";
import { format, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, Check, Clock, CalendarCheck, Send } from "lucide-react";

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

export default function EmployeeBookingView() {
  const { currentUser } = useAuth();
  const { state, requestBooking, suggestBooking } = useData();
  const userId = currentUser?.id ?? "";

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });

  // Booking modal state
  const [bookingSlot, setBookingSlot] = useState<ScheduleSlot | null>(null);
  const [bookContent, setBookContent] = useState("");
  const [booked, setBooked] = useState(false);

  // Suggest slot state
  const [suggestModal, setSuggestModal] = useState(false);
  const [sDate, setSDate] = useState("");
  const [sStart, setSStart] = useState("09:00");
  const [sEnd, setSEnd] = useState("10:00");
  const [sContent, setSContent] = useState("");
  const [sError, setSError] = useState("");

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const weekSlots = useMemo(() => {
    const end = addDays(weekStart, 7);
    return state.schedules
      .filter((s) => {
        const d = new Date(s.date + "T00:00:00");
        return d >= weekStart && d < end;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [state.schedules, weekStart]);

  const selectedDate = format(weekDays[selectedIdx], "yyyy-MM-dd");
  const daySlots = weekSlots.filter((s) => s.date === selectedDate);

  const getSlotStatus = (slot: ScheduleSlot) => {
    if (slot.bookingUserId === userId && slot.bookingStatus === "confirmed") return "my-confirmed";
    if (slot.bookingUserId === userId && slot.bookingStatus === "pending") return "my-pending";
    if (slot.bookingUserId === userId && slot.bookingStatus === "rejected") return "free";
    if (slot.type === "busy") return "busy";
    if (slot.bookingStatus === "confirmed") return "busy";
    if (slot.bookingStatus === "pending" && slot.bookingUserId !== userId) return "busy"; 
    return "free";
  };

  const openBooking = (slot: ScheduleSlot) => {
    setBookingSlot(slot);
    setBookContent("");
    setBooked(false);
  };

  const submitBooking = () => {
    if (!bookingSlot || !bookContent.trim()) return;
    requestBooking(bookingSlot.id, userId, bookContent.trim());
    setBooked(true);
  };

  const submitSuggest = () => {
    setSError("");
    if (!sDate || !sStart || !sEnd || !sContent.trim()) { setSError("Vui lòng điền đầy đủ thông tin."); return; }
    if (sStart >= sEnd) { setSError("Giờ kết thúc phải sau giờ bắt đầu."); return; }
    
    suggestBooking({
      title: `Nhân viên đề xuất lịch`,
      date: sDate,
      startTime: sStart,
      endTime: sEnd,
      type: "available",
      bookingUserId: userId,
      bookingStatus: "pending",
      bookingRequest: sContent.trim(),
    });
    setSuggestModal(false);
  };

  const SlotCard = ({ slot }: { slot: ScheduleSlot }) => {
    const status = getSlotStatus(slot);

    if (status === "busy") {
      return (
        <div style={{ borderRadius: 16, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", padding: 16, display: "flex", alignItems: "center", gap: 12, opacity: 0.8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 28, borderRadius: 4, background: "rgba(239,68,68,0.6)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>{slot.startTime} – {slot.endTime}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(239,68,68,0.6)", marginTop: 2 }}>⛔ Bận — không thể đặt lịch</div>
          </div>
        </div>
      );
    }

    if (status === "my-confirmed") {
      return (
        <div style={{ borderRadius: 16, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)", padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em" }}>{slot.startTime} – {slot.endTime}</span>
            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, color: "#3b82f6", background: "rgba(59,130,246,0.15)", padding: "3px 8px", borderRadius: 12, textTransform: "uppercase" }}>✅ Đã xác nhận</span>
          </div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700, fontStyle: "italic", marginBottom: slot.bookingRequest ? 6 : 0 }}>Lịch hẹn của bạn đã được Nero xác nhận!</div>
          {slot.bookingRequest && <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", borderLeft: "2px solid rgba(59,130,246,0.3)", paddingLeft: 8, margin: 0 }}>"{slot.bookingRequest}"</p>}
        </div>
      );
    }

    if (status === "my-pending") {
      return (
        <div style={{ borderRadius: 16, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{slot.startTime} – {slot.endTime}</span>
            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "3px 8px", borderRadius: 12, textTransform: "uppercase" }}>⏳ Chờ duyệt</span>
          </div>
          <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, marginBottom: slot.bookingRequest ? 6 : 0 }}>Yêu cầu của bạn đang chờ Nero xác nhận.</div>
          {slot.bookingRequest && <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", borderLeft: "2px solid rgba(245,158,11,0.3)", paddingLeft: 8, margin: 0 }}>"{slot.bookingRequest}"</p>}
        </div>
      );
    }

    return (
      <div style={{ borderRadius: 16, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)", padding: 16, display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 8, height: 28, borderRadius: 4, background: "rgba(16,185,129,0.6)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>{slot.startTime} – {slot.endTime}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(16,185,129,0.7)", marginTop: 2 }}>🟢 Slot trống — có thể đặt lịch</div>
        </div>
        <button onClick={() => openBooking(slot)} style={{ flexShrink: 0, height: 36, padding: "0 16px", borderRadius: 12, background: "var(--accent-green)", color: "white", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.2)" }}>
          Đặt lịch
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
              <CalendarCheck color="var(--accent-green)" size={24} /> Đặt lịch Nero
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500, margin: "4px 0 0" }}>Đặt lịch gặp & xin hỗ trợ từ Nero</p>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, padding: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Clock size={18} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Hướng dẫn</div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
              Chọn ô <span style={{ color: "#10b981", fontWeight: 800 }}>🟢 Trống</span> để đặt lịch gặp Nero. Ô <span style={{ color: "#ef4444", fontWeight: 800 }}>⛔ Bận</span> không thể đặt. Lịch sẽ được xác nhận sau khi Nero duyệt.
            </p>
          </div>
        </div>

        {/* Week navigator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <button onClick={() => setWeekStart((d) => addDays(d, -7))} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}><ChevronLeft size={20} /></button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{format(weekDays[0], "dd/MM")} – {format(weekDays[6], "dd/MM/yyyy")}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>{weekSlots.filter((s) => getSlotStatus(s) === "free").length} slot có thể đặt</div>
          </div>
          <button onClick={() => setWeekStart((d) => addDays(d, 7))} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}><ChevronRight size={20} /></button>
        </div>

        {/* Mobile: Day tab strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x lg:hidden">
          {weekDays.map((day, i) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const freeCount = weekSlots.filter(s => s.date === dayStr && getSlotStatus(s) === "free").length;
            const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
            return (
              <button key={i} onClick={() => setSelectedIdx(i)}
                className="flex-none snap-start flex flex-col items-center px-4 py-2.5 transition-all outline-none"
                style={{
                  borderRadius: 16,
                  border: selectedIdx === i ? "1px solid var(--accent-green)" : "1px solid var(--border)",
                  background: selectedIdx === i ? "var(--accent-green)" : "var(--bg-card)",
                  color: selectedIdx === i ? "white" : "var(--text-secondary)",
                  boxShadow: selectedIdx === i ? "0 4px 12px rgba(16,185,129,0.2)" : "none",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{DAY_LABELS[i]}</span>
                <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, color: isToday && selectedIdx !== i ? "var(--accent-green)" : "inherit" }}>{format(day, "dd")}</span>
                {freeCount > 0 && <span style={{ fontSize: 9, fontWeight: 800, marginTop: 2, opacity: 0.9 }}>{freeCount} slot</span>}
              </button>
            );
          })}
        </div>

        {/* Mobile: Day slot list */}
        <div className="lg:hidden" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 4 }}>
            {DAY_FULL[selectedIdx]}, {format(weekDays[selectedIdx], "dd/MM/yyyy")}
          </div>
          {daySlots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", borderRadius: 16, border: "2px dashed var(--border)", opacity: 0.4 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Không có slot ngày này</div>
            </div>
          ) : (
            daySlots.map(slot => <SlotCard key={slot.id} slot={slot} />)
          )}
          <button onClick={() => { setSDate(selectedDate); setSuggestModal(true); setSContent(""); }} style={{ width: "100%", padding: 12, borderRadius: 16, border: "2px dashed rgba(16,185,129,0.3)", background: "var(--bg-card)", color: "var(--accent-green)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
            Đề xuất lịch giờ khác
          </button>
        </div>

        {/* Desktop: 7-column week grid */}
        <div className="hidden lg:grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const slots = weekSlots.filter((s) => s.date === dayStr);
            const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
            
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12, border: isToday ? "2px solid rgba(16,185,129,0.3)" : "none", borderRadius: 18, padding: isToday ? 8 : 0, background: isToday ? "rgba(16,185,129,0.05)" : "transparent" }}>
                <div style={{ textAlign: "center", padding: "10px 0", borderRadius: 12, border: "1px solid var(--border)", background: isToday ? "var(--accent-green)" : "var(--bg-card)", color: isToday ? "white" : "var(--text-muted)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{DAY_LABELS[i]}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{format(day, "dd")}</div>
                </div>
                {slots.length === 0 && <div style={{ textAlign: "center", padding: 24, fontSize: 11, color: "var(--text-muted)", opacity: 0.4, textTransform: "uppercase", fontWeight: 800 }}>Trống</div>}
                {slots.map((slot) => <SlotCard key={slot.id} slot={slot} />)}
                <button onClick={() => { setSDate(dayStr); setSuggestModal(true); setSContent(""); }} style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px dashed rgba(16,185,129,0.4)", background: "transparent", color: "var(--accent-green)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", marginTop: "auto" }}>
                  Đề xuất lịch
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Modal - Outside animation div */}
      {bookingSlot && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && setBookingSlot(null)}>
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-card)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
            <div style={{ height: 6, background: "linear-gradient(to right, #10b981, #14b8a6)" }} />
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Đặt lịch Nero</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700, margin: "4px 0 0" }}>{bookingSlot.startTime} – {bookingSlot.endTime} · {format(new Date(bookingSlot.date + "T00:00:00"), "EEE dd/MM", { locale: vi })}</p>
              </div>
              <button onClick={() => setBookingSlot(null)} style={{ width: 36, height: 36, borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>

            {!booked ? (
              <>
                <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Clock size={20} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>{bookingSlot.startTime} – {bookingSlot.endTime}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{format(new Date(bookingSlot.date + "T00:00:00"), "EEEE, dd/MM/yyyy", { locale: vi })}</div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Nội dung cần hỗ trợ *</label>
                    <textarea
                      value={bookContent}
                      onChange={(e) => setBookContent(e.target.value)}
                      rows={5}
                      placeholder="Mô tả chi tiết vấn đề / nội dung bạn cần Nero hỗ trợ trong buổi gặp này..."
                      style={{ width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, fontSize: 14, color: "var(--text-primary)", outline: "none", resize: "none" }}
                    />
                    <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 8 }}>💡 Nội dung này sẽ được gửi cho Nero để chuẩn bị trước.</p>
                  </div>
                </div>

                <div style={{ padding: 24, background: "var(--bg-secondary)", borderTop: "1px solid var(--border)", display: "flex", gap: 12 }}>
                  <button onClick={() => setBookingSlot(null)} style={{ flex: 1, height: 48, borderRadius: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }}>Hủy</button>
                  <button
                    onClick={submitBooking}
                    disabled={!bookContent.trim()}
                    style={{ flex: 2, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #10b981, #0d9488)", border: "none", color: "white", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", opacity: !bookContent.trim() ? 0.5 : 1 }}
                  >
                    <Send size={16} /> Order lịch
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={40} color="#10b981" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Đã gửi yêu cầu!</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>Nero sẽ xác nhận lịch hẹn sớm nhất có thể. Bạn sẽ nhận được thông báo khi lịch được duyệt.</p>
                <button onClick={() => setBookingSlot(null)} style={{ marginTop: 16, padding: "12px 32px", borderRadius: 14, background: "var(--accent-green)", color: "white", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.2)" }}>Đóng lại</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggest Modal - Outside animation div */}
      {suggestModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={(e) => e.target === e.currentTarget && setSuggestModal(false)}>
          <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-card)", borderRadius: 24, border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Đề xuất lịch mới</h3>
              <button onClick={() => setSuggestModal(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {sError && <div style={{ fontSize: 12, fontWeight: 700, color: "white", background: "#ef4444", padding: "8px 12px", borderRadius: 8 }}>{sError}</div>}
              
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Ngày hẹn</label>
                  <input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} style={{ width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", padding: "0 12px", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, outline: "none" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Từ giờ</label>
                  <input type="time" value={sStart} onChange={(e) => setSStart(e.target.value)} style={{ width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", padding: "0 12px", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Tới lúc</label>
                  <input type="time" value={sEnd} onChange={(e) => setSEnd(e.target.value)} style={{ width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", padding: "0 12px", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, outline: "none" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Nội dung hỗ trợ</label>
                <textarea
                  value={sContent}
                  onChange={(e) => setSContent(e.target.value)}
                  rows={4}
                  placeholder="Tôi cần hỗ trợ về..."
                  style={{ width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, fontSize: 14, color: "var(--text-primary)", outline: "none", resize: "none" }}
                />
              </div>

              <button onClick={submitSuggest} style={{ width: "100%", height: 48, borderRadius: 12, background: "linear-gradient(135deg, #10b981, #0d9488)", color: "white", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", border: "none", marginTop: 8 }}>
                <Send size={16} /> Đề xuất lịch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
