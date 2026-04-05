"use client";

import { useState, useMemo } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO, addWeeks, subWeeks,
  startOfWeek as sowFn, endOfWeek as eowFn,
} from "date-fns";
import { vi } from "date-fns/locale";
import { Task, Brand, User } from "@/lib/types";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface Props {
  tasks: Task[];
  brands: Brand[];
  users: User[];
  onTaskClick: (task: Task) => void;
}

const STATUS_COLOR: Record<string, string> = {
  todo: "#6b7280",
  inprogress: "#3b82f6",
  review: "#f59e0b",
  done: "#10b981",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Chờ xử lý",
  inprogress: "Đang thực hiện",
  review: "Chờ duyệt",
  done: "Hoàn thành",
};

type CalView = "month" | "week";

export default function TaskCalendarView({ tasks, brands, users, onTaskClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalView>("month");

  const getBrand = (id: string) => brands.find((b) => b.id === id);
  const getUsers = (ids: string[]) => (ids ?? []).map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];

  // Tasks indexed by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      const key = t.deadline.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    // Also index by startDate
    tasks.forEach((t) => {
      if (t.startDate && t.startDate !== t.deadline.split("T")[0]) {
        const key = t.startDate.split("T")[0];
        if (!map[key]) map[key] = [];
        if (!map[key].find((x) => x.id === t.id)) map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  // Month view days
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const start = sowFn(currentDate, { weekStartsOn: 1 });
    const end = eowFn(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const days = view === "month" ? monthDays : weekDays;
  const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const goBack = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };
  const goForward = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const headerLabel = view === "month"
    ? format(currentDate, "MMMM yyyy", { locale: vi })
    : `Tuần ${format(sowFn(currentDate, { weekStartsOn: 1 }), "dd/MM")} – ${format(eowFn(currentDate, { weekStartsOn: 1 }), "dd/MM/yyyy")}`;

  const maxPerCell = view === "month" ? 3 : 8;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      {/* Calendar Header */}
      <div style={{ padding: "14px 20px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={16} color="var(--accent-blue)" />
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", minWidth: 200 }}>
            {headerLabel}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {(["month", "week"] as CalView[]).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "5px 12px", border: "none", background: view === v ? "var(--accent-blue)" : "transparent", color: view === v ? "white" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {v === "month" ? "Tháng" : "Tuần"}
              </button>
            ))}
          </div>

          <button onClick={goToday} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Hôm nay
          </button>
          <button onClick={goBack} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={goForward} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(7, 1fr)`, borderBottom: "1px solid var(--border)" }}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} style={{
            padding: "8px 4px",
            textAlign: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            borderRight: "1px solid var(--border)",
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(7, 1fr)` }}>
        {days.map((day, i) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDate[dateKey] ?? [];
          const isCurrentMonth = view === "week" || isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const overflowCount = dayTasks.length > maxPerCell ? dayTasks.length - maxPerCell : 0;
          const visibleTasks = dayTasks.slice(0, maxPerCell);

          return (
            <div
              key={dateKey}
              style={{
                minHeight: view === "month" ? 110 : 180,
                padding: view === "month" ? "6px 6px" : "8px 8px",
                background: isCurrentDay ? "rgba(59,130,246,0.06)" : isWeekend ? "var(--bg-secondary)" : "var(--bg-card)",
                borderRight: "1px solid var(--border)",
                borderBottom: (i < days.length - 7) ? "1px solid var(--border)" : "none",
                opacity: isCurrentMonth ? 1 : 0.45,
                position: "relative",
              }}
            >
              {/* Day number */}
              <div style={{ marginBottom: 5, textAlign: "center" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: isCurrentDay ? "var(--accent-blue)" : "transparent",
                  color: isCurrentDay ? "white" : isWeekend ? "var(--accent-red)" : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: isCurrentDay ? 700 : 500,
                }}>
                  {format(day, "d")}
                </span>
              </div>

              {/* Tasks */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {visibleTasks.map((task) => {
                  const brand = getBrand(task.brandId);
                  const color = brand?.color ?? STATUS_COLOR[task.status];
                  const isDeadline = format(parseISO(task.deadline), "yyyy-MM-dd") === dateKey;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      title={`${task.title} — ${STATUS_LABEL[task.status]}`}
                      style={{
                        padding: view === "month" ? "2px 5px" : "4px 7px",
                        borderRadius: 4,
                        background: isDeadline ? color : `${color}22`,
                        border: `1px solid ${color}${isDeadline ? "cc" : "44"}`,
                        color: isDeadline ? "white" : color,
                        fontSize: view === "month" ? 10 : 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.4,
                        transition: "opacity 0.15s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.transform = "scale(1.01)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      {isDeadline && "⚑ "}{task.title}
                    </div>
                  );
                })}

                {overflowCount > 0 && (
                  <div style={{ fontSize: 10, color: "var(--accent-blue)", fontWeight: 600, paddingLeft: 4, cursor: "pointer" }}>
                    +{overflowCount} task khác
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 14, flexWrap: "wrap", background: "var(--bg-secondary)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginRight: 4 }}>Chú thích:</span>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLOR[k] }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>⚑ = Deadline ngày đó</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)"}}>Ô nhạt = Ngày bắt đầu</span>
        </div>
      </div>
    </div>
  );
}
