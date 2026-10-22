"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserCog, Users, Plus, Edit, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createUser, deleteUser, getCurrentUser, getCompanies, getExams, getUsers, updateUser } from "@/lib/store";
import { examStatus } from "@/lib/helpers";
import type { User, UserRole, Exam } from "@/lib/types";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  coordinator: "Koordinator",
  teacher: "Müəllim",
  seller: "Satıcı",
};

const schema = z.object({
  name: z.string().trim().min(1, "Ad soyad yazın."),
  email: z.string().email("Düzgün e-poçt yazın."),
  role: z.enum(["admin", "coordinator", "teacher", "seller"]),
  active: z.boolean(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  companyId: z.string().optional(),
  sellerExamIds: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Şifrələr uyğun gəlmir.",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<import("@/lib/types").Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [authorized, setAuthorized] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [localSellerExamIds, setLocalSellerExamIds] = useState<string[]>([]);

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      role: "seller",
      active: true,
      password: "",
      confirmPassword: "",
      companyId: "",
      sellerExamIds: [],
    },
  });

  const watchedRole = useWatch({ control, name: "role" });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace("/admin/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace(user.role === "seller" ? "/account/seller-sales" : "/account");
      return;
    }
    const t = setTimeout(() => {
      setUsers(getUsers());
      setCompanies(getCompanies());
      setExams(getExams());
      setAuthorized(true);
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [users],
  );

  const openCreateDialog = () => {
    setEditingUser(null);
    setLocalSellerExamIds([]);
    reset({
      name: "",
      email: "",
      role: "seller",
      active: true,
      password: "",
      confirmPassword: "",
      companyId: "",
      sellerExamIds: [],
    });
    setSubmitError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setLocalSellerExamIds(user.sellerExamIds ?? []);
    reset({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      password: "",
      confirmPassword: "",
      companyId: user.companyId ?? "",
      sellerExamIds: user.sellerExamIds ?? [],
    });
    setSubmitError(null);
    setDialogOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const userData = {
      name: values.name,
      email: values.email,
      role: values.role,
      active: values.active,
      companyId: values.companyId || undefined,
      sellerExamIds: values.role === "seller" ? values.sellerExamIds : [],
    };

    try {
      const result = editingUser
        ? await updateUser({ ...editingUser, ...userData }, values.password)
        : await createUser({ ...userData, password: values.password || "hilal123" });

      if (!result.success) {
        setSubmitError(result.error ?? "Xəta baş verdi.");
        return;
      }

      setUsers(getUsers());
      setDialogOpen(false);
    } catch {
      setSubmitError("Dəyişikliklər yadda saxlanılmadı. Yenidən cəhd edin.");
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Bu istifadəçini silmək istədiyinizə əminsiniz?")) return;
    try {
      const result = deleteUser(id);
      if (!result.success) {
        alert(result.error ?? "Silinmə zaman xəta baş verdi.");
        return;
      }
      setUsers(getUsers());
    } catch {
      alert("İstifadəçi silinmədi. Yenidən cəhd edin.");
    }
  };

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">İstifadəçilər</h1>
          <p className="mt-1 text-sm text-neutral-500">
            İmtahanları idarə edən administrator, koordinator, müəllim və satıcı
            hesabları.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 shadow-sm">
            <Users className="size-4 text-brand-700" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
              {users.filter((u) => u.active).length} aktiv
            </span>
          </div>
            <Button onClick={openCreateDialog}>
              <Plus className="size-4 mr-2" />
              Yeni istifadəçi
            </Button>
        </div>
      </div>

      {/* Users List */}
      <Card className="gap-0 rounded-xl border-neutral-200 bg-white py-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-neutral-100 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <UserCog className="size-4 text-brand-700" />
            <h2 className="text-sm font-semibold text-neutral-900">
              Hesab siyahısı
            </h2>
          </div>
        </CardHeader>

        <CardContent className="px-0 py-0">
          {sorted.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-neutral-500">
              Hələ istifadəçi hesabı yoxdur.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {sorted.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 hover:bg-neutral-50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-700/10 text-xs font-bold text-brand-700">
                    {user.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {user.email}
                    </p>
                  </div>

                  <Badge variant={user.role === "admin" ? "default" : "neutral"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>

                  <span
                    className={
                      user.active
                        ? "inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
                        : "inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400"
                    }
                  >
                    <span
                      className={
                        user.active
                          ? "size-1.5 rounded-full bg-emerald-500"
                          : "size-1.5 rounded-full bg-neutral-300"
                      }
                    />
                    {user.active ? "Aktiv" : "Deaktiv"}
                  </span>

                  {user.role === "admin" && (
                    <ShieldCheck className="size-4 shrink-0 text-neutral-300" />
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Edit className="size-4" />
                      </Button>
                    {user.id !== "u-admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger/80"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "İstifadəçi redaktə et" : "Yeni istifadəçi"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "İstifadəçi məlumatlarını yeniləyin."
                : "Yeni istifadəçi hesabı yaradın."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {submitError && (
              <div
                role="alert"
                className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger-fg"
              >
                {submitError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Ad soyad *</Label>
              <Input
                id="name"
                placeholder="Ad Soyad"
                {...register("name")}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p className="text-sm text-danger-fg" role="alert">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-poçt *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@domain.com"
                {...register("email")}
                disabled={!!editingUser}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && (
                <p className="text-sm text-danger-fg" role="alert">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={watchedRole}
                onValueChange={(v) => setValue("role", v as UserRole, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="coordinator">Koordinator</SelectItem>
                  <SelectItem value="teacher">Müəllim</SelectItem>
                  <SelectItem value="seller">Satıcı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="active">Status</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="active"
                  type="checkbox"
                  {...register("active")}
                />
                <Label htmlFor="active" className="mb-0 cursor-pointer">
                  Aktiv
                </Label>
              </div>
            </div>

            <div className="space-y-2"><Label htmlFor="user-company">Şirkət</Label><select id="user-company" {...register("companyId")} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">Təyin edilməyib</option>{companies.filter((company) => company.active || company.id === editingUser?.companyId).map((company) => <option key={company.id} value={company.id}>{company.name}{company.active ? "" : " (arxiv)"}</option>)}</select></div>
            {/* Seller-specific fields */}
            {watchedRole === "seller" && (
              <div className="space-y-2">
                <Label>Satış yetkisi veriləcək imtahanlar</Label>
                <div className="max-h-48 overflow-y-auto rounded-md border border-neutral-200 bg-white p-3 space-y-2">
                  {exams
                    .filter((e) => e.onlineEnabled && examStatus(e) === "active")
                    .map((exam) => (
                      <label
                        key={exam.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                      >
                        <Input
                          type="checkbox"
                          value={exam.id}
                          checked={localSellerExamIds.includes(exam.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLocalSellerExamIds((prev) => [...prev, exam.id]);
                              setValue("sellerExamIds", [...localSellerExamIds, exam.id], { shouldValidate: true });
                            } else {
                              setLocalSellerExamIds((prev) => prev.filter((id) => id !== exam.id));
                              setValue("sellerExamIds", localSellerExamIds.filter((id) => id !== exam.id), { shouldValidate: true });
                            }
                          }}
                        />
                        <span className="truncate">{exam.title} ({exam.code ?? exam.id})</span>
                      </label>
                    ))}
                  {exams.filter((e) => e.onlineEnabled && examStatus(e) === "active").length === 0 && (
                    <p className="text-sm text-neutral-500">Hazırda aktiv onlayn imtahan yoxdur.</p>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  Boş qoyulursa, satıcı bütün aktiv onlayn imtahanlar üçün bilet satışa bilər.
                </p>
              </div>
            )}

            {/* Password fields */}
            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? "Yeni şifrə (boş = dəyişməsin)" : "Şifrə *"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={editingUser ? "Boş qoyun" : "Minimum 6 simvol"}
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && (
                <p className="text-sm text-danger-fg" role="alert">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifrəni təsdiqlə *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Şifrəni təkrar yazın"
                {...register("confirmPassword")}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-danger-fg" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                Ləğv et
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editingUser ? "Yadda saxla" : "Yarat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
