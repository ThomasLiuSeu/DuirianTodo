export function todayKey(date = new Date()): string {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

export function addDaysKey(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

export function formatDueDate(value: string | null): string {
  if (!value) return "无日期";
  const today = todayKey();
  const tomorrow = addDaysKey(1);
  if (value === today) return "今天";
  if (value === tomorrow) return "明天";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

export function isOverdue(value: string | null, completed: boolean): boolean {
  return Boolean(value && !completed && value < todayKey());
}
