"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, Brand, Task, SubTask, TaskComment, AppState, TaskStatus, KPI, CheckInRecord, KPILogEntry, Notification, Theme, ScheduleSlot } from "@/lib/types";
import { INITIAL_APP_STATE } from "@/lib/mockData";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, writeBatch, arrayUnion } from "firebase/firestore";

// =============================================================================
// AUTH CONTEXT
// =============================================================================
interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthInitialized: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AppProvider");
  return ctx;
};

// =============================================================================
// DATA CONTEXT
// =============================================================================
interface DataContextType {
  state: AppState;
  theme: Theme;
  toggleTheme: () => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "subTasks">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  addTaskComment: (taskId: string, comment: Omit<TaskComment, "id" | "createdAt">) => void;
  addSubTask: (taskId: string, subTask: Omit<SubTask, "id" | "taskId">) => void;
  updateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  addSubTaskComment: (taskId: string, subTaskId: string, comment: Omit<TaskComment, "id" | "createdAt">) => void;
  addUser: (user: Omit<User, "id" | "createdAt">) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addBrand: (brand: Omit<Brand, "id" | "createdAt">) => void;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;
  updateKPI: (brandId: string, kpiId: string, updates: Partial<KPI>) => void;
  addKPI: (brandId: string, kpi: Omit<KPI, "id">) => void;
  deleteKPI: (brandId: string, kpiId: string) => void;
  addKPILog: (log: Omit<KPILogEntry, "id">) => void;
  addCheckIn: (record: Omit<CheckInRecord, "id">) => Promise<void>;
  updateCheckIn: (id: string, updates: Partial<CheckInRecord>) => Promise<void>;
  getTodayCheckIn: (userId: string) => CheckInRecord | undefined;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  addNotification: (n: Omit<Notification, "id" | "createdAt">) => void;
  // Schedule actions
  addScheduleSlot: (slot: Omit<ScheduleSlot, "id" | "createdAt">) => void;
  updateScheduleSlot: (id: string, updates: Partial<ScheduleSlot>) => void;
  deleteScheduleSlot: (id: string) => void;
  requestBooking: (slotId: string, userId: string, content: string) => void;
  suggestBooking: (slot: Omit<ScheduleSlot, "id" | "createdAt">) => void;
  confirmBooking: (slotId: string) => void;
  rejectBooking: (slotId: string) => void;
  // Sub-task acceptance actions
  submitSubTaskReview: (taskId: string, subTaskId: string, note: string) => void;
  approveSubTask: (taskId: string, subTaskId: string, acceptanceNotes: string) => void;
  rejectSubTask: (taskId: string, subTaskId: string, reason: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside AppProvider");
  return ctx;
};

// =============================================================================
// HELPERS
// =============================================================================
const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const LS_KEY_USER = "nero_ops_current_user";
const LS_KEY_THEME = "nero_ops_theme";

// =============================================================================
// PROVIDER
// =============================================================================
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    tasks: [], users: [], brands: [], checkIns: [], kpiLogs: [], notifications: [], schedules: [], theme: "dark"
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [firebaseInit, setFirebaseInit] = useState(false);

  // Initialize Data from Firebase
  useEffect(() => {
    // 1. Check if database is empty and seed if necessary
    const seedIfEmpty = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        if (snap.empty) {
          console.log("Database empty. Seeding mock data...");
          const batch = writeBatch(db);
          INITIAL_APP_STATE.users.forEach(u => batch.set(doc(db, "users", u.id), u));
          INITIAL_APP_STATE.tasks.forEach(t => batch.set(doc(db, "tasks", t.id), t));
          INITIAL_APP_STATE.brands.forEach(b => batch.set(doc(db, "brands", b.id), b));
          INITIAL_APP_STATE.checkIns?.forEach(c => batch.set(doc(db, "checkIns", c.id), c));
          INITIAL_APP_STATE.kpiLogs?.forEach(l => batch.set(doc(db, "kpiLogs", l.id), l));
          INITIAL_APP_STATE.notifications?.forEach(n => batch.set(doc(db, "notifications", n.id), n));
          INITIAL_APP_STATE.schedules?.forEach(s => batch.set(doc(db, "schedules", s.id), s));
          await batch.commit();
          console.log("Seeding complete.");
        }
      } catch (err) {
        console.error("Firebase connection error:", err);
      } finally {
        setFirebaseInit(true);
      }
    };
    seedIfEmpty();

