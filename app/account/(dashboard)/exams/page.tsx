"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarRange,
  ClipboardList,
  Copy,
  FileCheck,
  FileX,
  GraduationCap,
  Layers,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  copyExam,
  deleteExam,
  getExams,
  getSession,
  initStore,
} from "@/lib/backend-store";
import { PHASE_LABELS, currentAcademicYear } from "@/lib/helpers";
import type { Exam, ExamPhase } from "@/lib/types";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
} from "@/components/ui";

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/admin/login");
      return;
    }
    const t = setTimeout(() => {
      initStore();
      setExams(getExams());
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exams;
    return exams.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.code ?? "").toLowerCase().includes(q),
    );
  }, [exams, search]);

  const handleDelete = async (exam: Exam) => {
    if (
      window.confirm(
        `"${exam.title}" imtahanı arxivləşdiriləcək, nəticələr qorunacaq. Davam edilsin?`,
      )
    ) {
      try {
        await deleteExam(exam.id);
        setExams(getExams());
      } catch { window.alert("İmtahan tam silinmədi. Yaddaş məlumatlarını yoxlayın və yenidən cəhd edin."); }
    }
  };

  const handleCopy = async (exam: Exam) => {
    try {
      await copyExam(exam.id);
      setExams(getExams());
    } catch { window.alert("İmtahan kopyalanmadı. Yenidən cəhd edin."); }
  };

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="page-heading flex flex-col items-start justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">İmtahanlar</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Kitabçaları hazırlayın, imtahanları bir yerdən idarə edin.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
          {/* Axtarış */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İmtahan adı və ya kodu..."
              aria-label="İmtahan axtar"
              className="w-full pl-9 sm:w-64"
            />
          </div>

          <Button
            asChild
            className="gap-1.5 bg-brand-700 text-white hover:bg-brand-800"
          >
            <Link href="/account/exams/new">
              <Plus className="size-4" />
              Yeni İmtahan
            </Link>
          </Button>
        </div>
      </div>

      {/* ===== Kart grid ===== */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
            <ClipboardList className="size-6 text-neutral-500" />
          </span>
          <p className="text-sm font-medium text-neutral-700">
            {exams.length === 0
              ? "Hələ imtahan yoxdur"
              : "Axtarışa uyğun imtahan tapılmadı"}
          </p>
          {exams.length === 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              İlk kitabçanı yaratmaq üçün yeni imtahan əlavə edin.
            </p>
          )}
          {exams.length === 0 && (
            <Button
              asChild
              className="mt-5 gap-1.5 bg-brand-700 text-white hover:bg-brand-800"
            >
              <Link href="/account/exams/new">
                <Plus className="size-4" />
                Yeni İmtahan
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onCopy={() => handleCopy(exam)}
              onDelete={() => handleDelete(exam)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* İmtahan kartı                                                             */
/* -------------------------------------------------------------------------- */

function ExamCard({
  exam,
  onCopy,
  onDelete,
}: {
  exam: Exam;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const phase: ExamPhase = exam.status ?? "preparing";
  const classBlock =
    [exam.grade, exam.block || exam.subject].filter(Boolean).join(" - ") ||
    exam.subject;
  const year = exam.academicYear || currentAcademicYear();
  const variants = exam.variants ?? 1;

  // Online availability badge
  const onlineBadge = exam.onlineEnabled ? (
    <Badge
      variant="success"
      className="shrink-0"
    >
      <Activity className="size-1.5 rounded-full bg-success" />
      Onlayn
    </Badge>
  ) : null;

  return (
    <Card className="exam-card group relative gap-0 rounded-lg border border-neutral-200 bg-white shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-brand-200 hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        {/* Başlıq + status */}
        <div className="flex flex-col-reverse items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 min-h-12 text-base font-semibold leading-snug text-neutral-900">
              {exam.title}
            </h2>
            <p className="mt-1 font-mono text-xs text-neutral-500">
              {exam.code ?? "—"}
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-row-reverse items-center justify-between gap-1.5">
            {/* Sil */}
            <button
              type="button"
              onClick={onDelete}
              title="İmtahanı sil"
              aria-label={`${exam.title} imtahanını sil`}
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-danger-soft hover:text-danger-fg focus-visible:opacity-100 focus-visible:outline-none"
            >
              <Trash2 className="size-4" />
            </button>

            {/* Status rozeti */}
            <Badge
              variant={phase === "done" ? "success" : phase === "first_ready" ? "warning" : phase === "review" ? "info" : "neutral"}
              className="shrink-0"
            >
              {PHASE_LABELS[phase]}
            </Badge>
          </div>
        </div>

        {/* Meta məlumatlar */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="size-3.5 shrink-0" />
            <span className="truncate">{classBlock}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarRange className="size-3.5 shrink-0" />
            <span className="truncate">{year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5 shrink-0" />
            <span className="truncate">
              {variants} {variants === 1 ? "variant" : "variant"}
            </span>
          </div>
          {onlineBadge}
          {exam.pdfReady ? (
            <div className="flex items-center gap-1.5">
              <FileCheck className="size-3.5" />
              <span className="text-xs font-medium text-emerald-600">PDF hazır</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <FileX className="size-3.5" />
              <span className="text-xs font-medium text-neutral-500">PDF yoxdur</span>
            </div>
          )}
        </dl>

        {/* Əməliyyatlar */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCopy}
            className="gap-1 text-neutral-700"
          >
            <Copy className="size-3.5" />
            Kopyala
          </Button>
          <Button
            asChild
            variant="outline" className="text-sm text-brand-700 border-brand-200"
          >
            <Link href={`/account/exams/${exam.id}`}>
              Aç
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
