"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { useAuth, useData } from "@/context/AppContext";
import { Deal, DealStage } from "@/lib/types";
import { Building2, Plus, UserRound, X } from "lucide-react";

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "lead",        label: "Tiếp cận",         color: "#94a3b8" },
  { id: "qualified",   label: "Đủ tiêu chuẩn",   color: "#6366f1" },
  { id: "proposal",    label: "Đề xuất",          color: "#8b5cf6" },
  { id: "negotiation", label: "Đàm phán",          color: "#f59e0b" },
  { id: "closed_won",  label: "Chốt thành công", color: "#10b981" },
  { id: "closed_lost", label: "Không thành công", color: "#ef4444" },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export default function PipelinePage() {
  const { currentUser } = useAuth();
  const { state, addDeal, updateDeal, deleteDeal, updateDealStage } = useData();
  const isSupervisor = currentUser?.role === "admin" || currentUser?.role === "assistant";
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);

  const visibleDeals = useMemo(() => {
    const uid = currentUser?.id ?? "";
    return state.deals.filter((deal) => isSupervisor || deal.ownerId === uid);
  }, [state.deals, currentUser?.id, isSupervisor]);

  const totals = useMemo(() => {
    const openDeals = visibleDeals.filter((deal) => deal.stage !== "closed_won" && deal.stage !== "closed_lost");
    return {
      openCount: openDeals.length,
      openValue: openDeals.reduce((sum, deal) => sum + deal.value, 0),
    };
  }, [visibleDeals]);

  const byStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>();
    STAGES.forEach((stage) => map.set(stage.id, []));
    visibleDeals.forEach((deal) => map.get(deal.stage)?.push(deal));
    return map;
  }, [visibleDeals]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const nextStage = result.destination.droppableId as DealStage;
    const deal = visibleDeals.find((item) => item.id === result.draggableId);
    if (deal && deal.stage !== nextStage) updateDealStage(deal.id, nextStage);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setModalOpen(true);
  };

  return (
    <>
      <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Phễu bán hàng</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{totals.openCount} cơ hội đang mở &middot; tổng giá trị {totals.openValue.toLocaleString("vi-VN")}đ</p>
          </div>
          <button onClick={openCreate} style={primaryButton}>
            <Plus size={18} /> Thêm cơ hội
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(260px, 1fr))", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
            {STAGES.map((stage) => {
              const deals = byStage.get(stage.id) ?? [];
              const total = deals.reduce((sum, deal) => sum + deal.value, 0);
              return (
                <div key={stage.id} style={{ minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: stage.color }} />
                      <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>{stage.label}</span>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{deals.length} · {money(total)}</span>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: 560,
                          borderRadius: 18,
                          border: `1px dashed ${snapshot.isDraggingOver ? stage.color : "var(--border)"}`,
                          background: snapshot.isDraggingOver ? `${stage.color}12` : "rgba(255,255,255,0.02)",
                          padding: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {deals.length === 0 && (
                          <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "36px 0" }}>Chưa có cơ hội</div>
                        )}
                        {deals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => openEdit(deal)}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  ...dealCard,
                                  transform: dragSnapshot.isDragging
                                    ? `${dragProvided.draggableProps.style?.transform ?? ""} rotate(1deg)`
                                    : dragProvided.draggableProps.style?.transform,
                                  boxShadow: dragSnapshot.isDragging ? "0 18px 40px rgba(0,0,0,0.22)" : "var(--shadow)",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                                  <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, lineHeight: 1.35 }}>{deal.name}</h3>
                                  <span style={{ color: "var(--accent-green)", fontWeight: 900 }}>{money(deal.value)}</span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12, color: "var(--text-secondary)", fontSize: 13 }}>
                                  <span style={metaRow}><UserRound size={14} /> {state.contacts.find((contact) => contact.id === deal.contactId)?.fullName ?? "Unknown contact"}</span>
                                  <span style={metaRow}><Building2 size={14} /> {deal.company}</span>
                                </div>
                                <div style={{ marginTop: 14 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ height: 7, flex: 1, borderRadius: 999, background: "var(--bg-secondary)", overflow: "hidden" }}>
                                      <div style={{ width: `${deal.probability}%`, height: "100%", background: stage.color }} />
                                    </div>
                                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{deal.probability}%</span>
                                  </div>
                                  {deal.notes && <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", lineHeight: 1.55 }}>{deal.notes}</p>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {modalOpen && (
        <DealModal
          deal={editing}
          contacts={state.contacts}
          users={state.users}
          brands={state.brands}
          projects={state.projects}
          currentUserId={currentUser?.id ?? ""}
          onClose={() => setModalOpen(false)}
          onSave={(payload) => {
            if (editing) updateDeal(editing.id, payload);
            else addDeal(payload);
            setModalOpen(false);
          }}
          onDelete={editing ? () => { deleteDeal(editing.id); setModalOpen(false); } : undefined}
        />
      )}
    </>
  );
}

