import {isSameOrigin} from "@/lib/server/origin";
import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeFin, normalizeTicket } from "@/lib/helpers";
import {beginAttempt,versionMetadata} from "@/lib/server/exam-service";
import {migrationQuestion} from "@/lib/migration-format";
import { safeQuestionDTO, setAttemptCookie } from "@/lib/server/student-security";
import { checkRateLimit, getClientIdentifier } from "@/lib/server/rate-limiter";

const startSchema = z.object({
  fin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{7}$/),
  ticket: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if(!isSameOrigin(req))return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    const { id } = await params;
    const body = await readJson(req,16*1024);
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "FİN və ya bilet kodu formatı yanlışdır." }, { status: 400 });
    }

    const network = await checkRateLimit(getClientIdentifier(req), "api-default");
    if(!network.allowed)return NextResponse.json({success:false,error:"Çox cəhd. Bir qədər sonra yenidən yoxlayın."},{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil((network.resetAt.getTime()-Date.now())/1000)))}});
    const identifier = id + ":" + parsed.data.fin;
    const rateLimit = await checkRateLimit(identifier, "student-entry");
    if (!network.allowed || !rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Çox çox cəhd. Zəhmət olmasa biraz gözləyin." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    const {attempt,version,exam}=await beginAttempt(id,normalizeFin(parsed.data.fin),normalizeTicket(parsed.data.ticket));
    const metadata=versionMetadata.safeParse(version.metadata);
    const questions=z.array(migrationQuestion).parse(version.questions).map(safeQuestionDTO);
    return setAttemptCookie(NextResponse.json({success:true,attemptId:attempt.id,expiresAt:attempt.expiredAt,durationMin:metadata.success?metadata.data.durationMin:exam.durationMin,questions,answers:attempt.answers}),attempt.id);
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if(error instanceof Error&&error.message.startsWith('ENTRY_'))return NextResponse.json({error:'Giriş məlumatları etibarsızdır və ya imtahan yekunlaşıb.'},{status:error.message==='ENTRY_FORBIDDEN'?403:error.message==='ENTRY_COMPLETED'?409:400});
    logFailure('Start exam error:', error);
    return NextResponse.json({ success: false, error: "İmtahan başladılarkən xəta baş verdi." }, { status: 500 });
  }
}

