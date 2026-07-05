import { differenceInCalendarDays, isPast, isToday, parseISO } from "date-fns";
import { SubTask, Task } from "@/lib/types";

export type TaskActionScope = "action" | "overdue" | "today" | "review" | "unassigned" | "mine" | "all";
export type UrgencyTone = "red" | "orange" | "purple" | "blue" | "green" | "gray";

const doneStatuses = new Set(["done", "cancelled"]);

function safeDate(value?: string) {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isTaskClosed(task: Task) {
  return doneStatuses.has(task.status);
}

function isSubTaskOpen(subTask: SubTask) {
  return subTask.status !== "done";
}

function getOpenSubTasks(task: Task) {
  return task.subTasks.filter(isSubTaskOpen);
}

function isOverdueDate(value?: string) {
  const date = safeDate(value);
  return !!date && isPast(date) && !isToday(date);
}

function daysUntil(value?: string) {
  const date = safeDate(value);
  if (!date) return null;
  return differenceInCalendarDays(date, new Date());
}

export function getTaskPriorityScore(task: Task) {
  if (isTaskClosed(task)) return -100;

  let score = 0;
  const openSubTasks = getOpenSubTasks(task);
  const overdueSubTasks = openSubTasks.filter((subTask) => isOverdueDate(subTask.deadline));
  const unassignedSubTasks = openSubTasks.filter((subTask) => !subTask.picIds?.length);
  const dueIn = daysUntil(task.deadline);

  if (overdueSubTasks.length) score += 1000 + overdueSubTasks.length * 40;
  if (isOverdueDate(task.deadline)) score += 900;
  if (task.priority === "high") score += 650;
  if (!task.picIds?.length && !task.picId) score += 560;
  if (unassignedSubTasks.length) score += 520 + unassignedSubTasks.length * 20;
  if (task.status === "review" || task.subTasks.some((subTask) => subTask.status === "reviewing")) score += 480;
  if (dueIn === 0) score += 420;
  if (dueIn !== null && dueIn > 0 && dueIn <= 3) score += 320 - dueIn * 20;
  if (openSubTasks.length) score += Math.min(180, openSubTasks.length * 25);
  if (task.status === "todo") score += 40;
  if (task.status === "inprogress") score += 30;

  return score;
}

export function getNextAction(task: Task) {
  const openSubTasks = getOpenSubTasks(task);
  const overdueSubTasks = openSubTasks.filter((subTask) => isOverdueDate(subTask.deadline));
  const unassignedSubTasks = openSubTasks.filter((subTask) => !subTask.picIds?.length);
  const reviewingSubTasks = task.subTasks.filter((subTask) => subTask.status === "reviewing");
  const dueIn = daysUntil(task.deadline);

  if (overdueSubTasks.length && unassignedSubTasks.length) {
    return `Next: ${overdueSubTasks.length} sub-task qu\u00e1 h\u1ea1n, c\u00f3 sub-task ch\u01b0a giao ng\u01b0\u1eddi x\u1eed l\u00fd`;
  }
  if (overdueSubTasks.length) return `Next: ${overdueSubTasks.length} sub-task qu\u00e1 h\u1ea1n`;
  if (isOverdueDate(task.deadline)) return "Next: Task qu\u00e1 h\u1ea1n, c\u1ea7n x\u1eed l\u00fd ngay";
  if (!task.picIds?.length && !task.picId) return "Next: Ch\u01b0a c\u00f3 ng\u01b0\u1eddi x\u1eed l\u00fd";
  if (unassignedSubTasks.length) return `Next: ${unassignedSubTasks.length} sub-task ch\u01b0a giao ng\u01b0\u1eddi`;
  if (task.status === "review" || reviewingSubTasks.length) return "Next: C\u1ea7n duy\u1ec7t tr\u01b0\u1edbc khi ti\u1ebfp t\u1ee5c";
  if (dueIn === 0) return "Next: Deadline h\u00f4m nay";
  if (dueIn !== null && dueIn > 0 && dueIn <= 3) return `Next: C\u00f2n ${dueIn} ng\u00e0y t\u1edbi deadline`;
  if (task.priority === "high" && !isTaskClosed(task)) return "Next: Task \u01b0u ti\u00ean cao ch\u01b0a ho\u00e0n th\u00e0nh";
  if (openSubTasks.length) return `Next: C\u00f2n ${openSubTasks.length} sub-task ch\u01b0a ho\u00e0n th\u00e0nh`;
  if (task.status === "done") return "Next: \u0110\u00e3 ho\u00e0n th\u00e0nh";
  if (task.status === "cancelled") return "Next: \u0110\u00e3 h\u1ee7y";
  return "Next: \u0110ang ch\u1edd ph\u1ea3n h\u1ed3i";
}

export function getTaskPriorityReason(task: Task) {
  const openSubTasks = getOpenSubTasks(task);
  const overdueSubTasks = openSubTasks.filter((subTask) => isOverdueDate(subTask.deadline));
  const unassignedSubTasks = openSubTasks.filter((subTask) => !subTask.picIds?.length);
  const dueIn = daysUntil(task.deadline);
  const reasons: string[] = [];

  if (overdueSubTasks.length) reasons.push(`${overdueSubTasks.length} sub-task qu\u00e1 h\u1ea1n`);
  if (isOverdueDate(task.deadline)) {
    const daysLate = Math.abs(dueIn ?? 0);
    reasons.push(daysLate ? `task qu\u00e1 h\u1ea1n ${daysLate} ng\u00e0y` : "task qu\u00e1 h\u1ea1n");
  }
  if (task.priority === "high" && !isTaskClosed(task)) reasons.push("\u0111\u1ed9 \u01b0u ti\u00ean cao");
  if (!task.picIds?.length && !task.picId) reasons.push("ch\u01b0a c\u00f3 ng\u01b0\u1eddi x\u1eed l\u00fd");
  if (unassignedSubTasks.length) reasons.push(`${unassignedSubTasks.length} sub-task ch\u01b0a giao ng\u01b0\u1eddi`);
  if (task.status === "review" || task.subTasks.some((subTask) => subTask.status === "reviewing")) reasons.push("\u0111ang c\u1ea7n duy\u1ec7t");
  if (dueIn === 0) reasons.push("deadline h\u00f4m nay");
  if (dueIn !== null && dueIn > 0 && dueIn <= 3) reasons.push(`s\u1eafp \u0111\u1ebfn h\u1ea1n trong ${dueIn} ng\u00e0y`);
  if (openSubTasks.length) reasons.push(`c\u00f2n ${openSubTasks.length} sub-task ch\u01b0a x\u1eed l\u00fd`);

  return reasons.length ? reasons.join(", ") : "kh\u00f4ng c\u00f3 vi\u1ec7c g\u1ea5p c\u1ea7n x\u1eed l\u00fd ngay";
}

export function getTaskUrgencyTone(task: Task): UrgencyTone {
  const openSubTasks = getOpenSubTasks(task);
  const hasOverdueSubTask = openSubTasks.some((subTask) => isOverdueDate(subTask.deadline));
  const dueIn = daysUntil(task.deadline);

  if (hasOverdueSubTask || isOverdueDate(task.deadline)) return "red";
  if (dueIn === 0 || (dueIn !== null && dueIn > 0 && dueIn <= 3)) return "orange";
  if (task.status === "review" || task.subTasks.some((subTask) => subTask.status === "reviewing")) return "purple";
  if (task.status === "inprogress") return "blue";
  if (task.status === "done") return "green";
  return "gray";
}

export function isTaskActionable(task: Task) {
  return getTaskPriorityScore(task) > 0 && !isTaskClosed(task);
}

export function isTaskInScope(task: Task, scope: TaskActionScope, currentUserId?: string) {
  const openSubTasks = getOpenSubTasks(task);
  const hasOverdueSubTask = openSubTasks.some((subTask) => isOverdueDate(subTask.deadline));
  const hasUnassignedSubTask = openSubTasks.some((subTask) => !subTask.picIds?.length);
  const mine = !!currentUserId && ((task.picIds ?? []).includes(currentUserId) || task.picId === currentUserId);

  if (scope === "action") return isTaskActionable(task);
  if (scope === "overdue") return !isTaskClosed(task) && (isOverdueDate(task.deadline) || hasOverdueSubTask);
  if (scope === "today") return !isTaskClosed(task) && daysUntil(task.deadline) === 0;
  if (scope === "review") return !isTaskClosed(task) && (task.status === "review" || task.subTasks.some((subTask) => subTask.status === "reviewing"));
  if (scope === "unassigned") return !isTaskClosed(task) && ((!task.picIds?.length && !task.picId) || hasUnassignedSubTask);
  if (scope === "mine") return mine;
  return true;
}

export function sortTasksByActionPriority(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const scoreDiff = getTaskPriorityScore(b) - getTaskPriorityScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
  });
}

function getSubTaskScore(subTask: SubTask) {
  if (subTask.status === "done") return -100;
  let score = 0;
  const dueIn = daysUntil(subTask.deadline);
  if (isOverdueDate(subTask.deadline)) score += 500;
  if (dueIn === 0) score += 420;
  if (dueIn !== null && dueIn > 0 && dueIn <= 3) score += 320 - dueIn * 20;
  if (!subTask.picIds?.length) score += 260;
  if (subTask.status === "reviewing") score += 220;
  if (subTask.status === "pending") score += 80;
  return score;
}

export function sortSubtasks(subTasks: SubTask[]) {
  return [...subTasks].sort((a, b) => {
    const scoreDiff = getSubTaskScore(b) - getSubTaskScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
  });
}
