import { currentAcademicYear } from "./helpers";
import type {
  AdminSession,
  EntryData,
  Exam,
  ExamResult,
  Question,
  SchoolClass,
  User,
} from "./types";

const KEYS = {
  exams: "kitabca.exams",
  results: "kitabca.results",
  session: "kitabca.admin.session",
  entry: "kitabca.entry",
  bank: "kitabca.questionBank",
  bankInit: "kitabca.questionBank.initAt",
  users: "kitabca.users",
  classes: "kitabca.classes",
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
      status: "preparing",
      code: "RIY-2026-001",
      grade: "X Sinif",
      block: "Blok",
      academicYear: currentAcademicYear(now),
      variants: 2,
      pdfReady: false,
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
      status: "review",
      code: "FIZ-2026-002",
      grade: "VIII Sinif",
      block: "Blok",
      academicYear: currentAcademicYear(now),
      variants: 1,
      pdfReady: true,
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
    window.localStorage.setItem(KEYS.bankInit, new Date().toISOString());
  }
  if (!window.localStorage.getItem(KEYS.users)) {
    writeJSON(KEYS.users, seedUsers());
  }
  if (!window.localStorage.getItem(KEYS.classes)) {
    writeJSON(KEYS.classes, seedClasses());
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
  const list = readJSON<Exam[]>(KEYS.exams, []);

  // Köhnə imtahanlarda yeni kitabça sahələri yoxdur — bir dəfəlik miqrasiya
  let changed = false;
  const normalized = list.map((exam, i) => {
    if (exam.status && exam.code && exam.onlineEnabled !== undefined) return exam;
    changed = true;
    return {
      ...exam,
      status: exam.status ?? "preparing",
      code: exam.code ?? generateExamCode(exam, i),
      grade: exam.grade ?? "",
      block: exam.block ?? "",
      academicYear: exam.academicYear ?? currentAcademicYear(),
      variants: exam.variants ?? 1,
      pdfReady: exam.pdfReady ?? false,
      onlineEnabled: exam.onlineEnabled ?? false,
    };
  });
  if (changed) writeJSON(KEYS.exams, normalized);
  return normalized;
}

function generateExamCode(exam: Exam, index: number): string {
  const word = (exam.subject || "IMT").trim().split(/\s+/)[0] || "IMT";
  const letters = word.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "IMT";
  const year = new Date(exam.createdAt || Date.now()).getFullYear();
  return `${letters}-${year}-${String(index + 1).padStart(3, "0")}`;
}

