"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { messaging, db } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { collection, doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAuth, useData } from "@/context/AppContext";
import { Bell, X, Share } from "lucide-react";

export default function NotificationManager() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { addNotification } = useData();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to get target URL based on notification data
  const getTargetUrl = (data: any) => {
    if (data.url) return data.url;
    // Handle deep linking for tasks
    if (data.taskId) return `/dashboard/tasks?id=${data.taskId}`;
    if (data.type === "task" || data.type === "subtask") {
      if (data.id) return `/dashboard/tasks?id=${data.id}`;
      return "/dashboard/tasks";
    }
    if (data.type === "hr" || data.type === "checkin") return "/dashboard/hr";
    if (data.type === "kpi") return "/dashboard/kpi-log";
    return "/dashboard/tasks";
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check notification permission
      if ("Notification" in window) {
        setPermission(Notification.permission);
        if (Notification.permission === "default") {
          setShowPrompt(true);
        }
      }

      // Check if iOS and not PWA
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      
      if (isIOS && !isStandalone) {
        // Show install guide once per session if not installed
        const seen = sessionStorage.getItem('pwa_guide_seen');
        if (!seen) setShowInstallGuide(true);
      }

      // Explicit Service Worker Registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.error('Service Worker registration failed:', err);
          });
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      
      if (status === "granted") {
        const msg = await messaging();
        if (msg) {
          // Get token via the service worker registration
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(msg, {
            vapidKey: "BLc_Hv3dgl1pj0oX9S2dgeAjEfyIbbu3jWAivySXh3FjtDugfB4VamqS_Kg3_s-4nWHKf2Gz-fCmGWpSCe2vfU8",
            serviceWorkerRegistration: registration
          });

          if (token) {
            console.log("FCM Token discovered:", token);
            await setDoc(doc(db, "fcmTokens", currentUser.id), {
              token,
              userId: currentUser.id,
              userName: currentUser.fullName,
              lastUpdated: serverTimestamp(),
              platform: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "web"
            }, { merge: true });
          }
        }
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!currentUser || permission !== "granted") return;

    const setupListener = async () => {
      const msg = await messaging();
      if (msg) {
        onMessage(msg, (payload) => {
          console.log("Foreground FCM message received:", payload);
          if (Notification.permission === "granted") {
             const n = new Notification(payload.notification?.title || "Nero Workspace", {
               body: payload.notification?.body || payload.data?.body,
               icon: "/icon.png",
               data: payload.data
             });
             n.onclick = () => {
               window.focus();
               const url = getTargetUrl(payload.data || {});
               router.push(url);
             };
          }
        });
      }

      const now = new Date();
      const bufferTime = new Date(now.getTime() - 60000).toISOString(); 
      
      const q = collection(db, "notifications");
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (
              data.userId === currentUser.id && 
              data.createdAt > bufferTime && 
              !data.read
            ) {
              if (Notification.permission === "granted") {
                const n = new Notification(data.title || "Nero Workspace", {
                  body: data.body,
                  icon: "/icon.png",
                  tag: change.doc.id,
                  data: data
                });
                n.onclick = () => {
                  window.focus();
                  const url = getTargetUrl(data);
                  router.push(url);
                };
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
  }, [currentUser, permission, router]);

  return (
    <>
      {/* Install Guide for iOS */}
      {showInstallGuide && (
        <div style={{ position: "fixed", bottom: 20, left: 16, right: 16, zIndex: 1000, background: "var(--bg-card)", border: "1px solid var(--accent-blue)", borderRadius: 16, padding: "16px 20px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)", animation: "slideUp 0.4s ease-out" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={22} color="var(--accent-blue)" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Nhận thông báo khi đóng app</h4>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Để nhận thông báo trên iPhone, hãy nhấn <Share size={14} style={{ display: "inline", verticalAlign: "middle" }} /> sau đó chọn <b>"Thêm vào MH chính"</b>.
              </p>
            </div>
            <button onClick={() => { setShowInstallGuide(false); sessionStorage.setItem('pwa_guide_seen', 'true'); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Permission Prompt */}
      {showPrompt && !showInstallGuide && permission === "default" && (
        <div style={{ position: "fixed", bottom: 20, left: 16, right: 16, zIndex: 1000, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 20px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)", animation: "slideUp 0.4s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={20} color="var(--accent-blue)" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Bật thông báo</h4>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Để không bỏ lỡ các công việc quan trọng.</p>
            </div>
            <button onClick={requestPermission} disabled={isRefreshing} style={{ padding: "8px 16px", borderRadius: 10, background: "var(--accent-blue)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {isRefreshing ? "..." : "Bật"}
            </button>
            <button onClick={() => setShowPrompt(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
