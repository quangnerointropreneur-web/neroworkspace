"use client";

import { useMemo, useState } from "react";
import { useAuth, useData } from "@/context/AppContext";
import { Account } from "@/lib/types";
import { canAccessBrand, getVisibleBrands } from "@/lib/permissions";
import { Check, Copy, ExternalLink, Plus, Save, Trash2, X } from "lucide-react";

type AccountDraft = {
  brandId: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

const emptyDraft: AccountDraft = {
  brandId: "",
  username: "",
  password: "",
  url: "",
  notes: "",
};

export default function AccountsPage() {
  const { state, addAccount, updateAccount, deleteAccount } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "assistant";
  const visibleBrands = useMemo(() => getVisibleBrands(state.brands, currentUser), [state.brands, currentUser]);

  const [brandFilter, setBrandFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newRow, setNewRow] = useState<AccountDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<AccountDraft>(emptyDraft);

  function getBrandName(brandId?: string) {
    return state.brands.find((brand) => brand.id === brandId)?.name ?? "";
  }

  const query = search.trim().toLowerCase();
  const accounts = state.accounts
    .filter((account) => canAccessBrand(currentUser, account.brandId))
    .filter((account) => brandFilter === "all" || account.brandId === brandFilter)
    .filter((account) => {
      if (!query) return true;
      return [account.username, account.password, account.url, account.notes, getBrandName(account.brandId)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    })
    .sort((a, b) => (getBrandName(a.brandId) || "").localeCompare(getBrandName(b.brandId) || "") || a.username.localeCompare(b.username));

  const toDraft = (account: Account): AccountDraft => ({
    brandId: account.brandId ?? "",
    username: account.username,
    password: account.password,
    url: account.url ?? "",
    notes: account.notes ?? "",
  });

  const toAccountData = (draft: AccountDraft): Omit<Account, "id" | "createdAt"> => ({
    name: draft.username || "Account",
    platform: "Account",
    category: "other",
    username: draft.username,
    password: draft.password,
    url: draft.url,
    notes: draft.notes,
    ...(draft.brandId ? { brandId: draft.brandId } : {}),
  });

  const addRow = () => {
    if (!newRow.username.trim() && !newRow.password.trim() && !newRow.url.trim()) return;
    if (newRow.brandId && !canAccessBrand(currentUser, newRow.brandId)) return;
    addAccount(toAccountData(newRow));
    setNewRow(emptyDraft);
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setEditingRow(toDraft(account));
  };

  const saveEdit = (id: string) => {
    if (editingRow.brandId && !canAccessBrand(currentUser, editingRow.brandId)) return;
    updateAccount(id, toAccountData(editingRow));
    setEditingId(null);
    setEditingRow(emptyDraft);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingRow(emptyDraft);
  };

  const copy = (value: string) => {
    if (value) navigator.clipboard.writeText(value);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 140,
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    padding: "8px 10px",
    outline: "none",
    fontSize: 13,
    fontFamily: "inherit",
  };

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 850, color: "var(--text-primary)", marginBottom: 4 }}>Tài khoản</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Bảng nhập nhanh theo dòng: STT, Brand, ID, Pass, Link, Note.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm ID, link, note..."
            style={{ ...inputStyle, width: 240 }}
          />
          <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} style={{ ...inputStyle, width: 180, cursor: "pointer" }}>
            <option value="all">Tất cả Brand</option>
            {visibleBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <Th width={58}>STT</Th>
                <Th width={190}>Brand</Th>
                <Th>ID</Th>
                <Th>Pass</Th>
                <Th>Link</Th>
                <Th>Note</Th>
                <Th width={132}>Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {isAdmin && (
                <tr style={{ borderTop: "1px solid var(--border)", background: "rgba(59,130,246,0.035)" }}>
                  <Td muted>+</Td>
                  <Td>
                    <select value={newRow.brandId} onChange={(event) => setNewRow((row) => ({ ...row, brandId: event.target.value }))} style={{ ...inputStyle, minWidth: 170 }}>
                      <option value="">Chung</option>
                      {visibleBrands.map((brand) => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                  </Td>
                  <Td><input value={newRow.username} onChange={(event) => setNewRow((row) => ({ ...row, username: event.target.value }))} placeholder="ID / Email" style={inputStyle} /></Td>
                  <Td><input value={newRow.password} onChange={(event) => setNewRow((row) => ({ ...row, password: event.target.value }))} placeholder="Password" style={inputStyle} /></Td>
                  <Td><input value={newRow.url} onChange={(event) => setNewRow((row) => ({ ...row, url: event.target.value }))} placeholder="https://..." style={inputStyle} /></Td>
                  <Td><textarea value={newRow.notes} onChange={(event) => setNewRow((row) => ({ ...row, notes: event.target.value }))} placeholder="Note" rows={1} style={{ ...inputStyle, resize: "vertical", minHeight: 38 }} /></Td>
                  <Td>
                    <button onClick={addRow} style={actionButtonStyle} title="Thêm dòng">
                      <Plus size={15} /> Thêm
                    </button>
                  </Td>
                </tr>
              )}

              {accounts.map((account, index) => {
                const isEditing = editingId === account.id;
                const row = isEditing ? editingRow : toDraft(account);
                return (
                  <tr key={account.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td muted>{index + 1}</Td>
                    <Td>
                      {isEditing ? (
                        <select value={row.brandId} onChange={(event) => setEditingRow((draft) => ({ ...draft, brandId: event.target.value }))} style={{ ...inputStyle, minWidth: 170 }}>
                          <option value="">Chung</option>
                          {visibleBrands.map((brand) => (
                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                          ))}
                        </select>
                      ) : (
                        <BrandPill label={getBrandName(account.brandId) || "Chung"} color={state.brands.find((brand) => brand.id === account.brandId)?.color} />
                      )}
                    </Td>
                    <Td>
                      {isEditing ? <input value={row.username} onChange={(event) => setEditingRow((draft) => ({ ...draft, username: event.target.value }))} style={inputStyle} /> : <CopyCell value={account.username} onCopy={copy} />}
                    </Td>
                    <Td>
                      {isEditing ? <input value={row.password} onChange={(event) => setEditingRow((draft) => ({ ...draft, password: event.target.value }))} style={inputStyle} /> : <CopyCell value={account.password} onCopy={copy} />}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input value={row.url} onChange={(event) => setEditingRow((draft) => ({ ...draft, url: event.target.value }))} style={inputStyle} />
                      ) : account.url ? (
                        <a href={account.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-blue)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", maxWidth: 220 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.url}</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>-</span>
                      )}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <textarea value={row.notes} onChange={(event) => setEditingRow((draft) => ({ ...draft, notes: event.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical", minHeight: 54 }} />
                      ) : (
                        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5 }}>{account.notes || "-"}</div>
                      )}
                    </Td>
                    <Td>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          {isEditing ? (
                            <>
                              <IconButton title="Lưu" onClick={() => saveEdit(account.id)} tone="green"><Check size={14} /></IconButton>
                              <IconButton title="Hủy" onClick={cancelEdit}><X size={14} /></IconButton>
                            </>
                          ) : (
                            <>
                              <IconButton title="Sửa" onClick={() => startEdit(account)}><Save size={14} /></IconButton>
                              <IconButton title="Xóa" onClick={() => deleteAccount(account.id)} tone="red"><Trash2 size={14} /></IconButton>
                            </>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {accounts.length === 0 && (
          <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            Chưa có tài khoản nào phù hợp.
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: number }) {
  return <th style={{ textAlign: "left", padding: "12px 14px", width }}>{children}</th>;
}

function Td({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <td style={{ padding: "10px 14px", verticalAlign: "top", color: muted ? "var(--text-muted)" : "var(--text-primary)", fontSize: 13 }}>{children}</td>;
}

function BrandPill({ label, color = "var(--text-muted)" }: { label: string; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

function CopyCell({ value, onCopy }: { value: string; onCopy: (value: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{value || "-"}</span>
      {value && (
        <button onClick={() => onCopy(value)} title="Copy" style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "flex" }}>
          <Copy size={12} />
        </button>
      )}
    </div>
  );
}

function IconButton({ children, onClick, title, tone = "neutral" }: { children: React.ReactNode; onClick: () => void; title: string; tone?: "neutral" | "green" | "red" }) {
  const color = tone === "green" ? "var(--accent-green)" : tone === "red" ? "var(--accent-red)" : "var(--text-secondary)";
  return (
    <button onClick={onClick} title={title} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );
}

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  color: "white",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};
