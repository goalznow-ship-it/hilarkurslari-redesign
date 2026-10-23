"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
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

import { currentAcademicYear } from "@/lib/helpers";
import { deleteClass, getClasses, getSession, saveClass, getAcademicYears, newId } from "@/lib/backend-store";
import type { SchoolClass } from "@/lib/types";

import {
  Badge,
  Button,
  Card,
  CardContent,
  StatCard,
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
  const createId=useRef(newId());
  const savingRef=useRef(false);
  const [saving,setSaving]=useState(false);
  const [academicYears, setAcademicYears] = useState<import("@/lib/types").AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());

  useEffect(() => {
    if (!getSession()) {
      router.replace("/admin/login");
      return;
    }
    const t = setTimeout(() => { try { setClasses(getClasses()); setAcademicYears(getAcademicYears()); } catch { window.alert("Sinif və il reyestri oxunmadı. Səhifəni yeniləyin."); } }, 0);
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
    createId.current=newId();
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

  const handleSave = async () => {
    if(savingRef.current)return;
    if (!form.name.trim() || !form.teacher.trim()) return;

    const schoolClass: SchoolClass = {
      id: editing?.id ?? createId.current,
      name: form.name.trim(),
      grade: form.grade,
      section: form.section.trim(),
      teacher: form.teacher.trim(),
      studentCount: Math.max(0, parseInt(form.studentCount, 10) || 0),
      academicYear: form.academicYear || currentAcademicYear(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };

    savingRef.current=true;setSaving(true);
    try {
      await saveClass(schoolClass);
      reload();
      setDialogOpen(false);
    } catch(error) { window.alert(error instanceof Error?error.message:"Sinif saxlanılmadı. Yenidən cəhd edin."); } finally{savingRef.current=false;setSaving(false);}
  };

  const handleDelete = async (c: SchoolClass) => {
    if (
      window.confirm(
        `"${c.name}" sinifi silinəcək. Davam edilsin?`,
      )
    ) {
      try { await deleteClass(c.id); reload(); }
      catch { window.alert("Sinif silinmədi. Yenidən cəhd edin."); }
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Siniflər &amp; Qruplar
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Siniflər, şöbələr və hazırlıq qruplarını idarə edin — müəllim və
            şagird sayı ilə.
          </p>
        </div>

        <Button
          onClick={openNew}
          className="gap-1.5 bg-brand-700 text-white hover:bg-brand-800"
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
        />
        <StatCard
          icon={Users}
          label="Cəmi şagird"
          value={String(stats.totalStudents)}
          hint="bütün siniflər"
        />
        <StatCard
          icon={GraduationCap}
          label="Aktiv tədris ili"
          value={stats.activeYear}
          hint={`${stats.years} il məlumatı`}
        />
        <StatCard
          icon={UserRound}
          label="Müəllim sayı"
          value={String(stats.teachers)}
          hint="unikal sinif rəhbəri"
        />
      </section>

      {/* ===== Axtarış ===== */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <Search className="size-4 text-neutral-400" />
        <span className="text-xs font-medium text-neutral-500">Axtarış:</span>
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
            className="ml-auto text-xs text-neutral-500"
          >
            Axtarışı təmizlə
          </Button>
        )}
      </div>

      {/* ===== Cədvəl ===== */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
            <Layers className="size-6 text-neutral-400" />
          </span>
          <p className="text-sm font-medium text-neutral-700">
            {classes.length === 0
              ? "Hələ sinif yoxdur"
              : "Axtarışa uyğun sinif tapılmadı"}
          </p>
          {classes.length === 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              İlk sinifi yaratmaq üçün “Yeni sinif” düyməsindən istifadə edin.
            </p>
          )}
          {classes.length === 0 && (
            <Button
              onClick={openNew}
              className="mt-5 gap-1.5 bg-brand-700 text-white hover:bg-brand-800"
            >
              <Plus className="size-4" />
              Yeni sinif
            </Button>
          )}
        </div>
      ) : (
        <Card className="gap-0 rounded-lg border-neutral-200 bg-white py-0 shadow-xs">
          <CardContent className="px-0 py-0">
            {/* Mobil: kart görünüşü */}
            <ul className="divide-y divide-neutral-100 md:hidden">
              {filtered.map((c) => (
                <li key={c.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900">{c.name}</p>
                      {c.section && (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          Şöbə: {c.section}
                        </p>
                      )}
                    </div>
                    <Badge variant="neutral">{c.grade}</Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <dt className="text-neutral-500">Müəllim</dt>
                    <dd className="truncate text-neutral-800">{c.teacher}</dd>
                    <dt className="text-neutral-500">Şagird sayı</dt>
                    <dd className="tnum text-neutral-800">{c.studentCount}</dd>
                    <dt className="text-neutral-500">Tədris ili</dt>
                    <dd className="text-neutral-800">{c.academicYear}</dd>
                  </dl>
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(c)}
                      className="text-neutral-500"
                    >
                      <Pencil className="size-4" />
                      Redaktə
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(c)}
                      className="text-neutral-500"
                    >
                      <Trash2 className="size-4" />
                      Sil
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: cədvəl */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                    <th className="px-6 py-3 font-medium">Sinif</th>
                    <th className="px-4 py-3 font-medium">Sinif</th>
                    <th className="px-4 py-3 font-medium">Müəllim</th>
                    <th className="px-4 py-3 font-medium">Şagird sayı</th>
                    <th className="px-4 py-3 font-medium">Tədris ili</th>
                    <th className="px-6 py-3 text-right font-medium">
                      Əməliyyat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-neutral-900">
                          {c.name}
                        </p>
                        {c.section && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            Şöbə: {c.section}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="neutral">{c.grade}</Badge>
                      </td>
                      <td className="px-4 py-4 text-neutral-700">{c.teacher}</td>
                      <td className="tnum px-4 py-4 text-neutral-700">
                        {c.studentCount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-neutral-600">
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
                            className="text-neutral-400 hover:text-brand-700"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(c)}
                            title="Sil"
                            aria-label={`${c.name} sinifini sil`}
                            className="text-neutral-400 hover:text-danger-fg"
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
                <select id="c-year" value={form.academicYear} onChange={(event) => setForm((value) => ({ ...value, academicYear: event.target.value }))} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">Tədris ili seçin</option>{editing?.academicYear&&!academicYears.some(year=>year.label===editing.academicYear)&&<option value={editing.academicYear}>{editing.academicYear} (tarixi)</option>}{academicYears.filter((year) => year.active || year.label === editing?.academicYear).map((year) => <option key={year.id} value={year.label}>{year.label}{year.active ? "" : " (arxiv)"}</option>)}</select>
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
              loading={saving}
              disabled={!form.name.trim() || !form.teacher.trim()}
              className="bg-brand-700 text-white hover:bg-brand-800"
            >
              Yadda Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

