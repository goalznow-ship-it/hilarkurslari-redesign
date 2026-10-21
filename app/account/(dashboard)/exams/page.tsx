"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
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
} from "@/lib/store";
import { PHASE_LABELS, PHASE_STYLES, currentAcademicYear } from "@/lib/helpers";
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

  const handleDelete = (exam: Exam) => {
    if (
      window.confirm(
        `"${exam.title}" imtahanı və ona aid bütün nəticələr silinəcək. Davam edilsin?`,
      )
    ) {
      deleteExam(exam.id);
      setExams(getExams());
    }
  };

  const handleCopy = (exam: Exam) => {
    copyExam(exam.id);
    setExams(getExams());
  };

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">İmtahanlar</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Kitabça hazırlığı və idarəsi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Axtarış */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Axtar..."
              aria-label="İmtahan axtar"
              className="w-56 pl-9"
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
            <ClipboardList className="size-6 text-neutral-400" />
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

  return (
    <Card className="group relative gap-0 rounded-xl border-neutral-200 bg-white py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5">
        {/* Başlıq + rozet */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 min-h-[44px] text-base font-bold leading-snug text-neutral-900">
              {exam.title}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-neutral-400">
              {exam.code ?? "—"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Sil */}
            <button
              type="button"
              onClick={onDelete}
              title="İmtahanı sil"
              aria-label={`${exam.title} imtahanını sil`}
              className="card-action rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-danger-soft hover:text-danger-fg focus-visible:opacity-100 focus-visible:outline-none"
            >
              <Trash2 className="size-4" />
            </button>

            {/* Status rozeti */}
            <Badge
              variant="neutral"
              className={`shrink-0 ${PHASE_STYLES[phase]}`}
            >
              {PHASE_LABELS[phase]}
            </Badge>
          </div>
        </div>

        {/* Meta məlumatlar */}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-neutral-600">
            <GraduationCap className="size-4 shrink-0 text-neutral-400" />
            <span className="truncate">{classBlock}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <CalendarRange className="size-4 shrink-0 text-neutral-400" />
            <span className="truncate">{year}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <Layers className="size-4 shrink-0 text-neutral-400" />
            <span className="truncate">
              {variants} {variants === 1 ? "variant" : "variant"}
            </span>
          </div>
        </dl>

        {/* PDF vəziyyəti */}
        <p
          className={`mt-4 flex items-center gap-1.5 text-xs font-medium ${
            exam.pdfReady ? "text-emerald-600" : "text-neutral-400"
          }`}
        >
          {exam.pdfReady ? (
            <>
              <FileCheck className="size-4" />
              PDF hazır
            </>
          ) : (
            <>
              <FileX className="size-4" />
              PDF yoxdur
            </>
          )}
        </p>

        {/* Əməliyyatlar */}
        <div className="mt-auto flex items-center gap-2 border-t border-neutral-100 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCopy}
            className="gap-1.5 text-neutral-700"
          >
            <Copy className="size-4" />
            Kopyala
          </Button>
          <Button
            asChild
            className="ml-auto gap-1.5 bg-brand-700 text-white hover:bg-brand-800"
          >
            <Link href={`/account/exams/${exam.id}`}>
              Aç
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
