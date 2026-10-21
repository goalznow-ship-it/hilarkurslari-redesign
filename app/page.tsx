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
      const active = getExams().filter((e) => examStatus(e) === "active");
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

    const exam = exams?.find((e) => e.id === values.examId);
    if (!exam) {
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
    <div className="min-h-[100dvh] bg-neutral-50 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ===== Brend paneli (desktop) ===== */}
      <aside className="hidden flex-col justify-between bg-brand-800 p-12 text-white lg:flex">
        <div>
          <Image
            src="/hilal-logo.png"
            alt="Hilal Kursları"
            width={768}
            height={240}
            priority
            className="h-auto w-[220px]"
          />
        </div>

        <div className="max-w-md">
          <h1 className="text-xl font-semibold text-white">
            Onlayn imtahan platforması
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-100/90">
            Kitabça imtahanları bir yerə toplanır: tələbələr FİN və bilet
            kodu ilə daxil olur, cavablar dərhal yoxlanılır, nəticələr isə
            dərhesab yığılır.
          </p>

          <ul className="mt-8 space-y-4 text-sm text-brand-100/90">
            <li className="flex gap-3">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-gold-300" />
              Vaxt bitəndə cavablar avtomatik yekunlaşdırılır.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-300" />
              Bütün cavablar cihazınızda, təhlükəsiz şəkildə saxlanılır.
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-300" />
              Nəticənizi dərhal görür və təsdiq linki ilə paylaşırsınız.
            </li>
          </ul>
        </div>

        <p className="text-sm font-medium text-gold-300">Uğurlar!</p>
      </aside>

      {/* ===== Forma ===== */}
      <main className="flex min-h-[100dvh] flex-col justify-center px-5 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          {/* Mobil brend */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Image
              src="/hilal-logo.png"
              alt="Hilal Kursları"
              width={768}
              height={240}
              priority
              className="h-auto w-[150px]"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">
                İmtahana giriş
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                FİN və bilet kodunuzu daxil edin.
              </p>
            </div>
            {process.env.NODE_ENV !== "production" && (
              <BadgeDemo />
            )}
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
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
                aria-describedby={errors.fin ? "fin-error" : undefined}
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
                aria-describedby={errors.ticket ? "ticket-error" : undefined}
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
              Daxil ol
              <ArrowRight />
            </Button>
          </form>

          {/* Alt məlumat */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link
              href="/admin/login"
              className="text-neutral-500 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
            >
              Əməkdaş girişi
            </Link>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-neutral-500">
                {online ? (
                  <Wifi className="size-3.5 text-success" />
                ) : (
                  <WifiOff className="size-3.5 text-danger" />
                )}
                {online ? "İnternet qoşuludur" : "İnternet yoxdur"}
              </span>
              <a
                href="mailto:destek@hilalkurslari.az"
                className="text-neutral-500 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
              >
                Kod işləmir? Dəstək
              </a>
            </div>
          </div>

          {/* Əməkdaş qeydi (yalnız demo mühitdə) */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mt-8 flex items-start gap-2.5 rounded-md border border-neutral-200 bg-white px-3.5 py-3 text-xs text-neutral-500">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-neutral-400" />
              <p className="leading-relaxed">
                Bu demo məlumatlar brauzerin yaddaşında saxlanılır və yalnız bu
                cihazda görünür. İmtahan bitəndə nəticəniz ekranda göstərilir.
              </p>
            </div>
          )}
        </div>
      </main>
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
