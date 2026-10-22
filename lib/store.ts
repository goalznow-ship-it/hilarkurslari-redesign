import { cloneQuestion, validQuestionImage } from "./questions";
import { currentAcademicYear, examStatus, normalizeFin, normalizeTicket, isValidFin, isValidTicket, escapeCsvCell } from "./helpers";
import type {
  Company,
  AcademicYear,
  AdminSession,
  EntryData,
  Exam,
  ExamResult,
  Question,
  QuestionType,
  SchoolClass,
  TicketSale,
  User,
  SalesReportFilters,
} from "./types";

const KEYS = {
  companies: "kitabca.companies",
  academicYears: "kitabca.academicYears",
  exams: "kitabca.exams",
  results: "kitabca.results",
  session: "kitabca.admin.session",
  entry: "kitabca.entry",
  bank: "kitabca.questionBank",
  bankInit: "kitabca.questionBank.initAt",
  users: "kitabca.users",
  classes: "kitabca.classes",
  ticketSales: "kitabca.ticketSales",
  progress: "kitabca.exam.progress",
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
    throw new Error("Yaddaşdakı məlumat oxunmadı. Məlumatı silmədən yenidən cəhd edin.");
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
        { id: uid(), text: "2x + 6 = 18 tənliyində x-in qiyməti neçədir?", options: ["4", "6", "8", "12"], correct: 1, type: "single" as const },
        { id: uid(), text: "45 × 18 hasilinin qiyməti necədir?", options: ["720", "780", "810", "850"], correct: 2, type: "single" as const },
        { id: uid(), text: "Bir mal 480 AZN-ə qiymətləndirilir. 20% endiriləndən sonra malın yeni qiyməti neçə AZN olur?", options: ["368", "384", "396", "408"], correct: 1, type: "single" as const },
        { id: uid(), text: "5! (5 faktorial) qiyməti neçədir?", options: ["20", "60", "100", "120"], correct: 3, type: "single" as const },
        { id: uid(), text: "Kubun neçə tilası (kənarı) var?", options: ["8", "10", "12", "16"], correct: 2, type: "single" as const },
        { id: uid(), text: "Bir ədədin əks qiymətini tapırız: −7", options: ["7", "−7", "0", "1/7"], correct: 0, type: "single" as const },
        { id: uid(), text: "0,25 onluq kəsrinin sadə kəsr şəklində yazılışı hansıdır?", options: ["1/5", "1/4", "1/3", "2/5"], correct: 1, type: "single" as const },
        { id: uid(), text: "Bir düzbucaqlının tərəfləri 12 sm və 8 sm, perimetri neçə sm-dir?", options: ["40", "48", "96", "20"], correct: 0, type: "single" as const },
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
        { id: uid(), text: "Sürətin beynəlxalq sistemdə (SI-də) vahidi hansıdır?", options: ["km/saat", "m/s", "m/s²", "km/s"], correct: 1, type: "single" as const },
        { id: uid(), text: "Sürət proqressiyasının (tərp) düsturu hansıdır?", options: ["s = v/t", "v = s/t", "v = s·t", "t = v/s"], correct: 1, type: "single" as const },
        { id: uid(), text: "1 kiloqram neçə qrama bərabərdir?", options: ["10", "100", "1000", "10 000"], correct: 2, type: "single" as const },
        { id: uid(), text: "Kütləsi 5 kq olan cisim 2 m/s sürətlə hərəkət edir. Cismin impulsu nə qədərdir?", options: ["2,5 kg·m/s", "7 kg·m/s", "10 kg·m/s", "20 kg·m/s"], correct: 2, type: "single" as const },
        { id: uid(), text: "Elektrik cərəyanının vahidi hansıdır?", options: ["Volt", "Amper", "Om", "Vat"], correct: 1, type: "single" as const },
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

export function copyExam(id: string): Exam | undefined {
  const exams = getExams();
  const source = exams.find((e) => e.id === id);
  if (!source) return undefined;

  // Original-code ilə yeni kod: əgər code yoxdursa, convention-ə uyğun yeni kod
  const sourceCode = source.code ?? generateExamCode(source, 0);

  // Əgər source-da code yoxdursa və ya "-kopya" sònuxundaorsa, 0-dan başlayaraq
  // arxiv saxlanaraq unique code təmin et
  const baseCode = sourceCode.replace(/-kopya$/, "");
  let newCode = sourceCode;
  let codeIndex = 1;
  while (exams.some((e) => e.code?.trim().toUpperCase() === newCode.trim().toUpperCase())) {
    newCode = `${baseCode}-${String(codeIndex).padStart(3, "0")}`;
    codeIndex++;
  }

  const copy: Exam = {
    ...source,
    id: newId(),
    code: newCode,
    questions: source.questions.map((q) => cloneQuestion(q, newId())),
    createdAt: new Date().toISOString(),
    // Standartlaşdırma: mevcud default/qorxuqluqları yukselt
    status: source.status ?? "preparing",
    grade: source.grade ?? "",
    block: source.block ?? "",
    academicYear: source.academicYear ?? currentAcademicYear(),
    variants: source.variants ?? 1,
    pdfReady: source.pdfReady ?? false,
    onlineEnabled: source.onlineEnabled ?? false,
  };

  exams.push(copy);
  writeJSON(KEYS.exams, exams);
  return copy;
}

export function getExam(id: string): Exam | undefined {
  return getExams().find((e) => e.id === id);
}

export function saveExam(exam: Exam, isEdit: boolean): { success: boolean; error?: string } {
  if (!exam.id || !exam.title.trim() || !exam.subject.trim() ||
    !Number.isFinite(Date.parse(exam.startsAt)) || !Number.isFinite(Date.parse(exam.endsAt)) ||
    Date.parse(exam.endsAt) <= Date.parse(exam.startsAt) || !Number.isInteger(exam.durationMin) || exam.durationMin <= 0 ||
    !exam.questions.length || exam.questions.some((q) => !validateQuestion(q).valid)) {
    return { success: false, error: "İmtahanın adı, vaxtı, müddəti və suallarını yoxlayın." };
  }
  const ticketCodes = exam.ticketCodes.map((code) => normalizeTicket(code));
  if (exam.ticketCodes.some((code) => !isValidTicket(code)) || new Set(ticketCodes).size !== ticketCodes.length) {
    return { success: false, error: "Bilet kodları düzgün formatda və təkrarsız olmalıdır." };
  }
  const exams = getExams();
  const existingIdx = exams.findIndex((e) => e.id === exam.id);
  const previous = existingIdx >= 0 ? exams[existingIdx] : undefined;
  const companyError = validateCompanyAssignment(exam.companyId, isEdit ? previous?.companyId : undefined);
  if (companyError) return { success: false, error: companyError };
  if (exam.academicYear && exam.academicYear !== (isEdit ? previous?.academicYear : undefined) && !getAcademicYears().some((year) => year.active && year.label === exam.academicYear)) return { success: false, error: "Aktiv reyestrdən tədris ili seçin." };

  // Normalize code for case-insensitive comparison
  const normalizeCode = (c: string | undefined) => c?.trim().toUpperCase() ?? "";
  const newCodeNorm = normalizeCode(exam.code);

  if (existingIdx >= 0) {
    // isEdit=true: updating existing exam by ID
    if (!isEdit) {
      // Caller passed isEdit=false but ID exists - reject to prevent silent overwrite
      return { success: false, error: "Bu ID ilə imtahan artıq mövcuddur." };
    }
    // Check code collision with OTHER exams (exclude current)
    if (newCodeNorm) {
      const codeCollision = exams.findIndex(
        (e, i) => i !== existingIdx && normalizeCode(e.code) === newCodeNorm
      );
      if (codeCollision >= 0) {
        return { success: false, error: "Bu kod ilə başqa bir imtahan artıq mövcuddur." };
      }
    }
    // Safe to update
    exams[existingIdx] = exam;
    writeJSON(KEYS.exams, exams);
    return { success: true };
  }

  // No existing exam with this ID
  if (isEdit) {
    // Trying to edit but ID not found - fail explicitly
    return { success: false, error: "İmtahan tapılmadı. Yeniləmə mümkün deyil." };
  }

  // Creating new exam (isEdit=false): check for ID and code collision
  if (newCodeNorm) {
    const codeCollision = exams.findIndex((e) => normalizeCode(e.code) === newCodeNorm);
    if (codeCollision >= 0) {
      return { success: false, error: "Bu kod ilə imtahan artıq mövcuddur." };
    }
  }

  // Safe to create new
  exams.push(exam);
  writeJSON(KEYS.exams, exams);
  return { success: true };
}

export function deleteExam(id: string) {
  const exams = getExams();
  const results = getResults();
  writeJSON(KEYS.exams, exams.filter((exam) => exam.id !== id));
  try {
    writeJSON(KEYS.results, results.filter((result) => result.examId !== id));
  } catch (error) {
    // shortcut: localStorage has no multi-key transaction; rollback cannot cover browser termination.
    writeJSON(KEYS.exams, exams);
    throw error;
  }
}

export function getResults(): ExamResult[] {
  seedIfEmpty();
  return readJSON<ExamResult[]>(KEYS.results, []);
}

export function saveResult(result: ExamResult) {
  const rows = getResults();
  if (rows.some((r) => r.id === result.id || (r.examId === result.examId && (normalizeFin(r.fin) === normalizeFin(result.fin) || (r.ticketCode && result.ticketCode && normalizeTicket(r.ticketCode) === normalizeTicket(result.ticketCode)))))) {
    throw new Error("Bu iştirakçının nəticəsi artıq saxlanılıb.");
  }
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
    (r) => r.examId === examId && normalizeFin(r.fin) === normalizeFin(fin),
  );
}