/** İmtahanı kopyalayıb koduna "-kopya" əlavə edərək yenisini yaradır */
export function copyExam(id: string): Exam | undefined {
  const exams = getExams();
  const source = exams.find((e) => e.id === id);
  if (!source) return undefined;

  const copy: Exam = {
    ...source,
    id: newId(),
    code: `${source.code ?? ""}-kopya`,
    questions: source.questions.map((q) => ({
      ...q,
      id: newId(),
      options: [...q.options],
    })),
    createdAt: new Date().toISOString(),
  };

  exams.push(copy);
  writeJSON(KEYS.exams, exams);
  return copy;
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

/** İmtahan sessiyasını başladır — vaxt damğası burada qeyd olunur */
export function startExamSession(examId: string, fin: string, ticket: string) {
  setEntry({ examId, fin, ticket, startedAt: Date.now() });
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
  const list = readJSON<Question[]>(KEYS.bank, []);
  const initAt = window.localStorage.getItem(KEYS.bankInit) || new Date().toISOString();

  // Köhnə məlumatlarda createdAt / verification yoxdur — bir dəfəlik normalizasiya
  let changed = false;
  const normalized = list.map((q) => {
    if (q.createdAt && q.verification) return q;
    changed = true;
    return {
      ...q,
      createdAt: q.createdAt ?? initAt,
      verification: q.verification ?? "verified",
    };
  });
  if (changed) writeJSON(KEYS.bank, normalized);
  return normalized;
}

export function saveQuestionBank(list: Question[]) {
  writeJSON(KEYS.bank, list);
}

export function addQuestionToBank(q: Question) {
  const bank = getQuestionBank();
  if (bank.some((b) => b.text.trim() === q.text.trim())) return;
  bank.push({
    ...q,
    id: newId(),
    createdAt: q.createdAt ?? new Date().toISOString(),
    verification: q.verification ?? "verified",
  });
  saveQuestionBank(bank);
}

export function deleteQuestionFromBank(id: string) {
  saveQuestionBank(getQuestionBank().filter((q) => q.id !== id));
}

// ---------------------------------------------------------------------------
// İstifadəçilər (müəllim / koordinator)
// ---------------------------------------------------------------------------

export function getUsers(): User[] {
  seedIfEmpty();
  return readJSON<User[]>(KEYS.users, []);
}

// ---------------------------------------------------------------------------
// Siniflər & Qruplar
// ---------------------------------------------------------------------------

export function getClasses(): SchoolClass[] {
  seedIfEmpty();
  const list = readJSON<SchoolClass[]>(KEYS.classes, []);

  // Köhnə məlumatlarda tədris ili / yaradılma tarixi yoxdur — bir dəfəlik miqrasiya
  let changed = false;
  const normalized = list.map((c) => {
    if (c.academicYear && c.createdAt) return c;
    changed = true;
    return {
      ...c,
      academicYear: c.academicYear ?? currentAcademicYear(),
      createdAt: c.createdAt ?? new Date().toISOString(),
      studentCount: c.studentCount ?? 0,
      section: c.section ?? "",
    };
  });
  if (changed) writeJSON(KEYS.classes, normalized);
  return normalized;
}

export function saveClass(schoolClass: SchoolClass) {
  const classes = getClasses();
  const idx = classes.findIndex((c) => c.id === schoolClass.id);
  if (idx >= 0) classes[idx] = schoolClass;
  else classes.push(schoolClass);
  writeJSON(KEYS.classes, classes);
}

export function deleteClass(id: string) {
  writeJSON(
    KEYS.classes,
    getClasses().filter((c) => c.id !== id),
  );
}

function seedClasses(): SchoolClass[] {
  const year = currentAcademicYear();
  const now = new Date().toISOString();

  return [
    {
      id: "class-9a",
      name: "9A",
      grade: "IX sinif",
      section: "A",
      teacher: "A. Məmmədova",
      studentCount: 28,
      academicYear: year,
      createdAt: now,
    },
    {
      id: "class-10b",
      name: "10B",
      grade: "X sinif",
      section: "B",
      teacher: "R. İsmayılov",
      studentCount: 26,
      academicYear: year,
      createdAt: now,
    },
    {
      id: "class-11-blok-1",
      name: "XI Blok 1",
      grade: "XI sinif",
      section: "Blok 1",
      teacher: "S. Həsənova",
      studentCount: 22,
      academicYear: year,
      createdAt: now,
    },
    {
      id: "class-buraxilis-2026",
      name: "Buraxılış qrupu 2026",
      grade: "XI sinif",
      section: "Buraxılış",
      teacher: "N. Əliyeva",
      studentCount: 18,
      academicYear: year,
      createdAt: now,
    },
    {
      id: "class-5-hazirliq",
      name: "5-ci sinif hazırlıq",
      grade: "V sinif",
      section: "Hazırlıq",
      teacher: "F. Quliyeva",
      studentCount: 24,
      academicYear: year,
      createdAt: now,
    },
  ];
}

function seedUsers(): User[] {
  return [
    {
      id: "u-admin",
      name: "Admin",
      email: "admin@hilalkurslari.az",
      role: "admin",
      active: true,
    },
    {
      id: "u-coord-1",
      name: "Aysel Qasımova",
      email: "aysel@hilalkurslari.az",
      role: "coordinator",
      active: true,
    },
    {
      id: "u-coord-2",
      name: "Elvin Məmmədov",
      email: "elvin@hilalkurslari.az",
      role: "coordinator",
      active: true,
    },
    {
      id: "u-teach-1",
      name: "Nərmin Əliyeva",
      email: "nermin@hilalkurslari.az",
      role: "teacher",
      active: false,
    },
  ];
}

function seedBank(): Question[] {
  return [
    {
      id: uid(),
      text: "2x + 6 = 18 tənliyində x-in qiyməti neçədir?",
      options: ["4", "6", "8", "12"],
      correct: 1,
      subject: "Riyaziyyat",
      grade: "IX sinif",
      difficulty: "Asan",
    },
    {
      id: uid(),
      text: "45 × 18 hasilinin qiyməti necədir?",
      options: ["720", "780", "810", "850"],
      correct: 2,
      subject: "Riyaziyyat",
      grade: "VII sinif",
      difficulty: "Asan",
    },
    {
      id: uid(),
      text: "Kvadrat tənliyin diskriminantı necə tapılır?",
      options: ["b² − 4ac", "b² + 4ac", "4ac − b²", "b² · 4ac"],
      correct: 0,
      subject: "Riyaziyyat",
      grade: "IX sinif",
      difficulty: "Orta",
    },
    {
      id: uid(),
      text: "Kubun neçə tilası (kənarı) var?",
      options: ["8", "10", "12", "16"],
      correct: 2,
      subject: "Riyaziyyat",
      grade: "VII sinif",
      difficulty: "Asan",
    },
    {
      id: uid(),
      text: "Sürətin beynəlxalq sistemdə (SI-də) vahidi hansıdır?",
      options: ["km/saat", "m/s", "m/s²", "km/s"],
      correct: 1,
      subject: "Fizika",
      grade: "VIII sinif",
      difficulty: "Asan",
    },
    {
      id: uid(),
      text: "1 kiloqram neçə qrama bərabərdir?",
      options: ["10", "100", "1000", "10 000"],
      correct: 2,
      subject: "Fizika",
      grade: "VII sinif",
      difficulty: "Asan",
    },
    {
      id: uid(),
      text: "Elektrik cərəyanının vahidi hansıdır?",
      options: ["Volt", "Amper", "Om", "Vat"],
      correct: 1,
      subject: "Fizika",
      grade: "IX sinif",
      difficulty: "Orta",
    },
    {
      id: uid(),
      text: "Azərbaycanın dövlət dili hansıdır?",
      options: ["Rus dili", "İngilis dili", "Azərbaycan dili", "Türk dili"],
      correct: 2,
      subject: "Azərbaycan dili",
      grade: "V sinif",
      difficulty: "Asan",
    },
    {
      id: uid(),
      text: "H2O kimyəvi formulu hansı maddəyə aiddir?",
      options: ["Hidrogen", "Oksigen", "Su", "Hidrogen peroksid"],
      correct: 2,
      subject: "Kimya",
      grade: "VIII sinif",
      difficulty: "Asan",
    },
    {
      id: uid(),
      text: "Fotosintez zamanı hansı qaz ayrılır?",
      options: ["Oksigen", "Karbon qazı", "Azot", "Hidrogen"],
      correct: 0,
      subject: "Biologiya",
      grade: "VII sinif",
      difficulty: "Orta",
    },
  ];
}
