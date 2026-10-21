import type {
  AdminSession,
  EntryData,
  Exam,
  ExamResult,
  Question,
} from "./types";

const KEYS = {
  exams: "kitabca.exams",
  results: "kitabca.results",
  session: "kitabca.admin.session",
  entry: "kitabca.entry",
  bank: "kitabca.questionBank",
};

export const ADMIN_USER = "admin";
export const ADMIN_PASSWORD = "admin123";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Seed (imtahanlar)
// ---------------------------------------------------------------------------

function seed(): Exam[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const iso = (t: number) => new Date(t).toISOString();

  const exams: Exam[] = [
    {
      id: "exam-math-1",
      title: "Riyaziyyat — Sınaq imtahanı №1",
      subject: "Riyaziyyat",
      startsAt: iso(now - 1 * DAY),
      endsAt: iso(now + 30 * DAY),
      durationMin: 20,
      ticketCodes: [],
      createdAt: iso(now),
      questions: [
        {
          id: uid(),
          text: "2x + 6 = 18 tənliyində x-in qiyməti neçədir?",
          options: ["4", "6", "8", "12"],
          correct: 1,
        },
        {
          id: uid(),
          text: "45 × 18 hasilinin qiyməti necədir?",
          options: ["720", "780", "810", "850"],
          correct: 2,
        },
        {
          id: uid(),
          text: "Bir mal 480 AZN-ə qiymətləndirilir. 20% endiriləndən sonra malın yeni qiyməti neçə AZN olur?",
          options: ["368", "384", "396", "408"],
          correct: 1,
        },
        {
          id: uid(),
          text: "5! (5 faktorial) qiyməti neçədir?",
          options: ["20", "60", "100", "120"],
          correct: 3,
        },
        {
          id: uid(),
          text: "Kubun neçə tilası (kənarı) var?",
          options: ["8", "10", "12", "16"],
          correct: 2,
        },
        {
          id: uid(),
          text: "Bir ədədin əks qiymətini tapırız: −7",
          options: ["7", "−7", "0", "1/7"],
          correct: 0,
        },
        {
          id: uid(),
          text: "0,25 onluq kəsrinin sadə kəsr şəklində yazılışı hansıdır?",
          options: ["1/5", "1/4", "1/3", "2/5"],
          correct: 1,
        },
        {
          id: uid(),
          text: "Bir düzbucaqlının tərəfləri 12 sm və 8 sm, perimetri neçə sm-dir?",
          options: ["40", "48", "96", "20"],
          correct: 0,
        },
      ],
    },
    {
      id: "exam-fiz-1",
      title: "Fizika — Sınaq imtahanı №1",
      subject: "Fizika",
      startsAt: iso(now - 1 * DAY),
      endsAt: iso(now + 7 * DAY),
      durationMin: 15,
      ticketCodes: [],
      createdAt: iso(now),
      questions: [
        {
          id: uid(),
          text: "Sürətin beynəlxalq sistemdə (SI-də) vahidi hansıdır?",
          options: ["km/saat", "m/s", "m/s²", "km/s"],
          correct: 1,
        },
        {
          id: uid(),
          text: "Sürət proqressiyasının (tərp) düsturu hansıdır?",
          options: ["s = v/t", "v = s/t", "v = s·t", "t = v/s"],
          correct: 1,
        },
        {
          id: uid(),
          text: "1 kiloqram neçə qrama bərabərdir?",
          options: ["10", "100", "1000", "10 000"],
          correct: 2,
        },
        {
          id: uid(),
          text: "Kütləsi 5 kq olan cisim 2 m/s sürətlə hərəkət edir. Cismin impulsu nə qədərdir?",
          options: ["2,5 kg·m/s", "7 kg·m/s", "10 kg·m/s", "20 kg·m/s"],
          correct: 2,
        },
        {
          id: uid(),
          text: "Elektrik cərəyanının vahidi hansıdır?",
          options: ["Volt", "Amper", "Om", "Vat"],
          correct: 1,
        },
      ],
    },
  ];

  return exams;
}

function seedIfEmpty() {
  if (!window.localStorage.getItem(KEYS.exams)) {
    writeJSON(KEYS.exams, seed());
  }
  if (!window.localStorage.getItem(KEYS.results)) {
    writeJSON(KEYS.results, []);
  }
  if (!window.localStorage.getItem(KEYS.bank)) {
    writeJSON(KEYS.bank, seedBank());
  }
}

