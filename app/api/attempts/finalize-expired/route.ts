import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {requireRole} from '@/lib/server/auth-utils';
import {finalizeExpired} from '@/lib/server/exam-service';
export async function POST(req:NextRequest){
 try{
  const secret=process.env.CRON_SECRET,provided=req.headers.get('authorization')?.replace(/^Bearer /,'');
  const cron=!!secret&&secret.length>=32&&!!provided&&Buffer.byteLength(secret)===Buffer.byteLength(provided)&&timingSafeEqual(Buffer.from(secret),Buffer.from(provided));
  const actor=cron?undefined:await requireRole(req,['admin','coordinator','teacher']);
  return NextResponse.json(await finalizeExpired(actor?.companyId),{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){const message=error instanceof Error?error.message:'';return NextResponse.json({error:'Yekunlaşdırma tamamlanmadı.'},{status:message==='UNAUTHORIZED'?401:message==='FORBIDDEN'?403:500});}
}