// ---------------------------------------------------------------------------
// Admin sessiyası
// ---------------------------------------------------------------------------

export function getSession(): AdminSession | null {
  return readJSON<AdminSession | null>(KEYS.session, null);
}

export function setSession(user: string) {
  const identity = user.trim().toLowerCase();
  const account = getUsers().find((u) => u.id === user || u.email.toLowerCase() === identity || (identity === "admin" && u.id === "u-admin"));
  if (!account?.active) throw new Error("Aktiv istifadəçi tapılmadı.");
  writeJSON(KEYS.session, { user: account.id, at: new Date().toISOString() });
}

export function getCurrentUser(): User | undefined {
  const session = getSession();
  if (!session || typeof session.user !== "string") return undefined;
  const identity = session.user.trim().toLowerCase();
  return getUsers().find((u) => u.active && (u.id === session.user || u.email.toLowerCase() === identity || (identity === "admin" && u.id === "u-admin")));
}

export function canAccessPage(user: User, pathname: string): boolean {
  if (!user.active) return false;
  if (user.role === "admin") return true;
  if (user.role === "seller") return pathname === "/account/seller-sales";
  if (pathname.startsWith("/account/users") || pathname.startsWith("/account/seller-sales")) return false;
  if (user.role === "teacher") return !["/account/reports", "/account/companies", "/account/years"].some((path) => pathname.startsWith(path));
  return user.role === "coordinator";
}

