import { format, differenceInDays } from "date-fns";

// Normaliza string de data evitando o shift UTC.
// "2026-05-21" sem hora → JS trata como meia-noite UTC → no Brasil vira dia 20 às 21h.
function toLocalDate(dateStr) {
  if (!dateStr) return null;
  const s = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
  return new Date(s.includes("T") ? s : s + "T12:00:00");
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return format(toLocalDate(dateStr), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

export function formatDateCompact(dateStr) {
  if (!dateStr) return "—";
  try {
    return format(toLocalDate(dateStr), "dd/MM/yy");
  } catch {
    return "—";
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  try {
    const s = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
    return format(new Date(s), "dd/MM/yyyy, HH:mm");
  } catch {
    return "—";
  }
}

export function formatTime(dateStr) {
  if (!dateStr) return "—";
  try {
    const s = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
    return format(new Date(s), "HH:mm");
  } catch {
    return "—";
  }
}

export function getDaysOverdue(reminderDate, today) {
  if (!reminderDate) return 0;
  return differenceInDays(
    new Date(today + "T00:00:00"),
    new Date(reminderDate + "T00:00:00")
  );
}
