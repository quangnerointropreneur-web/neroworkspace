"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useData } from "@/context/AppContext";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, DollarSign, Target, Users } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  lead: "#94a3b8",
  qualified: "#6366f1",
  proposal: "#8b5cf6",
  negotiation: "#f59e0b",
  closed_won: "#10b981",
  closed_lost: "#ef4444",
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export default function CrmReportPage() {
  const { currentUser } = useAuth();
  const { state } = useData();
  const router = useRouter();
  const isAdmin = currentUser?.role === "admin";

  const report = useMemo(() => {
    const openDeals = state.deals.filter((deal) => deal.stage !== "closed_won" && deal.stage !== "closed_lost");
    const wonDeals = state.deals.filter((deal) => deal.stage === "closed_won");
    const pipelineValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
    const revenueWon = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const avgProbability = openDeals.length ? Math.round(openDeals.reduce((sum, deal) => sum + deal.probability, 0) / openDeals.length) : 0;
    const winRate = state.deals.length ? Math.round((wonDeals.length / state.deals.length) * 100) : 0;

    const stageLabels: Record<string, string> = { lead: "Tiếp cận", qualified: "Đủ chuẩn", proposal: "Đề xuất", negotiation: "Đàm phán", closed_won: "Chốt", closed_lost: "Thất bại" };
    const stageData = Object.entries(STAGE_COLORS).map(([stage, color]) => {
      const deals = state.deals.filter((deal) => deal.stage === stage);
      return {
        stage: stageLabels[stage] ?? stage,
        value: deals.reduce((sum, deal) => sum + deal.value, 0),
        count: deals.length,
        color,
      };
    });

    const sourceLabels: Record<string, string> = { linkedin: "LinkedIn", referral: "Giới thiệu", website: "Website", event: "Sự kiện", cold_outreach: "Tiếp cận lạnh", other: "Khác" };
    const sourceData = ["linkedin", "referral", "website", "event", "cold_outreach", "other"].map((source) => ({
      source: sourceLabels[source] ?? source,
      count: state.contacts.filter((contact) => contact.source === source).length,
    }));

    const typeLabels: Record<string, string> = { call: "Gọi điện", email: "Email", meeting: "Cuộc họ p", note: "Ghi chú", task: "Công việc" };
    const activityData = ["call", "email", "meeting", "note", "task"].map((type) => ({
      type: typeLabels[type] ?? type,
      count: state.crmActivities.filter((activity) => activity.type === type).length,
    }));

    const revenueTrend = ["Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"].map((month, index) => ({
      month,
      revenue: index === 1 ? revenueWon : Math.round(revenueWon * (0.25 + index * 0.18)),
      forecast: Math.round(pipelineValue * (0.25 + index * 0.12)),
    }));

    return { openDeals, wonDeals, pipelineValue, revenueWon, avgProbability, winRate, stageData, sourceData, activityData, revenueTrend };
  }, [state.deals, state.contacts, state.crmActivities]);

  if (!isAdmin) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Báo cáo CRM</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Phân tích doanh số và hiệu suất bán hàng</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Giá trị Pipeline", value: money(report.pipelineValue), color: "#10b981", icon: <DollarSign size={18} /> },
          { label: "Doanh thu chốt",  value: money(report.revenueWon),   color: "#6366f1", icon: <Target size={18} /> },
          { label: "Tỷ lệ chốt",      value: `${report.winRate}%`,        color: "#8b5cf6", icon: <Activity size={18} /> },
          { label: "Khách hàng",      value: state.contacts.length,       color: "#06b6d4", icon: <Users size={18} /> },
        ].map((item) => (
          <div key={item.label} style={{ background: "var(--bg-card)", border: `1px solid ${item.color}30`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: item.color, marginBottom: 12 }}>
              {item.icon}
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>{item.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
        <Panel title="Xu hướng doanh thu" subtitle="Doanh thu chốt và dự báo">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={report.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Phân tích tỷ lệ chốt" subtitle="Hiệu suất chuyển đổi">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "center", height: 280 }}>
            <MetricDonut label="Tỷ lệ chốt" value={report.winRate} color="#10b981" />
            <MetricDonut label="Xác suất TB" value={report.avgProbability} color="#6366f1" />
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <Panel title="Phễu theo giai đoạn" subtitle="Phân bổ giá trị cơ hội">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.stageData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="stage" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {report.stageData.map((entry) => <Cell key={entry.stage} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Nguồn khách hàng" subtitle="Khách hàng đến từ đâu">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.sourceData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="source" type="category" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Hoạt động theo loại" subtitle="Phân bố tương tác của team">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.activityData}>
              <XAxis dataKey="type" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, minHeight: 320 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{title}</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 18 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function MetricDonut({ label, value, color }: { label: string; value: number; color: string }) {
  const data = [
    { name: "value", value },
    { name: "rest", value: 100 - value },
  ];
  return (
    <div style={{ textAlign: "center" }}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={54} outerRadius={74} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={color} />
            <Cell fill="var(--bg-secondary)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -108, marginBottom: 70, color, fontSize: 26, fontWeight: 900 }}>{value}%</div>
      <div style={{ color: "var(--text-secondary)", fontWeight: 800, fontSize: 13 }}>{label}</div>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text-primary)",
};
