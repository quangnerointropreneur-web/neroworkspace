"use client";

import { useEffect, useState } from "react";
import { messaging, db } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { collection, doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AppContext";
import { Bell, X } from "lucide-react";

export default function NotificationManager() {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      if (Notification.permission === "default") {
        setShowPrompt(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!currentUser) return;
    
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      setShowPrompt(false);

      if (status === "granted") {
        const msg = await messaging();
        if (msg) {
          const token = await getToken(msg, {
            vapidKey: "BLc_Hv3dgl1pj0oX9S2dgeAjEfyIbbu3jWAivySXh3FjtDugfB4VamqS_Kg3_s-4nWHKf2Gz-fCmGWpSCe2vfU8"
          });

          if (token) {
            console.log("FCM Token discovered:", token);
            // Save token to firestore
            await setDoc(doc(db, "fcmTokens", currentUser.id), {
              token,
              userId: currentUser.id,
              lastUpdated: serverTimestamp(),
              platform: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "web"
            }, { merge: true });
          }
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const setupListener = async () => {
      const msg = await messaging();
      if (msg) {
        onMessage(msg, (payload) => {
          console.log("Foreground FCM message received:", payload);
          if (Notification.permission === "granted") {
             new Notification(payload.notification?.title || "Nero Workspace", {
               body: payload.notification?.body,
               icon: "/icon.png"
             });
          }
        });
      }

      // Real-time Firestore sync (for "push-like" behavior when app is open)
      const startTime = new Date().toISOString();
      const q = collection(db, "notifications");
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            // Only notify for NEW records created after the app started, 
            // directed at the current user, and that are unread.
            if (
              data.userId === currentUser.id && 
              data.createdAt > startTime && 
              !data.read
            ) {
              if (Notification.permission === "granted") {
                new Notification(data.title || "Nero Workspace", {
                  body: data.body,
                  icon: "/icon.png",
                  tag: change.doc.id // prevent duplicates
                });
              }
            }
          }
        });
      });
      return unsubscribe;
    };
    
    let unsub: (() => void) | undefined;
    setupListener().then(u => { if (typeof u === 'function') unsub = u; });
    
    return () => { if (unsub) unsub(); };
  }, [currentUser]);

  if (!showPrompt || !currentUser) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 1000,
      width: 320,
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      animation: "slideInVertical 0.5s ease-out"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-blue)" }}>
          <Bell size={20} />
        </div>
        <button onClick={() => setShowPrompt(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
          <X size={16} />
        </button>
      </div>
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Bật thông báo đẩy?</h4>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Để cập nhật ngay lập tức các thay đổi công việc và tin nhắn mới trên Desktop & iPhone.
        </p>
      </div>
      <button 
        onClick={requestPermission}
        style={{
          width: "100%",
          padding: "10px 0",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(59,130,246,0.3)"
        }}
      >
        Cho phép ngay
      </button>
    </div>
  );
}
