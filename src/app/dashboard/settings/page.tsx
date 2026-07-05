"use client";

import { useState } from "react";
import { useData } from "@/context/AppContext";
import { Bell, Send, Info, Save, ToggleLeft, ToggleRight, MessageCircle, ShieldCheck, Users } from "lucide-react";

export default function SettingsPage() {
  const { state, updateSettings } = useData();
  const [token, setToken] = useState(state.settings.telegramBotToken || "");
  const [chatId, setChatId] = useState(state.settings.telegramChatId || "");
  const [adminToken, setAdminToken] = useState(state.settings.adminTelegramBotToken || "");
  const [adminChatId, setAdminChatId] = useState(state.settings.adminTelegramChatId || "");
  const [enabled, setEnabled] = useState(state.settings.enableTelegram || false);
  const [saving, setSaving] = useState(false);
  
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [adminTestStatus, setAdminTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        telegramBotToken: token.trim(),
        telegramChatId: chatId.trim(),
        adminTelegramBotToken: adminToken.trim(),
        adminTelegramChatId: adminChatId.trim(),
        enableTelegram: enabled
      });
      alert("Đã lưu cấu hình thành công!");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi lưu.");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (type: "group" | "admin") => {
    const t = type === "group" ? token : adminToken;
    const cid = type === "group" ? chatId : adminChatId;
    const setStatus = type === "group" ? setTestStatus : setAdminTestStatus;

    if (!t || !cid) {
      alert("Vui lòng nhập Token và Chat ID trước khi test.");
      return;
    }
    
    setStatus("sending");
    try {
      const res = await fetch(`https://api.telegram.org/bot${t.trim()}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cid.trim(),
          text: `🚀 *Nero Workspace*: Kết nối Bot ${type === 'group' ? 'Nhóm' : 'Admin'} thành công!`,
          parse_mode: "Markdown"
        })
      });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        throw new Error("Failed");
      }
    } catch (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="animate-fadeIn max-w-5xl mx-auto py-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
            Cấu hình hệ thống
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Quản lý các kết nối Telegram và cài đặt thông báo.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card)", padding: "10px 20px", borderRadius: 12, border: "1px solid var(--border)" }}>
           <span style={{ fontSize: 14, fontWeight: 600 }}>Kích hoạt Telegram</span>
           <button 
            onClick={() => setEnabled(!enabled)}
            style={{ background: "none", border: "none", cursor: "pointer", color: enabled ? "var(--accent-blue)" : "var(--text-muted)", display: "flex" }}
          >
            {enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Group Bot Configuration */}
        <div style={{ 
          background: "var(--bg-card)", 
          borderRadius: 20, 
          border: "1px solid var(--border)",
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Bot Thông Báo Nhóm</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Giao task, bản tin sáng/đêm</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Group Bot Token</label>
              <input 
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token từ BotFather..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Group Chat ID</label>
              <input 
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Ví dụ: -100123456789"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
              />
            </div>
            <button
              onClick={() => testConnection("group")}
              disabled={testStatus === "sending"}
              style={{
                width: "100%", padding: "10px", borderRadius: 10,
                background: testStatus === "success" ? "#10b981" : testStatus === "error" ? "#ef4444" : "var(--bg-hover)",
                border: "1px solid var(--border)", color: testStatus === "idle" ? "var(--text-primary)" : "white",
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <MessageCircle size={16} />
              {testStatus === "sending" ? "Đang gửi..." : testStatus === "success" ? "Thành công!" : testStatus === "error" ? "Thất bại" : "Kiểm tra Bot Nhóm"}
            </button>
          </div>
        </div>

        {/* Admin Bot Configuration */}
        <div style={{ 
          background: "var(--bg-card)", 
          borderRadius: 20, 
          border: "1px solid var(--border)",
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.1)", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Bot Riêng Admin</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Thông báo thay đổi, cập nhật task</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Admin Bot Token</label>
              <input 
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Token từ BotFather..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Admin Chat ID</label>
              <input 
                type="text"
                value={adminChatId}
                onChange={(e) => setAdminChatId(e.target.value)}
                placeholder="ID cá nhân của bạn..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
              />
            </div>
            <button
              onClick={() => testConnection("admin")}
              disabled={adminTestStatus === "sending"}
              style={{
                width: "100%", padding: "10px", borderRadius: 10,
                background: adminTestStatus === "success" ? "#10b981" : adminTestStatus === "error" ? "#ef4444" : "var(--bg-hover)",
                border: "1px solid var(--border)", color: adminTestStatus === "idle" ? "var(--text-primary)" : "white",
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <MessageCircle size={16} />
              {adminTestStatus === "sending" ? "Đang gửi..." : adminTestStatus === "success" ? "Thành công!" : adminTestStatus === "error" ? "Thất bại" : "Kiểm tra Bot Admin"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        background: "rgba(59,130,246,0.05)", 
        borderRadius: 16, 
        padding: 20, 
        marginTop: 30,
        border: "1px dashed rgba(59,130,246,0.2)"
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-blue)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={16} /> Lưu ý quan trọng
        </h3>
        <ul style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 8, paddingLeft: 20 }}>
          <li>• <b>Bot Nhóm:</b> Dùng để thông báo cho toàn bộ thành viên trong Group. Phải thêm Bot này vào nhóm.</li>
          <li>• <b>Bot Admin:</b> Dùng để báo riêng cho bạn các thay đổi task. Bạn phải nhắn <code>/start</code> cho Bot này trước.</li>
          <li>• <b>ID Nhóm:</b> Thường bắt đầu bằng dấu trừ <code>-</code> (Ví dụ: <code>-100...</code>).</li>
          <li>• Đừng quên nhấn <b>Lưu cấu hình</b> ở dưới cùng sau khi nhập liệu xong.</li>
        </ul>
      </div>

      <div style={{ marginTop: 30, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 40px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            border: "none",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(59,130,246,0.3)"
          }}
        >
          <Save size={18} />
          {saving ? "Đang lưu..." : "Lưu toàn bộ cấu hình"}
        </button>
      </div>
    </div>
  );
}