function requireAdmin() {
  if (getCurrentUser()?.role !== "admin") throw new Error("Bu əməliyyat yalnız administrator üçündür.");
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

function clearExamProgress() {
  for (const key of [KEYS.progress, "answers", "current", "remainSec", "startedAt"]) window.sessionStorage.removeItem(key);
}

export function clearEntry() {
  clearExamProgress();
  window.sessionStorage.removeItem(KEYS.entry);
}

export type ExamProgress = EntryData & { answers: Array<number | number[] | null>; current: number };

export function getExamProgress(): ExamProgress | null {
  try {
    const raw = window.sessionStorage.getItem(KEYS.progress);
    const progress = raw ? JSON.parse(raw) as ExamProgress : null;
    const entry = getEntry();
    if (!entry || !progress || progress.examId !== entry.examId || progress.fin !== entry.fin || progress.startedAt !== entry.startedAt || !Array.isArray(progress.answers)) return null;
    return progress;
  } catch { return null; }
}

export function saveExamProgress(progress: ExamProgress) {
  const entry = getEntry();
  if (!entry || progress.examId !== entry.examId || progress.fin !== entry.fin || progress.startedAt !== entry.startedAt) throw new Error("İmtahan sessiyası dəyişib.");
  window.sessionStorage.setItem(KEYS.progress, JSON.stringify(progress));
}

/** İmtahan sessiyasını başladır — vaxt damğası burada qeyd olunur */
export function startExamSession(examId: string, fin: string, ticket: string) {
  const exam = getExam(examId);
  const normalizedFin = normalizeFin(fin), normalizedTicket = normalizeTicket(ticket);
  if (!exam?.onlineEnabled || examStatus(exam) !== "active" || !exam.questions.length || !isValidFin(normalizedFin) || !isValidTicket(ticket) ||
    (exam.ticketCodes.length > 0 && !exam.ticketCodes.some((code) => normalizeTicket(code) === normalizedTicket)) || findResultByParticipant(examId, normalizedFin)) {
    throw new Error("İmtahana giriş məlumatları etibarlı deyil.");
  }
  const sale = readJSON<TicketSale[]>(KEYS.ticketSales, []).find((row) => row.examId === examId && normalizeTicket(row.ticketCode) === normalizedTicket);
  if ((sale && normalizeFin(sale.studentFIN) !== normalizedFin) || getResults().some((row) => row.examId === examId && normalizeTicket(row.ticketCode) === normalizedTicket)) {
    throw new Error("Bilet başqa iştirakçıya aiddir və ya artıq istifadə olunub.");
  }
  clearExamProgress();
  setEntry({ examId, fin: normalizedFin, ticket: normalizedTicket, startedAt: Date.now() });
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

  // Köhnə məlumatlarda yeni sahələr yoxdur — bir dəfəlik normalizasiya
  let changed = false;
  const normalized = list.map((q) => {
    if (q.type && q.createdAt && q.verification) return q;
    changed = true;
    return {
      ...q,
      type: q.type ?? "single",
      options: q.options ?? [],
      correct: Array.isArray(q.correct) ? [...q.correct] : typeof q.correct === "number" ? q.correct : 0,
      topic: q.topic ?? "",
      tags: q.tags ?? [],
      explanation: q.explanation ?? "",
      points: q.points ?? 1,
      createdAt: q.createdAt ?? initAt,
      verification: q.verification ?? "verified",
    };
  });
  if (changed) writeJSON(KEYS.bank, normalized);
  return normalized;
}

export function saveQuestionBank(list: Question[]) {
  // shortcut: conservative UTF-16 budget; actual browser quota may be smaller or shared with exams/results.
  if (JSON.stringify(list).length * 2 > 4 * 1024 * 1024) throw new Error("Sual bankı 4 MiB həddini keçir. Şəkilləri URL kimi saxlayın.");
  writeJSON(KEYS.bank, list);
}

export function addQuestionToBank(q: Question) {
  const bank = getQuestionBank();

  // İyileştirilmiş duplicate təhlükəsizlik: mətn, variantlar və düzgün cavab müqayisə edilər
  const normalizeText = (t: string) =>
    t
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const newNorm = normalizeText(q.text);

  // Mövcud suallarla müqayisə
  const duplicate = bank.find((b) => {
    const existingNorm = normalizeText(b.text);
    if (existingNorm !== newNorm) return false;
    // Mətn eyni olduğu halda variantlar və düzgün cavab yoxlansa yenisə sayılma
    if (
      q.options.length !== b.options.length ||
      q.correct !== b.correct
    )
      return false;
    // Variantlar eşleşirsə, hər birinin mətnini yenisən normalize edək
    for (let i = 0; i < q.options.length; i++) {
      if (
        normalizeText(q.options[i]) !==
        normalizeText(b.options[i] ?? "")
      )
        return false;
    }
    return true;
  });

  if (duplicate) {
    // Duplicate detected - could throw warning or just prevent addition
    // UI-da istifadəçiye bildirə bilərik, lakin store-də qaytarıb əlavə etməkdən məmnun olurik
    console.log(
      "Sual duplicateduq Qeydiyyat rədd edilib: mətn və cavablar artıq bankada mövcud.",
    );
    return;
  }

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
// Sual bankı - İlavə funksiyalar
// ---------------------------------------------------------------------------

/** Sualı kopyalayır */
export function duplicateQuestion(id: string): Question | undefined {
  const bank = getQuestionBank();
  const source = bank.find((q) => q.id === id);
  if (!source) return undefined;

  const duplicate: Question = {
    ...source,
    id: newId(),
    text: source.text + " (köhnə)",
    createdAt: new Date().toISOString(),
    verification: "pending",
  };

  bank.push(duplicate);
  saveQuestionBank(bank);
  return duplicate;
}

/** Redaktor qaralamasını yaddaşa yazmadan yeni suala uyğunlaşdırır. */
export function normalizeQuestionType(q: Question, type: QuestionType): Question {
  const options = type === "true_false" ? ["Doğru", "Yanlış"] :
    q.options.length >= 2 ? [...q.options] : ["", "", "", ""];
  const selected = (Array.isArray(q.correct) ? q.correct : [q.correct])
    .filter((i) => Number.isInteger(i) && i >= 0 && i < options.length);
  return { ...q, type, options, optionImages: type === "true_false" ? undefined : q.optionImages?.slice(0, options.length), correct: type === "multiple" ? [...new Set(selected)] : selected[0] ?? 0 };
}

/** Sualın növünü dəyişir (validasiya ilə) */
export function changeQuestionType(
  id: string,
  newType: QuestionType,
): { success: boolean; error?: string; question?: Question } {
  const bank = getQuestionBank();
  const idx = bank.findIndex((q) => q.id === id);
  if (idx < 0) return { success: false, error: "Sual tapılmadı." };

  const updated = normalizeQuestionType(bank[idx], newType);

  bank[idx] = updated;
  saveQuestionBank(bank);
  return { success: true, question: updated };
}

/** Validasiya nəticəsi */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Sualı validasiya et */
export function validateQuestion(q: Partial<Question>): ValidationResult {
  const errors: string[] = [];
  if (typeof q.text !== "string" || !q.text.trim()) errors.push("Sual mətni boşdur.");
  if (!Array.isArray(q.options) || q.options.length < 2) errors.push("Ən azı 2 variant olmalıdır.");
  else if (q.options.some((o) => typeof o !== "string" || !o.trim())) errors.push("Boş variantlar olmamalıdır.");

  if (q.image !== undefined && !validQuestionImage(q.image)) errors.push("Sual şəkli üçün HTTPS ünvanı və alternativ mətn yazın (URL ≤2048, mətn ≤500 simvol).");
  if (q.optionImages !== undefined && (!Array.isArray(q.optionImages) || q.optionImages.length > (q.options?.length ?? 0) || q.optionImages.some((image) => image !== null && !validQuestionImage(image)))) errors.push("Variant şəkillərinin ünvanını və alternativ mətnini yoxlayın.");
  const type = q.type ?? "single";
  if (!["single", "true_false", "multiple"].includes(type)) errors.push("Sualın növü yanlışdır.");
  const validIndex = (i: number) => Number.isInteger(i) && i >= 0 && i < (q.options?.length ?? 0);
  if (type === "multiple") {
    if (!Array.isArray(q.correct) || q.correct.length === 0) errors.push("Çoxseçimli sualda ən azı 1 düzgün cavab seçin.");
    else if (q.correct.some((i) => !validIndex(i)) || new Set(q.correct).size !== q.correct.length) errors.push("Düzgün cavab indeksləri etibarlı və təkrarsız olmalıdır.");
  } else if (typeof q.correct !== "number" || !validIndex(q.correct)) {
    errors.push("Düzgün cavab variantını seçin.");
  }
  if (type === "true_false" && (q.options?.length !== 2 || q.options[0] !== "Doğru" || q.options[1] !== "Yanlış")) {
    errors.push("Doğru/Yanlış sualında yalnız Doğru və Yanlış variantları olmalıdır.");
  }
  if (q.difficulty !== undefined && !["Asan", "Orta", "Çətin"].includes(q.difficulty)) errors.push("Çətinlik dəyəri yanlışdır.");
  if (q.tags !== undefined && (!Array.isArray(q.tags) || q.tags.some((tag) => typeof tag !== "string"))) errors.push("Etiketlər mətn siyahısı olmalıdır.");
  if (q.verification !== undefined && !["pending", "verified", "rejected"].includes(q.verification)) errors.push("Təsdiq vəziyyəti yanlışdır.");
  if (q.reviewHistory !== undefined && (!Array.isArray(q.reviewHistory) || q.reviewHistory.some((review) => !review || !["verified", "rejected"].includes(review.status) || typeof review.reviewerId !== "string" || !review.reviewerId.trim() || typeof review.reviewerName !== "string" || !review.reviewerName.trim() || typeof review.reviewedAt !== "string" || !Number.isFinite(Date.parse(review.reviewedAt)) || (review.status === "rejected" && (typeof review.reason !== "string" || !review.reason.trim()))))) errors.push("Yoxlama tarixçəsi yanlışdır.");
  for (const field of ["subject", "topic", "grade", "explanation", "createdAt"] as const) {
    if (q[field] !== undefined && typeof q[field] !== "string") errors.push(`${field} mətn olmalıdır.`);
  }
  if (q.createdAt && !Number.isFinite(Date.parse(q.createdAt))) errors.push("Yaradılma tarixi yanlışdır.");
  const points = q.points ?? 1;
  if (!Number.isFinite(points) || points <= 0) errors.push("Bal dəyəri müsbət ədəd olmalıdır.");
  return { valid: errors.length === 0, errors };
}

/**
 * Cavabı yoxlayır və bal hesablayır.
 * Qaytarır: { isCorrect: boolean, earnedPoints: number }
 */
export function scoreAnswer(question: Question, given: number | number[] | null): { isCorrect: boolean; earnedPoints: number } {
  const points = question.points ?? 1;
  if (question.type !== "multiple" && Array.isArray(given) && given.length !== 1) return { isCorrect: false, earnedPoints: 0 };

  if (given === null || given === undefined) {
    return { isCorrect: false, earnedPoints: 0 };
  }

  if (question.type === "multiple") {
    const correctArr = Array.isArray(question.correct) ? question.correct : [];
    const givenArr = Array.isArray(given) ? given : [];

    // Duplicate check
    const uniqueGiven = [...new Set(givenArr)];
    if (uniqueGiven.length !== givenArr.length) {
      return { isCorrect: false, earnedPoints: 0 };
    }

    // Exact match required for multiple choice
    const isCorrect = correctArr.length > 0 && correctArr.length === uniqueGiven.length &&
      correctArr.every((c) => uniqueGiven.includes(c)) &&
      uniqueGiven.every((g) => correctArr.includes(g));

    return { isCorrect, earnedPoints: isCorrect ? points : 0 };
  }

  if (question.type === "true_false") {
    const correct = typeof question.correct === "number" ? question.correct : 0;
    const givenNum = typeof given === "number" ? given : (Array.isArray(given) ? given[0] : null);
    if (givenNum === null) return { isCorrect: false, earnedPoints: 0 };
    const isCorrect = givenNum === correct;
    return { isCorrect, earnedPoints: isCorrect ? points : 0 };
  }

  // single choice
  const correct = typeof question.correct === "number" ? question.correct : 0;
  const givenNum = typeof given === "number" ? given : (Array.isArray(given) ? given[0] : null);
  if (givenNum === null) return { isCorrect: false, earnedPoints: 0 };
  const isCorrect = givenNum === correct;
  return { isCorrect, earnedPoints: isCorrect ? points : 0 };
}

/** Mövcud qayda: normallaşdırılmış mətn, variantlar və düzgün cavablar eynidir. */
function sameQuestion(a: Question, b: Question): boolean {
  const text = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const answers = (value: number | number[]) => JSON.stringify(Array.isArray(value) ? [...value].sort((a, b) => a - b) : value);
  const media = (q: Question) => JSON.stringify([q.image?.url ?? "", q.options.map((_, i) => q.optionImages?.[i]?.url ?? "")]);
  return media(a) === media(b) && text(a.text) === text(b.text) && a.options.length === b.options.length &&
    answers(a.correct) === answers(b.correct) &&
    a.options.every((option, i) => text(option) === text(b.options[i]));
}

/** Sualı banka əlavə et (validasiya ilə) */
export function addQuestionValidated(q: Question): { success: boolean; error?: string; question?: Question } {
  const validation = validateQuestion(q);
  if (!validation.valid) return { success: false, error: validation.errors.join("; ") };
  const bank = getQuestionBank();
  if (bank.some((b) => sameQuestion(b, q))) return { success: false, error: "Bu sual artıq bankda mövcuddur (mətn, variantlar və cavab eynidir)." };
  const question: Question = { ...q, id: newId(), createdAt: q.createdAt ?? new Date().toISOString(), verification: "pending" };
  saveQuestionBank([question, ...bank]);
  return { success: true, question };
}

export function updateQuestionValidated(q: Question): { success: boolean; error?: string; question?: Question } {
  const validation = validateQuestion(q);
  if (!validation.valid) return { success: false, error: validation.errors.join("; ") };
  const bank = getQuestionBank();
  const index = bank.findIndex((b) => b.id === q.id);
  if (index < 0) return { success: false, error: "Sual tapılmadı. Səhifəni yeniləyin." };
  if (bank.some((b, i) => i !== index && sameQuestion(b, q))) return { success: false, error: "Bu sual artıq bankda mövcuddur (mətn, variantlar və cavab eynidir)." };
  const question = { ...bank[index], ...q, createdAt: bank[index].createdAt, verification: "pending" as const, reviewHistory: bank[index].reviewHistory };
  bank[index] = question;
  saveQuestionBank(bank);
  return { success: true, question };
}

/** CSV export üçün sual formatı */
export type QuestionCsvRow = {
  text: string;
  type: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  option5: string;
  option6: string;
  correct: string; // index or comma-separated for multiple
  subject: string;
  topic: string;
  tags: string; // comma-separated
  grade: string;
  difficulty: string;
  explanation: string;
  points: string;
};

/** Bankı CSV-yə ixrac et */
export function exportQuestionsToCsv(questions: Question[], delimiter: "," | "\t" = ","): string {
  const count = Math.max(6, ...questions.map((q) => q.options.length));
  const optionColumns = Array.from({ length: count }, (_, i) => `option${i + 1}`);
  const headers = ["text", "type", ...optionColumns, "correct", "subject", "topic", "tags", "grade", "difficulty", "explanation", "points", "image_url", "image_alt", "metadata"];
  const escape = (value: string | number | undefined) => {
    const escaped = escapeCsvCell(value);
    return delimiter === "\t" && escaped.includes("\t") && !escaped.startsWith('"') ? '"' + escaped + '"' : escaped;
  };
  return [headers.join(delimiter), ...questions.map((q) => [q.text, q.type ?? "single", ...optionColumns.map((_, i) => q.options[i] ?? ""),
    Array.isArray(q.correct) ? q.correct.join(";") : String(q.correct), q.subject ?? "", q.topic ?? "", (q.tags ?? []).join(";"), q.grade ?? "", q.difficulty ?? "Orta", q.explanation ?? "", q.points ?? 1,
    q.image?.url ?? "", q.image?.alt ?? "", JSON.stringify(q)].map(escape).join(delimiter))].join("\n");
}

export type QuestionCsvPreview = {
  success: Question[];
  rows: number[];
  errors: { row: number; error: string }[];
};

/** CSV-dən sualları parse et; dırnaqlı çoxsətirli mətnləri də saxlayır. */
export function parseQuestionsFromCsv(csv: string): QuestionCsvPreview {
  const result: QuestionCsvPreview = { success: [], rows: [], errors: [] };
  if (csv.length > 2 * 1024 * 1024) { result.errors.push({ row: 0, error: "İdxal faylı 2 MiB mətn həddini keçir." }); return result; }
  const records: { row: number; values: string[] }[] = [];
  let values: string[] = [], field = "", quoted = false, closed = false, line = 1, row = 1;
  const source = csv.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const headerLine = source.split("\n").find((line) => line.trim()) ?? "";
  const delimiter = headerLine.includes("\t") ? "\t" : headerLine.includes(",") ? "," : ";";
  for (let i = 0; i <= source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === undefined) { result.errors.push({ row, error: "CSV-də bağlanmamış dırnaq var." }); break; }
      if (ch === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else { field += ch; if (ch === "\n") line++; }
    } else if (ch === '"' && field === "" && !closed) {
      quoted = true;
    } else if (ch === delimiter || ch === "\n" || ch === undefined) {
      values.push(field); field = ""; closed = false;
      if (ch !== delimiter) {
        if (values.length > 1 || values.some((v) => v.trim())) records.push({ row, values });
        values = []; line++; row = line;
      }
    } else if (closed && ch.trim()) {
      result.errors.push({ row, error: "CSV dırnağından sonra gözlənilməz simvol var." });
      field += ch;
    } else if (ch === '"') {
      result.errors.push({ row, error: "CSV sahəsində dırnaq formatı yanlışdır." });
    } else if (!closed) field += ch;
  }
  const header = records.shift();
  if (!header || records.length === 0) { result.errors.push({ row: 0, error: "CSV boşdur və ya məlumat sətirləri yoxdur." }); return result; }
  const headers = header.values.map((h) => h.trim().toLowerCase());
  for (const required of ["text", "type", "option1", "option2", "correct"]) {
    if (!headers.includes(required)) result.errors.push({ row: header.row, error: `Tələb olunan sütun yoxdur: ${required}` });
  }
  if (new Set(headers).size !== headers.length) result.errors.push({ row: header.row, error: "CSV başlıqlarında təkrar sütun var." });
  if (result.errors.length) return result;

  for (const record of records) {
    try {
      if (record.values.length > headers.length) throw new Error("Sütun sayı başlığa uyğun deyil.");
      const cells: Record<string, string> = {};
      headers.forEach((h, i) => { cells[h] = (record.values[i] ?? "").trim(); });
      const metadata = cells.metadata ? JSON.parse(cells.metadata) : {};
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("Metadata JSON obyekti olmalıdır.");
      const restore = (value: string, original: unknown) => typeof original === "string" && (value === original.trim() || value === "'" + original.trim()) ? original : value;
      const type = cells.type as QuestionType;
      const count = Math.max(2, ...headers.filter((h) => /^option\d+$/.test(h)).map((h) => Number(h.slice(6))));
      if (count > 100) throw new Error("Ən çox 100 variant idxal edilə bilər.");
      const options = Array.from({ length: count }, (_, i) => restore(cells[`option${i + 1}`] ?? "", metadata.options?.[i]));
      while (options.length && !options[options.length - 1]) options.pop();
      const indexes = type === "multiple" ? cells.correct.split(";") : [cells.correct];
      if (indexes.some((index) => !/^\d+$/.test(index.trim()))) throw new Error("Düzgün cavab indeksləri tam ədəd olmalıdır.");
      const correct = indexes.map((index) => Number(index.trim()));
      const q: Question = {
        ...metadata,
        id: newId(), text: restore(cells.text, metadata.text), type, options,
        correct: type === "multiple" ? correct : correct[0],
        points: cells.points === undefined ? metadata.points ?? 1 : cells.points ? Number(cells.points) : 1,
        subject: cells.subject === undefined ? metadata.subject ?? "" : restore(cells.subject, metadata.subject), topic: cells.topic === undefined ? metadata.topic ?? "" : restore(cells.topic, metadata.topic),
        tags: cells.tags === undefined ? metadata.tags ?? [] : Array.isArray(metadata.tags) && restore(cells.tags ?? "", metadata.tags.join(";")) === metadata.tags.join(";") ? metadata.tags : cells.tags ? cells.tags.split(";").map((tag) => tag.trim()).filter(Boolean) : [],
        grade: cells.grade === undefined ? metadata.grade ?? "" : restore(cells.grade, metadata.grade), difficulty: (cells.difficulty === undefined ? metadata.difficulty ?? "Orta" : cells.difficulty || "Orta") as Question["difficulty"],
        explanation: cells.explanation === undefined ? metadata.explanation ?? "" : restore(cells.explanation, metadata.explanation), createdAt: metadata.createdAt || new Date().toISOString(), verification: metadata.verification ?? "pending",
        image: !headers.includes("image_url") ? metadata.image : cells.image_url ? { url: cells.image_url, alt: restore(cells.image_alt ?? "", metadata.image?.alt) } : undefined,
        optionImages: headers.some((header) => /^option\d+_image_url$/.test(header))
          ? options.map((_, index) => cells[`option${index + 1}_image_url`] ? { url: cells[`option${index + 1}_image_url`], alt: cells[`option${index + 1}_image_alt`] ?? "" } : null)
          : metadata.optionImages,

      };
      const validation = validateQuestion(q);
      if (!validation.valid) throw new Error(validation.errors.join("; "));
      result.success.push(q); result.rows.push(record.row);
    } catch (error) {
      result.errors.push({ row: record.row, error: error instanceof Error ? error.message : "CSV sətri yanlışdır." });
    }
  }
  return result;
}

function prepareQuestionImport(csv: string, bank: Question[]): QuestionCsvPreview {
  const preview = parseQuestionsFromCsv(csv);
  preview.success.forEach((q, i) => {
    if (bank.some((b) => sameQuestion(b, q))) preview.errors.push({ row: preview.rows[i], error: "Bu sual artıq bankda mövcuddur." });
    if (preview.success.slice(0, i).some((b) => sameQuestion(b, q))) preview.errors.push({ row: preview.rows[i], error: "Bu sual CSV faylında təkrarlanır." });
  });
  return preview;
}

function readQuestionImportBank(): Question[] {
  const bank = readJSON<Question[] | null>(KEYS.bank, null);
  if (bank === null && window.localStorage.getItem(KEYS.bank) === null) return [];
  if (!Array.isArray(bank)) throw new Error("Sual bankı oxunmadı. Mövcud məlumatı yoxlayın.");
  return bank;
}

export function previewQuestionsFromCsv(csv: string): QuestionCsvPreview {
  try { return prepareQuestionImport(csv, readQuestionImportBank()); }
  catch { return { success: [], rows: [], errors: [{ row: 0, error: "Sual bankı oxunmadı. Mövcud məlumatı yoxlayın." }] }; }
}

/** Bütün fayl yenidən yoxlanılır; uğurlu idxal yalnız bir localStorage yazması edir. */
export function importQuestionsFromCsv(csv: string): { success: boolean; added: number; errors: QuestionCsvPreview["errors"]; questions?: Question[] } {
  try {
    const bank = readQuestionImportBank();
    const preview = prepareQuestionImport(csv, bank);
    if (preview.errors.length || !preview.success.length) return { success: false, added: 0, errors: preview.errors };
    if (preview.success.some((question) => (question.verification === "verified" || question.verification === "rejected" || !!question.reviewHistory?.length)) && !["admin", "coordinator"].includes(getCurrentUser()?.role ?? "")) {
      return { success: false, added: 0, errors: preview.success.flatMap((question, index) => (question.verification === "verified" || question.verification === "rejected" || !!question.reviewHistory?.length) ? [{ row: preview.rows[index], error: "Yoxlama metadata-sının idxalı üçün administrator və ya koordinator icazəsi lazımdır." }] : []) };
    }
    const questions = [...preview.success, ...bank];
    saveQuestionBank(questions);
    return { success: true, added: preview.success.length, errors: [], questions };
  } catch {
    return { success: false, added: 0, errors: [{ row: 0, error: "Sual bankı oxunmadı və ya yaddaşa yazılmadı. Mövcud məlumatı yoxlayıb yenidən cəhd edin." }] };
  }
}

/** Şablon CSV endirimi */
export function downloadCsvTemplate() {
  const template = exportQuestionsToCsv([
    {
      id: "",
      text: "Nümunə sual: Azərbaycanın paytaxtı hansıdır?",
      type: "single" as const,
      options: ["Bakı", "Gəncə", "Sumqayıt", "Mingəçevir"],
      correct: 0,
      subject: "Tarix",
      topic: "Azərbaycan coğrafiyası",
      tags: ["paytaxt", "coğrafiya"],
      grade: "V sinif",
      difficulty: "Asan" as const,
      explanation: "Bakı Azərbaycanın paytaxtıdır.",
      points: 1,
      createdAt: "",
      verification: "pending" as const,
    },
    {
      id: "",
      text: "Nümunə: Su H2O formulasında oksidəntdir.",
      type: "true_false" as const,
      options: ["Doğru", "Yanlış"],
      correct: 0,
      subject: "Kimya",
      topic: "Oksidəntlər",
      tags: ["oksidənt", "kimya"],
      grade: "IX sinif",
      difficulty: "Orta" as const,
      explanation: "Sudə oksigen oksidəntdir.",
      points: 1,
      createdAt: "",
      verification: "pending" as const,
    },
    {
      id: "",
      text: "Nümunə: Azərbaycanın qonşuları hansılardır?",
      type: "multiple" as const,
      options: ["Rusiya", "Gürcüstan", "Türkiyə", "İran", "Ermənistan"],
      correct: [0, 1, 2, 3, 4],
      subject: "Coğrafiya",
      topic: "Qonşu ölkələr",
      tags: ["qonşu", "sərhəd"],
      grade: "VII sinif",
      difficulty: "Çətin" as const,
      explanation: "Azərbaycan 5 ölkə ilə qonşudur.",
      points: 2,
      createdAt: "",
      verification: "pending" as const,
    },
  ]);

  const blob = new Blob(["﻿" + template], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sual-banki-sablon.csv";
  link.click();
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
  if (schoolClass.academicYear !== (idx >= 0 ? classes[idx].academicYear : undefined) && !getAcademicYears().some((year) => year.active && year.label === schoolClass.academicYear)) throw new Error("Aktiv reyestrdən tədris ili seçin.");
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
      passwordHash: "9ca6595ad1d315211887e83b132d4c299500a79c77c2f6be78ff859ab5939522", // hilal123
    },
    {
      id: "u-coord-1",
      name: "Aysel Qasımova",
      email: "aysel@hilalkurslari.az",
      role: "coordinator",
      active: true,
      passwordHash: "9ca6595ad1d315211887e83b132d4c299500a79c77c2f6be78ff859ab5939522", // hilal123
    },
    {
      id: "u-coord-2",
      name: "Elvin Məmmədov",
      email: "elvin@hilalkurslari.az",
      role: "coordinator",
      active: true,
      passwordHash: "9ca6595ad1d315211887e83b132d4c299500a79c77c2f6be78ff859ab5939522", // hilal123
    },
    {
      id: "u-teach-1",
      name: "Nərmin Əliyeva",
      email: "nermin@hilalkurslari.az",
      role: "teacher",
      active: false,
      passwordHash: "9ca6595ad1d315211887e83b132d4c299500a79c77c2f6be78ff859ab5939522", // hilal123
    },
  ];
}

