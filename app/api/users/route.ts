import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import {randomBytes} from "node:crypto";
import {issueEnrollment} from "@/lib/server/enrollment";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getUsers, createUser, getCompanies, getExams } from "@/lib/server/db/repositories";
import { requireRole,companyForWrite } from "@/lib/server/auth-utils";
import { hashPassword } from "@/lib/server/auth";

const userCreateSchema = z.object({
  name: z.string().min(1, "Ad soyad yazın."),
  email: z.string().email("Düzgün e-poçt yazın."),
  role: z.enum(["admin", "coordinator", "teacher", "seller"]),
  active: z.boolean().default(true),
  password: z.union([z.literal(""),z.string().min(12).max(256)]).default(""),
  companyId: z.string().optional(),
  sellerExamIds: z.array(z.string()).optional(),
});



export async function GET(req: NextRequest) {
  try {
    const actor=await requireRole(req,["admin"]);
    const users = (await getUsers()).filter(user=>!actor.companyId||user.companyId===actor.companyId);
    return NextResponse.json({ users: users.map(u => ({ ...u, passwordHash: undefined })) });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get users error:', error);
    return NextResponse.json({ error: "İstifadəçilər yüklənmədi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor=await requireRole(req,["admin"]);
    const body = await readJson(req,4*1024*1024);
    const parsed = userCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = {...parsed.data,companyId:companyForWrite(actor,parsed.data.companyId)};
    const existing = await getUsers().then(u => u.find(u => u.email.toLowerCase() === data.email.toLowerCase()));
    if (existing) return NextResponse.json({ success: false, error: "Bu e-poçt ilə istifadəçi artıq mövcuddur." }, { status: 400 });

    if (data.companyId) {
      const company = await getCompanies().then(c => c.find(c => c.id === data.companyId && c.active));
      if (!company) return NextResponse.json({ success: false, error: "Aktiv şirkət seçin." }, { status: 400 });
    }

    if (data.role === "seller" && data.sellerExamIds?.length) {
      const exams = await getExams();
      const valid = data.sellerExamIds.every(id => exams.some(e => e.id === id && e.onlineEnabled && (!data.companyId||e.companyId===data.companyId)));
      if (!valid) return NextResponse.json({ success: false, error: "Bəzi imtahanlar tapılmadı və ya onlayn deyil." }, { status: 400 });
    }

    const {password,...profile}=data;
    const passwordHash = await hashPassword(password||randomBytes(32).toString("hex"));
    const user = await createUser({
      ...profile,
      passwordHash,
      sellerExamIds: data.sellerExamIds ?? [],
    });

    const enrollmentToken=password?undefined:await issueEnrollment(user.id);
    return NextResponse.json({ success: true, user: { ...user, passwordHash: undefined }, enrollmentToken },{headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Create user error:', error);
    return NextResponse.json({ success: false, error: "İstifadəçi yaradılarkən xəta baş verdi." }, { status: 500 });
  }
}