export type QuestionType = "single" | "true_false" | "multiple";

export type QuestionImage = { url: string; alt: string };

export type QuestionReview = { status: "verified" | "rejected"; reviewerId: string; reviewerName: string; reviewedAt: string; reason?: string };

export type Question = {
  reviewHistory?: QuestionReview[];
  image?: QuestionImage;
  optionImages?: Array<QuestionImage | null>;
  id: string;
  text: string;
  options: string[]; // for true_false: ["Doğru", "Yanlış"] (fixed)
  correct: number | number[]; // index for single/true_false, array of indices for multiple
  type: QuestionType; // "single" | "true_false" | "multiple"
  subject?: string;
  topic?: string; // mövzu/ünvan
  tags?: string[]; // əlavə etiketlər
  grade?: string; // sinif, məs. "X sinif"
  difficulty?: "Asan" | "Orta" | "Çətin";
  explanation?: string; // şərh/izahat
  points?: number; // bal dəyəri (default 1)
  createdAt?: string; // ISO string — banka əlavə olunma vaxtı
  verification?: "pending" | "verified" | "rejected"; // təsdiq vəziyyəti
};

export type Company = { id: string; name: string; code: string; active: boolean; createdAt: string };
export type AcademicYear = { id: string; label: string; active: boolean; createdAt: string };

export type Exam = {
  companyId?: string;
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
  companyId?: string;
  academicYear?: string;
  id: string;
  examId: string;
  examTitle: string;
  fin: string;
  ticketCode: string;
  answers: Array<number | number[] | null>; // support multiple choice
  questions?: Question[]; // snapshot for historical review; legacy results fall back to exam
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

export type UserRole = "admin" | "coordinator" | "teacher" | "seller";

export type User = {
  companyId?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  passwordHash?: string; // SHA-256 hash of password
  // Seller-specific fields
  sellerExamIds?: string[]; // Exams this seller can sell tickets for
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

export type TicketSale = {
  companyId?: string;
  id: string;
  examId: string;
  examTitle: string;
  ticketCode: string;
  sellerId: string;
  sellerName: string;
  studentFIN: string;
  studentName?: string;
  soldAt: string; // ISO string
  price: number; // AZN
};

export type SalesReportFilters = {
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  examId?: string;
};

export type SalesSummary = {
  totalTickets: number;
  totalRevenue: number;
  bySeller: { sellerId: string; sellerName: string; tickets: number; revenue: number }[];
  byExam: { examId: string; examTitle: string; tickets: number; revenue: number }[];
  byDate: { date: string; tickets: number; revenue: number }[];
};