function seedBank(): Question[] {
  const base = {
    type: "single" as QuestionType,
    topic: "",
    tags: [] as string[],
    explanation: "",
    points: 1,
    createdAt: new Date().toISOString(),
    verification: "verified" as const,
  };

  return [
    {
      ...base,
      id: uid(),
      text: "2x + 6 = 18 tənliyində x-in qiyməti neçədir?",
      options: ["4", "6", "8", "12"],
      correct: 1,
      subject: "Riyaziyyat",
      grade: "IX sinif",
      difficulty: "Asan",
      topic: "Tənliklər",
      tags: ["tənlik", "algebra"],
      explanation: "2x = 12, x = 6",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "45 × 18 hasilinin qiyməti necədir?",
      options: ["720", "780", "810", "850"],
      correct: 2,
      subject: "Riyaziyyat",
      grade: "VII sinif",
      difficulty: "Asan",
      topic: "Vurma əməliyyatı",
      tags: ["vurma", "arifmetik"],
      explanation: "45 × 18 = 810",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "Kvadrat tənliyin diskriminantı necə tapılır?",
      options: ["b² − 4ac", "b² + 4ac", "4ac − b²", "b² · 4ac"],
      correct: 0,
      subject: "Riyaziyyat",
      grade: "IX sinif",
      difficulty: "Orta",
      topic: "Kvadrat tənliklər",
      tags: ["diskriminant", "kvadrat tənlik"],
      explanation: "Diskriminant D = b² − 4ac",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "Kubun neçə tilası (kənarı) var?",
      options: ["8", "10", "12", "16"],
      correct: 2,
      subject: "Riyaziyyat",
      grade: "VII sinif",
      difficulty: "Asan",
      topic: "Həndəsə",
      tags: ["kub", "həndəsə"],
      explanation: "Kubun 6 yüzü, 12 kənarı, 8 köçəsi var.",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "Sürətin beynəlxalq sistemdə (SI-də) vahidi hansıdır?",
      options: ["km/saat", "m/s", "m/s²", "km/s"],
      correct: 1,
      subject: "Fizika",
      grade: "VIII sinif",
      difficulty: "Asan",
      topic: "Kinematika",
      tags: ["sürət", "SI vahidləri"],
      explanation: "Sürətin SI vahidi m/s-dir.",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "1 kiloqram neçə qrama bərabərdir?",
      options: ["10", "100", "1000", "10 000"],
      correct: 2,
      subject: "Fizika",
      grade: "VII sinif",
      difficulty: "Asan",
      topic: "Ölcü vahidləri",
      tags: ["kiloqram", "qram", "çevirmə"],
      explanation: "1 kg = 1000 qram.",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "Elektrik cərəyanının vahidi hansıdır?",
      options: ["Volt", "Amper", "Om", "Vat"],
      correct: 1,
      subject: "Fizika",
      grade: "IX sinif",
      difficulty: "Orta",
      topic: "Elektriklik",
      tags: ["cərəyan", "amper", "vahid"],
      explanation: "Elektrik cərəyanının vahidi Amperdir.",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "Azərbaycanın dövlət dili hansıdır?",
      options: ["Rus dili", "İngilis dili", "Azərbaycan dili", "Türk dili"],
      correct: 2,
      subject: "Azərbaycan dili",
      grade: "V sinif",
      difficulty: "Asan",
      topic: "Dövlət dili",
      tags: ["Azərbaycan dili", "dövlət dili"],
      explanation: "Azərbaycanın dövlət dili Azərbaycan diliдир.",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "H2O kimyəvi formulu hansı maddəyə aiddir?",
      options: ["Hidrogen", "Oksigen", "Su", "Hidrogen peroksid"],
      correct: 2,
      subject: "Kimya",
      grade: "VIII sinif",
      difficulty: "Asan",
      topic: "Kimyəvi formulalar",
      tags: ["su", "H2O", "kimya"],
      explanation: "H2O su kimiyasının formuludur.",
      points: 1,
    },
    {
      ...base,
      id: uid(),
      text: "Fotosintez zamanı hansı qaz ayrılır?",
      options: ["Oksigen", "Karbon qazı", "Azot", "Hidrogen"],
      correct: 0,
      subject: "Biologiya",
      grade: "VII sinif",
      difficulty: "Orta",
      topic: "Fotosintez",
      tags: ["fotosintez", "oksigen", "bitkilər"],
      explanation: "Fotosintez zamanı bitkilər oksigen azad edir.",
      points: 1,
    },
  ];
}


