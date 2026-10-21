"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileQuestion,
  Plus,
  Radio,
  TriangleAlert,
  Users,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatCard,
} from "@/components/ui";
import {
  getExams,
  getQuestionBank,
  getResults,
  getSession,
  initStore,
} from "@/lib/store";
import { examStatus, formatDateTime } from "@/lib/helpers";
import type { Exam, ExamResult, Question } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Sabitlər                                                                  */
/* -------------------------------------------------------------------------- */

const DAY_MS = 86_400_000;
const TICKET_PRICE = 25; // ₼
const RANGES = [
  { days: 7, label: "7 gün" },
  { days: 30, label: "30 gün" },
  { days: 90, label: "90 gün" },
] as const;

const SERIES = {
  attempts: { key: "attempts", label: "Cəhd", color: "var(--color-brand-600)" },
  tickets: { key: "tickets", label: "Bilet", color: "var(--color-gold-500)" },
  questions: { key: "questions", label: "Sual", color: "var(--color-success)" },
} as const;

type ChartPoint = {
  date: string;
  full: string;
  attempts: number;
  tickets: number;
  questions: number;
};

type ExamRow = {
  exam: Exam;
  status: "planned" | "active" | "ended";
  participants: number;
  avgScore: number | null;
  created: number;
};

type SortKey = "created" | "participants" | "avg" | "name";

const PAGE_SIZE = 5;

/* -------------------------------------------------------------------------- */
/* Yardımçılar                                                              */
/* -------------------------------------------------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");

function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatNumber(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatManat(n: number): string {
  return `${formatNumber(n)} ₼`;
}

function formatDurationShort(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h} saat ${m} dəq`;
  return `${m} dəq`;
}

/* -------------------------------------------------------------------------- */
/* Səhifə                                                                    */
/* -------------------------------------------------------------------------- */

