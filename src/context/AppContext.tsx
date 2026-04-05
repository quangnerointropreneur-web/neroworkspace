"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  User, Brand, Task, SubTask, AppState, TaskStatus, KPI,
  CheckInRecord, KPILogEntry, Notification, Theme,
} from "@/lib/types";
import { INITIAL_APP_STATE } from "@/lib/mockData";

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
  // Tasks
  addTask: (task: Omit<Task, "id" | "createdAt" | "subTasks">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  // SubTasks
  addSubTask: (taskId: string, subTask: Omit<SubTask, "id" | "taskId">) => void;
  updateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  // Users
  addUser: (user: Omit<User, "id" | "createdAt">) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  // Brands
  addBrand: (brand: Omit<Brand, "id" | "createdAt">) => void;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;
  // KPIs
  updateKPI: (brandId: string, kpiId: string, updates: Partial<KPI>) => void;
  addKPI: (brandId: string, kpi: Omit<KPI, "id">) => void;
  deleteKPI: (brandId: string, kpiId: string) => void;
  // KPI Logs
  addKPILog: (log: Omit<KPILogEntry, "id">) => void;
  // Check-in
  addCheckIn: (record: Omit<CheckInRecord, "id">) => void;
  updateCheckIn: (id: string, updates: Partial<CheckInRecord>) => void;
  getTodayCheckIn: (userId: string) => CheckInRecord | undefined;
  // Notifications
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
const genId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const LS_KEY_STATE = "nero_ops_state_v2";
const LS_KEY_USER = "nero_ops_current_user";
const LS_KEY_THEME = "nero_ops_theme";

function loadState(): AppState {
  if (typeof window === "undefined") return INITIAL_APP_STATE;
  try {
    const raw = localStorage.getItem(LS_KEY_STATE);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Ensure new fields exist
      return {
        ...INITIAL_APP_STATE,
        ...parsed,
        checkIns: parsed.checkIns ?? [],
        kpiLogs: parsed.kpiLogs ?? [],
        notifications: parsed.notifications ?? [],
        theme: parsed.theme ?? "dark",
        // Migrate tasks: ensure picIds exists
        tasks: (parsed.tasks ?? []).map((t: Task) => ({
          ...t,
          picIds: t.picIds ?? (t.picId ? [t.picId] : []),
          subTasks: (t.subTasks ?? []).map((st: SubTask) => ({
            ...st,
            picIds: st.picIds ?? [],
          })),
        })),
      };
    }
  } catch {}
  return INITIAL_APP_STATE;
}

function saveState(s: AppState) {
  try { localStorage.setItem(LS_KEY_STATE, JSON.stringify(s)); } catch {}
}

function loadCurrentUser(users: User[]): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY_USER);
    if (!raw) return null;
    const saved = JSON.parse(raw) as User;
    return users.find((u) => u.id === saved.id) ?? null;
  } catch { return null; }
}

