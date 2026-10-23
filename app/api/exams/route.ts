import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import {migrationQuestion} from "@/lib/migration-format";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getExams, createExam, getCompanies, getAcademicYears } from "@/lib/server/db/repositories";
import { requireRole, companyForWrite } from "@/lib/server/auth-utils";

const examCreateSchema = z.object({
  title: z.string().min(1, "İmtahanın adı boşdur."),
  subject: z.string().min(1, "Fənn boşdur."),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  durationMin: z.number().int().min(1).max(1000),
  ticketCodes: z.array(z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)).default([]),
  questions: z.array(migrationQuestion).min(1),
  id: z.string().min(1).max(200).optional(),
  status: z.enum(["preparing","first_ready","review","done"]).default("preparing"),
  code: z.string().optional(),
  grade: z.string().optional(),
  block: z.string().optional(),
  academicYear: z.string().optional(),
  variants: z.number().int().min(1).max(50).default(1),
  pdfReady: z.boolean().default(false),
  onlineEnabled: z.boolean().default(false),
  companyId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin","coordinator","teacher"]);
    const exams = await getExams(user.companyId ?? undefined);
    return NextResponse.json({ exams });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get exams error:', error);
    return NextResponse.json({ error: "İmtahanlar yüklənmədi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin","coordinator","teacher"]);
    const body = await readJson(req,4*1024*1024);
    const parsed = examCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = {...parsed.data,companyId:companyForWrite(user,parsed.data.companyId)};
    if (data.startsAt >= data.endsAt) {
      return NextResponse.json({ success: false, error: "Bitmə tarixi başlanğıc tarixindən sonra olmalıdır." }, { status: 400 });
    }

    if (data.companyId) {
      const company = await getCompanies().then(c => c.find(c => c.id === data.companyId && c.active));
      if (!company) return NextResponse.json({ success: false, error: "Aktiv şirkət seçin." }, { status: 400 });
    }

    if (data.academicYear) {
      const year = await getAcademicYears().then(y => y.find(y => y.label === data.academicYear && y.active));
      if (!year) return NextResponse.json({ success: false, error: "Aktiv reyestrdən tədris ili seçin." }, { status: 400 });
    }

    if (data.code) {
      const existing = await getExams().then(e => e.find(e => e.code?.toUpperCase() === data.code!.toUpperCase()));
      if (existing) return NextResponse.json({ success: false, error: "Bu kod ilə imtahan artıq mövcuddur." }, { status: 400 });
    }

    const exam = await createExam({
      ...data,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      companyId: data.companyId || (user.companyId || undefined),
      status: data.status,
    });

    return NextResponse.json({ success: true, exam });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Create exam error:', error);
    return NextResponse.json({ success: false, error: "İmtahan yaradılarkən xəta baş verdi." }, { status: 500 });
  }
}