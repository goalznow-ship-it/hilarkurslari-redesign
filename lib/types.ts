export type Question = {
  id: string;
  text: string;
  options: string[];
  correct: number; // index of correct option
  subject?: string;
  grade?: string; // sinif, məs. "X sinif"
  difficulty?: "Asan" | "Orta" | "Çətin";
  createdAt?: string; // ISO string — banka əlavə olunma vaxtı
  verification?: "pending" | "verified"; // təsdiq vəziyyəti
};

export type Exam = {
  id: string;
  title: string;
  subject: string;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  durationMin: number;
  questions: Question[];
  ticketCodes: string[]; // boş olsa — istənilən keçərli format qəbul edilir
  createdAt: string;
  status: ExamPhase; // kitabçanın hazırlıq vəziyyəti
  code?: string; // imtahan kodu, məs. "RIY-2026-001"
  grade?: string; // sinif, məs. "X Sinif"
  block?: string; // blok, məs. "Blok"
  academicYear?: string; // tədris ili, məs. "2026-2027"
  variants?: number; // variant sayı
  pdfReady?: boolean; // PDF çapı hazır olub olmaması
  onlineEnabled?: boolean; // onlayn rejimdə şagirdlərə açıq olub olmaması
};

export type ExamResult = {
  id: string;
  examId: string;
  examTitle: string;
  fin: string;
  ticketCode: string;
  answers: (number | null)[];
  correctCount: number;
  total: number;
  score: number; // correct/total * 100, yuvarlaqlaşdırılmış
  startedAt: string;
  finishedAt: string;
  timeSpentSec: number;
};

export type AdminSession = {
  user: string;
  at: string;
};

export type EntryData = {
  examId: string;
  fin: string;
  ticket: string;
  startedAt: number;
};

export type ExamStatus = "planned" | "active" | "ended";

/** Kitabçanın hazırlıq vəziyyəti (admin panelindəki status rozeti) */
export type ExamPhase = "preparing" | "first_ready" | "review" | "done";

export type UserRole = "admin" | "coordinator" | "teacher";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export type SchoolClass = {
  id: string;
  name: string; // "9A", "Blok 1" kimi
  grade: string; // "IX sinif"
  section?: string; // "A", "Blok 1" (şöbə/blok)
  teacher: string; // sinif rəhbəri/müəllim
  studentCount: number;
  academicYear: string; // "2026-2027"
  createdAt: string;
};