// =============================================================================
// PROVIDER
// =============================================================================
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_APP_STATE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setCurrentUser(loadCurrentUser(loaded.users));
    const savedTheme = (localStorage.getItem(LS_KEY_THEME) as Theme) ?? loaded.theme ?? "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(LS_KEY_THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = useCallback((username: string, password: string): boolean => {
    const user = state.users.find(
      (u) => u.username === username && u.password === password
    );
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
      ...task,
      id: genId("task"),
      subTasks: [],
      createdAt: new Date().toISOString(),
      picIds: task.picIds ?? (task.picId ? [task.picId] : []),
    };
    setState((s) => {
      let newNotifs = s.notifications ?? [];
      // Notify PICs
      const notifs: Notification[] = newTask.picIds.map((uid) => ({
        id: genId("notif"),
        userId: uid,
        title: "Công việc mới",
        body: `Bạn vừa được giao một task mới: "${newTask.title}"`,
        type: "task",
        read: false,
        taskId: newTask.id,
        createdAt: new Date().toISOString(),
      }));
      return { ...s, tasks: [...s.tasks, newTask], notifications: [...notifs, ...newNotifs] };
    });
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setState((s) => {
      const task = s.tasks.find((t) => t.id === id);
      if (!task || task.status === status) return s;

      const newTasks = s.tasks.map((t) => (t.id === id ? { ...t, status } : t));
      let newNotifs = s.notifications ?? [];

      if (status === "review") {
        const admins = s.users.filter((u) => u.role === "admin");
        const notifs: Notification[] = admins.map((a) => ({
          id: genId("notif"), userId: a.id, title: "Task cần duyệt",
          body: `Công việc "${task.title}" đã được chuyển sang chờ duyệt.`,
          type: "task", read: false, taskId: task.id, createdAt: new Date().toISOString(),
        }));
        newNotifs = [...notifs, ...newNotifs];
      } else if (status === "done" || status === "todo") {
        const notifs: Notification[] = task.picIds.map((uid) => ({
          id: genId("notif"), userId: uid, title: status === "done" ? "Task đã hoàn thành" : "Task bị yêu cầu làm lại",
          body: `Công việc "${task.title}" vừa được Admin chuyển thành ${status === "done" ? "Hoàn thành" : "Chờ xử lý"}.`,
          type: "task", read: false, taskId: task.id, createdAt: new Date().toISOString(),
        }));
        newNotifs = [...notifs, ...newNotifs];
      }
      return { ...s, tasks: newTasks, notifications: newNotifs };
    });
  }, []);

  // ── SubTasks ──────────────────────────────────────────────────────────────
  const addSubTask = useCallback((taskId: string, subTask: Omit<SubTask, "id" | "taskId">) => {
    const newSub: SubTask = { ...subTask, id: genId("st"), taskId, picIds: subTask.picIds ?? [] };
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, subTasks: [...t.subTasks, newSub] } : t
      ),
    }));
  }, []);

  const updateSubTask = useCallback((taskId: string, subTaskId: string, updates: Partial<SubTask>) => {
    setState((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      const newTasks = s.tasks.map((t) =>
        t.id === taskId ? { ...t, subTasks: t.subTasks.map((st) => st.id === subTaskId ? { ...st, ...updates } : st) } : t
      );
      let newNotifs = s.notifications ?? [];
      
      // If marked as done
      if (updates.status === "done" && task) {
        const st = task.subTasks.find((st) => st.id === subTaskId);
        if (st && st.status !== "done") {
          const notifs: Notification[] = task.picIds.map((uid) => ({
            id: genId("notif"), userId: uid, title: "Sub-task hoàn thành",
            body: `Một công việc phụ ("${st.content}") trong task "${task.title}" đã hoàn tất!`,
            type: "subtask", read: false, taskId: task.id, createdAt: new Date().toISOString(),
          }));
          newNotifs = [...notifs, ...newNotifs];
        }
      }
      return { ...s, tasks: newTasks, notifications: newNotifs };
    });
  }, []);

  const deleteSubTask = useCallback((taskId: string, subTaskId: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, subTasks: t.subTasks.filter((st) => st.id !== subTaskId) } : t
      ),
    }));
  }, []);

  // ── Users ─────────────────────────────────────────────────────────────────
  const addUser = useCallback((user: Omit<User, "id" | "createdAt">) => {
    setState((s) => ({ ...s, users: [...s.users, { ...user, id: genId("user"), createdAt: new Date().toISOString() }] }));
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...updates } : u)) }));
    setCurrentUser((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));
  }, []);

  // ── Brands ────────────────────────────────────────────────────────────────
  const addBrand = useCallback((brand: Omit<Brand, "id" | "createdAt">) => {
    setState((s) => ({ ...s, brands: [...s.brands, { ...brand, id: genId("brand"), createdAt: new Date().toISOString() }] }));
  }, []);

  const updateBrand = useCallback((id: string, updates: Partial<Brand>) => {
    setState((s) => ({ ...s, brands: s.brands.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
  }, []);

  const deleteBrand = useCallback((id: string) => {
    setState((s) => ({ ...s, brands: s.brands.filter((b) => b.id !== id) }));
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const updateKPI = useCallback((brandId: string, kpiId: string, updates: Partial<KPI>) => {
    setState((s) => ({
      ...s,
      brands: s.brands.map((b) =>
        b.id === brandId ? { ...b, kpis: b.kpis.map((k) => k.id === kpiId ? { ...k, ...updates } : k) } : b
      ),
    }));
  }, []);

  const addKPI = useCallback((brandId: string, kpi: Omit<KPI, "id">) => {
    setState((s) => ({
      ...s,
      brands: s.brands.map((b) =>
        b.id === brandId ? { ...b, kpis: [...b.kpis, { ...kpi, id: genId("kpi") }] } : b
      ),
    }));
  }, []);

  const deleteKPI = useCallback((brandId: string, kpiId: string) => {
    setState((s) => ({
      ...s,
      brands: s.brands.map((b) =>
        b.id === brandId ? { ...b, kpis: b.kpis.filter((k) => k.id !== kpiId) } : b
      ),
    }));
  }, []);

  // ── KPI Logs ──────────────────────────────────────────────────────────────
  const addKPILog = useCallback((log: Omit<KPILogEntry, "id">) => {
    const newLog: KPILogEntry = { ...log, id: genId("kpilog") };
    setState((s) => ({
      ...s,
      kpiLogs: [...(s.kpiLogs ?? []), newLog],
      brands: s.brands.map((b) =>
        b.id === log.brandId
          ? {
              ...b,
              kpis: b.kpis.map((k) =>
                k.id === log.kpiId ? { ...k, current: k.current + log.value } : k
              ),
            }
          : b
      ),
    }));
  }, []);

  // ── Check-in ──────────────────────────────────────────────────────────────
  const getTodayCheckIn = useCallback((userId: string): CheckInRecord | undefined => {
    const today = new Date().toISOString().split("T")[0];
    return state.checkIns?.find((c) => c.userId === userId && c.date === today);
  }, [state.checkIns]);

  const addCheckIn = useCallback((record: Omit<CheckInRecord, "id">) => {
    const newRecord: CheckInRecord = { ...record, id: genId("ci") };
    setState((s) => {
      let newNotifs = s.notifications ?? [];
      if (record.status === "late") {
        const admins = s.users.filter((u) => u.role === "admin");
        const usr = s.users.find(u => u.id === record.userId);
        const notifs: Notification[] = admins.map((a) => ({
          id: genId("notif"), userId: a.id, title: "Cảnh báo đi muộn",
          body: `Nhân viên ${usr?.fullName} vừa điểm danh đi muộn vào lúc ${record.checkIn}.`,
          type: "checkin", read: false, createdAt: new Date().toISOString(),
        }));
        newNotifs = [...notifs, ...newNotifs];
      }
      return { ...s, checkIns: [...(s.checkIns ?? []), newRecord], notifications: newNotifs };
    });
  }, []);

  const updateCheckIn = useCallback((id: string, updates: Partial<CheckInRecord>) => {
    setState((s) => {
      const currentRec = s.checkIns?.find(c => c.id === id);
      const newCheckIns = (s.checkIns ?? []).map((c) => (c.id === id ? { ...c, ...updates } : c));
      let newNotifs = s.notifications ?? [];

      if (updates.status === "early_leave" && currentRec && currentRec.status !== "early_leave") {
        const admins = s.users.filter((u) => u.role === "admin");
        const usr = s.users.find(u => u.id === currentRec.userId);
        const notifs: Notification[] = admins.map((a) => ({
          id: genId("notif"), userId: a.id, title: "Cảnh báo về sớm",
          body: `Nhân viên ${usr?.fullName} vừa check-out về sớm vào lúc ${updates.checkOut}.`,
          type: "checkin", read: false, createdAt: new Date().toISOString(),
        }));
        newNotifs = [...notifs, ...newNotifs];
      }
      return { ...s, checkIns: newCheckIns, notifications: newNotifs };
    });
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────────
  const addNotification = useCallback((n: Omit<Notification, "id" | "createdAt">) => {
    const newN: Notification = { ...n, id: genId("notif"), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, notifications: [newN, ...(s.notifications ?? [])] }));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: (s.notifications ?? []).map((n) => n.id === id ? { ...n, read: true } : n),
    }));
  }, []);

  const markAllNotificationsRead = useCallback((userId: string) => {
    setState((s) => ({
      ...s,
      notifications: (s.notifications ?? []).map((n) =>
        n.userId === userId ? { ...n, read: true } : n
      ),
    }));
  }, []);

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, login, logout }}>
      <DataContext.Provider value={{
        state, theme, toggleTheme,
        addTask, updateTask, deleteTask, updateTaskStatus,
        addSubTask, updateSubTask, deleteSubTask,
        addUser, updateUser, deleteUser,
        addBrand, updateBrand, deleteBrand,
        updateKPI, addKPI, deleteKPI,
        addKPILog,
        addCheckIn, updateCheckIn, getTodayCheckIn,
        markNotificationRead, markAllNotificationsRead, addNotification,
      }}>
        {children}
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
