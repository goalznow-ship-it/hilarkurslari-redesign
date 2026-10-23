import {readJson,RequestBodyError} from "@/lib/server/request";
import {isSameOrigin} from "@/lib/server/origin";
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {completeEnrollment} from '@/lib/server/enrollment';
import {checkRateLimit,getClientIdentifier} from '@/lib/server/rate-limiter';
export async function POST(req:NextRequest){
 try{if(!isSameOrigin(req))return NextResponse.json({error:'İcazəniz yoxdur.'},{status:403});
 const limit=await checkRateLimit('enroll:'+getClientIdentifier(req),'api-default',{maxRequests:20,windowMs:900000,keyPrefix:'rl:enroll'});if(!limit.allowed)return NextResponse.json({error:'Çox cəhd. Daha sonra yoxlayın.'},{status:429});
 const {token,password}=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:z.string().min(12).max(256)}).strict().parse(await readJson(req,16*1024));
 await completeEnrollment(token,password);return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});return NextResponse.json({error:'Keçid etibarsızdır, vaxtı bitib və ya hesab aktiv deyil.'},{status:400});}
}
