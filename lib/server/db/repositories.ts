import {recordVersion} from "../version";
import { Prisma, type Question as StoredQuestion } from "@prisma/client";
import { migrationQuestion } from "../../migration-format";
import { prisma } from "@/lib/server/db/client";
import type {
  Exam,
  Question,
  User,
  Company,
  AcademicYear,
  SchoolClass,
  TicketSale,
  ExamResult,
  ExamAttempt,
  ExamVersion,
  UserRole,
  ExamPhase,
  QuestionType,
  QuestionVerification,
} from "@/lib/types";

export type { Exam, Question, User, Company, AcademicYear, SchoolClass, TicketSale, ExamResult, ExamAttempt, ExamVersion, UserRole, ExamPhase, QuestionType, QuestionVerification };

function toISO(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === "string") return date;
  return date.toISOString();
}

function toISORequired(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toISOString();
}

function optStr(val: string | null | undefined): string | undefined {
  return val ?? undefined;
}

function parseJson<T>(val: unknown): T {
  if (val === null || val === undefined) return undefined as T;
  if (typeof val === "string") return JSON.parse(val);
  return val as T;
}

// Company
export async function getCompanies(): Promise<Company[]> {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return companies.map(c => ({ ...c, createdAt: toISORequired(c.createdAt) }));
}

export async function getCompany(id: string): Promise<Company | null> {
  const c = await prisma.company.findUnique({ where: { id } });
  return c ? { ...c, createdAt: toISORequired(c.createdAt) } : null;
}

export async function createCompany(data: { name: string; code: string; active: boolean }): Promise<Company> {
  const c = await prisma.company.create({ data: { ...data, code: data.code.toUpperCase() } });
  return { ...c, createdAt: toISORequired(c.createdAt) };
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  if (data.code) data.code = data.code.toUpperCase();
  const c = await prisma.company.update({ where: { id }, data });
  return { ...c, createdAt: toISORequired(c.createdAt) };
}

export async function deleteCompany(id: string): Promise<void> {
  await prisma.company.update({ where: { id }, data:{active:false} });
}

// AcademicYear
export async function getAcademicYears(): Promise<AcademicYear[]> {
  const years = await prisma.academicYear.findMany({ orderBy: { label: "desc" } });
  return years.map(y => ({ ...y, createdAt: toISORequired(y.createdAt) }));
}

export async function getAcademicYear(id: string): Promise<AcademicYear | null> {
  const y = await prisma.academicYear.findUnique({ where: { id } });
  return y ? { ...y, createdAt: toISORequired(y.createdAt) } : null;
}

export async function createAcademicYear(data: { label: string; active: boolean }): Promise<AcademicYear> {
  const y = await prisma.academicYear.create({ data });
  return { ...y, createdAt: toISORequired(y.createdAt) };
}

export async function updateAcademicYear(id: string, data: Partial<AcademicYear>): Promise<AcademicYear> {
  const y = await prisma.$transaction(async tx=>{
    const existing=await tx.academicYear.findUniqueOrThrow({where:{id}});
    if(data.label&&data.label!==existing.label&&((await tx.exam.count({where:{academicYear:existing.label}}))||(await tx.schoolClass.count({where:{academicYear:existing.label}}))||(await tx.examResult.count({where:{academicYear:existing.label}}))))throw Error('İstifadə olunan ilin adı dəyişdirilə bilməz.');
    return tx.academicYear.update({where:{id},data});
  });
  return { ...y, createdAt: toISORequired(y.createdAt) };
}

export async function deleteAcademicYear(id: string): Promise<void> {
  await prisma.academicYear.update({ where: { id }, data:{active:false} });
}

// User
export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map(u => ({
    ...u,
    companyId: optStr(u.companyId),
    sellerExamIds: u.sellerExamIds ?? [],
    createdAt: toISORequired(u.createdAt),
    updatedAt: toISORequired(u.updatedAt),
  }));
}

