import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import {migrationQuestion} from "@/lib/migration-format";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getExam, updateExam, archiveExam, getCompanies, getAcademicYears, createExamVersion, getExams } from "@/lib/server/db/repositories";
import { requireRole, assertCompanyScope, companyForWrite } from "@/lib/server/auth-utils";

const examUpdateSchema = z.object({
  expectedVersion:z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(1).max(1000).optional(),
  ticketCodes: z.array(z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)).optional(),
  questions: z.array(migrationQuestion).min(1).optional(),
  code: z.string().nullable().optional(),
  grade: z.string().optional(),
  block: z.string().optional(),
  academicYear: z.string().optional(),
  variants: z.number().int().min(1).max(50).optional(),
  pdfReady: z.boolean().optional(),
  onlineEnabled: z.boolean().optional(),
  status: z.enum(["preparing", "first_ready", "review", "done"]).optional(),
  companyId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req,["admin","coordinator","teacher"]);
    const { id } = await params;
    const exam = await getExam(id);
    if (!exam) return NextResponse.json({ error: "İmtahan tapılmadı." }, { status: 404 });
    assertCompanyScope(actor,exam);
    return NextResponse.json({ exam });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get exam error:', error);
    return NextResponse.json({ error: "İmtahan yüklənmədi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req,["admin","coordinator","teacher"]);
    const { id } = await params;
    const body = await readJson(req,4*1024*1024);
    const parsed = examUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const existing = await getExam(id);
    if (!existing) return NextResponse.json({ success: false, error: "İmtahan tapılmadı." }, { status: 404 });

    assertCompanyScope(actor,existing);
    const {expectedVersion,...fields}=parsed.data;
    const data = {...fields,...(parsed.data.companyId!==undefined?{companyId:companyForWrite(actor,parsed.data.companyId)}:{})};
    if (Date.parse(data.startsAt??existing.startsAt) >= Date.parse(data.endsAt??existing.endsAt)) {
      return NextResponse.json({ success: false, error: "Bitmə tarixi başlanğıc tarixindən sonra olmalıdır." }, { status: 400 });
    }

    if (data.companyId && data.companyId!==existing.companyId) {
      const company = await getCompanies().then(c => c.find(c => c.id === data.companyId && c.active));
      if (!company) return NextResponse.json({ success: false, error: "Aktiv şirkət seçin." }, { status: 400 });
    }

    if (data.academicYear && data.academicYear!==existing.academicYear) {
      const year = await getAcademicYears().then(y => y.find(y => y.label === data.academicYear && y.active));
      if (!year) return NextResponse.json({ success: false, error: "Aktiv reyestrdən tədris ili seçin." }, { status: 400 });
    }

    if (data.code && data.code !== existing.code) {
      const collision = await getExams().then(e => e.find(e => e.code?.toUpperCase() === data.code!.toUpperCase() && e.id !== id));
      if (collision) return NextResponse.json({ success: false, error: "Bu kod ilə başqa bir imtahan artıq mövcuddur." }, { status: 400 });
    }

    // Create version snapshot if questions changed
    if (data.questions && JSON.stringify(data.questions) !== JSON.stringify(existing.questions)) {
      await createExamVersion(id, data.questions);
    }

    const exam = await updateExam(id, {
      ...data,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    },expectedVersion,actor.companyId);

    return NextResponse.json({ success: true, exam });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    if(error instanceof Error&&error.message==='STALE_RECORD')return NextResponse.json({error:'İmtahan başqa əməliyyatla dəyişib. Yeniləyin və yenidən yoxlayın.'},{status:409});
    logFailure('Update exam error:', error);
    return NextResponse.json({ success: false, error: "İmtahan yenilənərkən xəta baş verdi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req,["admin","coordinator","teacher"]);
    const { id } = await params;
    const exam = await getExam(id);
    if (!exam) return NextResponse.json({ success: false, error: "İmtahan tapılmadı." }, { status: 404 });

    assertCompanyScope(actor,exam);
    // Archive instead of delete to preserve history
    await archiveExam(id,actor.companyId);
    return NextResponse.json({ success: true, message: "İmtahan arxivləşdirildi." });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Archive exam error:', error);
    return NextResponse.json({ success: false, error: "İmtahan arxivləşdirilərkən xəta baş verdi." }, { status: 500 });
  }
}