// ---------------------------------------------------------------------------
// Şifrə hashleme (client-side SHA-256)
// ---------------------------------------------------------------------------

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hash;
}

// ---------------------------------------------------------------------------
// İstifadəçi CRUD
// ---------------------------------------------------------------------------

function validateUser(user: Pick<User, "name" | "email" | "role" | "active">): string | undefined {
  if (!user.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim()) || !["admin", "coordinator", "teacher", "seller"].includes(user.role) || typeof user.active !== "boolean") return "Ad, e-poçt və istifadəçi rolunu yoxlayın.";
}

export async function createUser(userData: Omit<User, "id"> & { password: string }): Promise<{ success: boolean; error?: string; user?: User }> {
  requireAdmin();
  const error = validateUser(userData);
  if (error || !userData.password) return { success: false, error: error ?? "Şifrə yazın." };
  const passwordHash = await hashPassword(userData.password);
  requireAdmin();
  const users = getUsers();
  const companyError = validateCompanyAssignment(userData.companyId);
  if (companyError) return { success: false, error: companyError };
  const email = userData.email.trim().toLowerCase();
  if (users.some((u) => u.email.trim().toLowerCase() === email)) return { success: false, error: "Bu e-poçt ilə istifadəçi artıq mövcuddur." };
  const user: User = { id: newId(), name: userData.name.trim(), email, role: userData.role, active: userData.active, passwordHash, sellerExamIds: userData.sellerExamIds ?? [], companyId: userData.companyId };
  writeJSON(KEYS.users, [...users, user]);
  return { success: true, user: { ...user, passwordHash: undefined } };
}

