"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, Brand, Task, SubTask, AppState, TaskStatus, KPI, CheckInRecord, KPILogEntry, Notification, Theme } from "@/lib/types";
import { INITIAL_APP_STATE } from "@/lib/mockData";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";

// =============================================================================
// AUTH CONTEXT
// =============================================================================
interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
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
  addSubTask: (taskId: string, subTask: Omit<SubTask, "id" | "taskId">) => void;
  updateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
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
  addCheckIn: (record: Omit<CheckInRecord, "id">) => void;
  updateCheckIn: (id: string, updates: Partial<CheckInRecord>) => void;
  getTodayCheckIn: (userId: string) => CheckInRecord | undefined;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  addNotification: (n: Omit<Notification, "id" | "createdAt">) => void;
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
    tasks: [], users: [], brands: [], checkIns: [], kpiLogs: [], notifications: [], theme: "dark"
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [firebaseInit, setFirebaseInit] = useState(false);

  // Initialize Data from Firebase
  useEffect(() => {
    // 1. Check if database is empty and seed if necessary
    const seedIfEmpty = async () => {
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
        await batch.commit();
        console.log("Seeding complete.");
      }
      setFirebaseInit(true);
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
        // Sort notifications by createdAt descending locally
        const notifs = snap.docs.map(d => d.data() as Notification)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState(s => ({ ...s, notifications: notifs }));
      }),
    ];

    // Theme & current user logic
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem(LS_KEY_USER);
      if (savedUser) { try { setCurrentUser(JSON.parse(savedUser)); } catch {} }
      const savedTheme = (localStorage.getItem(LS_KEY_THEME) as Theme) ?? "dark";
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
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
    const newTask: Task = {
      ...task, id: genId("task"), subTasks: [], createdAt: new Date().toISOString(),
      picIds: task.picIds ?? (task.picId ? [task.picId] : []),
    };
    setDoc(doc(db, "tasks", newTask.id), newTask);

    newTask.picIds.forEach(uid => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: uid, title: "Công việc mới",
        body: `Bạn vừa được giao một task mới: "${newTask.title}"`,
        type: "task", read: false, taskId: newTask.id, createdAt: new Date().toISOString()
      });
    });
    return newTask;
  }, []);

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
    setDoc(doc(db, "checkIns", id), { ...record, id });
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
  }, [state.users]);

  const updateCheckIn = useCallback((id: string, updates: Partial<CheckInRecord>) => {
    const currentRec = state.checkIns.find(c => c.id === id);
    updateDoc(doc(db, "checkIns", id), updates);
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

  // Before hydration / fetch finishes, render empty or loading if you prefer.
  if (!firebaseInit) return null;

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, login, logout }}>
      <DataContext.Provider value={{
        state, theme, toggleTheme,
        addTask, updateTask, deleteTask, updateTaskStatus,
        addSubTask, updateSubTask, deleteSubTask,
        addUser, updateUser, deleteUser,
        addBrand, updateBrand, deleteBrand,
        updateKPI, addKPI, deleteKPI,
        addKPILog, addCheckIn, updateCheckIn, getTodayCheckIn,
        markNotificationRead, markAllNotificationsRead, addNotification,
      }}>
        {children}
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
