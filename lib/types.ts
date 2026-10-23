export type QuestionType = "single" | "true_false" | "multiple";

export type QuestionImage = { url: string; alt: string };

export type QuestionReview = { status: "verified" | "rejected"; reviewerId: string; reviewerName: string; reviewedAt: string; reason?: string };

export type Question = {
  companyId?: string;
  updatedAt?: string;
  reviewHistory?: QuestionReview[];
  image?: QuestionImage;
  optionImages?: Array<QuestionImage | null>;
  id: string;
  text: string;
  options: string[];
  correct: number | number[];
  type: QuestionType;
  subject?: string;
  topic?: string;
  tags?: string[];
  grade?: string;
  difficulty?: "Asan" | "Orta" | "Çətin";
  explanation?: string;
  points?: number;
  createdAt?: string;
  verification?: "pending" | "verified" | "rejected";
};

export type Company = { id: string; name: string; code: string; active: boolean; createdAt: string };
export type AcademicYear = { id: string; label: string; active: boolean; createdAt: string };

export type Exam = {
  revision?: string;
  companyId?: string;
  id: string;
  title: string;
  subject: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  questions: Question[];
  ticketCodes: string[];
  createdAt: string;
  status: ExamPhase;
  code?: string;
  grade?: string;
  block?: string;
  academicYear?: string;
  variants?: number;
  pdfReady?: boolean;
  onlineEnabled?: boolean;
};

export type SafeExam = {
  id: string;
  title: string;
  subject: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  questionCount: number;
  onlineEnabled: boolean;
  status: string;
};

export type ExamResult = {
  companyId?: string;
  academicYear?: string;
  id: string;
  examId: string;
  examTitle: string;
  fin: string;
  ticketCode: string;
  answers: Array<number | number[] | null>;
  questions?: Question[];
  questionsSnapshot?: Question[];
  correctCount: number;
  total: number;
  score: number;
  startedAt: string;
  finishedAt: string;
  timeSpentSec: number;
  accessToken?: string;
  attemptId?: string;
  analysis?: Array<{
    questionIndex: number;
    questionText: string;
    questionType: string;
    options: string[];
    given: number | number[] | null;
    isCorrect: boolean;
    earnedPoints: number;
    points: number;
    explanation?: string;
    optionImages?: Array<QuestionImage | null>;
    image?: QuestionImage;
  }>;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  versionId: string;
  fin: string;
  ticketCode: string;
  answers: Array<number | number[] | null>;
  status: "in_progress" | "submitted" | "expired";
  startedAt: string;
  submittedAt?: string;
  expiredAt?: string;
  timeSpentSec: number;
};

export type ExamVersion = {
  id: string;
  examId: string;
  questions: Question[];
  createdAt: string;
};

export type QuestionVerification = "pending" | "verified" | "rejected";

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

export type ExamPhase = "preparing" | "first_ready" | "review" | "done";

export type UserRole = "admin" | "coordinator" | "teacher" | "seller";

export type User = {
  companyId?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  passwordHash?: string;
  sellerExamIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type SchoolClass = {
  id: string;
  name: string;
  grade: string;
  section?: string;
  teacher: string;
  studentCount: number;
  academicYear: string;
  companyId?: string;
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
  soldAt: string;
  price: number;
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