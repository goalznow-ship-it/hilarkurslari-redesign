"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Filter, Calendar, Users, FileText, CreditCard } from "lucide-react";

import { getCurrentUser, getExams, getFilteredTicketSales, getUsers, generateSalesReport } from "@/lib/backend-store";
import { escapeCsvCell } from "@/lib/helpers";
import type { Exam, User } from "@/lib/types";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

type ReportFilters = {
  startDate: string;
  endDate: string;
  sellerId: string;
  examId: string;
};

export default function AdminSalesReportsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: "",
    endDate: "",
    sellerId: "",
    examId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReturnType<typeof generateSalesReport> | null>(null);

  useEffect(() => {
    if (!getCurrentUser()) {
      router.replace("/admin/login");
      return;
    }
    const t = setTimeout(() => {
      setExams(getExams());
      setUsers(getUsers().filter((u) => u.active && u.role === "seller"));
      setLoading(false);
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value === "all" ? "" : value }));
    setReport(null);
    setError("");
  };

  const handleGenerateReport = () => {
    setLoading(true); setError("");
    try {
      const result = generateSalesReport({ startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, sellerId: filters.sellerId || undefined, examId: filters.examId || undefined });
      setReport(result);
    } catch { setReport(null); setError("Hesabat hazırlanmadı. Tarixləri və yaddaş məlumatlarını yoxlayın."); }
    finally { setLoading(false); }
  };

  const handleExportCSV = () => {
    if (!report) return;

    setError("");
    try {
    const rawSales = getFilteredTicketSales({ startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, sellerId: filters.sellerId || undefined, examId: filters.examId || undefined });
    const escapeCsv = escapeCsvCell;

    const headers = ["Tarix", "Saat", "İmtahan", "Bilet kodu", "FİN", "Şagird adı", "Satıcı", "Qiymət (AZN)"];
    const rows = [
      headers.join(","),
      ...rawSales.map((sale) => [
        escapeCsv(sale.soldAt.split("T")[0]),
        escapeCsv(sale.soldAt.split("T")[1]?.substring(0, 5) ?? ""),
        escapeCsv(sale.examTitle),
        escapeCsv(sale.ticketCode),
        escapeCsv(sale.studentFIN),
        escapeCsv(sale.studentName ?? ""),
        escapeCsv(sale.sellerName),
        escapeCsv(sale.price),
      ].join(","))
    ].join("\n");

    // Add BOM for proper UTF-8 display in Excel
    const bom = "\uFEFF";
    const blob = new Blob([bom + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `satis-hesabati-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    } catch { setError("CSV ixrac edilmədi. Yenidən cəhd edin."); }
  };

  const formatCurrency = (n: number) => n.toLocaleString("az-AZ", { style: "currency", currency: "AZN" });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Satış Hesabatları</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Bilet satışları üzrə statistik hesabatlar, ixracat və analiz.
          </p>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
      {/* Filters */}
      <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
        <CardHeader className="border-b border-neutral-100">
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-4" />
            Filtrlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Başlanğıc tarixi
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Bitmə tarixi
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Satıcı
              </label>
              <Select value={filters.sellerId || "all"} onValueChange={(v) => handleFilterChange("sellerId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Bütün satıcılar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün satıcılar</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                İmtahan
              </label>
              <Select value={filters.examId || "all"} onValueChange={(v) => handleFilterChange("examId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Bütün imtahanlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün imtahanlar</SelectItem>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.code ?? e.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handleGenerateReport} loading={loading}>
              <Filter className="size-4 mr-2" />
              Hesabat hazırla
            </Button>
            {report && (
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="size-4 mr-2" />
                CSV ixrac et
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-700/10">
                    <CreditCard className="size-5 text-brand-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{report.totalTickets}</p>
                    <p className="text-xs text-neutral-500">Satılan bilet</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CreditCard className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{formatCurrency(report.totalRevenue)}</p>
                    <p className="text-xs text-neutral-500">Cəmi gəlir</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <Users className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{report.bySeller.length}</p>
                    <p className="text-xs text-neutral-500">Aktiv satıcı</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
                    <FileText className="size-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{report.byExam.length}</p>
                    <p className="text-xs text-neutral-500">İmtahan sayı</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for detailed breakdowns */}
          <Tabs defaultValue="bySeller" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bySeller">
                <Users className="size-4 mr-2" />
                Satıcıya görə
              </TabsTrigger>
              <TabsTrigger value="byExam">
                <FileText className="size-4 mr-2" />
                İmtahana görə
              </TabsTrigger>
              <TabsTrigger value="byDate">
                <Calendar className="size-4 mr-2" />
                Tarixə görə
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bySeller">
              <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
                <CardHeader className="border-b border-neutral-100">
                  <CardTitle>Satıcı performansı</CardTitle>
                </CardHeader>
                <CardContent className="px-0 py-0">
                  {report.bySeller.length === 0 ? (
                    <div className="p-10 text-center text-neutral-500">Məlumat yoxdur.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Satıcı</TableHead>
                            <TableHead className="text-right">Bilet sayı</TableHead>
                            <TableHead className="text-right">Gəlir</TableHead>
                            <TableHead className="text-right">Pay</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.bySeller.map((s) => (
                            <TableRow key={s.sellerId} className="hover:bg-neutral-50">
                              <TableCell className="font-medium text-neutral-900">{s.sellerName}</TableCell>
                              <TableCell className="text-right text-sm text-neutral-700">{s.tickets}</TableCell>
                              <TableCell className="text-right font-medium text-neutral-900">{formatCurrency(s.revenue)}</TableCell>
                              <TableCell className="text-right text-sm text-neutral-500">
                                {report.totalRevenue > 0 ? ((s.revenue / report.totalRevenue) * 100).toFixed(1) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="byExam">
              <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
                <CardHeader className="border-b border-neutral-100">
                  <CardTitle>İmtahan performansı</CardTitle>
                </CardHeader>
                <CardContent className="px-0 py-0">
                  {report.byExam.length === 0 ? (
                    <div className="p-10 text-center text-neutral-500">Məlumat yoxdur.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>İmtahan</TableHead>
                            <TableHead className="text-right">Bilet sayı</TableHead>
                            <TableHead className="text-right">Gəlir</TableHead>
                            <TableHead className="text-right">Pay</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.byExam.map((e) => (
                            <TableRow key={e.examId} className="hover:bg-neutral-50">
                              <TableCell className="font-medium text-neutral-900">{e.examTitle}</TableCell>
                              <TableCell className="text-right text-sm text-neutral-700">{e.tickets}</TableCell>
                              <TableCell className="text-right font-medium text-neutral-900">{formatCurrency(e.revenue)}</TableCell>
                              <TableCell className="text-right text-sm text-neutral-500">
                                {report.totalRevenue > 0 ? ((e.revenue / report.totalRevenue) * 100).toFixed(1) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="byDate">
              <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
                <CardHeader className="border-b border-neutral-100">
                  <CardTitle>Günlük satışlar</CardTitle>
                </CardHeader>
                <CardContent className="px-0 py-0">
                  {report.byDate.length === 0 ? (
                    <div className="p-10 text-center text-neutral-500">Məlumat yoxdur.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarix</TableHead>
                            <TableHead className="text-right">Bilet sayı</TableHead>
                            <TableHead className="text-right">Gəlir</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.byDate.map((d) => (
                            <TableRow key={d.date} className="hover:bg-neutral-50">
                              <TableCell className="font-mono text-sm text-neutral-700">{d.date}</TableCell>
                              <TableCell className="text-right text-sm text-neutral-700">{d.tickets}</TableCell>
                              <TableCell className="text-right font-medium text-neutral-900">{formatCurrency(d.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {loading && !report && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-700" />
        </div>
      )}

      {!loading && !report && (
        <Card className="rounded-xl border-neutral-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto mb-4 size-12 text-neutral-300" />
          <h2 className="text-lg font-semibold text-neutral-900">Hesabat hazırlanmayıb</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Filtrləri təyin edib &ldquo;Hesabat hazırla&rdquo; düyməsini basın.
          </p>
        </Card>
      )}
    </div>
  );
}