function DealModal({
  deal,
  contacts,
  users,
  brands,
  projects,
  currentUserId,
  onClose,
  onSave,
  onDelete,
}: {
  deal: Deal | null;
  contacts: { id: string; fullName: string; company: string; brandId?: string }[];
  users: { id: string; fullName: string }[];
  brands: { id: string; name: string }[];
  projects: { id: string; name: string; brandId: string }[];
  currentUserId: string;
  onClose: () => void;
  onSave: (deal: Omit<Deal, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(deal?.name ?? "");
  const [contactId, setContactId] = useState(deal?.contactId ?? contacts[0]?.id ?? "");
  const selectedContact = contacts.find((contact) => contact.id === contactId);
  const [company, setCompany] = useState(deal?.company ?? selectedContact?.company ?? "");
  const [value, setValue] = useState(deal?.value ?? 0);
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? "lead");
  const [probability, setProbability] = useState(deal?.probability ?? 25);
  const [ownerId, setOwnerId] = useState(deal?.ownerId ?? currentUserId);
  const [brandId, setBrandId] = useState(deal?.brandId ?? selectedContact?.brandId ?? "");
  const [projectId, setProjectId] = useState(deal?.projectId ?? "");
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal?.expectedCloseDate ?? "");
  const [notes, setNotes] = useState(deal?.notes ?? "");

  const save = () => {
    if (!name.trim() || !contactId) return;
    onSave({ name, contactId, company, value, stage, probability, ownerId, brandId: brandId || undefined, projectId: projectId || undefined, expectedCloseDate, notes, closedAt: deal?.closedAt });
  };

  return (
    <div style={overlay} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="animate-scaleIn" style={modal}>
        <div style={modalHeader}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{deal ? "Chỉnh sửa cơ hội" : "Thêm cơ hội mới"}</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Giá trị, xác suất và giai đoạn trong phễu bán hàng</p>
          </div>
          <button onClick={onClose} style={iconButton}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tên cơ hội" value={name} onChange={setName} />
          <Select label="Khách hàng" value={contactId} onChange={(next) => { setContactId(next); setCompany(contacts.find((contact) => contact.id === next)?.company ?? company); }} options={contacts.map((contact) => ({ value: contact.id, label: contact.fullName }))} />
          <Field label="Công ty" value={company} onChange={setCompany} />
          <Field label="Giá trị" type="number" value={String(value)} onChange={(next) => setValue(Number(next) || 0)} />
          <Select label="Giai đoạn" value={stage} onChange={(next) => setStage(next as DealStage)} options={STAGES.map((item) => ({ value: item.id, label: item.label }))} />
          <Field label="Xác suất (%)" type="number" value={String(probability)} onChange={(next) => setProbability(Math.max(0, Math.min(100, Number(next) || 0)))} />
          <Select label="Phụ trách" value={ownerId} onChange={setOwnerId} options={users.map((user) => ({ value: user.id, label: user.fullName }))} />
          <Select label="Brand" value={brandId} onChange={setBrandId} options={[{ value: "", label: "Không chọn" }, ...brands.map((brand) => ({ value: brand.id, label: brand.name }))]} />
          <Select label="Dự án" value={projectId} onChange={setProjectId} options={[{ value: "", label: "Không chọn" }, ...projects.filter((project) => !brandId || project.brandId === brandId).map((project) => ({ value: project.id, label: project.name }))]} />
          <Field label="Dự kiến chốt" type="date" value={expectedCloseDate} onChange={setExpectedCloseDate} />
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Ghi chú</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>
        <div style={modalFooter}>
          {onDelete && <button onClick={onDelete} style={dangerButton}>Xóa</button>}
          <button onClick={onClose} style={secondaryButton}>Hủy</button>
          <button onClick={save} style={primaryButton}>Lưu cơ hội</button>
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
const dangerButton: React.CSSProperties = { ...secondaryButton, marginRight: "auto", color: "#ef4444", background: "rgba(239,68,68,0.08)" };
const dealCard: React.CSSProperties = { padding: 18, borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer" };
const metaRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modal: React.CSSProperties = { width: "100%", maxWidth: 720, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 22, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.45)" };
const modalHeader: React.CSSProperties = { padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const modalFooter: React.CSSProperties = { padding: 20, borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" };
const iconButton: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" };