export default function AdminDashboardPage() {
  const router = useRouter();
  const [now, setNow] = useState(0);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/admin/login");
      return;
    }
    const t = setTimeout(() => {
      initStore();
      setNow(Date.now());
      setExams(getExams());
      setResults(getResults());
      setQuestions(getQuestionBank());
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const changeRange = (days: number) => {
    setRangeDays(days);
    setPage(1);
  };

  const changeSort = (key: SortKey) => {
    setSortKey(key);
    setPage(1);
  };

  const loading = now === 0;

  /* --------------------------- canlı imtahanlar ----------------------- */

  const liveExams = useMemo(() => {
    if (!now) return [];
    return exams
      .filter((e) => examStatus(e, now) === "active")
      .map((exam) => {
        const examResults = results.filter((r) => r.examId === exam.id);
        const soldTickets = examResults.filter((r) => Boolean(r.ticketCode)).length;
        const start = new Date(exam.startsAt).getTime();
        const end = new Date(exam.endsAt).getTime();
        const elapsed = Math.min(Math.max(now - start, 0), end - start);
        const total = Math.max(end - start, 1);
        return {
          exam,
          participants: examResults.length,
          registered: exam.ticketCodes.length,
          soldTickets,
          revenue: soldTickets * TICKET_PRICE,
          remaining: Math.max(end - now, 0),
          progress: Math.min(Math.round((elapsed / total) * 100), 100),
        };
      });
  }, [exams, results, now]);

  /* ------------------------------ KPI-lər ---------------------------- */

  const kpis = useMemo(() => {
    if (!now) return null;

    const periodStart = now - rangeDays * DAY_MS;
    const prevStart = now - rangeDays * 2 * DAY_MS;

    const inPeriod = (t: number) => t >= periodStart && t <= now;
    const inPrev = (t: number) => t >= prevStart && t < periodStart;

    const examsIn = exams.filter((e) => inPeriod(new Date(e.createdAt).getTime()));
    const examsPrev = exams.filter((e) =>
      inPrev(new Date(e.createdAt).getTime()),
    );

    const resIn = results.filter((r) =>
      inPeriod(new Date(r.finishedAt).getTime()),
    );
    const resPrev = results.filter((r) =>
      inPrev(new Date(r.finishedAt).getTime()),
    );

    const avg = (list: ExamResult[]) =>
      list.length > 0
        ? Math.round(list.reduce((a, r) => a + r.score, 0) / list.length)
        : null;

    const pendingIn = questions.filter(
      (q) =>
        q.verification === "pending" &&
        q.createdAt &&
        inPeriod(new Date(q.createdAt).getTime()),
    );
    const pendingPrev = questions.filter(
      (q) =>
        q.verification === "pending" &&
        q.createdAt &&
        inPrev(new Date(q.createdAt).getTime()),
    );

    return {
      exams: {
        value: formatNumber(examsIn.length),
        delta: examsIn.length - examsPrev.length,
        label: `${rangeDays} gündə yaradılan`,
        href: "/account/exams",
      },
      participants: {
        value: formatNumber(resIn.length),
        delta: resIn.length - resPrev.length,
        label: "tamamlanan imtahan",
        href: "/account/results",
      },
      avgScore: {
        value: avg(resIn) === null ? "—" : `${avg(resIn)}%`,
        delta:
          avg(resIn) !== null && avg(resPrev) !== null
            ? avg(resIn)! - avg(resPrev)!
            : null,
        label: "orta bal",
        href: "/account/results",
      },
      pending: {
        value: formatNumber(pendingIn.length),
        delta: pendingIn.length - pendingPrev.length,
        label: "təsdiq gözləyir",
        href: "/account/questions/verification",
      },
    };
  }, [exams, results, questions, rangeDays, now]);

  /* ------------------------------ qrafik ----------------------------- */

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!now) return [];

    const buckets = new Map<
      string,
      { attempts: number; tickets: number; questions: number }
    >();
    const order: string[] = [];

    for (let i = rangeDays - 1; i >= 0; i -= 1) {
      const d = new Date(now - i * DAY_MS);
      const key = dayKey(d.getTime());
      buckets.set(key, { attempts: 0, tickets: 0, questions: 0 });
      order.push(key);
    }

    for (const r of results) {
      const bucket = buckets.get(dayKey(new Date(r.finishedAt).getTime()));
      if (!bucket) continue;
      bucket.attempts += 1;
      if (r.ticketCode) bucket.tickets += 1;
    }
    for (const q of questions) {
      if (!q.createdAt) continue;
      const bucket = buckets.get(dayKey(new Date(q.createdAt).getTime()));
      if (!bucket) continue;
      bucket.questions += 1;
    }

    return order.map((key) => {
      const bucket = buckets.get(key)!;
      const d = new Date(key + "T00:00:00");
      return {
        date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`,
        full: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
        ...bucket,
      };
    });
  }, [results, questions, rangeDays, now]);

  const chartEmpty =
    chartData.length === 0 ||
    chartData.every((p) => p.attempts + p.tickets + p.questions === 0);

  /* --------------------------- diqqət bloku -------------------------- */

  const attention = useMemo(() => {
    if (!now) return [];
    const items: {
      key: string;
      title: string;
      description: string;
      href: string;
    }[] = [];

    const pending = questions.filter((q) => q.verification === "pending");
    if (pending.length > 0) {
      items.push({
        key: "pending",
        title: `${pending.length} sual təsdiq gözləyir`,
        description:
          "Sual bankına əlavə olunan suallar yoxlanılmadan nəticələrə daxil edilmir.",
        href: "/account/questions/verification",
      });
    }

    const endedWithoutResults = exams.filter(
      (e) =>
        examStatus(e, now) === "ended" &&
        results.filter((r) => r.examId === e.id).length === 0,
    );
    if (endedWithoutResults.length > 0) {
      items.push({
        key: "no-results",
        title: `${endedWithoutResults.length} bitmiş imtahanda nəticə yoxdur`,
        description:
          "İmtahan vaxtı bitib, lakin heç bir iştirakçı qeydə alınmayıb — yoxlama tələb edir.",
        href: "/account/exams",
      });
    }

    const broken = exams.filter(
      (e) =>
        Number.isNaN(new Date(e.startsAt).getTime()) ||
        Number.isNaN(new Date(e.endsAt).getTime()) ||
        new Date(e.endsAt).getTime() <= new Date(e.startsAt).getTime(),
    );
    if (broken.length > 0) {
      items.push({
        key: "broken",
        title: `${broken.length} imtahanda vaxt diapazonu səhvdir`,
        description:
          "Başlama və bitmə vaxtlarını düzəldin, əks halda imtahan açılmayacaq.",
        href: "/account/exams",
      });
    }

    return items;
  }, [exams, questions, results, now]);

  /* -------------------------- son imtahanlar ------------------------- */

  const examRows = useMemo<ExamRow[]>(() => {
    if (!now) return [];
    return exams
      .map((exam) => {
        const examResults = results.filter((r) => r.examId === exam.id);
        const avg =
          examResults.length > 0
            ? Math.round(
                examResults.reduce((a, r) => a + r.score, 0) /
                  examResults.length,
              )
            : null;
        return {
          exam,
          status: examStatus(exam, now),
          participants: examResults.length,
          avgScore: avg,
          created: new Date(exam.createdAt).getTime(),
        };
      })
      .sort((a, b) => {
        if (sortKey === "participants") return b.participants - a.participants;
        if (sortKey === "avg")
          return (b.avgScore ?? -1) - (a.avgScore ?? -1);
        if (sortKey === "name") return a.exam.title.localeCompare(b.exam.title);
        return b.created - a.created;
      });
  }, [exams, results, sortKey, now]);

  const pageCount = Math.max(1, Math.ceil(examRows.length / PAGE_SIZE));
  const pageRows = examRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ------------------------------ render ----------------------------- */

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            İdarəetmə Paneli
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Canlı imtahanlar, iştirakçılar və seçilmiş dövrün dinamikası.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tarix aralığı */}
          <div
            className="flex items-center gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5"
            role="group"
            aria-label="Tarix aralığı"
          >
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => changeRange(r.days)}
                aria-pressed={rangeDays === r.days}
                className={
                  rangeDays === r.days
                    ? "rounded-[6px] bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                    : "rounded-[6px] px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                }
              >
                {r.label}
              </button>
            ))}
          </div>

          <Button asChild className="gap-1.5">
            <Link href="/account/exams/new">
              <Plus />
              Yeni imtahan
            </Link>
          </Button>
        </div>
      </div>

      {/* ===== Canlı imtahanlar ===== */}
      <section
        aria-label="Canlı imtahanlar"
        className="overflow-hidden rounded-lg border border-brand-800 bg-brand-800 text-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-white/10">
              <Radio className="size-4 text-gold-300" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Canlı imtahanlar
              </h2>
              <p className="text-xs text-brand-100/70">
                {liveExams.length > 0
                  ? `${liveExams.length} imtahan hal-hazırda açıqdır`
                  : "Hal-hazırda açıq imtahan yoxdur"}
              </p>
            </div>
          </div>
          <Link
            href="/account/online-exams"
            className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 underline-offset-4 transition-colors hover:text-gold-200 hover:underline"
          >
            Onlayn idarəetmə
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 px-5 pb-5">
            <Skeleton className="h-16 bg-white/10" />
          </div>
        ) : liveExams.length === 0 ? (
          <div className="flex items-center gap-3 border-t border-white/10 px-5 py-6">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-300/80" />
            <p className="text-sm text-brand-100/80">
              Hazırda canlı imtahan yoxdur — yeni imtahan yaradın və vaxt
              aralığını təyin edin.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10 border-t border-white/10">
            {liveExams.map((live) => (
              <li
                key={live.exam.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
              >
                <div className="min-w-[220px] flex-1">
                  <Link
                    href={`/account/exams/${live.exam.id}`}
                    className="text-sm font-medium text-white underline-offset-4 hover:underline"
                  >
                    {live.exam.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-brand-100/60">
                    {live.exam.code ?? "—"}
                  </p>
                </div>

                {/* İştirakçı / qeydiyyat */}
                <div className="min-w-[150px]">
                  <p className="tnum text-sm text-white">
                    {live.participants}{" "}
                    <span className="text-brand-100/60">
                      / {live.registered} qeydiyyatlı
                    </span>
                  </p>
                  <p className="tnum text-xs text-brand-100/60">
                    {live.soldTickets} bilet · {formatManat(live.revenue)}
                  </p>
                </div>

                {/* Qalan vaxt */}
                <div className="min-w-[170px]">
                  <div className="flex items-center justify-between text-xs text-brand-100/70">
                    <span>Qalan vaxt</span>
                    <span className="tnum text-white">
                      {formatDurationShort(live.remaining)}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15"
                    role="progressbar"
                    aria-valuenow={live.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${live.exam.title} — keçən vaxt`}
                  >
                    <div
                      className="h-full rounded-full bg-gold-400 transition-[width] duration-300"
                      style={{ width: `${live.progress}%` }}
                    />
                  </div>
                </div>

                <Button
                  asChild
                  variant="gold"
                  size="sm"
                  className="ml-auto gap-1.5"
                >
                  <Link href="/account/online-exams">
                    <Eye />
                    İzlə
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== KPI-lər ===== */}
      <section
        aria-label="Əsas göstəricilər"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[118px]" />
            ))
          : kpis && (
              <>
                <StatCard
                  label="İmtahanlar"
                  value={kpis.exams.value}
                  delta={kpis.exams.delta}
                  deltaLabel={kpis.exams.label}
                  href={kpis.exams.href}
                  icon={ClipboardList}
                />
                <StatCard
                  label="İştirakçılar"
                  value={kpis.participants.value}
                  delta={kpis.participants.delta}
                  deltaLabel={kpis.participants.label}
                  href={kpis.participants.href}
                  icon={Users}
                />
                <StatCard
                  label="Orta bal"
                  value={kpis.avgScore.value}
                  delta={kpis.avgScore.delta}
                  deltaLabel={kpis.avgScore.label}
                  href={kpis.avgScore.href}
                  icon={Activity}
                />
                <StatCard
                  label="Təsdiq gözləyən sual"
                  value={kpis.pending.value}
                  delta={kpis.pending.delta}
                  deltaLabel={kpis.pending.label}
                  href={kpis.pending.href}
                  icon={FileQuestion}
                />
              </>
            )}
      </section>

      {/* ===== Qrafik + Diqqət ===== */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Qrafik */}
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-neutral-100 py-4">
            <CardTitle className="text-sm">Aktivlik</CardTitle>
            <div className="flex items-center gap-3">
              {Object.values(SERIES).map((s) => (
                <span
                  key={s.key}
                  className="flex items-center gap-1.5 text-xs text-neutral-500"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
              ))}
            </div>
          </CardHeader>

          <CardContent className="py-5">
            {loading ? (
              <Skeleton className="h-[240px]" />
            ) : chartEmpty ? (
              <div className="flex h-[240px] flex-col justify-end gap-3 pb-2">
                <div className="dashed-empty h-1 w-full" />
                <p className="text-center text-sm text-neutral-500">
                  Hələ məlumat yoxdur
                </p>
                <p className="text-center text-xs text-neutral-400">
                  Seçilmiş {rangeDays} gün ərzində cəhd, bilet və ya yeni sual
                  qeydə alınmayıb.
                </p>
              </div>
            ) : (
              <div className="h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                    barCategoryGap="14%"
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--color-neutral-200)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="date"
                      interval="preserveStartEnd"
                      minTickGap={24}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-neutral-500)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={28}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-neutral-500)" }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-neutral-100)" }}
                      content={(props) => <ChartTooltip {...props} />}
                    />
                    <Bar
                      dataKey="attempts"
                      name="Cəhd"
                      fill={SERIES.attempts.color}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={14}
                    />
                    <Bar
                      dataKey="tickets"
                      name="Bilet"
                      fill={SERIES.tickets.color}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={14}
                    />
                    <Bar
                      dataKey="questions"
                      name="Sual"
                      fill={SERIES.questions.color}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diqqət tələb edir */}
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-neutral-100 py-4">
            <CardTitle className="text-sm">Diqqət tələb edir</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : attention.length === 0 ? (
              <div className="flex items-center gap-2.5 py-2">
                <CheckCircle2 className="size-4.5 shrink-0 text-success" />
                <p className="text-sm text-neutral-600">
                  Hər şey qaydasındadır — gözləyən təsdiq və ya xəta yoxdur.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {attention.map((item) => (
                  <li
                    key={item.key}
                    className="rounded-md border border-warning/25 bg-warning-soft p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-fg" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-warning-fg">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-warning-fg/80">
                          {item.description}
                        </p>
                        <Link
                          href={item.href}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warning-fg underline-offset-4 hover:underline"
                        >
                          Yoxla
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Son imtahanlar ===== */}
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-neutral-100 py-4">
          <CardTitle className="text-sm">Son imtahanlar</CardTitle>
          <div className="flex items-center gap-2">
            <label
              htmlFor="sort"
              className="text-xs text-neutral-500"
            >
              Sırala
            </label>
            <select
              id="sort"
              value={sortKey}
              onChange={(e) => changeSort(e.target.value as SortKey)}
              className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-700 outline-none focus-visible:border-brand-600"
            >
              <option value="created">Tarix</option>
              <option value="participants">İştirakçı</option>
              <option value="avg">Orta bal</option>
              <option value="name">Ad</option>
            </select>
            <Link
              href="/account/exams"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 underline-offset-4 hover:underline"
            >
              Bütün imtahanlar
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="px-0 py-0">
          {loading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
            </div>
          ) : examRows.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Hələ imtahan yaradılmayıb"
              description="İlk kitabçanı yaratmaq üçün yeni imtahan əlavə edin."
              action={
                <Button asChild>
                  <Link href="/account/exams/new">
                    <Plus />
                    Yeni imtahan
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                      <th className="px-5 py-3 font-medium">İmtahan</th>
                      <th className="px-5 py-3 font-medium">Vəziyyət</th>
                      <th className="px-5 py-3 font-medium">Tarix</th>
                      <th className="px-5 py-3 font-medium">İştirakçı</th>
                      <th className="px-5 py-3 font-medium">Orta bal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pageRows.map((row) => (
                      <tr key={row.exam.id} className="hover:bg-neutral-50">
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/account/exams/${row.exam.id}`}
                            className="font-medium text-neutral-900 underline-offset-4 hover:text-brand-700 hover:underline"
                          >
                            {row.exam.title}
                          </Link>
                          <p className="mt-0.5 font-mono text-xs text-neutral-400">
                            {row.exam.code ?? "—"}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-5 py-3.5 text-xs whitespace-nowrap text-neutral-500">
                          {formatDateTime(row.exam.createdAt)}
                        </td>
                        <td className="tnum px-5 py-3.5 text-neutral-700">
                          {row.participants}
                        </td>
                        <td className="tnum px-5 py-3.5 text-neutral-700">
                          {row.avgScore === null ? "—" : `${row.avgScore}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Səhifələmə */}
              {pageCount > 1 && (
                <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
                  <p className="text-xs text-neutral-500">
                    Səhifə {page} / {pageCount} · {examRows.length} imtahan
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Əvvəlki səhifə"
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setPage((p) => Math.min(pageCount, p + 1))
                      }
                      disabled={page === pageCount}
                      aria-label="Növbəti səhifə"
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Alt komponentlər                                                          */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: "planned" | "active" | "ended" }) {
  if (status === "active")
    return (
      <Badge variant="success">
        <span className="size-1.5 rounded-full bg-success" />
        Canlı
      </Badge>
    );
  if (status === "planned") return <Badge variant="warning">Gözləmədə</Badge>;
  return <Badge variant="neutral">Bitib</Badge>;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  const rows = [
    { color: SERIES.attempts.color, label: "Cəhd", value: point.attempts },
    { color: SERIES.tickets.color, label: "Bilet", value: point.tickets },
    { color: SERIES.questions.color, label: "Sual", value: point.questions },
  ];

  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-neutral-900">{point.full}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-2 text-xs text-neutral-600"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            {row.label}
            <span className="tnum ml-auto font-semibold text-neutral-900">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
