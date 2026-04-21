import { User, Brand, Task, SubTask, AppState, ScheduleSlot, PersonalNote } from "./types";

// =============================================================================
// MOCK DATA — Nero Ops System v2
// =============================================================================

export const INITIAL_USERS: User[] = [
  {
    id: "user-001",
    username: "admin",
    password: "admin123",
    fullName: "Trần Hoàng Admin",
    role: "admin",
    department: "Ban Giám Đốc",
    baseSalary: 25_000_000,
    bonus: 5_000_000,
    penalty: 0,
    attendance: [
      { month: "2026-03", workDays: 26, leaveDays: 0, totalWorkingDays: 26 },
      { month: "2026-04", workDays: 20, leaveDays: 1, totalWorkingDays: 26 },
    ],
    createdAt: "2025-01-15T08:00:00Z",
  },
  {
    id: "user-002",
    username: "nguyen.van.a",
    password: "pass123",
    fullName: "Nguyễn Văn An",
    role: "employee",
    department: "Marketing",
    baseSalary: 15_000_000,
    bonus: 2_000_000,
    penalty: 500_000,
    attendance: [
      { month: "2026-03", workDays: 24, leaveDays: 2, totalWorkingDays: 26 },
      { month: "2026-04", workDays: 18, leaveDays: 2, totalWorkingDays: 26 },
    ],
    createdAt: "2025-03-01T08:00:00Z",
  },
  {
    id: "user-003",
    username: "tran.thi.b",
    password: "pass123",
    fullName: "Trần Thị Bích",
    role: "employee",
    department: "Content & Creative",
    baseSalary: 14_000_000,
    bonus: 1_500_000,
    penalty: 0,
    attendance: [
      { month: "2026-03", workDays: 26, leaveDays: 0, totalWorkingDays: 26 },
      { month: "2026-04", workDays: 21, leaveDays: 0, totalWorkingDays: 26 },
    ],
    createdAt: "2025-05-15T08:00:00Z",
  },
];

export const INITIAL_BRANDS: Brand[] = [
  {
    id: "brand-001",
    name: "Nero Coffee",
    color: "#3b82f6",
    description: "Chuỗi cà phê cao cấp - phân khúc premium",
    budget: 50_000_000,
    kpis: [
      { id: "kpi-001-1", name: "Doanh số tháng", target: 200_000_000, current: 145_000_000, unit: "VNĐ" },
      { id: "kpi-001-2", name: "Lượt traffic website", target: 50_000, current: 32_400, unit: "Lượt" },
      { id: "kpi-001-3", name: "Followers Instagram", target: 20_000, current: 17_800, unit: "Follower" },
    ],
    createdAt: "2025-01-20T08:00:00Z",
  },
  {
    id: "brand-002",
    name: "Luxe Fashion",
    color: "#8b5cf6",
    description: "Thương hiệu thời trang Luxury - Made in Vietnam",
    budget: 80_000_000,
    kpis: [
      { id: "kpi-002-1", name: "Doanh số tháng", target: 500_000_000, current: 312_000_000, unit: "VNĐ" },
      { id: "kpi-002-2", name: "Tỷ lệ chuyển đổi", target: 5, current: 3.2, unit: "%" },
      { id: "kpi-002-3", name: "Followers TikTok", target: 100_000, current: 67_000, unit: "Follower" },
    ],
    createdAt: "2025-02-10T08:00:00Z",
  },
];

const st = (o: Omit<SubTask, "picIds">): SubTask => ({ ...o, picIds: [] });

const SUBTASKS_TASK1: SubTask[] = [
  st({ id: "st-001-1", taskId: "task-001", content: "Phân tích insight khách hàng mục tiêu Q2/2026", deadline: "2026-04-08", status: "done", acceptanceNotes: "Đã xong, tài liệu lưu Drive /NeroCoffee/Research/Q2" }),
  st({ id: "st-001-2", taskId: "task-001", content: "Lên concept nội dung cho 12 post Instagram", deadline: "2026-04-12", status: "done", acceptanceNotes: "Admin đã duyệt concept ngày 10/04" }),
  st({ id: "st-001-3", taskId: "task-001", content: "Thiết kế hình ảnh và viết caption hoàn chỉnh", deadline: "2026-04-18", status: "pending", acceptanceNotes: "" }),
  st({ id: "st-001-4", taskId: "task-001", content: "Lên lịch đăng và theo dõi engagement", deadline: "2026-04-25", status: "pending", acceptanceNotes: "" }),
];