export function initStore() {
  seedIfEmpty();
}

// ---------------------------------------------------------------------------
// Imtahan CRUD
// ---------------------------------------------------------------------------

export function getExams(): Exam[] {
  seedIfEmpty();
  return readJSON<Exam[]>(KEYS.exams, []);
}

export function getExam(id: string): Exam | undefined {
  return getExams().find((e) => e.id === id);
}

export function saveExam(exam: Exam, isEdit: boolean) {
  const exams = getExams();
  if (isEdit) {
    const idx = exams.findIndex((e) => e.id === exam.id);
    if (idx >= 0) exams[idx] = exam;
    else exams.push(exam);
  } else {
    exams.push(exam);
  }
  writeJSON(KEYS.exams, exams);
}

export function deleteExam(id: string) {
  writeJSON(
    KEYS.exams,
    getExams().filter((e) => e.id !== id),
  );
  writeJSON(
    KEYS.results,
    getResults().filter((r) => r.examId !== id),
  );
}

export function getResults(): ExamResult[] {
  seedIfEmpty();
  return readJSON<ExamResult[]>(KEYS.results, []);
}

export function saveResult(result: ExamResult) {
  const rows = getResults();
  rows.push(result);
  writeJSON(KEYS.results, rows);
}

export function getResult(id: string): ExamResult | undefined {
  return getResults().find((r) => r.id === id);
}

export function findResultByParticipant(
  examId: string,
  fin: string,
): ExamResult | undefined {
  return getResults().find(
    (r) => r.examId === examId && r.fin.toUpperCase() === fin.toUpperCase(),
  );
}

// ---------------------------------------------------------------------------
// Admin sessiyası
// ---------------------------------------------------------------------------

export function getSession(): AdminSession | null {
  return readJSON<AdminSession | null>(KEYS.session, null);
}

export function setSession(user: string) {
  writeJSON(KEYS.session, { user, at: new Date().toISOString() });
}

export function clearSession() {
  window.localStorage.removeItem(KEYS.session);
}

// ---------------------------------------------------------------------------
// Şagird girişi
// ---------------------------------------------------------------------------

export function setEntry(entry: EntryData) {
  window.sessionStorage.setItem(KEYS.entry, JSON.stringify(entry));
}

export function getEntry(): EntryData | null {
  try {
    const raw = window.sessionStorage.getItem(KEYS.entry);
    if (!raw) return null;
    return JSON.parse(raw) as EntryData;
  } catch {
    return null;
  }
}

export function clearEntry() {
  window.sessionStorage.removeItem(KEYS.entry);
}

export function newId(): string {
  return uid();
}

// ---------------------------------------------------------------------------
// Sual bankı
// ---------------------------------------------------------------------------

export function getQuestionBank(): Question[] {
  seedIfEmpty();
  if (!window.localStorage.getItem(KEYS.bank)) {
    writeJSON(KEYS.bank, seedBank());
  }
  return readJSON<Question[]>(KEYS.bank, []);
}

export function saveQuestionBank(list: Question[]) {
  writeJSON(KEYS.bank, list);
}

export function addQuestionToBank(q: Question) {
  const bank = getQuestionBank();
  if (bank.some((b) => b.text.trim() === q.text.trim())) return;
  bank.push({ ...q, id: newId() });
  saveQuestionBank(bank);
}

function seedBank(): Question[] {
  return [
    {
      id: uid(),
      text: "2x + 6 = 18 tənliyində x-in qiyməti neçədir?",
      options: ["4", "6", "8", "12"],
      correct: 1,
    },
    {
      id: uid(),
      text: "45 × 18 hasilinin qiyməti necədir?",
      options: ["720", "780", "810", "850"],
      correct: 2,
    },
    {
      id: uid(),
      text: "Kubun neçə tilası (kənarı) var?",
      options: ["8", "10", "12", "16"],
      correct: 2,
    },
    {
      id: uid(),
      text: "Sürətin beynəlxalq sistemdə (SI-də) vahidi hansıdır?",
      options: ["km/saat", "m/s", "m/s²", "km/s"],
      correct: 1,
    },
    {
      id: uid(),
      text: "1 kiloqram neçə qrama bərabərdir?",
      options: ["10", "100", "1000", "10 000"],
      correct: 2,
    },
    {
      id: uid(),
      text: "Elektrik cərəyanının vahidi hansıdır?",
      options: ["Volt", "Amper", "Om", "Vat"],
      correct: 1,
    },
  ];
}
