import {isSameOrigin} from "@/lib/server/origin";
import {readJson,RequestBodyError} from "@/lib/server/request";
import { NextRequest, NextResponse } from "next/server";
import { answerPayload, writeAttempt } from "@/lib/server/exam-service";
import { hasAttemptAccess } from "@/lib/server/student-security";
import { checkRateLimit } from "@/lib/server/rate-limiter";
export async function POST(req:NextRequest){
 try {
  if(!isSameOrigin(req))return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
  const parsed=answerPayload.safeParse(await readJson(req,128*1024));
  if(!parsed.success)return NextResponse.json({success:false,error:"Cavab formatı yanlışdır."},{status:400});
  const {attemptId,answers,expectedVersion}=parsed.data;
  if(!hasAttemptAccess(req,attemptId))return NextResponse.json({success:false,error:"İcazəniz yoxdur."},{status:403});
  const limit=await checkRateLimit(attemptId,"exam-submit");
  if(!limit.allowed)return NextResponse.json({success:false,error:"Çox cəhd. Bir qədər sonra yenidən yoxlayın."},{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil((limit.resetAt.getTime()-Date.now())/1000)))}});
  if(!expectedVersion)return NextResponse.json({error:"Cavab versiyası tələb olunur. Səhifəni yeniləyin."},{status:409});
  const result=await writeAttempt(attemptId,answers,true,expectedVersion);
  if(!result)throw new Error('NO_RESULT');
  return NextResponse.json({success:true,resultId:result.id,accessToken:result.accessToken,score:result.score,correctCount:result.correctCount,total:result.total,timeSpentSec:result.timeSpentSec});
 }catch(error){if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});if(error instanceof Error&&error.message==="STALE_ANSWERS")return NextResponse.json({error:"Başqa pəncərədə cavablar dəyişib. Saxlanılmadı; səhifəni yeniləyin."},{status:409});return NextResponse.json({success:false,error:"Əməliyyat tamamlanmadı. Məlumatları və imtahan vaxtını yoxlayın."},{status:error instanceof SyntaxError||error instanceof Error&&['EXPIRED','ALREADY_SUBMITTED','ANSWER_COUNT_MISMATCH'].includes(error.message)?400:500});}
}
