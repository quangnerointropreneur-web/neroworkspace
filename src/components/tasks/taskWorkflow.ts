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
    return `Next: ${overdueSubTasks.length} overdue sub-task, plus unassigned sub-task`;
  }
  if (overdueSubTasks.length) return `Next: ${overdueSubTasks.length} overdue sub-task`;
  if (isOverdueDate(task.deadline)) return "Next: Task is overdue, handle now";
  if (!task.picIds?.length && !task.picId) return "Next: Assign an owner";
  if (unassignedSubTasks.length) return `Next: Assign ${unassignedSubTasks.length} sub-task`;
  if (task.status === "review" || reviewingSubTasks.length) return "Next: Review before continuing";
  if (dueIn === 0) return "Next: Due today";
  if (dueIn !== null && dueIn > 0 && dueIn <= 3) return `Next: Due in ${dueIn} day${dueIn === 1 ? "" : "s"}`;
  if (task.priority === "high" && !isTaskClosed(task)) return "Next: High-priority unfinished task";
  if (openSubTasks.length) return `Next: ${openSubTasks.length} open sub-task`;
  if (task.status === "done") return "Next: Completed";
  if (task.status === "cancelled") return "Next: Cancelled";
  return "Next: Waiting for update";
}

export function getTaskPriorityReason(task: Task) {
  const openSubTasks = getOpenSubTasks(task);
  const overdueSubTasks = openSubTasks.filter((subTask) => isOverdueDate(subTask.deadline));
  const unassignedSubTasks = openSubTasks.filter((subTask) => !subTask.picIds?.length);
  const dueIn = daysUntil(task.deadline);
  const reasons: string[] = [];

  if (overdueSubTasks.length) reasons.push(`${overdueSubTasks.length} overdue sub-task`);
  if (isOverdueDate(task.deadline)) {
    const daysLate = Math.abs(dueIn ?? 0);
    reasons.push(daysLate ? `task is ${daysLate} day${daysLate === 1 ? "" : "s"} overdue` : "task is overdue");
  }
  if (task.priority === "high" && !isTaskClosed(task)) reasons.push("high priority");
  if (!task.picIds?.length && !task.picId) reasons.push("no owner assigned");
  if (unassignedSubTasks.length) reasons.push(`${unassignedSubTasks.length} unassigned sub-task`);
  if (task.status === "review" || task.subTasks.some((subTask) => subTask.status === "reviewing")) reasons.push("waiting for review");
  if (dueIn === 0) reasons.push("due today");
  if (dueIn !== null && dueIn > 0 && dueIn <= 3) reasons.push(`due in ${dueIn} day${dueIn === 1 ? "" : "s"}`);
  if (openSubTasks.length) reasons.push(`${openSubTasks.length} open sub-task`);

  return reasons.length ? reasons.join(", ") : "no urgent action right now";
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
