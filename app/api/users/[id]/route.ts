import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getUser, updateUser, deleteUser, getUsers, getCompanies, getExams } from "@/lib/server/db/repositories";
import { requireRole,assertCompanyScope,companyForWrite } from "@/lib/server/auth-utils";
import { hashPassword } from "@/lib/server/auth";

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "coordinator", "teacher", "seller"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(12).max(256).optional(),
  companyId: z.string().nullable().optional(),
  sellerExamIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req,["admin"]);
    const { id } = await params;
    const user = await getUser(id);
    if (!user) return NextResponse.json({ error: "İstifadəçi tapılmadı." }, { status: 404 });
    assertCompanyScope(actor,user);
    return NextResponse.json({ user: { ...user, passwordHash: undefined } });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get user error:', error);
    return NextResponse.json({ error: "İstifadəçi yüklənmədi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req,["admin"]);
    const { id } = await params;
    const body = await readJson(req,4*1024*1024);
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const existing = await getUser(id);
    if (!existing) return NextResponse.json({ success: false, error: "İstifadəçi tapılmadı." }, { status: 404 });

    assertCompanyScope(actor,existing);
    const data = {...parsed.data,companyId:companyForWrite(actor,parsed.data.companyId)};
    if (data.email && data.email !== existing.email) {
      const collision = await getUsers().then(u => u.find(u => u.email.toLowerCase() === data.email!.toLowerCase() && u.id !== id));
      if (collision) return NextResponse.json({ success: false, error: "Bu e-poçt ilə başqa bir istifadəçi artıq mövcuddur." }, { status: 400 });
    }

    // Prevent last admin deactivation/role change
    if (existing.role === "admin" && existing.active && (data.active === false || (data.role && data.role !== "admin"))) {
      const activeAdmins = await getUsers().then(u => u.filter(u => u.role === "admin" && u.active));
      if (activeAdmins.length <= 1) {
        return NextResponse.json({ success: false, error: "Son aktiv administrator deaktiv edilə və ya rolu dəyişdirilə bilməz." }, { status: 400 });
      }
    }

    if (data.companyId && data.companyId!==existing.companyId) {
      const company = await getCompanies().then(c => c.find(c => c.id === data.companyId && c.active));
      if (!company) return NextResponse.json({ success: false, error: "Aktiv şirkət seçin." }, { status: 400 });
    }

    if (data.role === "seller" && data.sellerExamIds?.length) {
      const exams = await getExams();
      const valid = data.sellerExamIds.every(eid => exams.some(e => e.id === eid && e.onlineEnabled && (!data.companyId||e.companyId===data.companyId)));
      if (!valid) return NextResponse.json({ success: false, error: "Bəzi imtahanlar tapılmadı və ya onlayn deyil." }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.password) updateData.passwordHash = await hashPassword(data.password);
    delete updateData.password;

    const user = await updateUser(id, updateData,actor.companyId);
    return NextResponse.json({ success: true, user: { ...user, passwordHash: undefined } });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Update user error:', error);
    return NextResponse.json({ success: false, error: "İstifadəçi yenilənərkən xəta baş verdi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor=await requireRole(req,["admin"]);
    const { id } = await params;
    const user = await getUser(id);
    if (!user) return NextResponse.json({ success: false, error: "İstifadəçi tapılmadı." }, { status: 404 });

    assertCompanyScope(actor,user);
    if (user.role === "admin" && user.active) {
      const activeAdmins = await getUsers().then(u => u.filter(u => u.role === "admin" && u.active));
      if (activeAdmins.length <= 1) {
        return NextResponse.json({ success: false, error: "Son aktiv administrator silinə bilməz." }, { status: 400 });
      }
    }

    await deleteUser(id,actor.companyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Delete user error:', error);
    return NextResponse.json({ success: false, error: "İstifadəçi silinərkən xəta baş verdi." }, { status: 500 });
  }
}