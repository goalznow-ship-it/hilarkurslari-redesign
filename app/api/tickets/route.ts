import {readJson,RequestBodyError} from "@/lib/server/request";
import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/server/zod-helpers";
import { getExams, getTicketSales, createTicketSale } from "@/lib/server/db/repositories";
import { requireRole } from "@/lib/server/auth-utils";
import { normalizeTicket, isValidFin, isValidTicket, examStatus } from "@/lib/helpers";

const sellSchema = z.object({
  examId: z.string(),
  ticketCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  studentFIN: z.string().regex(/^[A-Z0-9]{7}$/),
  studentName: z.string().optional(),
  price: z.number().nonnegative(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin", "coordinator", "seller"]);
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    const sellerId = user.role === "seller" ? user.id : searchParams.get("sellerId") || undefined;

    let sales = await getTicketSales({ sellerId, examId: examId || undefined, companyId:user.companyId });
    if (user.role === "seller") {
      sales = sales.filter(s => s.sellerId === user.id);
    }
    return NextResponse.json({ sales });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if(error instanceof Error && error.message==="FORBIDDEN")return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    logFailure('Get tickets error:', error);
    return NextResponse.json({ error: "Biletlər yüklənmədi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin", "seller"]);
    const body = await readJson(req,4*1024*1024);
    const parsed = sellSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    const fin = data.studentFIN.toUpperCase();
    const ticket = normalizeTicket(data.ticketCode);

    if (!isValidFin(fin) || !isValidTicket(data.ticketCode)) {
      return NextResponse.json({ success: false, error: "FİN və ya bilet kodu formatı yanlışdır." }, { status: 400 });
    }

    const exam = await getExams().then(e => e.find(e => e.id === data.examId));
    if (!exam || !exam.onlineEnabled || examStatus(exam) !== "active") {
      return NextResponse.json({ success: false, error: "İmtahan aktiv onlayn rejimdə deyil." }, { status: 400 });
    }
    if(user.companyId && exam.companyId!==user.companyId)return NextResponse.json({error:"İcazəniz yoxdur."},{status:403});
    if (!exam.ticketCodes.some(c => normalizeTicket(c) === ticket)) {
      return NextResponse.json({ success: false, error: "Bilet bu imtahan üçün ayrılmayıb." }, { status: 400 });
    }
    if (user.role === "seller" && !user.sellerExamIds?.includes(exam.id)) {
      return NextResponse.json({ success: false, error: "Bu imtahan üçün satış icazəniz yoxdur." }, { status: 403 });
    }

    const existingSales = await getTicketSales({ examId: exam.id });
    if (existingSales.some(s => s.ticketCode.toUpperCase() === ticket || s.studentFIN.toUpperCase() === fin)) {
      return NextResponse.json({ success: false, error: "Bu bilet və ya FİN üçün satış artıq mövcuddur." }, { status: 400 });
    }

    const sale = await createTicketSale({
      examId: exam.id,
      examTitle: exam.title,
      ticketCode: ticket,
      sellerId: user.id,
      sellerName: user.name,
      studentFIN: fin,
      studentName: data.studentName?.trim() || undefined,
      price: data.price,
      companyId: exam.companyId,
    });

    return NextResponse.json({ success: true, sale });
  } catch (error) {
    if(error instanceof RequestBodyError)return NextResponse.json({error:"Sorğunun formatı və ya ölçüsü yanlışdır."},{status:error.status});
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    if(error instanceof Error && "code" in error && error.code==="P2002")return NextResponse.json({error:"Bilet və ya iştirakçı üçün satış artıq mövcuddur."},{status:409});
    if(error instanceof Error&&error.message==="SALE_CONFLICT")return NextResponse.json({error:"Bilet və ya satış icazəsi dəyişib. Yenidən yoxlayın."},{status:409});
    logFailure('Sell ticket error:', error);
    return NextResponse.json({ success: false, error: "Satış qeyd edilərkən xəta baş verdi." }, { status: 500 });
  }
}