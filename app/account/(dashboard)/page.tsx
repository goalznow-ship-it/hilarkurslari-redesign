"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Plus,
  Radio,
  Ticket,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getExams,
  getQuestionBank,
  getResults,
  getSession,
  getUsers,
  initStore,
} from "@/lib/store";
import { examStatus, formatDateTime } from "@/lib/helpers";
import type { Exam, ExamResult, Question, User } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Sabitlər                                                                  */
/* -------------------------------------------------------------------------- */

const TICKET_PRICE = 25; // ₼ — bir biletin qiyməti
const COMPANY_NAME = "Hilal Kursları";
const DAY_MS = 86_400_000;
const CHART_DAYS = 30;

const SERIES = {
  attempts: { key: "attempts", label: "Cəhd", color: "#8b5cf6" },
  tickets: { key: "tickets", label: "Bilet", color: "#f97316" },
  questions: { key: "questions", label: "Sual", color: "#10b981" },
} as const;

type ChartPoint = {
  date: string;
  full: string;
  attempts: number;
  tickets: number;
  questions: number;
};

type AttentionKind = "approval" | "check" | "error";

type AttentionItem = {
  key: string;
  kind: AttentionKind;
  title: string;
  hint: string;
  href: string;
  questions?: Question[];
};

/* -------------------------------------------------------------------------- */
/* Yardımçı funksiyalar                                                      */
/* -------------------------------------------------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");

function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatNumber(n: number): string {
  return String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = (x: Date) => `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;
  const time = (x: Date) => `${pad(x.getHours())}:${pad(x.getMinutes())}`;
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "—";
  return s.toDateString() === e.toDateString()
    ? `${day(s)} · ${time(s)} – ${time(e)}`
    : `${day(s)} ${time(s)} – ${day(e)} ${time(e)}`;
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
  const [users, setUsers] = useState<User[]>([]);
  const [company, setCompany] = useState("all");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/account/login");
      return;
    }
    const t = setTimeout(() => {
      initStore();
      setNow(Date.now());
      setExams(getExams());
      setResults(getResults());
      setQuestions(getQuestionBank());
      setUsers(getUsers());
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  /* --------------------------- statistika --------------------------- */

  const stats = useMemo(() => {
    if (!now) {
      return {
        examsThisMonth: 0,
        examDelta: 0,
        liveCount: 0,
        todayAttempts: 0,
        verifiedQuestions: 0,
        pendingCount: 0,
        tickets30: 0,
        revenue30: 0,
        activeCoordinators: 0,
      };
    }

    const d = new Date(now);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const prevMonthStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    const createdAt = (e: Exam) => new Date(e.createdAt).getTime();

    const examsThisMonth = exams.filter((e) => createdAt(e) >= monthStart).length;
    const examsPrevMonth = exams.filter(
      (e) => createdAt(e) >= prevMonthStart && createdAt(e) < monthStart,
    ).length;

    const today = dayKey(now);
    const windowStart = now - CHART_DAYS * DAY_MS;

    const tickets30 = results.filter((r) => {
      const t = new Date(r.finishedAt).getTime();
      return t >= windowStart && t <= now && Boolean(r.ticketCode);
    }).length;

    return {
      examsThisMonth,
      examDelta: examsThisMonth - examsPrevMonth,
      liveCount: exams.filter((e) => examStatus(e, now) === "active").length,
      todayAttempts: results.filter(
        (r) => dayKey(new Date(r.finishedAt).getTime()) === today,
      ).length,
      verifiedQuestions: questions.filter(
        (q) => (q.verification ?? "verified") === "verified",
      ).length,
      pendingCount: questions.filter((q) => q.verification === "pending").length,
      tickets30,
      revenue30: tickets30 * TICKET_PRICE,
      activeCoordinators: users.filter(
        (u) => u.active && u.role === "coordinator",
      ).length,
    };
  }, [exams, results, questions, users, now]);

  /* ---------------------------- qrafik ----------------------------- */

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!now) return [];

    const buckets = new Map<
      string,
      { attempts: number; tickets: number; questions: number }
    >();
    const order: string[] = [];

    for (let i = CHART_DAYS - 1; i >= 0; i -= 1) {
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
  }, [results, questions, now]);

  const chartTotals = useMemo(
    () => ({
      attempts: chartData.reduce((a, p) => a + p.attempts, 0),
      tickets: chartData.reduce((a, p) => a + p.tickets, 0),
      questions: chartData.reduce((a, p) => a + p.questions, 0),
    }),
    [chartData],
  );

  /* --------------------------- diqqət ------------------------------ */

  const attention = useMemo<AttentionItem[]>(() => {
    if (!now) return [];
    const items: AttentionItem[] = [];

    const pending = questions.filter((q) => q.verification === "pending");
    if (pending.length > 0) {
      items.push({
        key: "pending-questions",
        kind: "approval",
        title: `${pending.length} sual təsdiq gözləyir`,
        hint: "Sual bankına əlavə olunan suallar yoxlanılmadan nəticələrə daxil edilmir.",
        href: "/account/questions/verification",
        questions: pending,
      });
    }

    const endedWithoutResults = exams.filter(
      (e) =>
        examStatus(e, now) === "ended" &&
        results.filter((r) => r.examId === e.id).length === 0,
    );
    if (endedWithoutResults.length > 0) {
      items.push({
        key: "ended-without-results",
        kind: "check",
        title: `${endedWithoutResults.length} bitmiş imtahanda nəticə yoxdur`,
        hint: "İmtahan vaxtı bitib, lakin heç bir iştirakçı qeydə alınmayıb — yoxlama tələb edir.",
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
        key: "broken-schedule",
        kind: "error",
        title: `${broken.length} imtahanda vaxt diapazonu səhvdir`,
        hint: "Başlama və bitmə vaxtlarını düzəldin, əks halda imtahan açılmayacaq.",
        href: "/account/exams",
      });
    }

    return items;
  }, [exams, questions, results, now]);

  /* ------------------------- son imtahanlar ------------------------ */

  const recentExams = useMemo(() => {
    if (!now) return [];
    return [...exams]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 6)
      .map((exam) => {
        const examResults = results.filter((r) => r.examId === exam.id);
        return {
          exam,
          status: examStatus(exam, now),
          started: examResults.length,
          finished: examResults.filter((r) => Boolean(r.finishedAt)).length,
        };
      });
  }, [exams, results, now]);

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">İdarəetmə Paneli</h1>
          <p className="mt-1 text-sm text-slate-500">
            Canlı imtahanlar, son 30 günün dinamikası və təsdiq gözləyən
            məsələlər bir yerə.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Şirkət seçimi */}
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[190px] gap-2 text-slate-700">
              <Building2 className="size-4 text-[#4a1c2c]" />
              <SelectValue placeholder="Şirkət" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün şirkətlər</SelectItem>
              <SelectItem value="hilal">{COMPANY_NAME}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" asChild className="gap-1.5">
            <Link href="/account/users">
              <Users className="size-4" />
              İstifadəçi
            </Link>
          </Button>

          <Button variant="outline" asChild className="gap-1.5">
            <Link href="/account/reports">
              <BarChart3 className="size-4" />
              Hesabatlıq
            </Link>
          </Button>

          <Button asChild className="gap-1.5 bg-[#4a1c2c] text-white hover:bg-[#381420]">
            <Link href="/account/exams/new">
              <Plus className="size-4" />
              İmtahan
            </Link>
          </Button>
        </div>
      </div>

      {/* ===== Statistika kartları ===== */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {/* İmtahan (bu ay) */}
        <StatCard
          icon={ClipboardList}
          label="İmtahan (bu ay)"
          value={formatNumber(stats.examsThisMonth)}
          hint="əvvəlki aya nisbətən"
          tone="violet"
        >
          <DeltaBadge delta={stats.examDelta} />
        </StatCard>

        {/* Onlayn imtahan */}
        <StatCard
          icon={Radio}
          label="Onlayn imtahan indi"
          value={formatNumber(stats.liveCount)}
          hint="hal-hazırda açıq imtahan"
          tone="emerald"
        >
          {stats.liveCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-emerald-700">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              CANLI
            </span>
          ) : null}
        </StatCard>

        {/* Bu gün cəhd */}
        <StatCard
          icon={CheckCircle2}
          label="Bu gün cəhd"
          value={formatNumber(stats.todayAttempts)}
          hint="bugün tamamlanan cəhd"
          tone="sky"
        />

        {/* Təsdiqli sual */}
        <StatCard
          icon={FileQuestion}
          label="Təsdiqli sual"
          value={formatNumber(stats.verifiedQuestions)}
          hint={`gözləyən ${formatNumber(stats.pendingCount)}`}
          tone="amber"
        />

        {/* Bilet (30 gün) */}
        <StatCard
          icon={Ticket}
          label="Bilet (30 gün)"
          value={`₼ ${formatNumber(stats.revenue30)}`}
          hint={`${formatNumber(stats.tickets30)} bilet satılıb`}
          tone="orange"
        />

        {/* Aktiv müəllim */}
        <StatCard
          icon={Users}
          label="Aktiv müəllim"
          value={formatNumber(stats.activeCoordinators)}
          hint="aktiv koordinator"
          tone="slate"
        />
      </section>

      {/* ===== Qrafik + xülasə ===== */}
      <Card className="gap-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-[#4a1c2c]" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Son 30 gün</h2>
              <p className="text-xs text-slate-400">
                gündəlik cəhd, bilet və yeni sual
              </p>
            </div>
          </div>
          <span className="hidden text-xs text-slate-400 sm:block">
            {formatNumber(chartTotals.attempts)} cəhd ·{" "}
            {formatNumber(chartTotals.tickets)} bilet ·{" "}
            {formatNumber(chartTotals.questions)} sual
          </span>
        </CardHeader>

        <CardContent className="px-6 py-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_190px]">
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                  barCategoryGap="12%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    interval={2}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={34}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    content={(props) => <ChartTooltip {...props} />}
                  />
                  <Bar
                    dataKey="attempts"
                    name="Cəhd"
                    fill={SERIES.attempts.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="tickets"
                    name="Bilet"
                    fill={SERIES.tickets.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="questions"
                    name="Sual"
                    fill={SERIES.questions.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Xülasə */}
            <div className="flex flex-col justify-center gap-3 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <SummaryRow
                color={SERIES.attempts.color}
                label="Cəhd"
                value={formatNumber(chartTotals.attempts)}
                hint="tamamlanan imtahan"
              />
              <SummaryRow
                color={SERIES.tickets.color}
                label="Bilet"
                value={formatNumber(chartTotals.tickets)}
                hint="satılan bilet"
              />
              <SummaryRow
                color={SERIES.questions.color}
                label="Sual"
                value={formatNumber(chartTotals.questions)}
                hint="yeni sual"
              />
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                cəhd {formatNumber(chartTotals.attempts)} · bilet{" "}
                {formatNumber(chartTotals.tickets)} · sual{" "}
                {formatNumber(chartTotals.questions)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Diqqət tələb edir ===== */}
      <Card className="gap-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Diqqət tələb edir
            </h2>
            {attention.length > 0 && (
              <Badge variant="warning">{attention.length}</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-6 py-5">
          {attention.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              Hər şey qaydasındadır. Gözləyən təsdiq, yoxlama və ya xəta yoxdur.
            </div>
          ) : (
            <ul className="space-y-4">
              {attention.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      item.kind === "approval" && "bg-amber-100 text-amber-700",
                      item.kind === "check" && "bg-sky-100 text-sky-700",
                      item.kind === "error" && "bg-red-100 text-red-700",
                    )}
                  >
                    {item.kind === "error" ? (
                      <TriangleAlert className="size-4" />
                    ) : item.kind === "check" ? (
                      <ClipboardList className="size-4" />
                    ) : (
                      <FileQuestion className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#4a1c2c] hover:underline underline-offset-4"
                      >
                        Yoxla
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>

                    {item.questions && item.questions.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5">
                        {item.questions.slice(0, 4).map((q) => (
                          <li
                            key={q.id}
                            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
                          >
                            {q.subject && (
                              <Badge variant="secondary" className="shrink-0">
                                {q.subject}
                              </Badge>
                            )}
                            <span className="truncate text-xs text-slate-700">
                              {q.text}
                            </span>
                          </li>
                        ))}
                        {item.questions.length > 4 && (
                          <li className="px-3 text-xs text-slate-400">
                            + {item.questions.length - 4} sual daha
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ===== Son imtahanlar ===== */}
      <Card className="gap-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-[#4a1c2c]" />
            <h2 className="text-sm font-semibold text-slate-900">Son imtahanlar</h2>
          </div>
          <Link
            href="/account/exams"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#4a1c2c] hover:underline underline-offset-4"
          >
            Bütün imtahanlar
            <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="px-0 py-0">
          {recentExams.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
              Hələ imtahan yaradılmayıb.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-6 py-3.5 font-medium">Bilet</th>
                    <th className="px-4 py-3.5 font-medium">Vəziyyət</th>
                    <th className="px-4 py-3.5 font-medium">Vaxt</th>
                    <th className="px-4 py-3.5 font-medium">Başlayan/Bitirən</th>
                    <th className="px-4 py-3.5 font-medium">İmtahan adı</th>
                    <th className="px-4 py-3.5 font-medium">Şirkət</th>
                    <th className="px-4 py-3.5 font-medium">Tarix</th>
                    <th className="px-6 py-3.5 text-right font-medium">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExams.map(({ exam, status, started, finished }) => (
                    <tr key={exam.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs font-medium whitespace-nowrap text-slate-700">
                        {exam.ticketCodes[0] ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600">
                        {formatRange(exam.startsAt, exam.endsAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-700 tabular-nums">
                        {started} / {finished}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/account/exams/${exam.id}`}
                          className="font-medium text-slate-900 hover:text-[#4a1c2c] hover:underline underline-offset-4"
                        >
                          {exam.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {exam.subject} · {exam.questions.length} sual ·{" "}
                          {exam.durationMin} dəq
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                        {COMPANY_NAME}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(exam.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Alt komponentlər                                                          */
/* -------------------------------------------------------------------------- */

const TONES = {
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  slate: "bg-slate-100 text-slate-600",
} as const;

type Tone = keyof typeof TONES;

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: Tone;
  children?: ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-h-[30px] text-xs font-medium leading-tight text-slate-500">
            {label}
          </p>
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              TONES[tone],
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {children}
        </div>

        <p className="mt-1 truncate text-[11px] text-slate-400">{hint}</p>
      </CardContent>
    </Card>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
        <TrendingUp className="size-3" />+{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
        <TrendingDown className="size-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
      0
    </span>
  );
}

function SummaryRow({
  color,
  label,
  value,
  hint,
}: {
  color: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        <p className="truncate text-[11px] text-slate-400">{hint}</p>
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "planned" | "active" | "ended" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Canlı
      </span>
    );
  }
  if (status === "planned") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Gözləmədə
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      Bitib
    </span>
  );
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{point.full}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-2 text-xs text-slate-600"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            {row.label}
            <span className="ml-auto font-semibold text-slate-900">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
