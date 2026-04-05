"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AppContext";
import { Eye, EyeOff, Zap, Lock, User } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate network
    const success = login(username.trim(), password);
    if (success) {
      router.push("/dashboard");
    } else {
      setError("Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f1117 0%, #161b27 50%, #1a1040 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient blobs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          top: -200,
          left: -200,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
          bottom: -150,
          right: -150,
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        className="animate-scaleIn"
        style={{
          width: "100%",
          maxWidth: 440,
          margin: "0 20px",
          background: "rgba(30, 37, 53, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "48px 40px",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(59,130,246,0.4)",
            }}
          >
            <Zap size={30} color="white" />
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#e2e8f0",
              marginBottom: 6,
              letterSpacing: "-0.5px",
            }}
          >
            Nero Ops
          </h1>
          <p style={{ fontSize: 14, color: "#8892a4" }}>
            Hệ thống Quản lý Công việc Nội bộ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Username */}
          <div>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8892a4", marginBottom: 8 }}
            >
              Tên đăng nhập
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                color="#4a5568"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username..."
                required
                style={{
                  width: "100%",
                  background: "rgba(15,17,23,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "13px 14px 13px 40px",
                  color: "#e2e8f0",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(59,130,246,0.6)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8892a4", marginBottom: 8 }}
            >
              Mật khẩu
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                color="#4a5568"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                required
                style={{
                  width: "100%",
                  background: "rgba(15,17,23,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "13px 44px 13px 40px",
                  color: "#e2e8f0",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(59,130,246,0.6)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#4a5568",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: loading
                ? "rgba(59,130,246,0.4)"
                : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 24px rgba(59,130,246,0.4)",
              marginTop: 8,
            }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        {/* Removed demo hints to avoid exposing credentials */}
      </div>
    </div>
  );
}