export async function getUser(id: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return null;
  return {
    ...u,
    companyId: optStr(u.companyId),
    sellerExamIds: u.sellerExamIds ?? [],
    createdAt: toISORequired(u.createdAt),
    updatedAt: toISORequired(u.updatedAt),
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const u = await prisma.user.findFirst({ where: { email: {equals:email.trim(),mode:"insensitive"} } });
  if (!u) return null;
  return {
    ...u,
    companyId: optStr(u.companyId),
    sellerExamIds: u.sellerExamIds ?? [],
    createdAt: toISORequired(u.createdAt),
    updatedAt: toISORequired(u.updatedAt),
  };
}

export async function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  passwordHash: string;
  companyId?: string;
  sellerExamIds?: string[];
}): Promise<User> {
  const u = await prisma.user.create({
    data: { ...data, email: data.email.toLowerCase(), sellerExamIds: data.sellerExamIds ?? [] },
  });
  return {
    ...u,
    companyId: optStr(u.companyId),
    sellerExamIds: u.sellerExamIds ?? [],
    createdAt: toISORequired(u.createdAt),
    updatedAt: toISORequired(u.updatedAt),
  };
}

export async function updateUser(id: string, data: Omit<Partial<User>,"companyId"> & {companyId?:string|null},companyScope?:string): Promise<User> {
  if (data.email) data.email = data.email.toLowerCase();
  const u = await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73419282)::text`;
    const current=await tx.user.findUniqueOrThrow({where:{id}});
    if(companyScope&&current.companyId!==companyScope)throw Error("FORBIDDEN");
    if(current.role==='admin'&&current.active&&!current.companyId&&(data.active===false||(data.role&&data.role!=='admin')||data.companyId)){
      if(await tx.user.count({where:{role:'admin',active:true,companyId:null}})<=1)throw Error('Son aktiv administrator qorunur.');
    }
    const updated=await tx.user.update({where:{id},data});
    if(data.passwordHash||data.active===false||(data.role&&data.role!==current.role)||(data.companyId!==undefined&&data.companyId!==current.companyId))await tx.session.deleteMany({where:{userId:id}});
    return updated;
  });
  return {
    ...u,
    companyId: optStr(u.companyId),
    sellerExamIds: u.sellerExamIds ?? [],
    createdAt: toISORequired(u.createdAt),
    updatedAt: toISORequired(u.updatedAt),
  };
}

export async function deleteUser(id: string,companyScope?:string): Promise<void> {
  await updateUser(id,{active:false},companyScope);
}

// Exam
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertExam(exam: any): Exam {
  if (!exam) return exam;
  return {
    ...exam,
    companyId: optStr(exam.companyId),
    code: optStr(exam.code),
    grade: optStr(exam.grade),
    block: optStr(exam.block),
    academicYear: optStr(exam.academicYear),
    startsAt: toISORequired(exam.startsAt),
    endsAt: toISORequired(exam.endsAt),
    createdAt: toISORequired(exam.createdAt),
    questions: parseJson<Question[]>(exam.questions),
  };
}

export async function getExams(companyId?: string): Promise<Exam[]> {
  const exams = await prisma.exam.findMany({
    where: companyId ? { companyId } : {},
    orderBy: { createdAt: "desc" },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return exams.map(convertExam);
}

export async function getExam(id: string): Promise<Exam | null> {
  const exam = await prisma.exam.findUnique({ where: { id } });
  return exam ? convertExam(exam) : null;
}

export async function createExam(data: Omit<Exam, "id" | "createdAt" | "versions" | "results" | "sales" | "attempts">): Promise<Exam> {
  const exam = await prisma.exam.create({ data: { ...data, academicYear:data.academicYear||null, code:data.code?.trim().toUpperCase()||null, questions: data.questions as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ } });
  return convertExam(exam);
}

export async function updateExam(id: string, data: Omit<Partial<Exam>,"companyId"|"code"> & {companyId?:string|null;code?:string|null},expectedVersion?:string,companyScope?:string): Promise<Exam> {
  const {revision:_revision,id:_id,createdAt:_created,...fields}=data;void [_revision,_id,_created];
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Exam" WHERE id=${id} FOR UPDATE`;
    const current=await tx.exam.findUniqueOrThrow({where:{id}});
    if(companyScope&&current.companyId!==companyScope)throw Error("FORBIDDEN");
    if(expectedVersion&&recordVersion(convertExam(current))!==expectedVersion)throw Error('STALE_RECORD');
    const ticketCodes=fields.ticketCodes?.map(code=>code.toUpperCase());
    if(ticketCodes&&(new Set(ticketCodes).size!==ticketCodes.length))throw Error('DUPLICATE_TICKET');
    if(ticketCodes){
      const used=[...(await tx.ticketSale.findMany({where:{examId:id},select:{ticketCode:true}})),...(await tx.examAttempt.findMany({where:{examId:id},select:{ticketCode:true}}))];
      if(used.some(row=>!ticketCodes.includes(row.ticketCode)))throw Error('USED_TICKET');
    }
    const exam=await tx.exam.update({where:{id},data:{...fields,...(fields.questions?{questions:JSON.parse(JSON.stringify(fields.questions)) as Prisma.InputJsonValue}:{}),academicYear:fields.academicYear===undefined?undefined:fields.academicYear||null,code:fields.code===undefined?undefined:fields.code?.trim().toUpperCase()||null,ticketCodes}});
    return convertExam(exam);
  });
}

