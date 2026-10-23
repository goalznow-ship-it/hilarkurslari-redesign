import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getCompanies, updateCompany, deleteCompany } from "@/lib/server/db/repositories";
import { requireAdmin } from "@/lib/server/auth-utils";

const companyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(2).max(40).regex(/^[A-Z0-9][A-Z0-9_-]*$/i).optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const { getCompany } = await import("@/lib/server/db/repositories");
    const company = await getCompany(id);
    if (!company) return NextResponse.json({ error: "Şirkət tapılmadı." }, { status: 404 });
    return NextResponse.json({ company });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get company error:', error);
    return NextResponse.json({ error: "Şirkət yüklənmədi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await readJson(req,4*1024*1024);
    const parsed = companyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    if (data.code) {
      const existing = await getCompanies().then(c => c.find(c => c.code.toUpperCase() === data.code!.toUpperCase() && c.id !== id));
      if (existing) return NextResponse.json({ success: false, error: "Bu şirkət kodu artıq mövcuddur." }, { status: 400 });
    }

    const company = await updateCompany(id, data.code ? { ...data, code: data.code.toUpperCase() } : data);
    return NextResponse.json({ success: true, company });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Update company error:', error);
    return NextResponse.json({ success: false, error: "Şirkət yenilənərkən xəta baş verdi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await deleteCompany(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Delete company error:', error);
    return NextResponse.json({ success: false, error: "Şirkət silinərkən xəta baş verdi." }, { status: 500 });
  }
}