// =============================================================================
// TYPE DEFINITIONS — Nero Ops System (v2)
// =============================================================================

export type UserRole = "admin" | "assistant" | "employee";
export type TaskStatus = "todo" | "inprogress" | "review" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type SubTaskStatus = "pending" | "reviewing" | "done";
export type Theme = "dark" | "light";

// ─── User / HR ───────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  month: string; // "2026-04"
  workDays: number;
  leaveDays: number;
  totalWorkingDays: number;
}

export interface CheckInRecord {
  id: string;
  userId: string;
  date: string; // "2026-04-05"
  checkIn: string; // "08:30"
  checkOut?: string; // "17:30"
  note?: string;
  status: "present" | "late" | "early_leave" | "absent";
}

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  brandIds?: string[]; // empty/undefined means no brand restriction
  avatar?: string;
  department?: string;
  baseSalary: number;
  bonus: number;
  penalty: number;
  attendance: AttendanceRecord[];
  createdAt: string;
  shiftStart?: string; // e.g. "08:30"
  shiftEnd?: string;   // e.g. "17:30"
}

// ─── Brand / KPI ─────────────────────────────────────────────────────────────
export interface KPILogEntry {
  id: string;
  kpiId: string;
  brandId: string;
  userId: string;
  date: string; // "2026-04-05"
  value: number;
  note?: string;
}

export interface KPI {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string; // "VNĐ", "Lượt", "%", "Follower"
}

export interface BrandPhasePerformance {
  phase: 1 | 2 | 3;
  target: number;
  actual: number;
}

export interface BrandMonthlyPerformance {
  id: string;
  month: string; // "2026-07"
  targetTotal: number;
  actualTotal: number;
  phases: BrandPhasePerformance[];
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  color: string;
  description?: string;
  budget: number;
  kpis: KPI[];
  monthlyPhases?: BrandMonthlyPerformance[];
  createdAt: string;
}

// ─── Project (Short-term campaigns) ──────────────────────────────────────────
export interface Project {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: "active" | "completed" | "archived";
  createdAt: string;
}

// ─── Comments ────────────────────────────────────────────────────────────────
export interface TaskComment {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string; // Optional image attachment
  createdAt: string;
}

// ─── Task / Sub-task ─────────────────────────────────────────────────────────
export interface SubTask {
  id: string;
  taskId: string;
  content: string;
  deadline: string;
  status: SubTaskStatus;
  acceptanceNotes: string;    // Admin's sign-off note
  submissionNote?: string;    // Employee's note when submitting for review
  submittedAt?: string;       // Time of submission for review
  rejectReason?: string;      // Admin's reason for rejection
  picIds: string[];           // multiple PICs
  comments?: TaskComment[];
}

// ─── Nero Schedule ────────────────────────────────────────────────────────────
export interface ScheduleSlot {
  id: string;
  date: string;          // "2026-04-07"
  startTime: string;     // "09:00"
  endTime: string;       // "10:00"
  title: string;         // Admin internal — employees CANNOT see this
  description?: string;  // Admin internal — employees CANNOT see this
  type: "busy" | "available";
  bookingUserId?: string;
  bookingRequest?: string;
  bookingStatus?: "pending" | "confirmed" | "rejected";
  reminded?: boolean; // Track if Telegram reminder was sent
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  brandId: string;
  picIds: string[]; // multiple PICs
  watcherIds?: string[]; // users who follow updates but are not accountable for work
  startDate: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  subTasks: SubTask[];
  comments?: TaskComment[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  projectId?: string; // Link to a short-term project
  // keep picId for backward compat
  picId?: string;
}

// ─── Notification ────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "task" | "subtask" | "kpi" | "checkin" | "system";
  read: boolean;
  taskId?: string;
  url?: string; // Target URL for deep-linking
  createdAt: string;
}

// ─── Personal Note ──────────────────────────────────────────────────────────
export interface PersonalNote {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  targetDate?: string; // YYYY-MM-DD
  createdAt: string;
}