export async function archiveExam(id: string,companyScope?:string): Promise<Exam> {
 return updateExam(id,{status:"done",onlineEnabled:false},undefined,companyScope);
}

export async function deleteExam(id: string): Promise<void> {
  await prisma.exam.delete({ where: { id } });
}

// ExamVersion
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertExamVersion(v: any): ExamVersion {
  return {
    ...v,
    createdAt: toISORequired(v.createdAt),
    questions: parseJson<Question[]>(v.questions),
  };
}

export async function createExamVersion(examId: string, questions: Question[]): Promise<ExamVersion> {
  const v = await prisma.examVersion.create({ data: { examId, questions: questions as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ } });
  return convertExamVersion(v);
}

export async function getExamVersion(id: string): Promise<ExamVersion | null> {
  const v = await prisma.examVersion.findUnique({ where: { id } });
  return v ? convertExamVersion(v) : null;
}

export async function getLatestExamVersion(examId: string): Promise<ExamVersion | null> {
  const v = await prisma.examVersion.findFirst({ where: { examId }, orderBy: { createdAt: "desc" } });
  return v ? convertExamVersion(v) : null;
}

// ExamAttempt
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertExamAttempt(a: any): ExamAttempt {
  return {
    ...a,
    startedAt: toISORequired(a.startedAt),
    submittedAt: toISO(a.submittedAt),
    expiredAt: toISO(a.expiredAt),
    answers: parseJson<Array<number | number[] | null>>(a.answers),
  };
}

export async function createExamAttempt(data: {
  examId: string;
  versionId: string;
  fin: string;
  ticketCode: string;
  expiresAt: Date;
}): Promise<ExamAttempt> {
  const a = await prisma.examAttempt.create({
    data: {
      examId: data.examId,
      versionId: data.versionId,
      fin: data.fin.toUpperCase(),
      ticketCode: data.ticketCode.toUpperCase(),
      answers: [],
      status: "in_progress",
      expiredAt: data.expiresAt,
    },
  });
  return convertExamAttempt(a);
}

export async function getExamAttempt(id: string): Promise<ExamAttempt | null> {
  const a = await prisma.examAttempt.findUnique({ where: { id }, include: { version: true } });
  return a ? convertExamAttempt(a) : null;
}

export async function getExamAttemptByExamAndFin(examId: string, fin: string): Promise<ExamAttempt | null> {
  const a = await prisma.examAttempt.findUnique({
    where: { examId_fin: { examId, fin: fin.toUpperCase() } },
    include: { version: true },
  });
  return a ? convertExamAttempt(a) : null;
}

export async function getExamAttemptByExamAndTicket(examId: string, ticketCode: string): Promise<ExamAttempt | null> {
  const a = await prisma.examAttempt.findUnique({
    where: { examId_ticketCode: { examId, ticketCode: ticketCode.toUpperCase() } },
    include: { version: true },
  });
  return a ? convertExamAttempt(a) : null;
}

export async function updateExamAttemptAnswers(id: string, answers: (number | number[] | null)[]): Promise<ExamAttempt> {
  const a = await prisma.examAttempt.update({ where: { id }, data: { answers: answers as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ } });
  return convertExamAttempt(a);
}