export async function updateUser(user: User, password?: string): Promise<{ success: boolean; error?: string }> {
  requireAdmin();
  const error = validateUser(user);
  if (error) return { success: false, error };
  const passwordHash = password ? await hashPassword(password) : undefined;
  requireAdmin();
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index < 0) return { success: false, error: "İstifadəçi tapılmadı." };
  const companyError = validateCompanyAssignment(user.companyId, users[index].companyId);
  if (companyError) return { success: false, error: companyError };
  const email = user.email.trim().toLowerCase();
  if (users.some((u, i) => i !== index && u.email.trim().toLowerCase() === email)) return { success: false, error: "Bu e-poçt ilə başqa bir istifadəçi artıq mövcuddur." };
  if (users[index].role === "admin" && users[index].active && (!user.active || user.role !== "admin") && users.filter((u) => u.role === "admin" && u.active).length <= 1) return { success: false, error: "Son aktiv administrator deaktiv edilə və ya rolu dəyişdirilə bilməz." };
  users[index] = { ...users[index], ...user, name: user.name.trim(), email, passwordHash: passwordHash ?? users[index].passwordHash };
  writeJSON(KEYS.users, users);
  return { success: true };
}

export function deleteUser(id: string): { success: boolean; error?: string } {
  requireAdmin();
  const users = getUsers(), user = users.find((u) => u.id === id);
  if (!user) return { success: false, error: "İstifadəçi tapılmadı." };
  if (user.role === "admin" && user.active && users.filter((u) => u.role === "admin" && u.active).length <= 1) return { success: false, error: "Son aktiv administrator silinə bilməz." };
  writeJSON(KEYS.users, users.filter((u) => u.id !== id));
  return { success: true };
}

