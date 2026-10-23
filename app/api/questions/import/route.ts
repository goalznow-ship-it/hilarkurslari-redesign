import {readJson,RequestBodyError} from "@/lib/server/request";
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {requireRole} from '@/lib/server/auth-utils';
import {parseQuestionsFromCsv} from '@/lib/store';
import {migrationQuestion} from '@/lib/migration-format';
import {persistQuestions} from '@/lib/server/question-service';
export async function POST(req:NextRequest){
 let rows:number[]=[];
 try{const actor=await requireRole(req,['admin','coordinator']);const {csv}=z.object({csv:z.string().max(2*1024*1024)}).strict().parse(await readJson(req,4*1024*1024));const preview=parseQuestionsFromCsv(csv);rows=preview.rows;preview.success.forEach((question,index)=>{if(!migrationQuestion.safeParse(question).success)preview.errors.push({row:preview.rows[index],error:"Sualın metadata formatı yanlışdır."});});
  if(preview.errors.length||!preview.success.length)return NextResponse.json({success:false,added:0,errors:preview.errors});
  await persistQuestions(preview.success.map(q=>({...q,id:randomUUID()})),undefined,actor.companyId);
  return NextResponse.json({success:true,added:preview.success.length,errors:[]});
 }catch(error){if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});const message=error instanceof Error?error.message:'';if(message.startsWith('Təkrar sual:'))return NextResponse.json({success:false,added:0,errors:[{row:rows[Number(message.slice("Təkrar sual:".length))-1]??0,error:"Bu sətirdə təkrar sual var."}]});return NextResponse.json({error:'İdxal edilmədi. Heç bir sual yazılmadı.'},{status:message==='UNAUTHORIZED'?401:message==='FORBIDDEN'?403:400});}
}
