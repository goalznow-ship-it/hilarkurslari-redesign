import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getAcademicYears, createAcademicYear } from "@/lib/server/db/repositories";
import { requireAdmin } from "@/lib/server/auth-utils";

const yearSchema = z.object({
  label: z.string().regex(/^\d{4}-\d{4}$/, "İli YYYY-YYYY formatında yazın."),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const years = await getAcademicYears();
    return NextResponse.json({ years });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get years error:', error);
    return NextResponse.json({ error: "Tədris illəri yüklənmədi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await readJson(req,4*1024*1024);
    const parsed = yearSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    const [start, end] = data.label.split("-").map(Number);
    if (end !== start + 1) {
      return NextResponse.json({ success: false, error: "İllər ardıcıl olmalıdır (məs. 2026-2027)." }, { status: 400 });
    }

    const existing = await getAcademicYears().then(y => y.find(y => y.label === data.label));
    if (existing) return NextResponse.json({ success: false, error: "Bu tədris ili artıq mövcuddur." }, { status: 400 });

    const year = await createAcademicYear(data);
    return NextResponse.json({ success: true, year });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Create year error:', error);
    return NextResponse.json({ success: false, error: "Tədris ili yaradılarkən xəta baş verdi." }, { status: 500 });
  }
}