const SUBTASKS_TASK2: SubTask[] = [
  st({ id: "st-002-1", taskId: "task-002", content: "Khảo sát địa điểm và đánh giá chi phí setup", deadline: "2026-04-07", status: "done", acceptanceNotes: "Đã xác nhận 3 địa điểm tiềm năng tại Q1, Q3, Bình Thạnh" }),
  st({ id: "st-002-2", taskId: "task-002", content: "Thiết kế booth pop-up và vật liệu in ấn", deadline: "2026-04-14", status: "done", acceptanceNotes: "Đã in xong, chờ nhận hàng từ xưởng in" }),
  st({ id: "st-002-3", taskId: "task-002", content: "Phối hợp với đội event tổ chức và livestream", deadline: "2026-04-20", status: "done", acceptanceNotes: "Sự kiện thành công, đạt 2.3K view livestream" }),
];

const SUBTASKS_TASK3: SubTask[] = [
  st({ id: "st-003-1", taskId: "task-003", content: "Viết brief và brief agency thiết kế lookbook", deadline: "2026-04-10", status: "done", acceptanceNotes: "Agency đã nhận brief và confirm timeline" }),
  st({ id: "st-003-2", taskId: "task-003", content: "Duyệt mẫu thiết kế lookbook (2 vòng revise)", deadline: "2026-04-18", status: "pending", acceptanceNotes: "" }),
  st({ id: "st-003-3", taskId: "task-003", content: "Đăng lookbook lên website, email campaign và mạng xã hội", deadline: "2026-04-25", status: "pending", acceptanceNotes: "" }),
];

const SUBTASKS_TASK4: SubTask[] = [
  st({ id: "st-004-1", taskId: "task-004", content: "Thu thập data Google Analytics Q1/2026", deadline: "2026-04-05", status: "done", acceptanceNotes: "Đã export báo cáo GA4, lưu tại Drive /Reports/Q1" }),
  st({ id: "st-004-2", taskId: "task-004", content: "Phân tích và lập báo cáo KPI tháng 3", deadline: "2026-04-08", status: "done", acceptanceNotes: "Báo cáo hoàn thành, đã gửi Admin review" }),
  st({ id: "st-004-3", taskId: "task-004", content: "Trình bày kết quả và đề xuất chiến lược Q2", deadline: "2026-04-12", status: "done", acceptanceNotes: "Đã trình bày meeting 12/04, đề xuất được chấp thuận" }),
];

const SUBTASKS_TASK5: SubTask[] = [
  st({ id: "st-005-1", taskId: "task-005", content: "Tìm kiếm và liên hệ KOLs phù hợp phân khúc coffee", deadline: "2026-04-15", status: "pending", acceptanceNotes: "" }),
  st({ id: "st-005-2", taskId: "task-005", content: "Đàm phán hợp đồng và brief nội dung cho KOLs", deadline: "2026-04-22", status: "pending", acceptanceNotes: "" }),
  st({ id: "st-005-3", taskId: "task-005", content: "Theo dõi và báo cáo kết quả campaign KOL", deadline: "2026-04-30", status: "pending", acceptanceNotes: "" }),
];

const SUBTASKS_TASK6: SubTask[] = [
  st({ id: "st-006-1", taskId: "task-006", content: "Thiết kế UI/UX landing page summer sale", deadline: "2026-04-20", status: "pending", acceptanceNotes: "" }),
  st({ id: "st-006-2", taskId: "task-006", content: "Viết copy và chuẩn bị hình ảnh sản phẩm", deadline: "2026-04-24", status: "pending", acceptanceNotes: "" }),
];

