import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getAcademicYears, updateAcademicYear, deleteAcademicYear } from "@/lib/server/db/repositories";
import { requireAdmin } from "@/lib/server/auth-utils";

const yearUpdateSchema = z.object({
  label: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const { getAcademicYear } = await import("@/lib/server/db/repositories");
    const year = await getAcademicYear(id);
    if (!year) return NextResponse.json({ error: "Tədris ili tapılmadı." }, { status: 404 });
    return NextResponse.json({ year });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get year error:', error);
    return NextResponse.json({ error: "Tədris ili yüklənmədi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await readJson(req,4*1024*1024);
    const parsed = yearUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    if (data.label) {
      const [start, end] = data.label.split("-").map(Number);
      if (end !== start + 1) {
        return NextResponse.json({ success: false, error: "İllər ardıcıl olmalıdır." }, { status: 400 });
      }
      const existing = await getAcademicYears().then(y => y.find(y => y.label === data.label && y.id !== id));
      if (existing) return NextResponse.json({ success: false, error: "Bu tədris ili artıq mövcuddur." }, { status: 400 });
    }

    const year = await updateAcademicYear(id, data);
    return NextResponse.json({ success: true, year });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Update year error:', error);
    return NextResponse.json({ success: false, error: "Tədris ili yenilənərkən xəta baş verdi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await deleteAcademicYear(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Delete year error:', error);
    return NextResponse.json({ success: false, error: "Tədris ili silinərkən xəta baş verdi." }, { status: 500 });
  }
}