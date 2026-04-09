// =============================================================================
// TYPE DEFINITIONS — Nero Ops System (v2)
// =============================================================================

export type UserRole = "admin" | "employee";
export type TaskStatus = "todo" | "inprogress" | "review" | "done";
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

export interface Brand {
  id: string;
  name: string;
  color: string;
  description?: string;
  budget: number;
  kpis: KPI[];
  createdAt: string;
}

// ─── Comments ────────────────────────────────────────────────────────────────
export interface TaskComment {
  id: string;
  userId: string;
  content: string;
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
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  brandId: string;
  picIds: string[]; // multiple PICs
  startDate: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  subTasks: SubTask[];
  comments?: TaskComment[];
  createdAt: string;
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
  createdAt: string;
}

// ─── App State ───────────────────────────────────────────────────────────────
export interface AppState {
  users: User[];
  brands: Brand[];
  tasks: Task[];
  checkIns: CheckInRecord[];
  kpiLogs: KPILogEntry[];
  notifications: Notification[];
  schedules: ScheduleSlot[];
  theme: Theme;
}

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
}

// ─── Filter / View ───────────────────────────────────────────────────────────
export type TaskView = "list" | "board" | "calendar";

export interface TaskFilters {
  brandId: string;
  picId: string;
  status: string;
  priority: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}
