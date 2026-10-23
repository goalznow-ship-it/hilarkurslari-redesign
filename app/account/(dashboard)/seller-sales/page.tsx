"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FileText, Plus, Search, User as UserIcon } from "lucide-react";

import { getCurrentUser, getExams, sellTicket, getAvailableTickets, getSalesBySeller } from "@/lib/backend-store";
import { examStatus, normalizeTicket } from "@/lib/helpers";
import type { Exam, TicketSale, User } from "@/lib/types";

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
} from "@/components/ui";

type SaleFormData = {
  examId: string;
  ticketCode: string;
  studentFIN: string;
  studentName: string;
  price: number;
};



export default function SellerSalesPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [sales, setSales] = useState<TicketSale[]>([]);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // availableTickets is now derived via useMemo

  // Form state
  const [formData, setFormData] = useState<SaleFormData>({
    examId: "",
    ticketCode: "",
    studentFIN: "",
    studentName: "",
    price: 10,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const user = getCurrentUser();
        if (!user) { router.replace("/admin/login"); return; }
        if (!["admin", "seller"].includes(user.role)) { router.replace("/account"); return; }
        setSeller(user);
        setExams(getExams());
        setSales(getSalesBySeller(user.id));
      } catch { setFormError("Satış məlumatları yüklənmədi. Səhifəni yeniləyin."); }
      finally { setLoading(false); }
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  // Filter exams to only active and online-enabled ones
  const eligibleExams = useMemo(() => {
    return exams.filter((exam) => {
      const status = examStatus(exam);
      return status === "active" && exam.onlineEnabled && (seller?.role === "admin" || seller?.sellerExamIds?.includes(exam.id));
    });
  }, [exams, seller]);

  // Derived state for available tickets
  const availableTickets = (() => {
    if (formData.examId) {
      return getAvailableTickets(formData.examId);
    }
    return [];
  })();

  // Filter sales by search
  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        s.ticketCode.toLowerCase().includes(q) ||
        s.studentFIN.toLowerCase().includes(q) ||
        (s.studentName?.toLowerCase().includes(q) ?? false) ||
        s.examTitle.toLowerCase().includes(q)
    );
  }, [sales, search]);

  const handleInputChange = (field: keyof SaleFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
    setFormSuccess(null);
  };

  // Keep a stable reference to availableTickets for the UI
  const availableTicketsForUI = availableTickets;

  const handleStudentFINChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    setFormData((prev) => ({ ...prev, studentFIN: formatted }));
    setFormError(null);
    setFormSuccess(null);
  };

  const handleTicketCodeChange = (value: string) => {
    const formatted = normalizeTicket(value);
    setFormData((prev) => ({ ...prev, ticketCode: formatted }));
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const { examId, ticketCode, studentFIN, studentName, price } = formData;

    if (!examId || !ticketCode || !studentFIN) {
      setFormError("Bütün sahələri doldurun.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await sellTicket(examId, ticketCode, seller.id, studentFIN, studentName, price);
      if (!result.success) { setFormError(result.error ?? "Satış zamanı xəta baş verdi."); return; }
      if (result.sale) setSales((prev) => [result.sale!, ...prev]);
      setFormSuccess("Bilet uğurla satıldı!");
      setFormData((prev) => ({ ...prev, ticketCode: "", studentFIN: "", studentName: "" }));
    } catch { setFormError("Satış saxlanılmadı. Yenidən cəhd edin."); }
    finally { setIsSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-700" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <p className="text-neutral-500">Satıcı hesabı tapılmadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Bilet Satışı</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Satıcı: {seller.name} ({seller.email})
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-700/10">
                <CreditCard className="size-5 text-brand-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{sales.length}</p>
                <p className="text-xs text-neutral-500">Satılan bilet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <FileText className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">
                  {sales.reduce((sum, s) => sum + s.price, 0)} AZN
                </p>
                <p className="text-xs text-neutral-500">Cəmi gəlir</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Search className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{eligibleExams.length}</p>
                <p className="text-xs text-neutral-500">Aktiv imtahan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
                <UserIcon className="size-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">
                  {eligibleExams.reduce((sum, e) => sum + getAvailableTickets(e.id).length, 0)}
                </p>
                <p className="text-xs text-neutral-500">Mövcud bilet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sale Form */}
      <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
        <CardHeader className="border-b border-neutral-100">
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Yeni Satış
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSell} className="space-y-4 max-w-xl">
            {formError && (
              <div
                role="alert"
                className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger-fg"
              >
                {formError}
              </div>
            )}
            {formSuccess && (
              <div
                role="status"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
              >
                {formSuccess}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  İmtahan *
                </label>
                <Select value={formData.examId} onValueChange={(v) => handleInputChange("examId", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="İmtahan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleExams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title} ({exam.code ?? exam.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Bilet kodu *
                </label>
                <Input
                  value={formData.ticketCode}
                  onChange={(e) => handleTicketCodeChange(e.target.value)}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  className="font-mono"
                />
                {availableTicketsForUI.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Mövcud: {availableTicketsForUI.length} bilet
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Şagird FİN *
                </label>
                <Input
                  value={formData.studentFIN}
                  onChange={(e) => handleStudentFINChange(e.target.value)}
                  placeholder="7 simvol"
                  maxLength={7}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Şagird adı (ixtiyari)
                </label>
                <Input
                  value={formData.studentName}
                  onChange={(e) => handleInputChange("studentName", e.target.value)}
                  placeholder="Ad Soyad"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Qiymət (AZN) *
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={(e) => handleInputChange("price", parseInt(e.target.value) || 0)}
                placeholder="10"
                className="w-32 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" loading={isSubmitting}>
                Satışı qeyd et
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setFormData((prev) => ({ ...prev, ticketCode: "", studentFIN: "", studentName: "" }));
                setFormError(null);
                setFormSuccess(null);
              }}>
                Təmizlə
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sales History */}
      <Card className="rounded-xl border-neutral-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-neutral-100 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-brand-700" />
            <h2 className="text-sm font-semibold text-neutral-900">
              Satış tarixi
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-neutral-400" />
            <Input
              placeholder="Axtar (FİN, bilet, imtahan)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {filteredSales.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-neutral-500">Hələ satış yoxdur.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Tarix</TableHead>
                    <TableHead>İmtahan</TableHead>
                    <TableHead className="w-36">Bilet</TableHead>
                    <TableHead className="w-36">FİN</TableHead>
                    <TableHead className="w-40">Şagird</TableHead>
                    <TableHead className="w-28 text-right">Qiymət</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-neutral-50">
                      <TableCell className="text-xs text-neutral-500">
                        {new Date(sale.soldAt).toLocaleDateString("az-AZ")}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-neutral-900">
                        {sale.examTitle}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-neutral-700">
                        {sale.ticketCode}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-neutral-700">
                        {sale.studentFIN}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-700">
                        {sale.studentName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-neutral-900">
                        {sale.price} AZN
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
