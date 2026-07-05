"use client";

import { useMemo, useState } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Contact, ContactStatus, LeadSource } from "@/lib/types";
import { Building2, Mail, Phone, Plus, Search, X } from "lucide-react";

const STATUS: Record<ContactStatus, { label: string; color: string }> = {
  new:       { label: "Mới",          color: "#6366f1" },
  active:    { label: "Hoạt động",    color: "#10b981" },
  nurturing: { label: "Chăm sóc",     color: "#f59e0b" },
  inactive:  { label: "Không hoạt động", color: "#94a3b8" },
  churned:   { label: "Mất khách",     color: "#ef4444" },
};

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "linkedin",     label: "LinkedIn" },
  { value: "referral",     label: "Giới thiệu" },
  { value: "website",      label: "Website" },
  { value: "event",        label: "Sự kiện" },
  { value: "cold_outreach",label: "Tiếp cận lạnh" },
  { value: "other",        label: "Khác" },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export default function ContactsPage() {
  const { currentUser } = useAuth();
  const { state, addContact, updateContact, deleteContact } = useData();
  const isSupervisor = currentUser?.role === "admin" || currentUser?.role === "assistant";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const visibleContacts = useMemo(() => {
    const uid = currentUser?.id ?? "";
    return state.contacts.filter((contact) => {
      const visible = isSupervisor || contact.ownerId === uid;
      const matchesQuery = `${contact.fullName} ${contact.company} ${contact.email}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
      return visible && matchesQuery && matchesStatus;
    });
  }, [state.contacts, currentUser?.id, isSupervisor, query, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setModalOpen(true);
  };

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Khách hàng</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{visibleContacts.length} liên hệ trong mạng lưới</p>
          </div>
          <button onClick={openCreate} style={primaryButton}>
            <Plus size={18} /> Thêm khách hàng
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm khách hàng..."
              style={{ width: "100%", padding: "14px 18px 14px 48px", borderRadius: 18, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", fontSize: 14 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["all", "new", "active", "nurturing", "inactive", "churned"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: statusFilter === status ? "var(--accent-blue)" : "var(--bg-card)",
                  color: statusFilter === status ? "white" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {status === "all" ? "Tất cả" : STATUS[status].label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {visibleContacts.map((contact) => {
            const status = STATUS[contact.status];
            return (
              <button key={contact.id} onClick={() => openEdit(contact)} style={cardButton}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
                    <div style={avatarStyle}>{initials(contact.fullName)}</div>
                    <div style={{ minWidth: 0, textAlign: "left" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.fullName}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{contact.title}</div>
                    </div>
                  </div>
                  <span style={{ color: status.color, fontSize: 12, fontWeight: 800 }}>{status.label}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, color: "var(--text-secondary)", fontSize: 13 }}>
                  <span style={metaRow}><Building2 size={14} /> {contact.company}</span>
                  <span style={metaRow}><Mail size={14} /> {contact.email}</span>
                  <span style={metaRow}><Phone size={14} /> {contact.phone}</span>
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{SOURCES.find((source) => source.value === contact.source)?.label}</span>
                  <span style={{ color: "var(--accent-green)", fontWeight: 900 }}>{contact.value ? money(contact.value) : ""}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <ContactModal
          contact={editing}
          users={state.users}
          brands={state.brands}
          currentUserId={currentUser?.id ?? ""}
          onClose={() => setModalOpen(false)}
          onSave={(payload) => {
            if (editing) updateContact(editing.id, payload);
            else addContact(payload);
            setModalOpen(false);
          }}
          onDelete={editing ? () => { deleteContact(editing.id); setModalOpen(false); } : undefined}
        />
      )}
    </>
  );
}

function ContactModal({
  contact,
  users,
  brands,
  currentUserId,
  onClose,
  onSave,
  onDelete,
}: {
  contact: Contact | null;
  users: { id: string; fullName: string }[];
  brands: { id: string; name: string }[];
  currentUserId: string;
  onClose: () => void;
  onSave: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: () => void;
}) {
  const [fullName, setFullName] = useState(contact?.fullName ?? "");
  const [title, setTitle] = useState(contact?.title ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [status, setStatus] = useState<ContactStatus>(contact?.status ?? "new");
  const [source, setSource] = useState<LeadSource>(contact?.source ?? "linkedin");
  const [value, setValue] = useState(contact?.value ?? 0);
  const [ownerId, setOwnerId] = useState(contact?.ownerId ?? currentUserId);
  const [brandId, setBrandId] = useState(contact?.brandId ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");

  const save = () => {
    if (!fullName.trim() || !company.trim()) return;
    onSave({ fullName, title, company, email, phone, status, source, value, ownerId, brandId: brandId || undefined, notes });
  };

  return (
    <div style={overlay} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="animate-scaleIn" style={modal}>
        <div style={modalHeader}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{contact ? "Chỉnh sửa khách hàng" : "Thêm khách hàng"}</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Thông tin liên hệ và phân công phụ trách</p>
          </div>
          <button onClick={onClose} style={iconButton}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Họ tên" value={fullName} onChange={setFullName} />
          <Field label="Chức vụ" value={title} onChange={setTitle} />
          <Field label="Công ty" value={company} onChange={setCompany} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Số điện thoại" value={phone} onChange={setPhone} />
          <Field label="Giá trị" type="number" value={String(value)} onChange={(next) => setValue(Number(next) || 0)} />
          <Select label="Trạng thái" value={status} onChange={(next) => setStatus(next as ContactStatus)} options={Object.entries(STATUS).map(([valueKey, config]) => ({ value: valueKey, label: config.label }))} />
          <Select label="Nguồn" value={source} onChange={(next) => setSource(next as LeadSource)} options={SOURCES} />
          <Select label="Phụ trách" value={ownerId} onChange={setOwnerId} options={users.map((user) => ({ value: user.id, label: user.fullName }))} />
          <Select label="Brand" value={brandId} onChange={setBrandId} options={[{ value: "", label: "Không chọn" }, ...brands.map((brand) => ({ value: brand.id, label: brand.name }))]} />
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Ghi chú</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>
        <div style={modalFooter}>
          {onDelete && <button onClick={onDelete} style={dangerButton}>Xóa</button>}
          <button onClick={onClose} style={secondaryButton}>Hủy</button>
          <button onClick={save} style={primaryButton}>Lưu khách hàng</button>
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

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(59,130,246,0.25)",
};

const secondaryButton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-secondary)",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  ...secondaryButton,
  marginRight: "auto",
  color: "#ef4444",
  background: "rgba(239,68,68,0.08)",
};

const cardButton: React.CSSProperties = {
  padding: 20,
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "var(--shadow)",
};

const avatarStyle: React.CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: 18,
  background: "var(--accent-blue-light)",
  color: "var(--accent-blue)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  flexShrink: 0,
};

const metaRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modal: React.CSSProperties = { width: "100%", maxWidth: 680, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 22, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.45)" };
const modalHeader: React.CSSProperties = { padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const modalFooter: React.CSSProperties = { padding: 20, borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" };
const iconButton: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" };