export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
  const identity = email.trim().toLowerCase();
  const user = getUsers().find((u) => u.email.trim().toLowerCase() === identity || (identity === "admin" && u.id === "u-admin"));
  if (!user || !user.active || !user.passwordHash || !await verifyPassword(password, user.passwordHash)) return { success: false, error: "İstifadəçi adı və ya şifrə yanlışdır, yaxud hesab deaktivdir." };
  return { success: true, user: { ...user, passwordHash: undefined } };
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

// ---------------------------------------------------------------------------
// Bilet satışları
// ---------------------------------------------------------------------------

export function getTicketSales(): TicketSale[] {
  seedIfEmpty();
  const user = getCurrentUser();
  const sales = readJSON<TicketSale[]>(KEYS.ticketSales, []);
  if (!user) return [];
  if (user.role === "seller") return sales.filter((sale) => sale.sellerId === user.id);
  return user.role === "admin" || user.role === "coordinator" ? sales : [];
}

export function saveTicketSales(sales: TicketSale[]) {
  requireAdmin();
  writeJSON(KEYS.ticketSales, sales);
}

export function sellTicket(
  examId: string,
  ticketCode: string,
  sellerId: string,
  studentFIN: string,
  studentName: string,
  price: number
): { success: boolean; error?: string; sale?: TicketSale } {
  try {
    const seller = getCurrentUser();
    if (!seller || seller.id !== sellerId || !["admin", "seller"].includes(seller.role)) return { success: false, error: "Bu satış üçün icazəniz yoxdur." };
    if (seller.role === "seller" && !seller.sellerExamIds?.includes(examId)) return { success: false, error: "Bu imtahan üçün satış icazəniz yoxdur." };
    const fin = normalizeFin(studentFIN), ticket = normalizeTicket(ticketCode);
    if (!isValidFin(fin) || !isValidTicket(ticketCode) || !Number.isFinite(price) || price < 0) return { success: false, error: "FİN, bilet kodu və qiyməti yoxlayın." };
    const exam = getExam(examId);
    if (!exam?.onlineEnabled || examStatus(exam) !== "active") return { success: false, error: "İmtahan aktiv onlayn rejimdə deyil." };
    if (!exam.ticketCodes.some((code) => normalizeTicket(code) === ticket)) return { success: false, error: "Bilet bu imtahan üçün ayrılmayıb." };
    const sales = readJSON<TicketSale[]>(KEYS.ticketSales, []);
    if (sales.some((sale) => sale.examId === examId && (normalizeTicket(sale.ticketCode) === ticket || normalizeFin(sale.studentFIN) === fin))) return { success: false, error: "Bu bilet və ya FİN üçün satış artıq mövcuddur." };
    const sale: TicketSale = { id: newId(), companyId: exam.companyId, examId, examTitle: exam.title, ticketCode: ticket, sellerId, sellerName: seller.name, studentFIN: fin, studentName: studentName?.trim() || undefined, soldAt: new Date().toISOString(), price };
    writeJSON(KEYS.ticketSales, [...sales, sale]);
    return { success: true, sale };
  } catch {
    return { success: false, error: "Satış yadda saxlanılmadı. Yenidən cəhd edin." };
  }
}

export function getSalesBySeller(sellerId: string): TicketSale[] {
  return getTicketSales().filter((s) => s.sellerId === sellerId);
}

export function getSalesByExam(examId: string): TicketSale[] {
  return getTicketSales().filter((s) => s.examId === examId);
}

export function getAvailableTickets(examId: string): string[] {
  const exam = getExam(examId);
  if (!exam) return [];
  const sales = readJSON<TicketSale[]>(KEYS.ticketSales, []);
  const soldCodes = new Set(
    sales.filter((s) => s.examId === examId).map((s) => s.ticketCode.toUpperCase())
  );
  return exam.ticketCodes.filter((c) => !soldCodes.has(c.toUpperCase()));
}

// ---------------------------------------------------------------------------
// Satış hesabatları
// ---------------------------------------------------------------------------

export function getFilteredTicketSales(filters: SalesReportFilters = {}): TicketSale[] {
  const parseDate = (value: string, end: boolean) => {
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T00:00:00" : value);
    if (!Number.isFinite(date.getTime())) throw new Error("Tarix yanlışdır.");
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setDate(date.getDate() + 1);
    return date.getTime();
  };
  const start = filters.startDate ? parseDate(filters.startDate, false) : -Infinity;
  const end = filters.endDate ? parseDate(filters.endDate, true) : Infinity;
  if (start > end) throw new Error("Tarix aralığı yanlışdır.");
  const dateOnlyEnd = /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate ?? "");
  return getTicketSales().filter((sale) => {
    const date = Date.parse(sale.soldAt);
    return date >= start && (dateOnlyEnd ? date < end : date <= end) &&
      (!filters.sellerId || sale.sellerId === filters.sellerId) && (!filters.examId || sale.examId === filters.examId);
  });
}

export function generateSalesReport(filters: {
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  examId?: string;
} = {}): {
  totalTickets: number;
  totalRevenue: number;
  bySeller: { sellerId: string; sellerName: string; tickets: number; revenue: number }[];
  byExam: { examId: string; examTitle: string; tickets: number; revenue: number }[];
  byDate: { date: string; tickets: number; revenue: number }[];
} {
  const sales = getFilteredTicketSales(filters);

  // Calculate totals
  const totalTickets = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.price, 0);

  // By seller
  const sellerMap = new Map<string, { sellerId: string; sellerName: string; tickets: number; revenue: number }>();
  for (const s of sales) {
    const existing = sellerMap.get(s.sellerId) || { sellerId: s.sellerId, sellerName: s.sellerName, tickets: 0, revenue: 0 };
    existing.tickets++;
    existing.revenue += s.price;
    sellerMap.set(s.sellerId, existing);
  }
  const bySeller = Array.from(sellerMap.values()).sort((a, b) => b.revenue - a.revenue);

  // By exam
  const examMap = new Map<string, { examId: string; examTitle: string; tickets: number; revenue: number }>();
  for (const s of sales) {
    const existing = examMap.get(s.examId) || { examId: s.examId, examTitle: s.examTitle, tickets: 0, revenue: 0 };
    existing.tickets++;
    existing.revenue += s.price;
    examMap.set(s.examId, existing);
  }
  const byExam = Array.from(examMap.values()).sort((a, b) => b.revenue - a.revenue);

  // By date
  const dateMap = new Map<string, { date: string; tickets: number; revenue: number }>();
  for (const s of sales) {
    const date = s.soldAt.split("T")[0];
    const existing = dateMap.get(date) || { date, tickets: 0, revenue: 0 };
    existing.tickets++;
    existing.revenue += s.price;
    dateMap.set(date, existing);
  }
  const byDate = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalTickets,
    totalRevenue,
    bySeller,
    byExam,
    byDate,
  };
}

