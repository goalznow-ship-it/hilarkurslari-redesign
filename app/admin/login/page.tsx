"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";
import { request } from "@/lib/backend-store";
import type { User } from "@/lib/types";

const schema = z.object({
  username: z.string().trim().min(1, "İstifadəçi adını yazın."),
  password: z.string().min(1, "Şifrəni yazın."),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { username: "", password: "" },
  });

  // Artıq girişli istifadəçi birbaşa panele yönləndirilir
  useEffect(() => {
    void request<{user:User}>("/api/auth/me").then(({user})=>{if(user) router.replace(user.role === "seller" ? "/account/seller-sales" : "/account");}).catch(()=>{});
  }, [router]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await request<{success:boolean;user?:User;error?:string}>("/api/auth/login", "POST", {email:values.username.trim(),password:values.password});
      if (result.success && result.user) {
        router.push(result.user.role === "seller" ? "/account/seller-sales" : "/account");
        return;
      }
      setError(result.error ?? "İstifadəçi adı və ya şifrə yanlışdır.");
    } catch(error) {
      setError(error instanceof Error?error.message:"Giriş yadda saxlanılmadı. Yenidən cəhd edin.");
    }
  });

  return (
    <div className="flex min-h-[100dvh] flex-col student-portal">
      <header className="px-5 py-6 sm:px-8">
        <Link href="/" className="inline-block">
          <Image
            src="/hilal-original.png"
            alt="Hilal Kursları"
            width={64}
            height={64}
            priority
            className="size-16"
          />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <ShieldCheck className="size-4.5" />
              </span>
              <div>
                <h1 className="text-base font-semibold text-neutral-900">
                  Əməkdaş girişi
                </h1>
                <p className="text-xs text-neutral-500">
                  İmtahanları idarə etmək üçün daxil olun.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <Field
                label="İstifadəçi adı"
                htmlFor="username"
                error={errors.username?.message}
              >
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="admin"
                  aria-invalid={Boolean(errors.username)}
                  {...register("username")}
                />
              </Field>

              <Field
                label="Şifrə"
                htmlFor="password"
                error={errors.password?.message}
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger-fg"
                >
                  {error}
                </p>
              )}

              <Button type="submit" loading={isSubmitting} className="w-full">
                <Lock />
                Daxil ol
              </Button>
            </form>
          </div>


          <Link
            href="/"
            className="mt-6 flex items-center justify-center gap-1.5 text-xs text-neutral-500 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Tələbə girişinə qayıt
          </Link>
        </div>
      </main>
    </div>
  );
}
