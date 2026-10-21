"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentAcademicYear } from "@/lib/helpers";
import { deleteClass, getClasses, getSession, saveClass } from "@/lib/store";
import type { SchoolClass } from "@/lib/types";

const GRADES = [
  "V sinif",
  "VI sinif",
  "VII sinif",
  "VIII sinif",
  "IX sinif",
  "X sinif",
  "XI sinif",
];

type FormState = {
  name: string;
  grade: string;
  section: string;
  teacher: string;
  studentCount: string;
  academicYear: string;
};

function blankForm(): FormState {
  return {
    name: "",
    grade: GRADES[4],
    section: "",
    teacher: "",
    studentCount: "0",
    academicYear: currentAcademicYear(),
  };
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());

  useEffect(() => {
    if (!getSession()) {
      router.replace("/account/login");
      return;
    }
    const t = setTimeout(() => setClasses(getClasses()), 0);
    return () => clearTimeout(t);
  }, [router]);

  const reload = () => setClasses(getClasses());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.teacher.toLowerCase().includes(q) ||
        (c.section ?? "").toLowerCase().includes(q),
    );
  }, [classes, search]);

  const stats = useMemo(() => {
    const totalStudents = classes.reduce((acc, c) => acc + c.studentCount, 0);
    const teachers = new Set(
      classes.map((c) => c.teacher.trim().toLowerCase()).filter(Boolean),
    ).size;
    const years = new Set(
      classes.map((c) => c.academicYear).filter(Boolean),
    ).size;
    return {
      totalClasses: classes.length,
      totalStudents,
      teachers,
      years,
      activeYear: currentAcademicYear(),
    };
  }, [classes]);

  const openNew = () => {
    setEditing(null);
    setForm(blankForm());
    setDialogOpen(true);
  };

  const openEdit = (c: SchoolClass) => {
    setEditing(c);
    setForm({
      name: c.name,
      grade: c.grade,
      section: c.section ?? "",
      teacher: c.teacher,
      studentCount: String(c.studentCount),
      academicYear: c.academicYear || currentAcademicYear(),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.teacher.trim()) return;

    const schoolClass: SchoolClass = {
      id: editing?.id ?? `class-${Date.now()}`,
      name: form.name.trim(),
      grade: form.grade,
      section: form.section.trim(),
      teacher: form.teacher.trim(),
      studentCount: Math.max(0, parseInt(form.studentCount, 10) || 0),
      academicYear: form.academicYear.trim() || currentAcademicYear(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };

    saveClass(schoolClass);
    reload();
    setDialogOpen(false);
  };

  const handleDelete = (c: SchoolClass) => {
    if (
      window.confirm(
        `"${c.name}" sinifi silinəcək. Davam edilsin?`,
      )
    ) {
      deleteClass(c.id);
      reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Siniflər &amp; Qruplar
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Siniflər, şöbələr və hazırlıq qruplarını idarə edin — müəllim və
            şagird sayı ilə.
          </p>
        </div>

        <Button
          onClick={openNew}
          className="gap-1.5 bg-[#4a1c2c] text-white hover:bg-[#381420]"
        >
          <Plus className="size-4" />
          Yeni sinif
        </Button>
      </div>

      {/* ===== Stat kartları ===== */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Cəmi sinif"
          value={String(stats.totalClasses)}
          hint="qruplar daxil"
          tone="violet"
        />
        <StatCard
          icon={Users}
          label="Cəmi şagird"
          value={String(stats.totalStudents)}
          hint="bütün siniflər"
          tone="sky"
        />
        <StatCard
          icon={GraduationCap}
          label="Aktiv tədris ili"
          value={stats.activeYear}
          hint={`${stats.years} il məlumatı`}
          tone="emerald"
        />
        <StatCard
          icon={UserRound}
          label="Müəllim sayı"
          value={String(stats.teachers)}
          hint="unikal sinif rəhbəri"
          tone="amber"
        />
      </section>

      {/* ===== Axtarış ===== */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="size-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">Axtarış:</span>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sinif adı, şöbə və ya müəllim..."
          aria-label="Sinif axtar"
          className="h-8 w-full max-w-xs border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch("")}
            className="ml-auto text-xs text-slate-500"
          >
            Axtarışı təmizlə
          </Button>
        )}
      </div>

      {/* ===== Cədvəl ===== */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
            <Layers className="size-6 text-slate-400" />
          </span>
          <p className="text-sm font-medium text-slate-700">
            {classes.length === 0
              ? "Hələ sinif yoxdur"
              : "Axtarışa uyğun sinif tapılmadı"}
          </p>
          {classes.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              İlk sinifi yaratmaq üçün “Yeni sinif” düyməsindən istifadə edin.
            </p>
          )}
          {classes.length === 0 && (
            <Button
              onClick={openNew}
              className="mt-5 gap-1.5 bg-[#4a1c2c] text-white hover:bg-[#381420]"
            >
              <Plus className="size-4" />
              Yeni sinif
            </Button>
          )}
        </div>
      ) : (
        <Card className="gap-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm">
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="px-6 py-3.5 font-medium">Sinif</th>
                    <th className="px-4 py-3.5 font-medium">Sinif</th>
                    <th className="px-4 py-3.5 font-medium">Müəllim</th>
                    <th className="px-4 py-3.5 font-medium">Şagird sayı</th>
                    <th className="px-4 py-3.5 font-medium">Tədris ili</th>
                    <th className="px-6 py-3.5 text-right font-medium">
                      Əməliyyat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        {c.section && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            Şöbə: {c.section}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="secondary">{c.grade}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{c.teacher}</td>
                      <td className="px-4 py-4 text-slate-700 tabular-nums">
                        {c.studentCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                        {c.academicYear}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(c)}
                            title="Redaktə et"
                            aria-label={`${c.name} sinifini redaktə et`}
                            className="text-slate-400 hover:text-[#4a1c2c]"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c)}
                            title="Sil"
                            aria-label={`${c.name} sinifini sil`}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Yeni / Redaktə sinif Dialogu ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sinifi redaktə et" : "Yeni sinif"}
            </DialogTitle>
            <DialogDescription>
              Sinif adı, sınıf, şöbə, müəllim və şagird sayını daxil edin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="c-name">Sinif adı</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Məs: 9A"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-grade">Sinif</Label>
                <Select
                  value={form.grade}
                  onValueChange={(v) => setForm((f) => ({ ...f, grade: v }))}
                >
                  <SelectTrigger id="c-grade">
                    <SelectValue placeholder="Sinif" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="c-section">Şöbə / blok</Label>
                <Input
                  id="c-section"
                  value={form.section}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, section: e.target.value }))
                  }
                  placeholder="Məs: A və ya Blok 1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-teacher">Müəllim / sinif rəhbəri</Label>
                <Input
                  id="c-teacher"
                  value={form.teacher}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, teacher: e.target.value }))
                  }
                  placeholder="Məs: A. Məmmədova"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="c-count">Şagird sayı</Label>
                <Input
                  id="c-count"
                  type="number"
                  min={0}
                  max={999}
                  value={form.studentCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, studentCount: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-year">Tədris ili</Label>
                <Input
                  id="c-year"
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, academicYear: e.target.value }))
                  }
                  placeholder="Məs: 2026-2027"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Ləğv et
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim() || !form.teacher.trim()}
              className="bg-[#4a1c2c] text-white hover:bg-[#381420]"
            >
              Yadda Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Alt komponentlər                                                          */
/* -------------------------------------------------------------------------- */

const TONES = {
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
} as const;

type Tone = keyof typeof TONES;

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}) {
  return (
    <Card className="gap-0 rounded-xl border-slate-200 bg-white py-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-h-[30px] text-xs font-medium leading-tight text-slate-500">
            {label}
          </p>
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] text-slate-400">{hint}</p>
      </CardContent>
    </Card>
  );
}