export const INITIAL_TASKS: Task[] = [
  { id: "task-001", title: "Lên kế hoạch Marketing Q2/2026 cho Nero Coffee", description: "Xây dựng chiến lược content marketing toàn diện cho Nero Coffee trong Q2/2026, bao gồm phân tích insight, concept nội dung và lịch đăng bài.", brandId: "brand-001", picId: "user-002", picIds: ["user-002"], startDate: "2026-04-01", deadline: "2026-04-25", status: "inprogress", priority: "high", subTasks: SUBTASKS_TASK1, createdAt: "2026-04-01T08:00:00Z" },
  { id: "task-002", title: "Tổ chức Pop-up Event Nero Coffee tại TP.HCM", description: "Lên kế hoạch và thực hiện pop-up event giới thiệu sản phẩm mới của Nero Coffee tại 3 địa điểm trên địa bàn TP.HCM.", brandId: "brand-001", picId: "user-003", picIds: ["user-003", "user-002"], startDate: "2026-04-01", deadline: "2026-04-20", status: "review", priority: "high", subTasks: SUBTASKS_TASK2, createdAt: "2026-04-02T08:00:00Z" },
  { id: "task-003", title: "Ra mắt BST Summer 2026 — Luxe Fashion", description: "Chuẩn bị và triển khai truyền thông cho bộ sưu tập Summer 2026 của Luxe Fashion, bao gồm lookbook, email campaign và social media.", brandId: "brand-002", picId: "user-002", picIds: ["user-002", "user-003"], startDate: "2026-04-05", deadline: "2026-04-28", status: "inprogress", priority: "high", subTasks: SUBTASKS_TASK3, createdAt: "2026-04-05T08:00:00Z" },
  { id: "task-004", title: "Báo cáo KPI tháng 3 — Nero Coffee", description: "Thu thập, phân tích và trình bày báo cáo KPI tháng 3/2026 cho brand Nero Coffee, đề xuất chiến lược Q2.", brandId: "brand-001", picId: "user-003", picIds: ["user-003"], startDate: "2026-04-03", deadline: "2026-04-12", status: "done", priority: "medium", subTasks: SUBTASKS_TASK4, createdAt: "2026-04-03T08:00:00Z" },
  { id: "task-005", title: "Chiến dịch KOL Marketing — Nero Coffee", description: "Tìm kiếm, liên hệ và triển khai chiến dịch hợp tác với KOLs trong lĩnh vực F&B và lifestyle để quảng bá Nero Coffee.", brandId: "brand-001", picId: "user-002", picIds: ["user-002"], startDate: "2026-04-10", deadline: "2026-04-30", status: "todo", priority: "medium", subTasks: SUBTASKS_TASK5, createdAt: "2026-04-09T08:00:00Z" },
  { id: "task-006", title: "Landing Page Summer Sale — Luxe Fashion", description: "Thiết kế và xây dựng landing page chuyên biệt cho chương trình sale hè 2026 của Luxe Fashion.", brandId: "brand-002", picId: "user-003", picIds: ["user-003"], startDate: "2026-04-15", deadline: "2026-04-30", status: "todo", priority: "low", subTasks: SUBTASKS_TASK6, createdAt: "2026-04-10T08:00:00Z" },
];

