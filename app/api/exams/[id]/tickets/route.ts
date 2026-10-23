import {readJson,RequestBodyError} from "@/lib/server/request";
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRole,assertCompanyScope} from '@/lib/server/auth-utils';
import {prisma} from '@/lib/server/db/client';
const schema=z.object({codes:z.array(z.string().trim().regex(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/).transform(code=>code.toUpperCase())).min(1).max(10000)}).strict();
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const actor=await requireRole(req,["admin","coordinator","teacher"]);const {id}=await params;const {codes}=schema.parse(await readJson(req,4*1024*1024));
  await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "Exam" WHERE id=${id} FOR UPDATE`;
   const exam=await tx.exam.findUnique({where:{id}});if(!exam)throw Error('NOT_FOUND');assertCompanyScope(actor,exam);
   const current=new Set(exam.ticketCodes.map(code=>code.toUpperCase()));
   if(new Set(codes).size!==codes.length||codes.some(code=>current.has(code)))throw Error('DUPLICATE');
   await tx.exam.update({where:{id},data:{ticketCodes:{push:codes}}});
  });return NextResponse.json({success:true});
 }catch(error){if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});const message=error instanceof Error?error.message:'';return NextResponse.json({error:message==='DUPLICATE'?'Təkrar bilet kodları.':'Biletlər saxlanılmadı.'},{status:message==='UNAUTHORIZED'?401:message==='FORBIDDEN'?403:message==='NOT_FOUND'?404:400});}
}
