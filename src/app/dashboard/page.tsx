"use client";

import { useAuth, useData } from "@/context/AppContext";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckSquare, Clock, AlertTriangle, TrendingUp,
  ArrowRight, Users,
} from "lucide-react";
import { format, isPast, parseISO, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import TaskModal from "@/components/tasks/TaskModal";
import { Task } from "@/lib/types";
import { canAccessBrand } from "@/lib/permissions";

const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280", inprogress: "#3b82f6", review: "#f59e0b", done: "#10b981",
};
const STATUS_LABELS: Record<string, string> = {
  todo: "Chờ xử lý", inprogress: "Đang thực hiện", review: "Chờ duyệt", done: "Hoàn thành",
};

const SHOW_SALES_MANAGEMENT = false;

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { state } = useData();
  const isAdmin = currentUser?.role === "admin";
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const myTasks = useMemo(() => {
    const uid = currentUser?.id ?? "";
    const visibleTasks = state.tasks.filter((task) => canAccessBrand(currentUser, task.brandId));
    return isAdmin
      ? visibleTasks
      : visibleTasks.filter((t) => t.picIds?.includes(uid) || t.picId === uid || t.watcherIds?.includes(uid));
  }, [state.tasks, currentUser, isAdmin]);

  const stats = useMemo(() => {
    const total = myTasks.length;
    const done = myTasks.filter((t) => t.status === "done").length;
    const inProgress = myTasks.filter((t) => t.status === "inprogress").length;
    const overdue = myTasks.filter((t) => t.status !== "done" && isPast(parseISO(t.deadline))).length;
    const dueToday = myTasks.filter((t) => t.status !== "done" && isToday(parseISO(t.deadline))).length;
    return { total, done, inProgress, overdue, dueToday };
  }, [myTasks]);

  const recentTasks = useMemo(
    () => [...myTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [myTasks]
  );

  const crmStats = useMemo(() => {
    const uid = currentUser?.id ?? "";
    const contacts = isAdmin ? state.contacts : state.contacts.filter((contact) => contact.ownerId === uid);
    const deals = isAdmin ? state.deals : state.deals.filter((deal) => deal.ownerId === uid);
    const activities = isAdmin ? state.crmActivities : state.crmActivities.filter((activity) => activity.userId === uid);
    const openDeals = deals.filter((deal) => deal.stage !== "closed_won" && deal.stage !== "closed_lost");
    const wonDeals = deals.filter((deal) => deal.stage === "closed_won");
    const pipelineValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
    const revenueWon = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const winRate = deals.length ? Math.round((wonDeals.length / deals.length) * 100) : 0;
    return { contacts, deals, activities, openDeals, pipelineValue, revenueWon, winRate };
  }, [state.contacts, state.deals, state.crmActivities, currentUser, isAdmin]);

  const statCards = [
    { label: "Tổng công việc", value: stats.total, icon: CheckSquare, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    { label: "Đang thực hiện", value: stats.inProgress, icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { label: "Quá hạn", value: stats.overdue, icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    { label: "Hoàn thành", value: stats.done, icon: TrendingUp, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  ];

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Welcome */}
        <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
              👋 Xin chào, {currentUser?.fullName.split(" ").slice(-2).join(" ")}!
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              {format(new Date(), "EEEE, dd MMMM yyyy", { locale: vi })}
              {stats.dueToday > 0 && (
                <span style={{ marginLeft: 12, color: "#f59e0b", fontWeight: 600 }}>
                  • {stats.dueToday} task đến hạn hôm nay
                </span>
              )}
            </p>
          </div>
          <div style={{ fontSize: 48, lineHeight: 1, opacity: 0.8 }}>
            {isAdmin ? "🛡️" : "⚡"}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color={card.color} />
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 800, color: card.color }}>{card.value}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{card.label}</div>
              </div>
            );
          })}
        </div>

        {/* CRM overview */}
        {SHOW_SALES_MANAGEMENT && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>Quản lý Bán hàng</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Khách hàng, cơ hội và hoạt động</p>
            </div>
            <Link href="/dashboard/crm-report" style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}>
              Báo cáo CRM <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "Giá trị Pipeline", value: `${Math.round(crmStats.pipelineValue / 1000)}tr`, color: "#10b981", href: "/dashboard/pipeline" },
              { label: "Doanh thu chốt", value: `${Math.round(crmStats.revenueWon / 1000)}tr`, color: "#6366f1", href: "/dashboard/crm-report" },
              { label: "Cơ hội mở", value: crmStats.openDeals.length, color: "#8b5cf6", href: "/dashboard/pipeline" },
              { label: "Khách hàng", value: crmStats.contacts.length, color: "#06b6d4", href: "/dashboard/contacts" },
            ].map((item) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", display: "block" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                <div style={{ fontSize: 27, fontWeight: 900, color: item.color, marginTop: 7 }}>{item.value}</div>
              </Link>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 14, border: "1px solid var(--border)", padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 800 }}>Phễu theo giai đoạn</h4>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{crmStats.deals.length} cơ hội</span>
              </div>
              {["lead", "qualified", "proposal", "negotiation", "closed_won"].map((stage) => {
                const stageLabel: Record<string, string> = { lead: "Tiếp cận", qualified: "Đủ tiêu chuẩn", proposal: "Đề xuất", negotiation: "Đàm phán", closed_won: "Chốt thành công" };
                const count = crmStats.deals.filter((deal) => deal.stage === stage).length;
                const pct = crmStats.deals.length ? Math.round((count / crmStats.deals.length) * 100) : 0;
                return (
                  <div key={stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
                      <span>{stageLabel[stage]}</span>
                      <span>{count}</span>
                    </div>
                    <div style={{ height: 7, background: "var(--bg-card)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#3b82f6,#8b5cf6)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "var(--bg-secondary)", borderRadius: 14, border: "1px solid var(--border)", padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 800 }}>Hoạt động gần đây</h4>
                <Link href="/dashboard/activity" style={{ color: "var(--accent-blue)", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Xem tất cả</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {crmStats.activities.slice(0, 4).map((activity) => (
                  <div key={activity.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", flexShrink: 0, marginTop: 7 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activity.title}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{activity.type}</div>
                    </div>
                  </div>
                ))}
                {crmStats.activities.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Chưa có hoạt động nào.</div>}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Bottom grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          {/* Recent tasks */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Công việc gần đây</h3>
              <Link href="/dashboard/tasks" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-blue)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                Xem tất cả <ArrowRight size={14} />
              </Link>
            </div>
            <div>
              {recentTasks.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Chưa có công việc nào</div>
              ) : (
                recentTasks.map((task, i) => {
                  const brand = state.brands.find((b) => b.id === task.brandId);
                  const pics = (task.picIds ?? [task.picId ?? ""].filter(Boolean)).map((id) => state.users.find((u) => u.id === id)).filter(Boolean);
                  const isOverdue = task.status !== "done" && isPast(parseISO(task.deadline));
                  const doneSubCount = task.subTasks.filter((s) => s.status === "done").length;

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      style={{
                        padding: "14px 20px",
                        borderBottom: i < recentTasks.length - 1 ? "1px solid var(--border)" : "none",
                        display: "flex", alignItems: "flex-start", gap: 12,
                        transition: "background 0.15s", cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Brand accent bar */}
                      <div style={{ width: 4, height: 40, borderRadius: 2, background: brand?.color ?? "#3b82f6", flexShrink: 0, marginTop: 2 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title */}
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
                          {task.title}
                        </div>
                        {/* Meta */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                          {brand && <span style={{ color: brand.color, fontWeight: 600 }}>{brand.name}</span>}
                          <span>•</span>
                          <span style={{ color: isOverdue ? "var(--accent-red)" : "var(--text-muted)", fontWeight: isOverdue ? 600 : 400 }}>
                            {isOverdue ? "⚠ Quá hạn: " : ""}{format(parseISO(task.deadline), "dd/MM/yyyy")}
                          </span>
                          {task.subTasks.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{doneSubCount}/{task.subTasks.length} sub-tasks</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {/* PICs */}
                        <div style={{ display: "flex" }}>
                          {(pics as NonNullable<typeof pics[0]>[]).slice(0, 2).map((p, idx) => (
                            <div key={p!.id} style={{ width: 24, height: 24, borderRadius: 6, background: p!.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", marginLeft: idx > 0 ? -5 : 0, border: "1.5px solid var(--bg-card)" }} title={p!.fullName}>
                              {p!.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                        {/* Status badge */}
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: `${STATUS_COLORS[task.status]}18`, color: STATUS_COLORS[task.status], fontWeight: 600, border: `1px solid ${STATUS_COLORS[task.status]}40` }}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {isAdmin && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={15} /> Nhân sự
                  </h3>
                  <Link href="/dashboard/hr" style={{ color: "var(--accent-blue)", fontSize: 12, textDecoration: "none" }}>Quản lý →</Link>
                </div>
                {state.users.map((user) => {
                  const userTasks = state.tasks.filter((t) => t.picIds?.includes(user.id) || t.picId === user.id);
                  const activeTasks = userTasks.filter((t) => t.status !== "done").length;
                  return (
                    <div key={user.id} style={{ padding: "11px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: user.role === "admin" ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }}>
                        {user.fullName.split(" ").slice(-1)[0].charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.fullName}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.department}</div>
                      </div>
                      <span style={{ fontSize: 11, color: activeTasks > 0 ? "#f59e0b" : "#10b981", fontWeight: 600, background: activeTasks > 0 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${activeTasks > 0 ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>
                        {activeTasks} active
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* My progress (employee) */}
            {!isAdmin && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 20px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Tiến độ của tôi</h3>
                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                  const count = myTasks.filter((t) => t.status === status).length;
                  const total = myTasks.length || 1;
                  return (
                    <div key={status} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
                        <span style={{ fontSize: 12, color: STATUS_COLORS[status], fontWeight: 700 }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(count / total) * 100}%`, background: STATUS_COLORS[status], borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </>
  );
}
