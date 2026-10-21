import type { Exam, ExamStatus } from "./types";

export function examStatus(exam: Exam, now: number = Date.now()): ExamStatus {
  if (now < new Date(exam.startsAt).getTime()) return "planned";
  if (now > new Date(exam.endsAt).getTime()) return "ended";
  return "active";
}

export const STATUS_LABELS: Record<ExamStatus, string> = {
  planned: "Gözləmədə",
  active: "Açıq",
  ended: "Bitib",
};

export const STATUS_STYLES: Record<ExamStatus, string> = {
  planned: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-600",
};

const FIN_RE = /^[A-Z0-9]{7}$/;
const TICKET_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function isValidFin(value: string): boolean {
  return FIN_RE.test(value.trim().toUpperCase());
}

export function normalizeFin(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidTicket(value: string): boolean {
  return TICKET_RE.test(value.trim().toUpperCase());
}

export function normalizeTicket(value: string): string {
  let v = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (v.length > 4) {
    v = `${v.slice(0, 4)}-${v.slice(0 + 4, 8)}`;
  }
  return v;
}

export function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTimeLocal(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
