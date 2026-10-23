import {recordVersion} from "./version";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "./db/client";
import { scoreAnswer } from "../store";
import { migrationQuestion } from "../migration-format";
import { z } from "zod";
export const answerPayload=z.object({expectedVersion:z.string().regex(/^[a-f0-9]{64}$/).optional(),attemptId:z.string().min(1).max(200),answers:z.array(z.union([z.number().int().nonnegative(),z.array(z.number().int().nonnegative()).max(100),z.null()])).max(1000)}).strict();
type Answers=z.infer<typeof answerPayload>["answers"];
function validAnswers(questions:z.infer<typeof migrationQuestion>[],answers:Answers){
 return answers.length===questions.length&&questions.every((q,i)=>{const value=answers[i];if(value===null)return true;if(q.type==='multiple')return Array.isArray(value)&&new Set(value).size===value.length&&value.every(index=>index<q.options.length);return typeof value==='number'&&value<q.options.length;});
}
export async function writeAttempt(id:string,answers:Answers,submit:boolean,expectedVersion?:string){
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "ExamAttempt" WHERE id=${id} FOR UPDATE`;
  const attempt=await tx.examAttempt.findUnique({where:{id},include:{version:true,exam:true,result:true}});
  if(!attempt)throw new Error('ATTEMPT_NOT_FOUND');
  if(attempt.result&&submit)return attempt.result;
  if(attempt.status!=='in_progress')throw new Error('ALREADY_SUBMITTED');
  const questions=z.array(migrationQuestion).parse(attempt.version.questions);
  const expired=!!attempt.expiredAt&&Date.now()>=attempt.expiredAt.getTime();
  if(!submit&&expired)throw new Error('EXPIRED');
  if(!expired&&expectedVersion&&recordVersion(attempt.answers)!==expectedVersion)throw Error('STALE_ANSWERS');
  if(!validAnswers(questions,answers))throw new Error('ANSWER_COUNT_MISMATCH');
  // At deadline only answers already accepted by the server can earn points.
  const accepted:Answers=expired?questions.map((_,i)=>{const saved=attempt.answers;return Array.isArray(saved)?saved[i] as Answers[number]??null:null;}):answers;
  if(!submit){await tx.examAttempt.update({where:{id},data:{answers}});return null;}
  const scores=questions.map((q,i)=>scoreAnswer(q,accepted[i]??null));
  const totalPoints=questions.reduce((n,q)=>n+q.points,0),earned=scores.reduce((n,s)=>n+s.earnedPoints,0);
  const finishedAt=new Date(),timeSpentSec=Math.max(0,Math.floor(((attempt.expiredAt?Math.min(finishedAt.getTime(),attempt.expiredAt.getTime()):finishedAt.getTime())-attempt.startedAt.getTime())/1000));
  await tx.examAttempt.update({where:{id},data:{answers:accepted,status:'submitted',submittedAt:finishedAt,timeSpentSec}});
  const metadata=versionMetadata.safeParse(attempt.version.metadata);
  const historical=metadata.success?metadata.data:attempt.exam;
  return tx.examResult.create({data:{examId:attempt.examId,attemptId:id,companyId:historical.companyId,academicYear:historical.academicYear,examTitle:historical.title,fin:attempt.fin,ticketCode:attempt.ticketCode,answers:accepted,questionsSnapshot:attempt.version.questions??Prisma.JsonNull,correctCount:scores.filter(s=>s.isCorrect).length,total:questions.length,score:Math.round(100*earned/totalPoints),startedAt:attempt.startedAt,finishedAt,timeSpentSec,accessToken:randomBytes(32).toString('hex')}});
 });
}

export const versionMetadata=z.object({title:z.string(),subject:z.string(),durationMin:z.number(),companyId:z.string().nullable(),academicYear:z.string().nullable()});
export async function beginAttempt(examId:string,fin:string,ticketCode:string){
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Exam" WHERE id=${examId} FOR UPDATE`;
  const exam=await tx.exam.findUnique({where:{id:examId}}),now=new Date();
  if(!exam||!exam.onlineEnabled||now<exam.startsAt||now>=exam.endsAt||!exam.ticketCodes.includes(ticketCode))throw Error('ENTRY_INVALID');
  const sale=await tx.ticketSale.findUnique({where:{examId_ticketCode:{examId,ticketCode}}});
  if(sale&&sale.studentFIN!==fin)throw Error('ENTRY_FORBIDDEN');
  if(await tx.examResult.findFirst({where:{examId,OR:[{fin},{ticketCode}]}}))throw Error('ENTRY_COMPLETED');
  const existing=await tx.examAttempt.findFirst({where:{examId,OR:[{fin},{ticketCode}]},include:{version:true}});
  if(existing){if(existing.fin!==fin||existing.ticketCode!==ticketCode)throw Error('ENTRY_FORBIDDEN');if(existing.status!=='in_progress')throw Error('ENTRY_COMPLETED');return {attempt:existing,version:existing.version,exam};}
  const questions=z.array(migrationQuestion).min(1).parse(exam.questions);
  const metadata=versionMetadata.parse({title:exam.title,subject:exam.subject,durationMin:exam.durationMin,companyId:exam.companyId,academicYear:exam.academicYear});
  const version=await tx.examVersion.create({data:{examId,questions:exam.questions??Prisma.JsonNull,metadata}});
  const attempt=await tx.examAttempt.create({data:{examId,versionId:version.id,fin,ticketCode,answers:questions.map(()=>null),expiredAt:new Date(Math.min(now.getTime()+exam.durationMin*60000,exam.endsAt.getTime()))}});
  return {attempt,version,exam};
 });
}

export async function finalizeExpired(companyId?:string){
 const expired=await prisma.examAttempt.findMany({where:{status:'in_progress',expiredAt:{lte:new Date()},result:null,exam:{companyId}},select:{id:true,answers:true},orderBy:{expiredAt:'asc'},take:100});
 let finalized=0,failed=0;
 for(const attempt of expired){try{await writeAttempt(attempt.id,answerPayload.shape.answers.parse(attempt.answers),true);finalized++;}catch{failed++;}}
 return {finalized,failed,batchLimit:100};
}