export async function submitExamAttempt(id: string, timeSpentSec: number): Promise<ExamAttempt> {
  const a = await prisma.examAttempt.update({
    where: { id },
    data: { status: "submitted", submittedAt: new Date(), timeSpentSec },
  });
  return convertExamAttempt(a);
}

export async function expireExamAttempt(id: string): Promise<ExamAttempt> {
  const a = await prisma.examAttempt.update({
    where: { id },
    data: { status: "expired", expiredAt: new Date() },
  });
  return convertExamAttempt(a);
}

// ExamResult
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertExamResult(r: any): ExamResult {
  return {
    ...r,
    companyId: optStr(r.companyId),
    academicYear: optStr(r.academicYear),
    startedAt: toISORequired(r.startedAt),
    finishedAt: toISORequired(r.finishedAt),
    answers: parseJson<Array<number | number[] | null>>(r.answers),
    questionsSnapshot: parseJson<Question[]>(r.questionsSnapshot),
    attemptId: optStr(r.attemptId),
  };
}

export async function createExamResult(data: {
  examId: string;
  attemptId?: string;
  companyId?: string;
  academicYear?: string;
  examTitle: string;
  fin: string;
  ticketCode: string;
  answers: (number | number[] | null)[];
  questionsSnapshot: Question[];
  correctCount: number;
  total: number;
  score: number;
  startedAt: Date;
  finishedAt: Date;
  timeSpentSec: number;
}): Promise<ExamResult> {
  const r = await prisma.examResult.create({
    data: {
      ...data,
      fin: data.fin.toUpperCase(),
      ticketCode: data.ticketCode.toUpperCase(),
      answers: data.answers as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
      questionsSnapshot: data.questionsSnapshot as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
    },
  });
  return convertExamResult(r);
}

export async function getExamResult(id: string): Promise<ExamResult | null> {
  const r = await prisma.examResult.findUnique({ where: { id } });
  return r ? convertExamResult(r) : null;
}

export async function getExamResultByAccessToken(token: string): Promise<ExamResult | null> {
  const r = await prisma.examResult.findUnique({ where: { accessToken: token } });
  return r ? convertExamResult(r) : null;
}

export async function getExamResults(filters: { examId?: string; companyId?: string; academicYear?: string }): Promise<ExamResult[]> {
  const results = await prisma.examResult.findMany({
    where: {
      examId: filters.examId,
      companyId: filters.companyId,
      academicYear: filters.academicYear,
    },
    orderBy: { finishedAt: "desc" },
  });
  return results.map(convertExamResult);
}

// Question

function convertQuestion(q: StoredQuestion): Question {
 return migrationQuestion.parse({id:q.id,companyId:optStr(q.companyId),text:q.text,options:q.options,correct:q.correct,type:q.type,subject:optStr(q.subject),topic:optStr(q.topic),tags:q.tags,grade:optStr(q.grade),difficulty:optStr(q.difficulty),explanation:optStr(q.explanation),points:q.points,image:q.imageUrl?{url:q.imageUrl,alt:q.imageAlt??""}:undefined,optionImages:q.optionImages??undefined,verification:q.verification,reviewHistory:q.reviewHistory??undefined,createdAt:toISORequired(q.createdAt),updatedAt:toISORequired(q.updatedAt)});
}

export async function getQuestions(filters?: {
  companyId?: string;
  subject?: string;
  grade?: string;
  topic?: string;
  difficulty?: string;
  type?: QuestionType;
  verification?: QuestionVerification;
}): Promise<Question[]> {
  const questions = await prisma.question.findMany({
    where: filters as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
    orderBy: { createdAt: "desc" },
  });
  return questions.map(convertQuestion);
}

export async function getQuestion(id: string): Promise<Question | null> {
  const q = await prisma.question.findUnique({ where: { id } });
  return q ? convertQuestion(q) : null;
}

const questionJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
function questionColumns(data: Partial<Question>) {
 const {image,optionImages,correct,reviewHistory,...rest}=data;
 return {...rest,...(correct!==undefined?{correct:questionJson(correct)}:{}),...(image!==undefined?{imageUrl:image.url,imageAlt:image.alt}:{}),...(optionImages!==undefined?{optionImages:questionJson(optionImages)}:{}),...(reviewHistory!==undefined?{reviewHistory:questionJson(reviewHistory)}:{})};
}
export async function createQuestion(data: Omit<Question, "id" | "createdAt" | "updatedAt">): Promise<Question> {
 const {image,optionImages,correct,reviewHistory,...rest}=data;
 const row=await prisma.question.create({data:{...rest,correct:questionJson(correct),tags:data.tags??[],imageUrl:image?.url,imageAlt:image?.alt,...(optionImages?{optionImages:questionJson(optionImages)}:{}),...(reviewHistory?{reviewHistory:questionJson(reviewHistory)}:{})}});
 return convertQuestion(row);
}
export async function updateQuestion(id:string,data:Partial<Question>,expectedUpdatedAt?:string,companyScope?:string):Promise<Question>{return prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(73419281)::text`;const current=await tx.question.findUniqueOrThrow({where:{id}});if(companyScope&&current.companyId!==companyScope)throw Error("FORBIDDEN");if(expectedUpdatedAt&&current.updatedAt.toISOString()!==expectedUpdatedAt)throw Error('STALE_QUESTION');return convertQuestion(await tx.question.update({where:{id},data:questionColumns(data)}));});}

export async function deleteQuestion(id: string,companyScope?:string): Promise<void> {
  const result=await prisma.question.deleteMany({ where: { id,companyId:companyScope } });if(!result.count)throw Error("FORBIDDEN");
}

// SchoolClass

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertClass(c: any): SchoolClass {
  return {
    ...c,
    section: optStr(c.section),
    companyId: optStr(c.companyId),
    createdAt: toISORequired(c.createdAt),
  };
}

export async function getClasses(companyId?: string): Promise<SchoolClass[]> {
  const classes = await prisma.schoolClass.findMany({
    where: companyId ? { companyId } : {},
    orderBy: { name: "asc" },
  });
  return classes.map(convertClass);
}

export async function getClass(id: string): Promise<SchoolClass | null> {
  const c = await prisma.schoolClass.findUnique({ where: { id } });
  return c ? convertClass(c) : null;
}

export async function createClass(data: Omit<SchoolClass, "id" | "createdAt">): Promise<SchoolClass> {
  const c = await prisma.schoolClass.create({ data });
  return convertClass(c);
}

export async function updateClass(id: string, data: Partial<SchoolClass>,companyScope?:string): Promise<SchoolClass> {
 return prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "SchoolClass" WHERE id=${id} FOR UPDATE`;const current=await tx.schoolClass.findUniqueOrThrow({where:{id}});if(companyScope&&current.companyId!==companyScope)throw Error('FORBIDDEN');return convertClass(await tx.schoolClass.update({where:{id},data}));});
}

export async function deleteClass(id: string,companyScope?:string): Promise<void> {
  const result=await prisma.schoolClass.deleteMany({ where: { id,companyId:companyScope } });if(!result.count)throw Error("FORBIDDEN");
}

// TicketSale

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertSale(s: any): TicketSale {
  return {
    ...s,
    companyId: optStr(s.companyId),
    studentName: optStr(s.studentName),
    soldAt: toISORequired(s.soldAt),
  };
}

export async function getTicketSales(filters?: { sellerId?: string; examId?: string; companyId?: string }): Promise<TicketSale[]> {
  const sales = await prisma.ticketSale.findMany({
    where: filters as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
    orderBy: { soldAt: "desc" },
  });
  return sales.map(convertSale);
}

