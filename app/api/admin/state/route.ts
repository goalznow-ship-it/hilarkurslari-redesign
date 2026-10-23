import {recordVersion} from '@/lib/server/version';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/auth-utils';
import * as repository from '@/lib/server/db/repositories';
export async function GET(req:NextRequest){
 try {
  const actor=await requireRole(req,['admin','coordinator','teacher','seller']);
  const {passwordHash: _secret,...user}=actor; void _secret;
  const seller=actor.role==='seller', teacher=actor.role==='teacher';
  const [allExams,questions,results,users,classes,companies,years,sales]=await Promise.all([
   repository.getExams(actor.companyId), seller?[]:repository.getQuestions({companyId:actor.companyId}), seller?[]:repository.getExamResults({companyId:actor.companyId}),
   actor.role==='admin'?repository.getUsers():[],seller?[]:repository.getClasses(actor.companyId), seller?[]:repository.getCompanies(), seller?[]:repository.getAcademicYears(),teacher?[]:repository.getTicketSales({companyId:actor.companyId,...(seller?{sellerId:actor.id}:{})})
  ]);
  const exams=allExams.filter(exam=>!seller||actor.sellerExamIds?.includes(exam.id)).map(exam=>seller?{...exam,questions:[]}:{...exam,revision:recordVersion(exam)});
  const availableTickets=(actor.role==="admin"||seller)?await repository.getTicketAvailability(exams):{};
  return NextResponse.json({availableTickets,user,exams:seller?exams.map(exam=>({...exam,ticketCodes:availableTickets[exam.id]??[]})):exams,questions,results:results.map(result=>({...result,accessToken:undefined,attemptId:undefined})),users:users.filter(account=>!actor.companyId||actor.companyId===account.companyId).map(account=>({...account,passwordHash:undefined})),classes,companies:companies.filter(company=>!actor.companyId||actor.companyId===company.id),years,sales},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){const message=error instanceof Error?error.message:'';return NextResponse.json({error:message==='UNAUTHORIZED'?'Giriş tələb olunur.':message==='FORBIDDEN'?'İcazəniz yoxdur.':'Məlumatlar yüklənmədi. Yenidən cəhd edin.'},{status:message==='UNAUTHORIZED'?401:message==='FORBIDDEN'?403:500,headers:{'Cache-Control':'no-store'}});}
}