    // 2. Setup Snapshots
    const unsubs = [
      onSnapshot(collection(db, "tasks"), (snap) => {
        setState(s => ({ ...s, tasks: snap.docs.map(d => d.data() as Task) }));
      }),
      onSnapshot(collection(db, "users"), (snap) => {
        const users = snap.docs.map(d => d.data() as User);
        setState(s => ({ ...s, users }));
        // Update currentUser if modified
        setCurrentUser(prev => prev ? (users.find(u => u.id === prev.id) ?? prev) : null);
      }),
      onSnapshot(collection(db, "brands"), (snap) => {
        setState(s => ({ ...s, brands: snap.docs.map(d => d.data() as Brand) }));
      }),
      onSnapshot(collection(db, "checkIns"), (snap) => {
        setState(s => ({ ...s, checkIns: snap.docs.map(d => d.data() as CheckInRecord) }));
      }),
      onSnapshot(collection(db, "kpiLogs"), (snap) => {
        setState(s => ({ ...s, kpiLogs: snap.docs.map(d => d.data() as KPILogEntry) }));
      }),
      onSnapshot(collection(db, "notifications"), (snap) => {
        const notifs = snap.docs.map(d => d.data() as Notification)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState(s => ({ ...s, notifications: notifs }));
      }),
      onSnapshot(collection(db, "schedules"), (snap) => {
        const schedules = snap.docs.map(d => d.data() as ScheduleSlot)
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
        setState(s => ({ ...s, schedules }));
      }),
    ];