export async function createTicketSale(data: Omit<TicketSale, "id" | "soldAt">): Promise<TicketSale> {
  const s = await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${data.sellerId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Exam" WHERE id=${data.examId} FOR UPDATE`;
    const seller=await tx.user.findUnique({where:{id:data.sellerId}}),exam=await tx.exam.findUnique({where:{id:data.examId}}),now=new Date();
    if(!seller?.active||!['admin','seller'].includes(seller.role)||!exam?.onlineEnabled||now<exam.startsAt||now>=exam.endsAt||!exam.ticketCodes.includes(data.ticketCode)||(seller.role==='seller'&&!seller.sellerExamIds.includes(exam.id))||(seller.companyId&&seller.companyId!==exam.companyId))throw Error('SALE_CONFLICT');
    const attempt=await tx.examAttempt.findFirst({where:{examId:data.examId,ticketCode:data.ticketCode}});
    if(attempt&&attempt.fin!==data.studentFIN)throw Error('SALE_CONFLICT');
    return tx.ticketSale.create({data:{...data,examTitle:exam.title,sellerName:seller.name,companyId:exam.companyId}});
  });
  return convertSale(s);
}

export async function getTicketAvailability(exams:Pick<Exam,'id'|'ticketCodes'>[]):Promise<Record<string,string[]>>{
 const ids=exams.map(exam=>exam.id);
 const [sales,attempts,results]=await Promise.all([prisma.ticketSale.findMany({where:{examId:{in:ids}},select:{examId:true,ticketCode:true}}),prisma.examAttempt.findMany({where:{examId:{in:ids}},select:{examId:true,ticketCode:true}}),prisma.examResult.findMany({where:{examId:{in:ids}},select:{examId:true,ticketCode:true}})]);
 const used=new Map<string,Set<string>>();for(const row of [...sales,...attempts,...results]){if(!used.has(row.examId))used.set(row.examId,new Set());used.get(row.examId)!.add(row.ticketCode.toUpperCase());}
 return Object.fromEntries(exams.map(exam=>[exam.id,exam.ticketCodes.filter(code=>!used.get(exam.id)?.has(code.toUpperCase()))]));
}
export async function getAvailableTickets(examId: string): Promise<string[]> {
 const exam=await prisma.exam.findUnique({where:{id:examId},select:{id:true,ticketCodes:true}});return exam?(await getTicketAvailability([exam]))[examId]:[];
}

export async function getSalesReport(filters: {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  endExclusive?: boolean;
  sellerId?: string;
  examId?: string;
}) {
  const sales = await prisma.ticketSale.findMany({
    where: {
      companyId: filters.companyId,
      sellerId: filters.sellerId,
      examId: filters.examId,
      soldAt: {
        gte: filters.startDate,
        ...(filters.endExclusive?{lt:filters.endDate}:{lte:filters.endDate}),
      },
    },
    orderBy: { soldAt: "asc" },
  });

  const totalTickets = sales.length;
  const totalRevenue = sales.reduce((sum: number, s) => sum + s.price, 0);

  const bySeller = new Map<string, { sellerId: string; sellerName: string; tickets: number; revenue: number }>();
  const byExam = new Map<string, { examId: string; examTitle: string; tickets: number; revenue: number }>();
  const byDate = new Map<string, { date: string; tickets: number; revenue: number }>();

  for (const s of sales) {
    const sellerKey = s.sellerId;
    const seller = bySeller.get(sellerKey) || { sellerId: s.sellerId, sellerName: s.sellerName, tickets: 0, revenue: 0 };
    seller.tickets++;
    seller.revenue += s.price;
    bySeller.set(sellerKey, seller);

    const examKey = s.examId;
    const exam = byExam.get(examKey) || { examId: s.examId, examTitle: s.examTitle, tickets: 0, revenue: 0 };
    exam.tickets++;
    exam.revenue += s.price;
    byExam.set(examKey, exam);

    const date = s.soldAt.toISOString().split("T")[0];
    const day = byDate.get(date) || { date, tickets: 0, revenue: 0 };
    day.tickets++;
    day.revenue += s.price;
    byDate.set(date, day);
  }

  return {
    totalTickets,
    totalRevenue,
    bySeller: Array.from(bySeller.values()).sort((a, b) => b.revenue - a.revenue),
    byExam: Array.from(byExam.values()).sort((a, b) => b.revenue - a.revenue),
    byDate: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Session
export async function createSession(userId: string, token: string, expiresAt: Date): Promise<void> {
  await prisma.session.create({ data: { userId, token, expiresAt } });
}

export async function getSession(token: string) {
  return prisma.session.findUnique({ where: { token }, include: { user: true } });
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } });
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function deleteExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