// Initialize default seller password for existing users
export async function ensureDefaultPasswords() {
  const users = getUsers();
  let changed = false;

  for (const user of users) {
    if (!user.passwordHash) {
      user.passwordHash = await hashPassword("hilal123");
      changed = true;
    }
  }

  if (changed) {
    writeJSON(KEYS.users, users);
  }
}

/** Təsdiq cari bank üzərində aparılır; müəllimlər təsdiq edə bilməz. */
export function verifyQuestion(id: string) { return reviewQuestion(id, "verified"); }

export function reviewQuestion(id: string, status: "verified" | "rejected", reason = ""): { success: boolean; error?: string; questions?: Question[] } {
  try {
    const user = getCurrentUser();
    if (!user || !["admin", "coordinator"].includes(user.role)) return { success: false, error: "Yoxlama yalnız administrator və koordinator üçündür." };
    if (!["verified", "rejected"].includes(status) || (status === "rejected" && !reason.trim())) return { success: false, error: "Rədd səbəbini yazın." };
    if (reason.length > 2000) return { success: false, error: "Səbəb 2000 simvoldan uzun ola bilməz." };
    const bank = getQuestionBank(), index = bank.findIndex((question) => question.id === id);
    if (index < 0) return { success: false, error: "Sual tapılmadı." };
    if (bank[index].verification !== "pending") return { success: false, error: "Bu sual artıq yoxlanılıb. Siyahını yeniləyin." };
    const validation = validateQuestion(bank[index]);
    if (status === "verified" && !validation.valid) return { success: false, error: validation.errors.join("; ") };
    bank[index] = { ...bank[index], verification: status, reviewHistory: [...(bank[index].reviewHistory ?? []), { status, reviewerId: user.id, reviewerName: user.name, reviewedAt: new Date().toISOString(), ...(status === "rejected" ? { reason: reason.trim() } : {}) }] };
    saveQuestionBank(bank);
    return { success: true, questions: bank };
  } catch { return { success: false, error: "Yoxlama yaddaşa yazılmadı. Yenidən cəhd edin." }; }
}

export function getCompanies(): Company[] {
  const records = readJSON<Company[]>(KEYS.companies, []);
  if (!Array.isArray(records)) throw new Error("Şirkət reyestri oxunmadı.");
  return records;
}

function validateCompanyAssignment(id?: string, previousId?: string): string | undefined {
  if (!id || id === previousId) return;
  if (!getCompanies().some((company) => company.id === id && company.active)) return "Aktiv şirkət seçin.";
}

export function saveCompany(company: Company, isEdit: boolean): { success: boolean; error?: string; record?: Company } {
  try {
    requireAdmin();
    if (!company.id.trim() || !company.name.trim() || !/^[A-Z0-9][A-Z0-9_-]{1,39}$/i.test(company.code.trim()) || typeof company.active !== "boolean") return { success: false, error: "Şirkət adı və 2–40 simvolluq unikal kod yazın (hərf, rəqəm, _ və -)." };
    const records = getCompanies(), index = records.findIndex((row) => row.id === company.id);
    if (isEdit !== (index >= 0)) return { success: false, error: isEdit ? "Şirkət tapılmadı." : "Bu ID artıq mövcuddur." };
    const code = company.code.trim().toUpperCase();
    if (records.some((row, i) => i !== index && row.code.trim().toUpperCase() === code)) return { success: false, error: "Bu şirkət kodu artıq mövcuddur." };
    const record = { ...(index >= 0 ? records[index] : {}), ...company, name: company.name.trim(), code, createdAt: index >= 0 ? records[index].createdAt : new Date().toISOString() };
    const next = index >= 0 ? records.map((row, i) => i === index ? record : row) : [...records, record];
    writeJSON(KEYS.companies, next);
    return { success: true, record };
  } catch { return { success: false, error: "Şirkət saxlanılmadı. İcazəni və yaddaşı yoxlayın." }; }
}

/** Tarixi mətnlər yalnız oxunur; ayrıca reyestrə avtomatik yazılmır. */
export function getAcademicYears(): AcademicYear[] {
  const stored = readJSON<AcademicYear[]>(KEYS.academicYears, []);
  if (!Array.isArray(stored)) throw new Error("Tədris ili reyestri oxunmadı.");
  const labels = new Set([currentAcademicYear(), ...readJSON<Exam[]>(KEYS.exams, []).map((exam) => exam.academicYear), ...readJSON<SchoolClass[]>(KEYS.classes, []).map((row) => row.academicYear)].filter((label): label is string => !!label));
  return [...stored, ...[...labels].filter((label) => !stored.some((year) => year.label === label)).map((label) => ({ id: `legacy-year:${label}`, label, active: true, createdAt: "" }))];
}

export function saveAcademicYear(year: AcademicYear, isEdit: boolean): { success: boolean; error?: string; record?: AcademicYear } {
  try {
    requireAdmin();
    const all = getAcademicYears(), previous = all.find((row) => row.id === year.id);
    if (isEdit !== !!previous) return { success: false, error: isEdit ? "Tədris ili tapılmadı." : "Bu ID artıq mövcuddur." };
    const label = isEdit && year.label === previous?.label ? previous.label : year.label.trim();
    if ((!isEdit && year.id.startsWith("legacy-year:")) || (previous?.id.startsWith("legacy-year:") && previous.label !== label)) return { success: false, error: "Tarixi/default ilin adı sabitdir. Yeni il yaradın." };
    const referenced = previous && [...readJSON<Exam[]>(KEYS.exams, []), ...readJSON<SchoolClass[]>(KEYS.classes, [])].some((row) => row.academicYear === previous.label);
    if (referenced && previous.label !== label) return { success: false, error: "İstifadə olunan ilin adı dəyişdirilə bilməz. Yeni il yaradın." };
    if (!year.id.trim() || typeof year.active !== "boolean" || ((!previous || label !== previous.label) && (!/^\d{4}-\d{4}$/.test(label) || Number(label.slice(5)) !== Number(label.slice(0, 4)) + 1))) return { success: false, error: "İli ardıcıl YYYY-YYYY formatında yazın, məsələn 2026-2027." };
    if (all.some((row) => row.id !== year.id && row.label.trim() === label.trim())) return { success: false, error: "Bu tədris ili artıq mövcuddur." };
    const stored = readJSON<AcademicYear[]>(KEYS.academicYears, []);
    const record = { ...year, label, createdAt: previous?.createdAt || new Date().toISOString() };
    writeJSON(KEYS.academicYears, [...stored.filter((row) => row.id !== year.id), record]);
    return { success: true, record };
  } catch { return { success: false, error: "Tədris ili saxlanılmadı. İcazəni və yaddaşı yoxlayın." }; }
}
