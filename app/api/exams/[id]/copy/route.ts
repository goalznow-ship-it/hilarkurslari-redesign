import {NextRequest,NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {requireRole,assertCompanyScope} from '@/lib/server/auth-utils';
import {prisma} from '@/lib/server/db/client';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const actor=await requireRole(req,["admin","coordinator","teacher"]);const {id}=await params;const exam=await prisma.exam.findUnique({where:{id}});if(!exam)return NextResponse.json({error:'İmtahan tapılmadı.'},{status:404});
 assertCompanyScope(actor,exam);
 const copy=await prisma.exam.create({data:{...exam,questions:exam.questions??Prisma.JsonNull,id:randomUUID(),createdAt:new Date(),title:exam.title+' (surət)',code:exam.code?exam.code+'-'+randomUUID().slice(0,8):null,status:'preparing',onlineEnabled:false,ticketCodes:[],pdfReady:false}});
 return NextResponse.json({success:true,id:copy.id});
 }catch(error){const message=error instanceof Error?error.message:'';return NextResponse.json({error:'İmtahan kopyalanmadı.'},{status:message==='UNAUTHORIZED'?401:message==='FORBIDDEN'?403:500});}
}
