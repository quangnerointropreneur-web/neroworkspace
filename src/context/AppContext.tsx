"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, Brand, Task, SubTask, TaskComment, AppState, TaskStatus, KPI, CheckInRecord, KPILogEntry, Notification, Theme, ScheduleSlot, PersonalNote, StrategyCard, PromptCard, Account, Project, RecruitmentLog, SocialContent, Contact, Deal, CrmActivity, DealStage } from "@/lib/types";
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
  updateSettings: (s: Partial<AppState["settings"]>) => void;
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
  // Personal Note actions
  addPersonalNote: (note: Omit<PersonalNote, "id" | "createdAt" | "userId">) => void;
  updatePersonalNote: (id: string, updates: Partial<PersonalNote>) => void;
  deletePersonalNote: (id: string) => void;
  // Strategy Board actions
  addStrategyCard: (card: Omit<StrategyCard, "id" | "createdAt" | "updatedAt">) => void;
  updateStrategyCard: (id: string, updates: Partial<StrategyCard>) => void;
  deleteStrategyCard: (id: string) => void;
  // Prompt Cards actions
  addPromptCard: (card: Omit<PromptCard, "id" | "createdAt" | "updatedAt">) => void;
  updatePromptCard: (id: string, updates: Partial<PromptCard>) => void;
  deletePromptCard: (id: string) => void;
  // Account actions
  addAccount: (acc: Omit<Account, "id" | "createdAt">) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  // Project actions
  addProject: (project: Omit<Project, "id" | "createdAt">) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // Recruitment actions
  addRecruitmentLog: (log: Omit<RecruitmentLog, "id" | "createdAt">) => void;
  deleteRecruitmentLog: (id: string) => void;
  // Social Content actions
  addSocialContent: (content: Omit<SocialContent, "id" | "createdAt" | "updatedAt">) => void;
  updateSocialContent: (id: string, updates: Partial<SocialContent>) => void;
  deleteSocialContent: (id: string) => void;
  // CRM actions
  addContact: (contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addDeal: (deal: Omit<Deal, "id" | "createdAt" | "updatedAt">) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  updateDealStage: (id: string, stage: DealStage) => void;
  addCrmActivity: (activity: Omit<CrmActivity, "id" | "createdAt">) => void;
  updateCrmActivity: (id: string, updates: Partial<CrmActivity>) => void;
  deleteCrmActivity: (id: string) => void;
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

const uniqueIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

const getTaskParticipantIds = (task: Task) =>
  uniqueIds([...(task.picIds ?? []), ...(task.watcherIds ?? [])]);

// =============================================================================
// PROVIDER
// =============================================================================
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    tasks: [], users: [], brands: [], checkIns: [], kpiLogs: [], notifications: [], schedules: [], accounts: [], personalNotes: [], strategyCards: [], promptCards: [], projects: [], recruitmentLogs: [], socialContents: [], contacts: [], deals: [], crmActivities: [], settings: { enableTelegram: false }, theme: "dark"
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
          INITIAL_APP_STATE.contacts?.forEach(c => batch.set(doc(db, "contacts", c.id), c));
          INITIAL_APP_STATE.deals?.forEach(d => batch.set(doc(db, "deals", d.id), d));
          INITIAL_APP_STATE.crmActivities?.forEach(a => batch.set(doc(db, "crmActivities", a.id), a));
          await batch.commit();
          console.log("Seeding complete.");
        }
        const crmSnap = await getDocs(collection(db, "contacts"));
        if (crmSnap.empty && INITIAL_APP_STATE.contacts.length > 0) {
          const crmBatch = writeBatch(db);
          INITIAL_APP_STATE.contacts.forEach(c => crmBatch.set(doc(db, "contacts", c.id), c));
          INITIAL_APP_STATE.deals.forEach(d => crmBatch.set(doc(db, "deals", d.id), d));
          INITIAL_APP_STATE.crmActivities.forEach(a => crmBatch.set(doc(db, "crmActivities", a.id), a));
          await crmBatch.commit();
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
      onSnapshot(collection(db, "personalNotes"), (snap) => {
        setState(s => ({ ...s, personalNotes: snap.docs.map(d => d.data() as PersonalNote) }));
      }),
      onSnapshot(collection(db, "strategyCards"), (snap) => {
        const cards = snap.docs.map(d => d.data() as StrategyCard)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState(s => ({ ...s, strategyCards: cards }));
      }),
      onSnapshot(collection(db, "promptCards"), (snap) => {
        const cards = snap.docs.map(d => d.data() as PromptCard)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState(s => ({ ...s, promptCards: cards }));
      }),
      onSnapshot(collection(db, "accounts"), (snap) => {
        const accs = snap.docs.map(d => d.data() as Account)
          .sort((a, b) => a.name.localeCompare(b.name));
        setState(s => ({ ...s, accounts: accs }));
      }),
      onSnapshot(collection(db, "projects"), (snap) => {
        setState(s => ({ ...s, projects: snap.docs.map(d => d.data() as Project) }));
      }),
      onSnapshot(collection(db, "recruitmentLogs"), (snap) => {
        const logs = snap.docs.map(d => d.data() as RecruitmentLog)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setState(s => ({ ...s, recruitmentLogs: logs }));
      }),
      onSnapshot(collection(db, "socialContents"), (snap) => {
        const contents = snap.docs.map(d => d.data() as SocialContent)
          .sort((a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime());
        setState(s => ({ ...s, socialContents: contents }));
      }),
      onSnapshot(collection(db, "contacts"), (snap) => {
        const contacts = snap.docs.map(d => d.data() as Contact)
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        setState(s => ({ ...s, contacts }));
      }),
      onSnapshot(collection(db, "deals"), (snap) => {
        const deals = snap.docs.map(d => d.data() as Deal)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState(s => ({ ...s, deals }));
      }),
      onSnapshot(collection(db, "crmActivities"), (snap) => {
        const crmActivities = snap.docs.map(d => d.data() as CrmActivity)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setState(s => ({ ...s, crmActivities }));
      }),
      onSnapshot(doc(db, "settings", "main"), (docSnap) => {
        if (docSnap.exists()) {
          setState(s => ({ ...s, settings: docSnap.data() as AppState["settings"] }));
        }
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

  // ── Notifications ─────────────────────────────────────────────────────────
  const addNotification = useCallback((n: Omit<Notification, "id" | "createdAt">, telegramOptions?: { chatId?: string, silent?: boolean, buttons?: { text: string, url: string }[] }) => {
    const id = genId("notif");
    const newNotif = { ...n, id, createdAt: new Date().toISOString() };
    setDoc(doc(db, "notifications", id), newNotif);

    // Telegram Notification Logic
    const settings = state.settings;
    if (settings.enableTelegram && !telegramOptions?.silent) {
      const titleLower = n.title.toLowerCase();
      const isUpdate = titleLower.includes("cập nhật") || titleLower.includes("thay đổi");
      const isPrivate = n.type === "subtask" && (titleLower.includes("duyệt") || titleLower.includes("nghiệm thu"));
      
      let botToken = settings.telegramBotToken;
      let targetChatId = settings.telegramChatId;

      if (telegramOptions?.chatId) {
        targetChatId = telegramOptions.chatId;
      } else if ((isUpdate || isPrivate) && settings.adminTelegramBotToken && settings.adminTelegramChatId) {
        botToken = settings.adminTelegramBotToken;
        targetChatId = settings.adminTelegramChatId;
      } else if (isPrivate && settings.adminTelegramChatId) {
        // Use primary bot but admin chat for private matters if admin token not set
        targetChatId = settings.adminTelegramChatId;
      }

      if (botToken && targetChatId) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const text = `🔔 *${n.title}*\n${n.body}${n.taskId ? `\n\n🔗 [Xem chi tiết](${origin}/dashboard/tasks?taskId=${n.taskId})` : ''}`;
        
        const payload: {
          chat_id: string;
          text: string;
          parse_mode: string;
          reply_markup?: { inline_keyboard: { text: string; url: string }[][] };
        } = {
          chat_id: targetChatId,
          text: text,
          parse_mode: 'Markdown'
        };

        if (telegramOptions?.buttons && telegramOptions.buttons.length > 0) {
          payload.reply_markup = {
            inline_keyboard: [
              telegramOptions.buttons.map(b => ({ text: b.text, url: b.url }))
            ]
          };
        }

        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.error("Telegram send error:", err));
      }
    }
  }, [state.settings]);

  const updateSettings = useCallback((s: Partial<AppState["settings"]>) => {
    const newSettings = { ...state.settings, ...s };
    setDoc(doc(db, "settings", "main"), newSettings);
  }, [state.settings]);

  // Periodic Briefs Checker
  useEffect(() => {
    if (!state.settings.enableTelegram || !state.settings.telegramBotToken || !state.settings.telegramChatId || !currentUser) return;
    
    // Only the admin or first active user should trigger global briefs to avoid duplicates
    const isAdmin = currentUser.role === "admin";
    if (!isAdmin) return;

    const checkBriefs = async () => {
      const now = new Date();
      const today = now.toLocaleDateString('en-CA');
      const hour = now.getHours();
      const settings = state.settings;

      // 1. Morning Brief (9:00 AM)
      if (hour >= 9 && hour < 21 && settings.lastMorningBriefDate !== today) {
        const activeTasks = state.tasks.filter(t => t.status !== 'done');
        const picStats = new Map<string, { dueToday: number, overdue: number }>();
        
        activeTasks.forEach(t => {
          const isOverdue = t.deadline && t.deadline < today;
          const isToday = t.deadline === today;
          if (isOverdue || isToday) {
            t.picIds.forEach(pid => {
              const current = picStats.get(pid) || { dueToday: 0, overdue: 0 };
              picStats.set(pid, { 
                dueToday: current.dueToday + (isToday ? 1 : 0), 
                overdue: current.overdue + (isOverdue ? 1 : 0) 
              });
            });
          }
        });

        if (picStats.size > 0) {
          let msg = `☀️ *BẢN TIN SÁNG ${today}*\n\n`;
          picStats.forEach((stats, pid) => {
            const user = state.users.find(u => u.id === pid);
            if (user) {
              msg += `👤 *${user.fullName}*: Bạn có *${stats.dueToday + stats.overdue}* task cần giải quyết (trong đó *${stats.overdue}* quá hạn).\n`;
            }
          });
          msg += `\nChúc cả nhà một ngày năng suất! 💪`;
          
          await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: settings.telegramChatId, text: msg, parse_mode: 'Markdown' })
          });
        }
        updateSettings({ lastMorningBriefDate: today });
      }

      // 2. Nightly Brief (11:00 PM)
      if (hour >= 23 && settings.lastNightlyBriefDate !== today) {
        const todayCompleted = state.tasks.filter(t => t.status === 'done' && t.completedAt?.split('T')[0] === today);
        const pending = state.tasks.filter(t => t.status !== 'done');
        
        const picStats = new Map<string, { completed: number, pending: number, overdue: number }>();
        
        // Count completed
        todayCompleted.forEach(t => {
          t.picIds.forEach(pid => {
            const s = picStats.get(pid) || { completed: 0, pending: 0, overdue: 0 };
            picStats.set(pid, { ...s, completed: s.completed + 1 });
          });
        });

        // Count pending
        pending.forEach(t => {
          const isOverdue = t.deadline && t.deadline < today;
          t.picIds.forEach(pid => {
            const s = picStats.get(pid) || { completed: 0, pending: 0, overdue: 0 };
            picStats.set(pid, { ...s, pending: s.pending + 1, overdue: s.overdue + (isOverdue ? 1 : 0) });
          });
        });

        if (picStats.size > 0) {
          let msg = `🌙 *BÁO CÁO CUỐI NGÀY ${today}*\n\n`;
          picStats.forEach((s, pid) => {
            const user = state.users.find(u => u.id === pid);
            if (user) {
              msg += `👤 *${user.fullName}*: Hoàn thành *${s.completed}* task. Còn *${s.pending}* task cần xử lý (trong đó *${s.overdue}* quá hạn).\n`;
            }
          });
          msg += `\nChúc cả nhà ngủ ngon! 😴`;
          
          await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: settings.telegramChatId, text: msg, parse_mode: 'Markdown' })
          });
        }
        updateSettings({ lastNightlyBriefDate: today });
      }
    };

    const checkReminders = async () => {
      const settings = state.settings;
      if (!settings.enableTelegram || !settings.adminTelegramBotToken || !settings.adminTelegramChatId) return;

      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA');
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      state.schedules.forEach(slot => {
        // Only remind for busy slots or confirmed bookings
        const isRelevant = slot.type === 'busy' || slot.bookingStatus === 'confirmed';
        if (isRelevant && slot.date === todayStr && !slot.reminded) {
          const [h, m] = slot.startTime.split(':').map(Number);
          const slotTimeMinutes = h * 60 + m;
          const diff = slotTimeMinutes - nowMinutes;

          // Remind 15 minutes before
          if (diff > 0 && diff <= 15) {
            const msg = `⏰ *NHẮC LỊCH HẸN SẮP TỚI*\n\n📌 *Lịch*: ${slot.title}\n🕒 *Thời gian*: ${slot.startTime} - ${slot.endTime}\n${slot.description ? `📝 *Mô tả*: ${slot.description}` : ''}\n\nĐừng quên nhé! 🚀`;
            
            fetch(`https://api.telegram.org/bot${settings.adminTelegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: settings.adminTelegramChatId, text: msg, parse_mode: 'Markdown' })
            }).catch(err => console.error("Reminder error:", err));
            
            // Mark as reminded in Firestore
            updateDoc(doc(db, "schedules", slot.id), { reminded: true });
          }
        }
      });
    };

    const interval = setInterval(() => {
      checkBriefs();
      checkReminders();
    }, 60000 * 5); // Check every 5 mins
    checkBriefs();
    checkReminders();
    return () => clearInterval(interval);
  }, [state.settings, state.tasks, state.users, currentUser, updateSettings]);

  const markNotificationRead = useCallback((id: string) => updateDoc(doc(db, "notifications", id), { read: true }), []);
  const markAllNotificationsRead = useCallback((userId: string) => {
    state.notifications.forEach(n => {
      if (n.userId === userId && !n.read) updateDoc(doc(db, "notifications", n.id), { read: true });
    });
  }, [state.notifications]);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const addTask = useCallback((task: Omit<Task, "id" | "createdAt" | "subTasks">): Task => {
    const finalPicIds = uniqueIds(task.picIds ?? (task.picId ? [task.picId] : []));
    const adminIds = state.users.filter(u => u.role === "admin").map(u => u.id);
    const finalWatcherIds = uniqueIds([...(task.watcherIds ?? []), ...adminIds])
      .filter(id => !finalPicIds.includes(id));

    const newTask: Task = {
      ...task, 
      id: genId("task"), 
      subTasks: [], 
      createdAt: new Date().toISOString(),
      picIds: finalPicIds,
      watcherIds: finalWatcherIds,
      picId: finalPicIds[0] ?? "", // Ensure fallback for old code
    };
    setDoc(doc(db, "tasks", newTask.id), newTask);

    // Specialized Telegram Assignment Message
    const settings = state.settings;
    if (settings.enableTelegram && settings.telegramBotToken && settings.telegramChatId) {
      const picNames = finalPicIds.map(pid => state.users.find(u => u.id === pid)?.fullName || pid).join(", ");
      const teleMsg = `🚀 *TASK MỚI ĐƯỢC GIAO*\n\n📌 *Nội dung*: ${newTask.title}\n👤 *Giao cho*: ${picNames}\n📅 *Deadline*: ${newTask.deadline || "Không có"}\n\nChúc các bạn hoàn thành tốt công việc!`;
      
      fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: settings.telegramChatId, text: teleMsg, parse_mode: 'Markdown' })
      }).catch(err => console.error("Telegram assignment error:", err));
    }

    finalPicIds.forEach(uid => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: uid, title: "Công việc mới",
        body: `Bạn vừa được giao task mới: "${newTask.title}"`,
        type: "task", read: false, taskId: newTask.id, createdAt: new Date().toISOString()
      });
    });
    finalWatcherIds.forEach(uid => {
      const nId = genId("notif");
      setDoc(doc(db, "notifications", nId), {
        id: nId, userId: uid, title: "Theo dõi công việc mới",
        body: `Bạn được thêm vào danh sách theo dõi task: "${newTask.title}"`,
        type: "task", read: false, taskId: newTask.id, createdAt: new Date().toISOString()
      });
    });
    return newTask;
  }, [state.users]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    const adminIds = state.users.filter(u => u.role === "admin").map(u => u.id);
    const nextPicIds = updates.picIds ?? task.picIds ?? [];
    const normalizedUpdates: Partial<Task> = { ...updates };
    if (updates.watcherIds || updates.picIds) {
      normalizedUpdates.watcherIds = uniqueIds([...(updates.watcherIds ?? task.watcherIds ?? []), ...adminIds])
        .filter(uid => !nextPicIds.includes(uid));
    }

    const p = updateDoc(doc(db, "tasks", id), { ...normalizedUpdates, updatedAt: new Date().toISOString() });
    
    // Calculate what changed to provide better notification
    let changeLog = "";
    if (normalizedUpdates.status && normalizedUpdates.status !== task.status) changeLog += `\n- Trạng thái: ${task.status} ➔ ${normalizedUpdates.status}`;
    if (normalizedUpdates.deadline && normalizedUpdates.deadline !== task.deadline) changeLog += `\n- Deadline: ${task.deadline} ➔ ${normalizedUpdates.deadline}`;
    if (normalizedUpdates.title && normalizedUpdates.title !== task.title) changeLog += `\n- Tên mới: ${normalizedUpdates.title}`;
    if (normalizedUpdates.description && normalizedUpdates.description !== task.description) changeLog += `\n- Mô tả mới: ${normalizedUpdates.description}`;

    // Notify participants about the edit
    getTaskParticipantIds(task).forEach(uid => {
      addNotification({
        userId: uid,
        title: "Cập nhật công việc",
        body: `Công việc "${task.title}" vừa có thay đổi:${changeLog || "\n- Thông tin chung"}`,
        type: "task",
        read: false,
        taskId: id
      });
    });
    return p;
  }, [state.tasks, state.users, addNotification]);

  const deleteTask = useCallback((id: string) => deleteDoc(doc(db, "tasks", id)), []);
  
  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task || task.status === status) return;
    const updates: Partial<Task> = { status, updatedAt: new Date().toISOString() };
    if (status === "done") updates.completedAt = new Date().toISOString();
    
    updateDoc(doc(db, "tasks", id), updates);

    if (status === "review") {
      state.users.filter(u => u.role === "admin" || u.role === "assistant").forEach(a => {
        const nId = genId("notif");
        setDoc(doc(db, "notifications", nId), {
          id: nId, userId: a.id, title: "Task cần duyệt",
          body: `Công việc "${task.title}" đã được chuyển sang chờ duyệt.`,
          type: "task", read: false, taskId: task.id, createdAt: new Date().toISOString(),
        });
      });
    } else if (status === "done" || status === "todo") {
      getTaskParticipantIds(task).forEach(uid => {
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
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newComment: TaskComment = { ...comment, id: genId("msg"), createdAt: new Date().toISOString() };
    updateDoc(doc(db, "tasks", taskId), {
      comments: arrayUnion(newComment)
    });

    // Notify all participants except the commenter
    const commenter = state.users.find(u => u.id === comment.userId);
    getTaskParticipantIds(task).forEach(uid => {
      if (uid !== comment.userId) {
        addNotification({
          userId: uid,
          title: "Bình luận mới",
          body: `${commenter?.fullName || "Ai đó"} vừa bình luận trong task "${task.title}"`,
          type: "task",
          read: false,
          taskId
        });
      }
    });
  }, [state.tasks, state.users]);

  // ── SubTasks ──────────────────────────────────────────────────────────────
  const addSubTask = useCallback((taskId: string, subTask: Omit<SubTask, "id" | "taskId">) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSub: SubTask = { ...subTask, id: genId("st"), taskId, picIds: subTask.picIds ?? [] };
    updateDoc(doc(db, "tasks", taskId), { subTasks: [...task.subTasks, newSub] });

    // Notify task participants about new sub-task
    getTaskParticipantIds(task).forEach(uid => {
      addNotification({
        userId: uid,
        title: "Công việc phụ mới",
        body: `Thêm sub-task "${newSub.content}" vào công việc "${task.title}"`,
        type: "subtask",
        read: false,
        taskId
      });
    });
  }, [state.tasks, addNotification]);

  const updateSubTask = useCallback((taskId: string, subTaskId: string, updates: Partial<SubTask>) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubs = task.subTasks.map(st => st.id === subTaskId ? { ...st, ...updates } : st);
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });

    if (updates.status === "done") {
      const st = task.subTasks.find(st => st.id === subTaskId);
      if (st && st.status !== "done") {
        getTaskParticipantIds(task).forEach(uid => {
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
    const st = task.subTasks.find(s => s.id === subTaskId);
    if (!st) return;

    const newComment: TaskComment = { ...comment, id: genId("msg"), createdAt: new Date().toISOString() };
    const newSubs = task.subTasks.map(sub => 
      sub.id === subTaskId ? { ...sub, comments: [...(sub.comments || []), newComment] } : sub
    );
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });

    // Notify sub-task PICs and main task PICs
    const admins = state.users.filter(u => u.role === "admin");
    const targets = new Set([...getTaskParticipantIds(task), ...(st.picIds ?? []), ...admins.map(a => a.id)]);
    const commenter = state.users.find(u => u.id === comment.userId);

    targets.forEach(uid => {
      if (uid !== comment.userId) {
        addNotification({
          userId: uid,
          title: "Thảo luận sub-task",
          body: `${commenter?.fullName || "Ai đó"} bình luận về "${st.content}"`,
          type: "subtask",
          read: false,
          taskId
        });
      }
    });
  }, [state.tasks, state.users, addNotification]);

  // ── Sub-task Acceptance Flow ───────────────────────────────────────────────
  const submitSubTaskReview = useCallback((taskId: string, subTaskId: string, note: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const submittedAt = new Date().toISOString();
    const newSubs = task.subTasks.map(st => st.id === subTaskId ? { ...st, status: "reviewing" as const, submissionNote: note, submittedAt } : st);
    updateDoc(doc(db, "tasks", taskId), { subTasks: newSubs });
    
    const st = task.subTasks.find(s => s.id === subTaskId);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // 1. Send ONE Telegram notification to Admin Chat (Private)
    addNotification({
      userId: "system", // Not specific to one user for Telegram
      title: "Sub-task gửi nghiệm thu",
      body: `Nhân viên gửi yêu cầu duyệt: "${st?.content}"\nTrong task: "${task.title}"\nGhi chú: ${note || "Không có"}`,
      type: "subtask",
      read: false,
      taskId: task.id
    }, {
      buttons: [
        { text: "Duyệt nhanh ✅", url: `${origin}/dashboard/tasks?taskId=${task.id}&subTaskId=${subTaskId}&action=approve` },
        { text: "Xem chi tiết 🔍", url: `${origin}/dashboard/tasks?taskId=${task.id}` }
      ]
    });

    // 2. Send In-App notifications to each admin/assistant (Silent on Telegram to avoid duplicates)
    state.users.filter(u => u.role === "admin" || u.role === "assistant").forEach(a => {
      addNotification({
        userId: a.id,
        title: "Sub-task gửi nghiệm thu",
        body: `Nhân viên gửi yêu cầu duyệt: "${st?.content}"`,
        type: "subtask",
        read: false,
        taskId: task.id
      }, { silent: true });
    });
  }, [state.tasks, state.users, addNotification]);

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

  // ── Recruitment ───────────────────────────────────────────────────────────
  const addRecruitmentLog = useCallback((log: Omit<RecruitmentLog, "id" | "createdAt">) => {
    const id = genId("rclog");
    setDoc(doc(db, "recruitmentLogs", id), { ...log, id, createdAt: new Date().toISOString() });
  }, []);
  const deleteRecruitmentLog = useCallback((id: string) => deleteDoc(doc(db, "recruitmentLogs", id)), []);

  // ── Social Content ────────────────────────────────────────────────────────
  const addSocialContent = useCallback((content: Omit<SocialContent, "id" | "createdAt" | "updatedAt">) => {
    const id = genId("content");
    const now = new Date().toISOString();
    setDoc(doc(db, "socialContents", id), { ...content, id, createdAt: now, updatedAt: now });
  }, []);
  const updateSocialContent = useCallback((id: string, updates: Partial<SocialContent>) => {
    updateDoc(doc(db, "socialContents", id), { ...updates, updatedAt: new Date().toISOString() });
  }, []);
  const deleteSocialContent = useCallback((id: string) => deleteDoc(doc(db, "socialContents", id)), []);

  // ── CRM ───────────────────────────────────────────────────────────────────
  const addContact = useCallback((contact: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    const id = genId("contact");
    const now = new Date().toISOString();
    setDoc(doc(db, "contacts", id), { ...contact, id, createdAt: now, updatedAt: now });
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    updateDoc(doc(db, "contacts", id), { ...updates, updatedAt: new Date().toISOString() });
  }, []);

  const deleteContact = useCallback((id: string) => deleteDoc(doc(db, "contacts", id)), []);

  const addDeal = useCallback((deal: Omit<Deal, "id" | "createdAt" | "updatedAt">) => {
    const id = genId("deal");
    const now = new Date().toISOString();
    setDoc(doc(db, "deals", id), { ...deal, id, createdAt: now, updatedAt: now });
  }, []);

  const updateDeal = useCallback((id: string, updates: Partial<Deal>) => {
    updateDoc(doc(db, "deals", id), { ...updates, updatedAt: new Date().toISOString() });
  }, []);

  const deleteDeal = useCallback((id: string) => deleteDoc(doc(db, "deals", id)), []);

  const updateDealStage = useCallback((id: string, stage: DealStage) => {
    const updates: Partial<Deal> = { stage, updatedAt: new Date().toISOString() };
    if (stage === "closed_won" || stage === "closed_lost") {
      updates.closedAt = new Date().toISOString();
      updates.probability = stage === "closed_won" ? 100 : 0;
    }
    updateDoc(doc(db, "deals", id), updates);
  }, []);

  const addCrmActivity = useCallback((activity: Omit<CrmActivity, "id" | "createdAt">) => {
    const id = genId("crmact");
    setDoc(doc(db, "crmActivities", id), { ...activity, id, createdAt: new Date().toISOString() });
  }, []);

  const updateCrmActivity = useCallback((id: string, updates: Partial<CrmActivity>) => {
    updateDoc(doc(db, "crmActivities", id), updates);
  }, []);

  const deleteCrmActivity = useCallback((id: string) => deleteDoc(doc(db, "crmActivities", id)), []);

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
  
  // ── Projects ──────────────────────────────────────────────────────────────
  const addProject = useCallback((project: Omit<Project, "id" | "createdAt">) => {
    const id = genId("proj");
    setDoc(doc(db, "projects", id), { ...project, id, createdAt: new Date().toISOString() });
  }, []);
  const updateProject = useCallback((id: string, updates: Partial<Project>) => updateDoc(doc(db, "projects", id), updates), []);
  const deleteProject = useCallback((id: string) => deleteDoc(doc(db, "projects", id)), []);

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

  // ── Personal Notes ──────────────────────────────────────────────────────────
  const addPersonalNote = useCallback((note: Omit<PersonalNote, "id" | "createdAt" | "userId">) => {
    if (!currentUser) return;
    const id = genId("pnote");
    setDoc(doc(db, "personalNotes", id), {
      ...note, id, userId: currentUser.id, createdAt: new Date().toISOString()
    });
  }, [currentUser]);

  const updatePersonalNote = useCallback((id: string, updates: Partial<PersonalNote>) => 
    updateDoc(doc(db, "personalNotes", id), updates), []);

  const deletePersonalNote = useCallback((id: string) => deleteDoc(doc(db, "personalNotes", id)), []);

  // ── Strategy Board ───────────────────────────────────────────────────────
  const addStrategyCard = useCallback((card: Omit<StrategyCard, "id" | "createdAt" | "updatedAt">) => {
    const id = genId("strat");
    const now = new Date().toISOString();
    setDoc(doc(db, "strategyCards", id), { ...card, id, createdAt: now, updatedAt: now });
  }, []);

  const updateStrategyCard = useCallback((id: string, updates: Partial<StrategyCard>) => {
    updateDoc(doc(db, "strategyCards", id), { ...updates, updatedAt: new Date().toISOString() });
  }, []);

  const deleteStrategyCard = useCallback((id: string) => deleteDoc(doc(db, "strategyCards", id)), []);

  // ── Master Prompt AI ──────────────────────────────────────────────────────
  const addPromptCard = useCallback((card: Omit<PromptCard, "id" | "createdAt" | "updatedAt">) => {
    const id = genId("prompt");
    const now = new Date().toISOString();
    setDoc(doc(db, "promptCards", id), { ...card, id, createdAt: now, updatedAt: now });
  }, []);

  const updatePromptCard = useCallback((id: string, updates: Partial<PromptCard>) => {
    updateDoc(doc(db, "promptCards", id), { ...updates, updatedAt: new Date().toISOString() });
  }, []);

  const deletePromptCard = useCallback((id: string) => deleteDoc(doc(db, "promptCards", id)), []);

  // ── Accounts ──────────────────────────────────────────────────────────────
  const addAccount = useCallback((acc: Omit<Account, "id" | "createdAt">) => {
    const id = genId("acc");
    setDoc(doc(db, "accounts", id), { ...acc, id, createdAt: new Date().toISOString() });
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    updateDoc(doc(db, "accounts", id), updates);
  }, []);

  const deleteAccount = useCallback((id: string) => deleteDoc(doc(db, "accounts", id)), []);

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
        updateSettings,
        addTaskComment, addSubTaskComment,
        addScheduleSlot, updateScheduleSlot, deleteScheduleSlot,
        requestBooking, suggestBooking, confirmBooking, rejectBooking,
        addPersonalNote, updatePersonalNote, deletePersonalNote,
        addStrategyCard, updateStrategyCard, deleteStrategyCard,
        addPromptCard, updatePromptCard, deletePromptCard,
        addProject, updateProject, deleteProject,
        addAccount, updateAccount, deleteAccount,
        addRecruitmentLog, deleteRecruitmentLog,
        addSocialContent, updateSocialContent, deleteSocialContent,
        addContact, updateContact, deleteContact,
        addDeal, updateDeal, deleteDeal, updateDealStage,
        addCrmActivity, updateCrmActivity, deleteCrmActivity
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
