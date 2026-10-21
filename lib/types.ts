export type Question = {
  id: string;
  text: string;
  options: string[];
  correct: number; // index of correct option
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
