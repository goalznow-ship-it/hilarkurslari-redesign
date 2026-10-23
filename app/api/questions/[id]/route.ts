import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import {persistQuestions} from "@/lib/server/question-service";
import { NextRequest, NextResponse } from "next/server";
import { migrationQuestion } from "@/lib/migration-format";
import { getQuestion } from "@/lib/server/db/repositories";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getQuestions, updateQuestion, deleteQuestion } from "@/lib/server/db/repositories";
import { requireRole,assertCompanyScope } from "@/lib/server/auth-utils";

const questionUpdateSchema = z.object({
  expectedUpdatedAt:z.string().datetime().optional(),
  text: z.string().min(1).max(100000).optional(),
  options: z.array(z.string().min(1).max(10000)).min(2).max(100).optional(),
  correct: z.union([z.number().int(), z.array(z.number().int())]).optional(),
  type: z.enum(["single","multiple","true_false"]).optional(),
  subject: z.string().max(10000).optional(),
  topic: z.string().max(10000).optional(),
  tags: z.array(z.string()).optional(),
  grade: z.string().max(10000).optional(),
  difficulty: z.enum(["Asan","Orta","Çətin"]).optional(),
  explanation: z.string().max(10000).optional(),
  points: z.number().positive().max(10000).optional(),
  image: z.object({ url: z.string().max(2048), alt: z.string().min(1).max(500) }).strict().optional(),
  optionImages: z.array(z.object({ url: z.string().max(2048), alt: z.string().min(1).max(500) }).strict().nullable()).optional(),
  verification: z.enum(["pending","verified","rejected"]).optional(),
  reason: z.string().max(2000).optional(),
}).strict();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const { id } = await params;
    const questions = await getQuestions();
    const question = questions.find(q => q.id === id);
    if (!question) return NextResponse.json({ error: "Sual tapılmadı." }, { status: 404 });
    assertCompanyScope(actor,question);
    return NextResponse.json({ question });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if(error instanceof Error && error.message==="FORBIDDEN")return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    logFailure('Get question error:', error);
    return NextResponse.json({ error: "Sual yüklənmədi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const { id } = await params;
    const body = await readJson(req,4*1024*1024);
    const parsed = questionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const current=await getQuestion(id);
    if(!current)return NextResponse.json({error:"Sual tapılmadı."},{status:404});
    assertCompanyScope(actor,current);
    const {reason,expectedUpdatedAt,...fields}=parsed.data;
    if(actor.role==="teacher"&&fields.verification)return NextResponse.json({error:"Yoxlama icazəniz yoxdur."},{status:403});
    if(!expectedUpdatedAt)return NextResponse.json({error:"Sual versiyasını yeniləyin."},{status:409});
    const merged=migrationQuestion.safeParse({...current,...fields});
    if(!merged.success)return NextResponse.json({error:"Sual məlumatları yanlışdır."},{status:400});
    if(fields.verification==="rejected"&&!reason?.trim())return NextResponse.json({error:"Rədd səbəbi tələb olunur."},{status:400});
    const history=fields.verification&&fields.verification!=="pending"?[...(current.reviewHistory??[]),{status:fields.verification,reviewerId:actor.id,reviewerName:actor.name,reviewedAt:new Date().toISOString(),...(fields.verification==="rejected"?{reason:reason!.trim()}:{})}]:current.reviewHistory;
    if(!fields.verification) { await persistQuestions([{...merged.data,id}],id,actor.companyId,expectedUpdatedAt); return NextResponse.json({success:true}); }
    const question = await updateQuestion(id, {...fields,verification:fields.verification??"pending",reviewHistory:history},expectedUpdatedAt,actor.companyId);
    return NextResponse.json({ success: true, question });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    if(error instanceof Error&&error.message==='STALE_QUESTION')return NextResponse.json({error:'Sual dəyişib. Yeniləyin və yenidən yoxlayın.'},{status:409});
    logFailure('Update question error:', error);
    return NextResponse.json({ success: false, error: "Sual yenilənərkən xəta baş verdi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const { id } = await params;
    const current=await getQuestion(id);if(!current)throw Error("NOT_FOUND");assertCompanyScope(actor,current);
    await deleteQuestion(id,actor.companyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Delete question error:', error);
    return NextResponse.json({ success: false, error: "Sual silinərkən xəta baş verdi." }, { status: 500 });
  }
}