import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getCompanies, createCompany } from "@/lib/server/db/repositories";
import { requireAdmin } from "@/lib/server/auth-utils";

const companySchema = z.object({
  name: z.string().min(1, "Şirkət adı yazın."),
  code: z.string().min(2).max(40).regex(/^[A-Z0-9][A-Z0-9_-]*$/i, "Kod yalnız hərf, rəqəm, _ və - ola bilər."),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const companies = await getCompanies();
    return NextResponse.json({ companies });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get companies error:', error);
    return NextResponse.json({ error: "Şirkətlər yüklənmədi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await readJson(req,4*1024*1024);
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await getCompanies().then(c => c.find(c => c.code.toUpperCase() === data.code.toUpperCase()));
    if (existing) return NextResponse.json({ success: false, error: "Bu şirkət kodu artıq mövcuddur." }, { status: 400 });

    const company = await createCompany({ ...data, code: data.code.toUpperCase() });
    return NextResponse.json({ success: true, company });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Create company error:', error);
    return NextResponse.json({ success: false, error: "Şirkət yaradılarkən xəta baş verdi." }, { status: 500 });
  }
}