export const INITIAL_SCHEDULES: ScheduleSlot[] = [
  // Monday 06/04
  { id: "sch-001", date: "2026-04-06", startTime: "09:00", endTime: "10:30", title: "Họ p chiẽn lược Q2 với BƠĐ", description: "Review kết quả KPI Q1 và lên kế hoạch marketing Q2/2026 cho toàn bộ các brand", type: "busy", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-002", date: "2026-04-06", startTime: "14:00", endTime: "15:00", title: "Gặp đối tác in ấn Booth Event", description: "Duyệt mẫu in ấn cho Pop-up Event Nero Coffee TP.HCM", type: "busy", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-003", date: "2026-04-06", startTime: "16:00", endTime: "17:00", title: "Slot hỗ trợ team", type: "available", createdAt: "2026-04-01T08:00:00Z" },
  // Tuesday 07/04
  { id: "sch-004", date: "2026-04-07", startTime: "09:00", endTime: "11:00", title: "Review báo cáo KPI tháng 3", description: "Xét duyệt báo cáo KPI của các team, phân tích nguyên nhân không đạt target và đề xuất cải thiện", type: "busy", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-005", date: "2026-04-07", startTime: "14:00", endTime: "15:00", title: "Tư vấn chiẽn lược Content", type: "available", bookingUserId: "user-002", bookingRequest: "Em cần tư vấn về chiẽn lược content marketing cho Instagram Nero Coffee tháng 4, đặc biệt về cách tăng engagement và reach organic ạ Nero.", bookingStatus: "pending", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-006", date: "2026-04-07", startTime: "16:00", endTime: "17:00", title: "Slot tư vấn mở", type: "available", createdAt: "2026-04-01T08:00:00Z" },
  // Wednesday 08/04
  { id: "sch-007", date: "2026-04-08", startTime: "10:00", endTime: "12:00", title: "Phỏng vấn ứng viên Content Writer", description: "Phỏng vấn 3 ứng viên vào vị trí Senior Content Writer cho bộ phận Creative", type: "busy", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-008", date: "2026-04-08", startTime: "15:00", endTime: "16:00", title: "Hướng dẫn thiết kế Lookbook", type: "available", bookingUserId: "user-003", bookingRequest: "Kính nhờ Nero hỗ trợ hướng dẫn định hướng thiết kế và visual style cho lookbook Summer 2026 của Luxe Fashion.", bookingStatus: "confirmed", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-009", date: "2026-04-08", startTime: "16:30", endTime: "17:30", title: "Slot tư vấn mở buổi chiều", type: "available", createdAt: "2026-04-01T08:00:00Z" },
  // Thursday 09/04
  { id: "sch-010", date: "2026-04-09", startTime: "09:00", endTime: "10:00", title: "Cuộc gọi với Creative Agency", description: "Brief agency về campaign Luxe Fashion Summer 2026", type: "busy", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-011", date: "2026-04-09", startTime: "14:00", endTime: "15:30", title: "Hỗ trợ Brief KOL Campaign", type: "available", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-012", date: "2026-04-09", startTime: "16:00", endTime: "17:00", title: "Slot tư vấn tự do", type: "available", createdAt: "2026-04-01T08:00:00Z" },
  // Friday 10/04
  { id: "sch-013", date: "2026-04-10", startTime: "09:00", endTime: "10:00", title: "Weekly Team Meeting", description: "Review tiến độ tasks tuần qua, phân công công việc tuần mới", type: "busy", createdAt: "2026-04-01T08:00:00Z" },
  { id: "sch-014", date: "2026-04-10", startTime: "14:00", endTime: "15:00", title: "Tư vấn chiẽn lược thương hiệu", type: "available", createdAt: "2026-04-01T08:00:00Z" },
];

export const INITIAL_APP_STATE: AppState = {
  users: INITIAL_USERS,
  brands: INITIAL_BRANDS,
  tasks: INITIAL_TASKS,
  checkIns: [],
  kpiLogs: [],
  schedules: INITIAL_SCHEDULES,
  notifications: [
    { id: "notif-001", userId: "user-002", title: "Task mới được giao", body: "Bạn vừa được giao task: Chiến dịch KOL Marketing", type: "task", read: false, taskId: "task-005", createdAt: "2026-04-09T09:00:00Z" },
    { id: "notif-002", userId: "user-003", title: "Sub-task sắp đến hạn", body: "Sub-task 'Duyệt mẫu lookbook' đến hạn vào 18/04", type: "subtask", read: false, taskId: "task-003", createdAt: "2026-04-09T10:00:00Z" },
    { id: "notif-003", userId: "user-002", title: "Task chuyển trạng thái Review", body: "Task Pop-up Event đã chuyển sang Review", type: "task", read: true, taskId: "task-002", createdAt: "2026-04-08T15:00:00Z" },
  ],
  personalNotes: [],
  theme: "dark",
};
