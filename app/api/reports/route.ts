import {logFailure} from "@/lib/server/logger";
import { NextRequest, NextResponse } from "next/server";
import { getSalesReport, getTicketSales, getExams, getUsers } from "@/lib/server/db/repositories";
import { requireRole } from "@/lib/server/auth-utils";
import { escapeCsvCell } from "@/lib/helpers";

export async function GET(req: NextRequest) {
  try {
    const actor=await requireRole(req, ["admin", "coordinator"]);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const endExclusive=/^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("endDate")??"");
    if((startDate&&!Number.isFinite(startDate.getTime()))||(endDate&&!Number.isFinite(endDate.getTime()))||(startDate&&endDate&&startDate>endDate))return NextResponse.json({error:"Tarix aralığı yanlışdır."},{status:400});
    if(endDate&&endExclusive)endDate.setUTCDate(endDate.getUTCDate()+1);
    const sellerId = searchParams.get("sellerId") || undefined;
    const examId = searchParams.get("examId") || undefined;
    const format = searchParams.get("format");

    const report = await getSalesReport({ startDate, endDate, endExclusive, sellerId, examId, companyId:actor.companyId });

    if (format === "csv") {
      const sales = await getTicketSales({ sellerId, examId, companyId:actor.companyId });
      const startDateStr = startDate ? startDate.toISOString() : undefined;
      const endDateStr = endDate ? endDate.toISOString() : undefined;
      const filteredSales = sales.filter(sale => {
        const saleDate = sale.soldAt; // ISO string
        if (startDateStr && saleDate < startDateStr) return false;
        if (endDateStr && (endExclusive?saleDate>=endDateStr:saleDate>endDateStr)) return false;
        return true;
      });
      const headers = ["Tarix", "Saat", "İmtahan", "Bilet kodu", "FİN", "Şagird adı", "Satıcı", "Qiymət (AZN)"];
      const rows = [
        headers.join(","),
        ...filteredSales.map(sale => [
          escapeCsvCell(sale.soldAt.split("T")[0]),
          escapeCsvCell(sale.soldAt.split("T")[1]?.substring(0, 5) ?? ""),
          escapeCsvCell(sale.examTitle),
          escapeCsvCell(sale.ticketCode),
          escapeCsvCell(sale.studentFIN),
          escapeCsvCell(sale.studentName ?? ""),
          escapeCsvCell(sale.sellerName),
          escapeCsvCell(sale.price),
        ].join(","))
      ].join("\n");

      return new NextResponse("\uFEFF" + rows, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="satis-hesabati-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const [exams, sellers] = await Promise.all([getExams(actor.companyId), getUsers().then(u => u.filter(u => u.role === "seller" && u.active && (!actor.companyId||u.companyId===actor.companyId)))]);
    return NextResponse.json({ report, exams, sellers:sellers.map(({id,name,email,role,active,companyId})=>({id,name,email,role,active,companyId})) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "İcazəniz yoxdur." }, { status: 403 });
    }
    logFailure('Get reports error:', error);
    return NextResponse.json({ error: "Hesabat yüklənmədi." }, { status: 500 });
  }
}