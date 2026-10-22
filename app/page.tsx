"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import {
  findResultByParticipant,
  getExams,
  getExam,
  initStore,
  startExamSession,
} from "@/lib/store";
import { examStatus, normalizeFin, normalizeTicket } from "@/lib/helpers";
import type { Exam } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Validasiya                                                                 */
/* -------------------------------------------------------------------------- */

const schema = z.object({
  examId: z.string().min(1, "İmtahan seçin."),
  fin: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{7}$/, "FİN 7 simvol olmalıdır (hərf və ya rəqəm)."),
  ticket: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Bilet kodu XXXX-XXXX formatında olmalıdır."),
});

type FormValues = z.infer<typeof schema>;

/* -------------------------------------------------------------------------- */

export default function ExamEntryPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [online, setOnline] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resultHref, setResultHref] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { examId: "", fin: "", ticket: "" },
  });

  const examId = useWatch({ control, name: "examId" });
  const fin = useWatch({ control, name: "fin" });
  const ticket = useWatch({ control, name: "ticket" });

  /* --- Aktiv imtahanlar: 1-dirsə seçim addımı yoxdur --- */
  useEffect(() => {
    const t = setTimeout(() => {
      initStore();
      const active = getExams().filter((e) => e.onlineEnabled && e.questions.length > 0 && examStatus(e) === "active");
      setExams(active);
      if (active.length === 1) {
        setValue("examId", active[0].id, { shouldValidate: false });
      }
    }, 0);
    return () => clearTimeout(t);
  }, [setValue]);

  /* --- İnternet / brauzer yoxlaması --- */
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const needsExamChoice = useMemo(
    () => (exams?.length ?? 0) > 1,
    [exams],
  );

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setResultHref(null);

    try {
    const exam = getExam(values.examId);
    if (!exam?.onlineEnabled || !exam.questions.length) {
      setServerError("İmtahan tapılmadı.");
      return;
    }

    const status = examStatus(exam);
    if (status === "planned") {
      setServerError("İmtahan hələ başlamayıb.");
      return;
    }
    if (status === "ended") {
      setServerError("İmtahan bitib.");
      return;
    }

    const finNorm = normalizeFin(values.fin);
    const ticketNorm = normalizeTicket(values.ticket);

    if (
      exam.ticketCodes.length > 0 &&
      !exam.ticketCodes.some((c) => c.toUpperCase() === ticketNorm)
    ) {
      setServerError("Bu bilet kodu bu imtahan üçün qeyd olunmayıb.");
      return;
    }

    const existing = findResultByParticipant(exam.id, finNorm);
    if (existing) {
      setServerError("Bu FİN kodu ilə imtahan artıq yekunlaşdırılıb.");
      setResultHref(`/online-exam/result?rid=${existing.id}`);
      return;
    }

      startExamSession(exam.id, finNorm, ticketNorm);
      router.push("/online-exam");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "İmtahana giriş saxlanılmadı. Yenidən cəhd edin.");
    }
  });

  /* --- FİN: avtomatik böyük hərf, 7 simvol --- */
  const onFinChange = (value: string) =>
    setValue("fin", value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7), {
      shouldValidate: true,
    });

  /* --- Bilet: XXXX-XXXX maska + paste dəstəyi --- */
  const onTicketChange = (value: string) => {
    const pasted = normalizeTicket(value);
    setValue("ticket", pasted, { shouldValidate: true });
  };

  return (
    <div className="student-portal min-h-[100dvh]">
      <header className="portal-header">
        <Link href="/" className="brand-lockup" aria-label="Hilal Kursları — ana səhifə">
          <Image src="/hilal-original.png" alt="Hilal Kursları" width={48} height={48} priority />
          <span><strong>Hilal Kursları</strong><small>Kitabça sistemi</small></span>
        </Link>
        <nav aria-label="Əsas naviqasiya" className="flex items-center gap-5 text-xs font-medium text-neutral-600">
          <a href="#qaydalar" className="hidden hover:text-brand-700 sm:block">İmtahan qaydaları</a>
          <a href="mailto:destek@hilalkurslari.az" className="hidden hover:text-brand-700 md:block">Kömək mərkəzi</a>
          <Button asChild variant="secondary" size="sm"><Link href="/admin/login">Panel girişi <ArrowRight className="size-3.5" /></Link></Button>
        </nav>
      </header>

      <main id="main-content" className="portal-grid">
        <section className="portal-intro" aria-labelledby="portal-title">
          <p className="eyebrow">Hilal Kursları <span className="mx-2 text-brand-300">/</span> Şagird portalı</p>
          <h1 id="portal-title">Biliklərini sına,<br /><span>uğurunu göstər.</span></h1>
          <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-neutral-600">Onlayn imtahanına rahat və aydın şəkildə qoşul. Başlamaq üçün cəmi 3 addım.</p>
          <div id="qaydalar" className="portal-steps scroll-mt-8">
            <h2 className="font-semibold text-neutral-900">İmtahana giriş</h2>
            <p className="mt-1 text-xs text-neutral-500">Məlumatlarını hazırla və davam et.</p>
            <ol className="mt-5 space-y-5">
              {[['İmtahanı seç', 'Açıq olan imtahanlardan iştirak edəcəyini seç.'], ['FİN kodunu yaz', 'Şəxsiyyət vəsiqəndəki 7 simvollu kodu daxil et.'], ['Bilet kodunu daxil et', 'Biletindəki kodu yaz və imtahana başla.']].map(([title, description], index) => (
                <li key={title} className="flex gap-3"><span className="step-number">0{index + 1}</span><div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-neutral-500">{description}</p></div></li>
              ))}
            </ol>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200/80 bg-white/80 p-4 text-xs text-neutral-600">
            <ShieldCheck className="size-5 shrink-0 text-success" /><span>FİN və bilet kodu ilə giriş<br /><span className="text-neutral-500">Məlumatlarını yoxla, imtahana hazır ol.</span></span>
          </div>
        </section>

        <section className="entry-card" aria-labelledby="entry-title">
          <div className="flex justify-center"><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-semibold tracking-wide text-brand-700"><span className="size-1.5 rounded-full bg-success" />ONLAYN İMTAHAN</span></div>
          <Image src="/hilal-original.png" alt="Hilal Kursları" width={72} height={72} priority className="mx-auto mt-5" />
          <h2 id="entry-title" className="mt-4 text-center text-lg font-semibold">İmtahana xoş gəlmisən!</h2>
          <p className="mt-1 text-center text-xs text-neutral-500">Məlumatlarını daxil et və imtahana başla.</p>
          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
            {/* İmtahan seçimi — yalnız 1-dən çox aktiv imtahan varsa */}
            {needsExamChoice && (
              <Field
                label="İmtahan"
                htmlFor="exam"
                error={errors.examId?.message}
                hint="Hazırda açıq olan imtahanlardan birini seçin."
              >
                <select
                  id="exam"
                  value={examId}
                  onChange={(e) =>
                    setValue("examId", e.target.value, { shouldValidate: true })
                  }
                  className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-xs outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
                >
                  <option value="">İmtahan seçin</option>
                  {(exams ?? []).map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} · {exam.durationMin} dəq
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* FİN */}
            <Field
              label="FİN kod"
              htmlFor="fin"
              required
              error={errors.fin?.message}
              hint="Şəxsiyyət vəsiqənizdəki 7 simvollu kod (hərf və rəqəm)."
            >
              <Input
                id="fin"
                autoComplete="off"
                inputMode="text"
                maxLength={7}
                placeholder="AB12CD3"
                aria-invalid={Boolean(errors.fin)}
                aria-describedby={errors.fin ? "fin-error" : "fin-hint"}
                value={fin}
                onChange={(e) => onFinChange(e.target.value)}
                className="h-11 text-base"
              />
            </Field>

            {/* Bilet kodu */}
            <Field
              label="Bilet kodu"
              htmlFor="ticket"
              required
              error={errors.ticket?.message}
              hint="Kartonuzun üzərindəki XXXX-XXXX kodunu daxil edin."
            >
              <Input
                id="ticket"
                autoComplete="off"
                inputMode="text"
                maxLength={9}
                placeholder="A1B2-C3D4"
                aria-invalid={Boolean(errors.ticket)}
                aria-describedby={errors.ticket ? "ticket-error" : "ticket-hint"}
                value={ticket}
                onChange={(e) => onTicketChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  onTicketChange(e.clipboardData.getData("text"));
                }}
                className="h-11 text-base"
              />
            </Field>

            {/* Server xətaları */}
            {serverError && (
              <div
                role="alert"
                className="rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-fg"
              >
                {serverError}{" "}
                {resultHref && (
                  <Link
                    href={resultHref}
                    className="font-medium underline underline-offset-2"
                  >
                    Nəticəyə bax
                  </Link>
                )}
              </div>
            )}

            {/* İmtahan yoxdur */}
            {exams !== null && exams.length === 0 && (
              <div className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
                Hazırda açıq imtahan yoxdur. Yeni imtahan başladıqda bu səhifə
                yenilənir.
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={exams === null || exams.length === 0}
              className="h-11 w-full"
            >
              İmtahana başla
              <ArrowRight />
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-neutral-500" aria-live="polite">
            {online ? <Wifi className="size-3.5 text-success" /> : <WifiOff className="size-3.5 text-danger" />}
            {online ? "İnternet qoşuludur" : "İnternet yoxdur"}
          </div>
          {process.env.NODE_ENV !== "production" && <div className="mt-4"><BadgeDemo /><p className="mt-2 text-xs text-neutral-500">Demo məlumatlar bu brauzerdə saxlanılır.</p></div>}
        </section>

        <aside className="portal-notes" aria-label="İmtahan haqqında">
          <div className="portal-note"><p className="eyebrow">Öyrən. Yoxla. İrəlilə.</p><h2 className="mt-3 text-lg font-semibold">Kitabça sistemi</h2><p className="mt-2 text-sm text-neutral-500">Biliklərini yoxlamaq və nəticəni görmək üçün aydın bir başlanğıc.</p><div className="mt-5 rounded-md bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">Sadə giriş · Rahat istifadə · Aydın nəticə</div></div>
          <div className="portal-note"><div className="flex items-center gap-3"><span className="note-icon"><Clock3 className="size-5" /></span><h3 className="text-sm font-semibold">Vaxtını düzgün böl</h3></div><p className="mt-3 text-xs leading-relaxed text-neutral-500">İmtahan vaxtı bitdikdə cavablar avtomatik yekunlaşdırılır.</p></div>
          <div className="portal-note"><div className="flex items-center gap-3"><span className="note-icon sage"><CheckCircle2 className="size-5" /></span><h3 className="text-sm font-semibold">Nəticəni dərhal gör</h3></div><p className="mt-3 text-xs leading-relaxed text-neutral-500">İmtahanı bitirdikdən sonra nəticə səhifəsinə keçəcəksən.</p></div>
          <a href="mailto:destek@hilalkurslari.az" className="portal-support"><BookOpen className="size-5 shrink-0" /><span><strong className="block text-sm">Köməyə ehtiyacın var?</strong><span className="text-xs">Dəstək komandası ilə əlaqə saxla.</span></span><ArrowRight className="ml-auto size-4 shrink-0" /></a>
        </aside>
      </main>
      <footer className="portal-footer"><div><strong className="text-xs font-semibold text-brand-700">HİLAL KURSLARI</strong><p className="mt-1 text-xs text-neutral-500">Bilik, inkişaf və gələcəyə inam.</p></div><a href="mailto:destek@hilalkurslari.az" className="text-xs text-neutral-500 hover:text-brand-700">Dəstək ilə əlaqə</a></footer>
    </div>
  );
}

function BadgeDemo() {
  return (
    <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-medium text-gold-700">
      Demo mühit
    </span>
  );
}
