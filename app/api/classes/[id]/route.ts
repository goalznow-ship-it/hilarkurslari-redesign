import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getClass, getAcademicYears, updateClass, deleteClass } from "@/lib/server/db/repositories";
import { requireRole,assertCompanyScope,companyForWrite } from "@/lib/server/auth-utils";

const classUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  grade: z.string().min(1).optional(),
  section: z.string().optional(),
  teacher: z.string().min(1).optional(),
  studentCount: z.number().int().min(0).optional(),
  academicYear: z.string().min(1).optional(),
  companyId: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const { id } = await params;
    const current=await getClass(id);if(!current)throw Error("NOT_FOUND");assertCompanyScope(actor,current);
    const schoolClass = await getClass(id);
    if (!schoolClass) return NextResponse.json({ error: "Sinif tapılmadı." }, { status: 404 });
    return NextResponse.json({ class: schoolClass });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if(error instanceof Error&&error.message==="FORBIDDEN")return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    logFailure('Get class error:', error);
    return NextResponse.json({ error: "Sinif yüklənmədi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const { id } = await params;
    const current=await getClass(id);if(!current)throw Error("NOT_FOUND");assertCompanyScope(actor,current);
    const body = await readJson(req,4*1024*1024);
    const parsed = classUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = {...parsed.data,companyId:companyForWrite(actor,parsed.data.companyId)};
    if (data.academicYear) {
      const years = await getAcademicYears();
      const year = years.find(y => y.label === data.academicYear && (y.active || data.academicYear===current.academicYear));
      if (!year) return NextResponse.json({ success: false, error: "Tədris ili seçin." }, { status: 400 });
    }

    const schoolClass = await updateClass(id, data,actor.companyId);
    return NextResponse.json({ success: true, class: schoolClass });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Update class error:', error);
    return NextResponse.json({ success: false, error: "Sinif yenilənərkən xəta baş verdi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const { id } = await params;
    const current=await getClass(id);if(!current)throw Error("NOT_FOUND");assertCompanyScope(actor,current);
    await deleteClass(id,actor.companyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Delete class error:', error);
    return NextResponse.json({ success: false, error: "Sinif silinərkən xəta baş verdi." }, { status: 500 });
  }
}