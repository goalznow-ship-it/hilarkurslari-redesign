import {Prisma} from '@prisma/client';
import {prisma} from './db/client';
import {migrationQuestion} from '../migration-format';
import {sameQuestion} from '../store';
import type {Question} from '../types';
const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));
export async function persistQuestions(input:Question[],editId?:string,companyId?:string,expectedUpdatedAt?:string){
 const questions=input.map(q=>migrationQuestion.parse({...q,companyId:companyId??q.companyId}));
 return prisma.$transaction(async tx=>{
  // Shared lock makes duplicate detection and batch persistence one operation across instances.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(73419281)::text`;
  const bank=await tx.question.findMany({where:{companyId}});
  if(editId&&expectedUpdatedAt&&bank.find(q=>q.id===editId)?.updatedAt.toISOString()!==expectedUpdatedAt)throw Error("STALE_QUESTION");
  if(editId&&companyId&&!bank.some(q=>q.id===editId))throw Error("FORBIDDEN");
  for(const [index,q] of questions.entries()){
   if(bank.some(b=>b.id!==editId&&sameQuestion({...b,correct:b.correct as number|number[],image:b.imageUrl?{url:b.imageUrl,alt:b.imageAlt??''}:undefined,optionImages:b.optionImages as Question['optionImages']},q))||questions.slice(0,index).some(b=>sameQuestion(b,q)))throw Error('Təkrar sual: '+(index+1));
  }
  for(const q of questions){
   const {id,createdAt,updatedAt:_updated,image,optionImages,correct,reviewHistory:_history,verification:_verification,...fields}=q;void [_updated,_history,_verification];
   const data={...fields,correct:json(correct),imageUrl:image?.url??null,imageAlt:image?.alt??null,optionImages:optionImages?json(optionImages):Prisma.DbNull,verification:'pending' as const};
   if(editId)await tx.question.update({where:{id:editId},data});else await tx.question.create({data:{...data,id,createdAt:createdAt?new Date(createdAt):undefined}});
  }
 });
}