// ─── Strategy Board ──────────────────────────────────────────────────────────
export type StrategyTag = "idea" | "plan" | "campaign" | "okr" | "insight";
export type StrategyStatus = "draft" | "researching" | "executing" | "done";

export interface StrategyCard {
  id: string;
  title: string;
  content: string;
  tag: StrategyTag;
  status: StrategyStatus;
  priority: "normal" | "important" | "critical";
  brandId?: string;
  timeline?: string;  // Target date ISO string
  pinned: boolean;
  createdAt: string;
}

// ─── Master Prompt AI ────────────────────────────────────────────────────────
export interface PromptCard {
  id: string;
  title: string;
  description?: string;
  promptText: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Recruitment Activity ───────────────────────────────────────────────────
export interface RecruitmentLog {
  id: string;
  brandId: string;
  userId: string;
  date: string;       // ISO Date
  groupName: string;
  postLink: string;
  commentCount: number;
  cvCount: number;
  note?: string;
  createdAt: string;
}

// ─── Social Content ─────────────────────────────────────────────────────────
export type ContentStatus = "draft" | "writing" | "designing" | "pending" | "approved" | "scheduled" | "posted";
export type ContentPlatform = "facebook" | "tiktok" | "instagram" | "youtube" | "other";

export interface SocialContent {
  id: string;
  brandId: string;
  title: string;
  description?: string;
  platform: ContentPlatform;
  status: ContentStatus;
  postDate: string; // ISO string with date and time
  pillar?: string; // Content pillar
  contentLink?: string;
  assetLink?: string;
  contentPicId?: string; // PIC for content writing
  designPicId?: string;  // PIC for design/media
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── App State ───────────────────────────────────────────────────────────────
export interface Account {
  id: string;
  name: string;
  platform: string; // e.g. "Facebook", "Gmail", "ChatGPT"
  category: "social" | "resource" | "other";
  username: string;
  password: string;
  brandId?: string;
  notes?: string;
  url?: string;
  createdAt: string;
}

// ─── CRM ────────────────────────────────────────────────────────────────────
export type ContactStatus = "new" | "active" | "nurturing" | "inactive" | "churned";
export type LeadSource = "linkedin" | "referral" | "website" | "event" | "cold_outreach" | "other";
export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
export type CrmActivityType = "call" | "email" | "meeting" | "note" | "task";

export interface Contact {
  id: string;
  fullName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  status: ContactStatus;
  source: LeadSource;
  value: number;
  ownerId: string;
  brandId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Deal {
  id: string;
  name: string;
  contactId: string;
  company: string;
  value: number;
  stage: DealStage;
  probability: number;
  ownerId: string;
  brandId?: string;
  projectId?: string;
  expectedCloseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
}

export interface CrmActivity {
  id: string;
  type: CrmActivityType;
  title: string;
  contactId?: string;
  dealId?: string;
  brandId?: string;
  userId: string;
  date: string;
  note?: string;
  createdAt: string;
}

export interface AppState {
  users: User[];
  brands: Brand[];
  tasks: Task[];
  checkIns: CheckInRecord[];
  kpiLogs: KPILogEntry[];
  notifications: Notification[];
  schedules: ScheduleSlot[];
  accounts: Account[];
  personalNotes: PersonalNote[];
  strategyCards: StrategyCard[];
  promptCards: PromptCard[];
  projects: Project[];
  recruitmentLogs: RecruitmentLog[];
  socialContents: SocialContent[];
  contacts: Contact[];
  deals: Deal[];
  crmActivities: CrmActivity[];
  theme: Theme;
  settings: {
    telegramBotToken?: string;
    telegramChatId?: string;
    adminTelegramBotToken?: string;
    adminTelegramChatId?: string;
    enableTelegram?: boolean;
    lastMorningBriefDate?: string; // YYYY-MM-DD
    lastNightlyBriefDate?: string; // YYYY-MM-DD
  };
}

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
}

// ─── Filter / View ───────────────────────────────────────────────────────────
export type TaskView = "work" | "list" | "board" | "calendar";

export interface TaskFilters {
  brandId: string;
  picId: string;
  status: string;
  priority: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  showHistory: boolean;
  projectId: string;
}
