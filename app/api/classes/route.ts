import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getClasses, createClass, getAcademicYears } from "@/lib/server/db/repositories";
import { requireRole,companyForWrite } from "@/lib/server/auth-utils";

const classSchema = z.object({
  id:z.string().min(1).max(200).optional(),
  name: z.string().min(1, "Sinif adı yazın."),
  grade: z.string().min(1, "Sinif yazın."),
  section: z.string().optional(),
  teacher: z.string().min(1, "Müəllim yazın."),
  studentCount: z.number().int().min(0).default(0),
  academicYear: z.string().min(1, "Tədris ili seçin."),
  companyId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin", "coordinator", "teacher"]);
    const classes = await getClasses(user.companyId ?? undefined);
    return NextResponse.json({ classes });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if(error instanceof Error && error.message==="FORBIDDEN")return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    logFailure('Get classes error:', error);
    return NextResponse.json({ error: "Siniflər yüklənmədi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator", "teacher"]);
    const body = await readJson(req,4*1024*1024);
    const parsed = classSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = {...parsed.data,companyId:companyForWrite(actor,parsed.data.companyId)};
    const years = await getAcademicYears();
    const year = years.find(y => y.label === data.academicYear && y.active);
    if (!year) return NextResponse.json({ success: false, error: "Tədris ili seçin." }, { status: 400 });

    const schoolClass = await createClass(data);
    return NextResponse.json({ success: true, class: schoolClass });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Create class error:', error);
    return NextResponse.json({ success: false, error: "Sinif yaradılarkən xəta baş verdi." }, { status: 500 });
  }
}