    // Theme & current user logic
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem(LS_KEY_USER);
      if (savedUser) { try { setCurrentUser(JSON.parse(savedUser)); } catch {} }
      const savedTheme = (localStorage.getItem(LS_KEY_THEME) as Theme) ?? "dark";
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
      setIsAuthInitialized(true);
    } else if (typeof window !== "undefined") {
      setIsAuthInitialized(true);
    }

    return () => unsubs.forEach(u => u());
  }, []);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(LS_KEY_THEME, theme);
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme(t => (t === "dark" ? "light" : "dark")), []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = useCallback((username: string, password: string): boolean => {
    const user = state.users.find(u => u.username === username && u.password === password);
    if (!user) return false;
    setCurrentUser(user);
    localStorage.setItem(LS_KEY_USER, JSON.stringify(user));
    return true;
  }, [state.users]);
  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(LS_KEY_USER);
  }, []);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const addTask = useCallback((task: Omit<Task, "id" | "createdAt" | "subTasks">): Task => {
    let finalPicIds = task.picIds ?? (task.picId ? [task.picId] : []);
    
    // Auto-add admin(s) if not already included, so Nero can monitor
    const admins = state.users.filter(u => u.role === "admin");
    admins.forEach(admin => {
      if (!finalPicIds.includes(admin.id)) {
        finalPicIds.push(admin.id);
      }
    });

    const newTask: Task = {
      ...task, 
      id: genId("task"), 
      subTasks: [], 
      createdAt: new Date().toISOString(),
      picIds: finalPicIds,
      picId: finalPicIds[0] ?? "", // Ensure fallback for old code
    };
    setDoc(doc(db, "tasks", newTask.id), newTask);

    finalPicIds.forEach(uid => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: uid, title: "Công việc mới",
        body: `Bạn vừa được giao hoặc mời theo dõi task mới: "${newTask.title}"`,
        type: "task", read: false, taskId: newTask.id, createdAt: new Date().toISOString()
      });
    });
    return newTask;
  }, [state.users]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => updateDoc(doc(db, "tasks", id), updates), []);
  const deleteTask = useCallback((id: string) => deleteDoc(doc(db, "tasks", id)), []);
  
  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task || task.status === status) return;
    updateDoc(doc(db, "tasks", id), { status });

    if (status === "review") {
      state.users.filter(u => u.role === "admin").forEach(a => {
        const nId = genId("notif");
        setDoc(doc(db, "notifications", nId), {
          id: nId, userId: a.id, title: "Task cần duyệt",
          body: `Công việc "${task.title}" đã được chuyển sang chờ duyệt.`,
          type: "task", read: false, taskId: task.id, createdAt: new Date().toISOString(),
        });
      });
    } else if (status === "done" || status === "todo") {
      task.picIds.forEach(uid => {
        const nId = genId("notif");
        setDoc(doc(db, "notifications", nId), {
          id: nId, userId: uid, title: status === "done" ? "Task đã hoàn thành" : "Task bị yêu cầu làm lại",
          body: `Công việc "${task.title}" vừa được Admin chuyển thành ${status === "done" ? "Hoàn thành" : "Chờ xử lý"}.`,
          type: "task", read: false, taskId: task.id, createdAt: new Date().toISOString(),
        });
      });
    }
  }, [state.tasks, state.users]);
  
  const addTaskComment = useCallback((taskId: string, comment: Omit<TaskComment, "id" | "createdAt">) => {
    const newComment: TaskComment = { ...comment, id: genId("msg"), createdAt: new Date().toISOString() };
    updateDoc(doc(db, "tasks", taskId), {
      comments: arrayUnion(newComment)
    });
  }, []);

  // ── SubTasks ──────────────────────────────────────────────────────────────
  const addSubTask = useCallback((taskId: string, subTask: Omit<SubTask, "id" | "taskId">) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSub: SubTask = { ...subTask, id: genId("st"), taskId, picIds: subTask.picIds ?? [] };
    updateDoc(doc(db, "tasks", taskId), { subTasks: [...task.subTasks, newSub] });
  }, [state.tasks]);

  const updateSubTask = useCallback((taskId: string, subTaskId: string, updates: Partial<SubTask>) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = task.subTasks.map(st => st.id === subTaskId ? { ...st, ...updates } : st);
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });

    if (updates.status === "done") {
      const st = task.subTasks.find(st => st.id === subTaskId);
      if (st && st.status !== "done") {
        task.picIds.forEach(uid => {
          const nId = genId("notif");
          setDoc(doc(db, "notifications", nId), {
            id: nId, userId: uid, title: "Sub-task hoàn thành",
            body: `Một công việc phụ ("${st.content}") trong task "${task.title}" đã hoàn tất!`,
            type: "subtask", read: false, taskId: task.id, createdAt: new Date().toISOString(),
          });
        });
      }
    }
  }, [state.tasks]);

  const deleteSubTask = useCallback((taskId: string, subTaskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) updateDoc(doc(db, "tasks", taskId), { subTasks: task.subTasks.filter(st => st.id !== subTaskId) });
  }, [state.tasks]);

  const addSubTaskComment = useCallback((taskId: string, subTaskId: string, comment: Omit<TaskComment, "id" | "createdAt">) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newComment: TaskComment = { ...comment, id: genId("msg"), createdAt: new Date().toISOString() };
    const newSubs = task.subTasks.map(st => 
      st.id === subTaskId ? { ...st, comments: [...(st.comments || []), newComment] } : st
    );
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });
  }, [state.tasks]);

  // ── Sub-task Acceptance Flow ───────────────────────────────────────────────
  const submitSubTaskReview = useCallback((taskId: string, subTaskId: string, note: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = task.subTasks.map(st => st.id === subTaskId ? { ...st, status: "reviewing" as const, submissionNote: note } : st);
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });
    // Notify all admins
    state.users.filter(u => u.role === "admin").forEach(a => {
      const nId = genId("notif");
      const st = task.subTasks.find(s => s.id === subTaskId);
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: a.id, title: "Sub-task gửi nghiệm thu",
        body: `Nhân viên vừa gửi yêu cầu nghiệm thu: "${st?.content}" trong task "${task.title}".`,
        type: "subtask", read: false, taskId: task.id, createdAt: new Date().toISOString(),
      });
    });
  }, [state.tasks, state.users]);

  const approveSubTask = useCallback((taskId: string, subTaskId: string, acceptanceNotes: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = task.subTasks.map(st => st.id === subTaskId ? { ...st, status: "done" as const, acceptanceNotes, rejectReason: "" } : st);
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });
    const st = task.subTasks.find(s => s.id === subTaskId);
    // Notify PICs
    (st?.picIds ?? task.picIds).forEach(uid => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: uid, title: "Sub-task được duyệt ✅",
        body: `Nero đã duyệt nghiệm thu: "${st?.content}" trong task "${task.title}".`,
        type: "subtask", read: false, taskId: task.id, createdAt: new Date().toISOString(),
      });
    });
  }, [state.tasks]);

  const rejectSubTask = useCallback((taskId: string, subTaskId: string, reason: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = task.subTasks.map(st => st.id === subTaskId ? { ...st, status: "pending" as const, rejectReason: reason, submissionNote: "", acceptanceNotes: "" } : st);
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });
    const st = task.subTasks.find(s => s.id === subTaskId);
    // Notify PICs
    (st?.picIds ?? task.picIds).forEach(uid => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: uid, title: "Sub-task cần làm lại ↩️",
        body: `Nero yêu cầu làm lại: "${st?.content}". Lý do: ${reason || "Không có ghi chú"}`,
        type: "subtask", read: false, taskId: task.id, createdAt: new Date().toISOString(),
      });
    });
  }, [state.tasks]);

  // ── Users & Brands ────────────────────────────────────────────────────────
  const addUser = useCallback((user: Omit<User, "id" | "createdAt">) => {
    const id = genId("user");
    setDoc(doc(db, "users", id), { ...user, id, createdAt: new Date().toISOString() });
  }, []);
  const updateUser = useCallback((id: string, updates: Partial<User>) => updateDoc(doc(db, "users", id), updates), []);
  const deleteUser = useCallback((id: string) => deleteDoc(doc(db, "users", id)), []);

  const addBrand = useCallback((brand: Omit<Brand, "id" | "createdAt">) => {
    const id = genId("brand");
    setDoc(doc(db, "brands", id), { ...brand, id, createdAt: new Date().toISOString() });
  }, []);
  const updateBrand = useCallback((id: string, updates: Partial<Brand>) => updateDoc(doc(db, "brands", id), updates), []);
  const deleteBrand = useCallback((id: string) => deleteDoc(doc(db, "brands", id)), []);

  const addKPI = useCallback((brandId: string, kpi: Omit<KPI, "id">) => {
    const brand = state.brands.find(b => b.id === brandId);
    if (brand) updateDoc(doc(db, "brands", brandId), { kpis: [...brand.kpis, { ...kpi, id: genId("kpi") }] });
  }, [state.brands]);
  const updateKPI = useCallback((brandId: string, kpiId: string, updates: Partial<KPI>) => {
    const brand = state.brands.find(b => b.id === brandId);
    if (brand) updateDoc(doc(db, "brands", brandId), { kpis: brand.kpis.map(k => k.id === kpiId ? { ...k, ...updates } : k) });
  }, [state.brands]);
  const deleteKPI = useCallback((brandId: string, kpiId: string) => {
    const brand = state.brands.find(b => b.id === brandId);
    if (brand) updateDoc(doc(db, "brands", brandId), { kpis: brand.kpis.filter(k => k.id !== kpiId) });
  }, [state.brands]);

  // ── KPI Logs & CheckIns ───────────────────────────────────────────────────
  const addKPILog = useCallback((log: Omit<KPILogEntry, "id">) => {
    const newLog: KPILogEntry = { ...log, id: genId("kpilog") };
    setDoc(doc(db, "kpiLogs", newLog.id), newLog);
    // Update KPI current tracking safely:
    const brand = state.brands.find(b => b.id === log.brandId);
    if (brand) {
      updateDoc(doc(db, "brands", log.brandId), {
        kpis: brand.kpis.map(k => k.id === log.kpiId ? { ...k, current: k.current + log.value } : k)
      });
    }
  }, [state.brands]);

  const getTodayCheckIn = useCallback((userId: string): CheckInRecord | undefined => {
    const today = new Date().toISOString().split("T")[0];
    return state.checkIns?.find(c => c.userId === userId && c.date === today);
  }, [state.checkIns]);

  const addCheckIn = useCallback((record: Omit<CheckInRecord, "id">) => {
    const id = genId("ci");
    const p = setDoc(doc(db, "checkIns", id), { ...record, id });
    if (record.status === "late") {
      state.users.filter(u => u.role === "admin").forEach(a => {
        const nId = genId("notif");
        setDoc(doc(db, "notifications", nId), {
          id: nId, userId: a.id, title: "Cảnh báo đi muộn",
          body: `Nhân viên vừa điểm danh đi muộn vào lúc ${record.checkIn}.`,
          type: "checkin", read: false, createdAt: new Date().toISOString(),
        });
      });
    }
    return p;
  }, [state.users]);

  const updateCheckIn = useCallback((id: string, updates: Partial<CheckInRecord>) => {
    const currentRec = state.checkIns.find(c => c.id === id);
    const p = updateDoc(doc(db, "checkIns", id), updates);
    if (updates.status === "early_leave" && currentRec && currentRec.status !== "early_leave") {
      state.users.filter(u => u.role === "admin").forEach(a => {
        const nId = genId("notif");
        setDoc(doc(db, "notifications", nId), {
          id: nId, userId: a.id, title: "Cảnh báo về sớm",
          body: `Một nhân viên vừa check-out về sớm vào lúc ${updates.checkOut}.`,
          type: "checkin", read: false, createdAt: new Date().toISOString(),
        });
      });
    }
    return p;
  }, [state.checkIns, state.users]);

  // ── Notifications ─────────────────────────────────────────────────────────
  const addNotification = useCallback((n: Omit<Notification, "id" | "createdAt">) => {
    const id = genId("notif");
    setDoc(doc(db, "notifications", id), { ...n, id, createdAt: new Date().toISOString() });
  }, []);
  const markNotificationRead = useCallback((id: string) => updateDoc(doc(db, "notifications", id), { read: true }), []);
  const markAllNotificationsRead = useCallback((userId: string) => {
    state.notifications.forEach(n => {
      if (n.userId === userId && !n.read) updateDoc(doc(db, "notifications", n.id), { read: true });
    });
  }, [state.notifications]);

  // ── Schedule ─────────────────────────────────────────────────────────────────
  const addScheduleSlot = useCallback((slot: Omit<ScheduleSlot, "id" | "createdAt">) => {
    const id = genId("sch");
    setDoc(doc(db, "schedules", id), { ...slot, id, createdAt: new Date().toISOString() });
  }, []);

  const updateScheduleSlot = useCallback((id: string, updates: Partial<ScheduleSlot>) =>
    updateDoc(doc(db, "schedules", id), updates), []);

  const deleteScheduleSlot = useCallback((id: string) => deleteDoc(doc(db, "schedules", id)), []);

  const requestBooking = useCallback((slotId: string, userId: string, content: string) => {
    updateDoc(doc(db, "schedules", slotId), { bookingUserId: userId, bookingRequest: content, bookingStatus: "pending" });
    const user = state.users.find(u => u.id === userId);
    state.users.filter(u => u.role === "admin").forEach(a => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: a.id, title: "Yêu cầu đặt lịch 📅",
        body: `${user?.fullName ?? "Nhân viên"} vừa gửi yêu cầu đặt lịch hỗ trợ.`,
        type: "system", read: false, createdAt: new Date().toISOString(),
      });
    });
  }, [state.users]);

  const suggestBooking = useCallback((slot: Omit<ScheduleSlot, "id" | "createdAt">) => {
    const id = genId("sch");
    setDoc(doc(db, "schedules", id), { ...slot, id, createdAt: new Date().toISOString() });
    
    // Notify admin
    const user = state.users.find(u => u.id === slot.bookingUserId);
    state.users.filter(u => u.role === "admin").forEach(a => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: a.id, title: "Đề xuất lịch hẹn mới 📅",
        body: `${user?.fullName ?? "Một nhân viên"} vừa đề xuất khung giờ hẹn mới.`,
        type: "system", read: false, createdAt: new Date().toISOString(),
      });
    });
  }, [state.users]);

  const confirmBooking = useCallback((slotId: string) => {
    const slot = state.schedules.find(s => s.id === slotId);
    updateDoc(doc(db, "schedules", slotId), { bookingStatus: "confirmed" });
    if (slot?.bookingUserId) {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: slot.bookingUserId, title: "Lịch được xác nhận ✅",
        body: `Nero đã xác nhận lịch hẹn ${slot.date} lúc ${slot.startTime}–${slot.endTime}.`,
        type: "system", read: false, createdAt: new Date().toISOString(),
      });
    }
  }, [state.schedules]);

  const rejectBooking = useCallback((slotId: string) => {
    const slot = state.schedules.find(s => s.id === slotId);
    updateDoc(doc(db, "schedules", slotId), { bookingStatus: "rejected", bookingUserId: undefined, bookingRequest: undefined });
    if (slot?.bookingUserId) {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: slot.bookingUserId, title: "Lịch bị từ chối ❌",
        body: `Nero không thể nhận lịch hẹn ${slot.date} lúc ${slot.startTime}–${slot.endTime}. Vui lòng đặt lịch khác.`,
        type: "system", read: false, createdAt: new Date().toISOString(),
      });
    }
  }, [state.schedules]);

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, isAuthInitialized, login, logout }}>
      <DataContext.Provider value={{
        state, theme, toggleTheme,
        addTask, updateTask, deleteTask, updateTaskStatus,
        addSubTask, updateSubTask, deleteSubTask,
        submitSubTaskReview, approveSubTask, rejectSubTask,
        addUser, updateUser, deleteUser,
        addBrand, updateBrand, deleteBrand,
        updateKPI, addKPI, deleteKPI,
        addKPILog, addCheckIn, updateCheckIn, getTodayCheckIn,
        markNotificationRead, markAllNotificationsRead, addNotification,
        addTaskComment, addSubTaskComment,
        addScheduleSlot, updateScheduleSlot, deleteScheduleSlot,
        requestBooking, suggestBooking, confirmBooking, rejectBooking,
      }}>
        {!firebaseInit && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ color: 'var(--text-primary)', textAlign: 'center' }}>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4 mx-auto"></div>
              <p>Đang tải dữ liệu Nero Ops...</p>
            </div>
          </div>
        )}
        {children}
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
