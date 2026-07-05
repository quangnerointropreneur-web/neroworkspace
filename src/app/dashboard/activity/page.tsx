"use client";

import { useMemo, useState } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { CrmActivity, CrmActivityType } from "@/lib/types";
import { Calendar, CheckSquare, FileText, Mail, Phone, Plus, X } from "lucide-react";
import { format, parseISO } from "date-fns";

const TYPES: { value: CrmActivityType | "all"; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "all",     label: "Tất cả",     icon: null,                       color: "#3b82f6" },
  { value: "call",    label: "Gọi điện",   icon: <Phone size={15} />,        color: "#10b981" },
  { value: "email",   label: "Email",       icon: <Mail size={15} />,         color: "#6366f1" },
  { value: "meeting", label: "Cuộc họ p",  icon: <Calendar size={15} />,     color: "#8b5cf6" },
  { value: "note",    label: "Ghi chú",     icon: <FileText size={15} />,     color: "#f59e0b" },
  { value: "task",    label: "Công việc",   icon: <CheckSquare size={15} />,  color: "#ec4899" },
];

export default function ActivityPage() {
  const { currentUser } = useAuth();
  const { state, addCrmActivity, deleteCrmActivity } = useData();
  const isSupervisor = currentUser?.role === "admin" || currentUser?.role === "assistant";
  const [filter, setFilter] = useState<CrmActivityType | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);

  const activities = useMemo(() => {
    const uid = currentUser?.id ?? "";
    return state.crmActivities.filter((activity) => {
      const visible = isSupervisor || activity.userId === uid;
      return visible && (filter === "all" || activity.type === filter);
    });
  }, [state.crmActivities, currentUser?.id, isSupervisor, filter]);

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Hoạt động CRM</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{activities.length} tương tác đã ghi nhận</p>
          </div>
          <button onClick={() => setModalOpen(true)} style={primaryButton}>
            <Plus size={18} /> Ghi hoạt động
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: filter === type.value ? "var(--accent-blue)" : "var(--bg-card)",
                color: filter === type.value ? "white" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activities.map((activity) => {
            const type = TYPES.find((item) => item.value === activity.type) ?? TYPES[0];
            const contact = state.contacts.find((item) => item.id === activity.contactId);
            const deal = state.deals.find((item) => item.id === activity.dealId);
            return (
              <div key={activity.id} style={activityRow}>
                <div style={{ width: 34, height: 34, borderRadius: 12, background: `${type.color}15`, border: `1px solid ${type.color}40`, color: type.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {type.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 700, marginBottom: 6 }}>{activity.title}</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "var(--text-muted)", fontSize: 13 }}>
                    {contact && <span style={pill}>{contact.fullName}</span>}
                    {deal && <span style={{ ...pill, color: "var(--accent-blue)" }}>{deal.name}</span>}
                    <span>{format(parseISO(activity.date), "MMM d, h:mm a")}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{format(parseISO(activity.date), "MMM d")}</span>
                  {isSupervisor && <button onClick={() => deleteCrmActivity(activity.id)} style={textButton}>Xóa</button>}
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: 18, background: "var(--bg-card)" }}>Chưa có hoạt động nào</div>
          )}
        </div>
      </div>

      {modalOpen && (
        <ActivityModal
          contacts={state.contacts}
          deals={state.deals}
          brands={state.brands}
          currentUserId={currentUser?.id ?? ""}
          onClose={() => setModalOpen(false)}
          onSave={(payload) => {
            addCrmActivity(payload);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}

function ActivityModal({
  contacts,
  deals,
  brands,
  currentUserId,
  onClose,
  onSave,
}: {
  contacts: { id: string; fullName: string }[];
  deals: { id: string; name: string; brandId?: string; contactId: string }[];
  brands: { id: string; name: string }[];
  currentUserId: string;
  onClose: () => void;
  onSave: (activity: Omit<CrmActivity, "id" | "createdAt">) => void;
}) {
  const [type, setType] = useState<CrmActivityType>("call");
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [dealId, setDealId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");

  const save = () => {
    if (!title.trim()) return;
    onSave({ type, title, contactId: contactId || undefined, dealId: dealId || undefined, brandId: brandId || undefined, userId: currentUserId, date: new Date(date).toISOString(), note });
  };

  return (
    <div style={overlay} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="animate-scaleIn" style={modal}>
        <div style={modalHeader}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Ghi hoạt động</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Ghi nhận điểm tiếp xúc với khách hàng</p>
          </div>
          <button onClick={onClose} style={iconButton}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Loại" value={type} onChange={(next) => setType(next as CrmActivityType)} options={TYPES.filter((item) => item.value !== "all").map((item) => ({ value: item.value, label: item.label }))} />
          <Field label="Ngày giờ" type="datetime-local" value={date} onChange={setDate} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Tiêu đề" value={title} onChange={setTitle} />
          </div>
          <Select label="Khách hàng" value={contactId} onChange={setContactId} options={[{ value: "", label: "Không chọn" }, ...contacts.map((contact) => ({ value: contact.id, label: contact.fullName }))]} />
          <Select label="Cơ hội" value={dealId} onChange={(next) => { setDealId(next); setBrandId(deals.find((deal) => deal.id === next)?.brandId ?? brandId); }} options={[{ value: "", label: "Không chọn" }, ...deals.filter((deal) => !contactId || deal.contactId === contactId).map((deal) => ({ value: deal.id, label: deal.name }))]} />
          <Select label="Brand" value={brandId} onChange={setBrandId} options={[{ value: "", label: "Không chọn" }, ...brands.map((brand) => ({ value: brand.id, label: brand.name }))]} />
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Ghi chú</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>
        <div style={modalFooter}>
          <button onClick={onClose} style={secondaryButton}>Hủy</button>
          <button onClick={save} style={primaryButton}>Lưu hoạt động</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 20px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white", fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 22px rgba(59,130,246,0.25)" };
const secondaryButton: React.CSSProperties = { padding: "10px 18px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer" };
const activityRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg-card)", boxShadow: "var(--shadow)" };
const pill: React.CSSProperties = { padding: "3px 10px", borderRadius: 999, background: "var(--bg-secondary)", color: "var(--text-secondary)", fontWeight: 700 };
const textButton: React.CSSProperties = { border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontWeight: 700 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modal: React.CSSProperties = { width: "100%", maxWidth: 680, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 22, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.45)" };
const modalHeader: React.CSSProperties = { padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const modalFooter: React.CSSProperties = { padding: 20, borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" };
const iconButton: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" };
