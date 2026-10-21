"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import {
  deleteQuestionFromBank,
  getQuestionBank,
  getSession,
  saveQuestionBank,
} from "@/lib/store";
import type { Question } from "@/lib/types";

const SUBJECTS = [
  "Riyaziyyat",
  "Fizika",
  "Kimya",
  "Biologiya",
  "Azərbaycan dili",
  "İngilis dili",
  "Tarix",
];

const GRADES = ["V sinif", "VI sinif", "VII sinif", "VIII sinif", "IX sinif", "X sinif", "XI sinif"];

const DIFFICULTIES: Array<"Asan" | "Orta" | "Çətin"> = ["Asan", "Orta", "Çətin"];

function difficultyVariant(
  d?: string,
): "success" | "warning" | "danger" | "neutral" {
  if (d === "Asan") return "success";
  if (d === "Orta") return "warning";
  if (d === "Çətin") return "danger";
  return "neutral";
}

function blankQuestion(): Question {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: "",
    options: ["", "", "", ""],
    correct: 0,
    subject: SUBJECTS[0],
    grade: GRADES[0],
    difficulty: "Orta",
  };
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState<Question>(blankQuestion());

  useEffect(() => {
    if (!getSession()) {
      router.replace("/admin/login");
      return;
    }
    const t = setTimeout(() => {
      setQuestions(getQuestionBank());
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const reload = () => setQuestions(getQuestionBank());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (subjectFilter !== "all" && item.subject !== subjectFilter) return false;
      if (gradeFilter !== "all" && item.grade !== gradeFilter) return false;
      if (difficultyFilter !== "all" && item.difficulty !== difficultyFilter)
        return false;
      if (q && !item.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [questions, search, subjectFilter, gradeFilter, difficultyFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(blankQuestion());
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setForm({ ...q, options: [...q.options] });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.text.trim()) return;
    if (form.options.some((o) => !o.trim())) return;

    const bank = getQuestionBank();
    if (editing) {
      const idx = bank.findIndex((b) => b.id === editing.id);
      if (idx >= 0) {
        bank[idx] = {
          ...form,
          createdAt: editing.createdAt ?? new Date().toISOString(),
          verification: editing.verification ?? "verified",
        };
      }
    } else {
      // Banka yeni əlavə olunan sual təsdiq gözləyir
      bank.unshift({
        ...form,
        id: form.id || `q-${Date.now()}`,
        createdAt: new Date().toISOString(),
        verification: "pending",
      });
    }
    saveQuestionBank(bank);
    reload();
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bu sual bankdan silinsin?")) {
      deleteQuestionFromBank(id);
      reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== Səhifə başlığı ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Suallar</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sual bankı — fənnə görə sualların siyahısı və redaktəsi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Axtarış */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sual axtar…"
              className="w-56 pl-9"
            />
          </div>

          {/* Fənn filtri */}
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fənn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün fənlər</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={openNew}
            className="gap-1.5 bg-brand-700 hover:bg-brand-800 text-white"
          >
            <Plus className="size-4" />
            Yeni Sual
          </Button>
        </div>
      </div>

      {/* ===== Filtrlər paneli ===== */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <Filter className="size-4 text-neutral-400" />
        <span className="text-xs font-medium text-neutral-500">Filtrlər:</span>

        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Sinif" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün siniflər</SelectItem>
            {GRADES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Çətinlik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün çətinliklər</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || subjectFilter !== "all" || gradeFilter !== "all" || difficultyFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setSubjectFilter("all");
              setGradeFilter("all");
              setDifficultyFilter("all");
            }}
            className="ml-auto text-xs text-neutral-500"
          >
            Filtrləri sıfırla
          </Button>
        )}
      </div>

      {/* ===== Suallar grid ===== */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-neutral-500">
            {questions.length === 0
              ? "Hələ sual yoxdur. “Yeni Sual” düyməsi ilə əlavə edin."
              : "Filtrə uyğun sual tapılmadı."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <Card
              key={q.id}
              className="flex flex-col rounded-xl border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                {/* Nişanlar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {q.subject && (
                    <Badge variant="default" className="bg-brand-700">
                      {q.subject}
                    </Badge>
                  )}
                  {q.grade && <Badge variant="neutral">{q.grade}</Badge>}
                  {q.difficulty && (
                    <Badge variant={difficultyVariant(q.difficulty)}>
                      {q.difficulty}
                    </Badge>
                  )}
                  {(q.verification ?? "verified") === "pending" && (
                    <Badge variant="warning">Təsdiq gözləyir</Badge>
                  )}
                </div>

                {/* Sual mətni */}
                <p className="line-clamp-2 text-base font-medium text-neutral-900">
                  {q.text}
                </p>

                {/* Variantlar (qısa) */}
                <ul className="space-y-1 text-xs text-neutral-500">
                  {q.options.slice(0, 4).map((o, i) => (
                    <li
                      key={i}
                      className={`truncate ${i === q.correct ? "font-semibold text-brand-700" : ""}`}
                    >
                      {String.fromCharCode(65 + i)}) {o}
                    </li>
                  ))}
                </ul>

                {/* Əməliyyatlar */}
                <div className="mt-auto flex items-center justify-end gap-1 border-t border-neutral-100 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(q)}
                    className="gap-1.5 text-neutral-600 hover:text-brand-700"
                  >
                    <Pencil className="size-4" />
                    Redaktə et
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(q.id)}
                    className="gap-1.5 text-neutral-400 hover:text-danger-fg"
                  >
                    <Trash2 className="size-4" />
                    Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== Yeni / Redaktə sual Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sualı redaktə et" : "Yeni sual"}
            </DialogTitle>
            <DialogDescription>
              Sual mətnini, variantları və düzgün cavabı daxil edin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Fənn</Label>
                <Select
                  value={form.subject ?? SUBJECTS[0]}
                  onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Fənn" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Sinif</Label>
                <Select
                  value={form.grade ?? GRADES[0]}
                  onValueChange={(v) => setForm((f) => ({ ...f, grade: v }))}
                >
                  <SelectTrigger>
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
              <div className="grid gap-2">
                <Label>Çətinlik</Label>
                <Select
                  value={form.difficulty ?? "Orta"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, difficulty: v as Question["difficulty"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Çətinlik" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qtext">Sualın mətni</Label>
              <Textarea
                id="qtext"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                rows={3}
                placeholder="Sualı buraya yazın…"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500">
                Cavab variantları (düzgününü seçin):
              </p>
              <RadioGroup
                value={String(form.correct)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, correct: parseInt(v, 10) }))
                }
                className="gap-2"
              >
                {form.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className="flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50/50 px-3 py-2"
                  >
                    <RadioGroupItem value={String(oi)} id={`opt-${oi}`} />
                    <span className="w-5 text-xs font-semibold text-neutral-500">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...form.options];
                        opts[oi] = e.target.value;
                        setForm((f) => ({ ...f, options: opts }));
                      }}
                      placeholder={`Variant ${String.fromCharCode(65 + oi)}`}
                      className="flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                ))}
              </RadioGroup>
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
              disabled={!form.text.trim() || form.options.some((o) => !o.trim())}
              className="bg-brand-700 hover:bg-brand-800 text-white"
            >
              Yadda Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
