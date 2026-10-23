import { z } from "zod";
import { validateQuestion } from "./store";
const id = z.string().trim().min(1).max(200);
const date = z.string().datetime({ offset: true });
const optionalYear=z.string().max(10000).transform(value=>value===""?undefined:value).optional();
const optionalText = z.string().max(10000).optional();
const image = z.object({ url: z.string().max(2048), alt: z.string().min(1).max(500) }).strict();
const answer = z.union([z.number().int().nonnegative(), z.array(z.number().int().nonnegative()).max(100), z.null()]);
const review = z.object({ status: z.enum(["verified", "rejected"]), reviewerId: id, reviewerName: z.string().min(1), reviewedAt: date, reason: optionalText }).strict();
export const questionFieldsSchema = z.object({ id, companyId:id.optional(), text: z.string().min(1).max(100000), options: z.array(z.string().min(1).max(10000)).min(2).max(100), correct: z.union([z.number().int(),z.array(z.number().int())]), type: z.enum(["single","multiple","true_false"]).default("single"), subject: optionalText, topic: optionalText, tags: z.array(z.string()).default([]), grade: optionalText, difficulty: z.enum(["Asan","Orta","Çətin"]).optional(), explanation: optionalText, points: z.number().positive().max(10000).default(1), image: image.optional(), optionImages: z.array(image.nullable()).optional(), verification: z.enum(["pending","verified","rejected"]).default("pending"), reviewHistory: z.array(review).optional(), createdAt: date.optional(), updatedAt: date.optional() }).strict();
export const migrationQuestion = questionFieldsSchema.superRefine((q, ctx) => { if(!validateQuestion(q).valid) ctx.addIssue({code:"custom",message:"Sualın variantları, cavabları və ya şəkli yanlışdır."}); });
export const migrationCompany = z.object({id,name:z.string().trim().min(1).max(200),code:z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/).transform(v=>v.toUpperCase()),active:z.boolean(),createdAt:date.optional()}).strict();
export const migrationYear = z.object({id,label:z.string().regex(/^\d{4}-\d{4}$/).refine(v=>Number(v.slice(5))===Number(v.slice(0,4))+1),active:z.boolean(),createdAt:date.optional()}).strict();
export const migrationUser = z.object({id,name:z.string().min(1).max(200),email:z.string().email().transform(v=>v.toLowerCase()),role:z.enum(["admin","coordinator","teacher","seller"]),active:z.boolean(),companyId:id.optional(),sellerExamIds:z.array(id).default([]),createdAt:date.optional(),updatedAt:date.optional()}).strict();
export const migrationExam = z.object({id,title:z.string().min(1),subject:z.string().min(1),startsAt:date,endsAt:date,durationMin:z.number().int().min(1).max(1000),questions:z.array(migrationQuestion).min(1).max(1000),ticketCodes:z.array(z.string().trim().regex(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/).transform(v=>v.toUpperCase())),createdAt:date.optional(),status:z.enum(["preparing","first_ready","review","done"]).default("preparing"),code:optionalText,grade:optionalText,block:optionalText,academicYear:optionalYear,variants:z.number().int().positive().default(1),pdfReady:z.boolean().default(false),onlineEnabled:z.boolean().default(false),companyId:id.optional()}).strict().refine(e=>Date.parse(e.endsAt)>Date.parse(e.startsAt),"Tarix aralığı yanlışdır.");
export const migrationClass = z.object({id,name:z.string().min(1),grade:z.string(),section:optionalText,teacher:z.string().min(1),studentCount:z.number().int().nonnegative(),academicYear:z.string().min(1),companyId:id.optional(),createdAt:date.optional()}).strict();
export const migrationSale = z.object({id,examId:id,examTitle:z.string(),ticketCode:z.string().trim().regex(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/).transform(v=>v.toUpperCase()),sellerId:id,sellerName:z.string(),studentFIN:z.string().trim().regex(/^[A-Za-z0-9]{7}$/).transform(v=>v.toUpperCase()),studentName:optionalText,soldAt:date,price:z.number().nonnegative().finite(),companyId:id.optional()}).strict();
export const migrationResult = z.object({id,examId:id,examTitle:z.string(),fin:z.string().trim().regex(/^[A-Za-z0-9]{7}$/).transform(v=>v.toUpperCase()),ticketCode:z.string().trim().regex(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/).transform(v=>v.toUpperCase()),answers:z.array(answer),questions:z.array(migrationQuestion).optional(),questionsSnapshot:z.array(migrationQuestion).optional(),correctCount:z.number().int().nonnegative(),total:z.number().int().positive(),score:z.number().int().min(0).max(100),startedAt:date,finishedAt:date,timeSpentSec:z.number().int().nonnegative(),companyId:id.optional(),academicYear:optionalYear}).strict().refine(r=>!!(r.questionsSnapshot?.length||r.questions?.length)&&r.correctCount<=r.total&&r.answers.length===r.total&&(r.questionsSnapshot??r.questions)?.length===r.total,"Tarixi nəticənin sual surəti və cavabları tələb olunur.");
export const migrationSchema = z.object({version:z.literal(1),exportedAt:date,companies:z.array(migrationCompany).max(10000),academicYears:z.array(migrationYear).max(10000),users:z.array(migrationUser).max(10000),exams:z.array(migrationExam).max(10000),questions:z.array(migrationQuestion).max(10000),classes:z.array(migrationClass).max(10000),ticketSales:z.array(migrationSale).max(10000),results:z.array(migrationResult).max(10000)}).strict();
export type MigrationData = z.infer<typeof migrationSchema>;
export const migrationSections = ["companies","academicYears","users","exams","questions","classes","ticketSales","results"] as const;
export type MigrationSection = typeof migrationSections[number];
export type MigrationPreview = Record<MigrationSection,{create:number;update:number;skip:number;conflicts:string[]}> & {errors:string[];manualReenrollment:string[]};

/** Only declared business fields leave the browser; authentication state is never read. */
export function exportLegacyData(storage: Pick<Storage,"getItem">): MigrationData {
 const result: Record<string,unknown> = {version:1,exportedAt:new Date().toISOString()};
 const schemas = {companies:migrationCompany,academicYears:migrationYear,users:migrationUser,exams:migrationExam,questions:migrationQuestion,classes:migrationClass,ticketSales:migrationSale,results:migrationResult};
 for(const key of migrationSections){
  const raw:unknown=JSON.parse(storage.getItem(`kitabca.${key==="questions"?"questionBank":key}`)??"[]");
  if(!Array.isArray(raw))throw new Error(`${key}: siyahı oxunmadı.`);
  result[key]=raw.map((row:unknown)=>{
   if(!row||typeof row!=="object")throw new Error(`${key}: qeyd yanlışdır.`);
   const entries=Object.entries(row).filter(([field])=>key==="users" ? field in schemas.users.shape : !["password","passwordHash","token","sessionToken","accessToken","attemptId"].includes(field));
   return Object.fromEntries(entries);
  });
 }
 return migrationSchema.parse(result);
}
