"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
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
  addQuestionValidated,
  deleteQuestionFromBank,
  downloadCsvTemplate,
  getQuestionBank,
  getSession,
  exportQuestionsToCsv,
  previewQuestionsFromCsv,
  importQuestionsFromCsv,
  normalizeQuestionType,
  updateQuestionValidated,
} from "@/lib/store";
import type { Question, QuestionType } from "@/lib/types";

import { QuestionImage, QuestionMediaEditor } from "@/components/QuestionMedia";
import QuestionBankFilters from "@/components/QuestionBankFilters";
import { matchesQuestion, cloneQuestion, type QuestionFilters } from "@/lib/questions";

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
    type: "single",
    subject: SUBJECTS[0],
    topic: "",
    tags: [],
    grade: GRADES[0],
    difficulty: "Orta",
    explanation: "",
    points: 1,
  };
}

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState<QuestionFilters>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState<Question>(blankQuestion());
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ success: Question[]; errors: { row: number; error: string; data?: Record<string, unknown> }[] } | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [formError, setFormError] = useState("");

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

  const filtered = useMemo(() => questions.filter((q) => matchesQuestion(q, filters)), [questions, filters]);

  const openNew = () => {
    setEditing(null);
    setForm(blankQuestion());
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setForm(cloneQuestion(q));
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    setFormError("");
    try {
      const result = editing ? updateQuestionValidated({ ...form, id: editing.id }) : addQuestionValidated(form);
      if (!result.success) { setFormError(result.error ?? "Sual saxlanılmadı."); return; }
      reload();
      setDialogOpen(false);
    } catch {
      setFormError("Sual yaddaşa yazılmadı. Yenidən cəhd edin.");
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bu sual bankdan silinsin?")) {
      try { deleteQuestionFromBank(id); reload(); }
      catch { window.alert("Sual silinmədi. Yenidən cəhd edin."); }
    }
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvText("");
    setCsvError("");
    setCsvSuccess("");
    setCsvPreview(null);
  };

  const handleCsvPreview = () => {
    if (!csvFile) { setCsvPreview(previewQuestionsFromCsv(csvText)); return; }
    if (csvFile.size > 2 * 1024 * 1024) { setCsvError("Fayl 2 MiB həddini keçir."); return; }
    setCsvError("");
    setCsvSuccess("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = String(e.target?.result ?? "");
      setCsvText(csv);
      setCsvPreview(previewQuestionsFromCsv(csv));
    };
    reader.onerror = () => setCsvError("CSV faylı oxunmadı. Faylı yenidən seçin.");
    reader.readAsText(csvFile);
  };

  const handleCsvImport = () => {
    setCsvError("");
    setCsvSuccess("");
    if (!csvPreview || csvPreview.errors.length || !csvPreview.success.length) {
      setCsvError("İdxal edilmədi. Əvvəlcə bütün sətir xətalarını düzəldin.");
      return;
    }
    setCsvImporting(true);
    try {
      const result = importQuestionsFromCsv(csvText);
      if (!result.success) {
        setCsvPreview((previous) => previous ? { ...previous, errors: result.errors } : previous);
        setCsvError("İdxal edilmədi. Heç bir sual əlavə olunmadı.");
        return;
      }
      setQuestions(result.questions ?? []);
      setCsvSuccess(`İdxal tamamlandı: ${result.added} sual əlavə edildi.`);
      setCsvFile(null);
      setCsvText("");
      setCsvPreview(null);
    } catch {
      setCsvError("İdxal zamanı xəta baş verdi. Yenidən cəhd edin.");
    } finally {
      setCsvImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsvTemplate();
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
          <Button
            variant="outline"
            onClick={() => { setCsvError(""); setCsvSuccess(""); setCsvDialogOpen(true); }}
            className="gap-1.5"
          >
            <Download className="size-4" />
            CSV-dən idxal
          </Button>
          <Button variant="outline" onClick={() => {
            try { const blob = new Blob(["\uFEFF" + exportQuestionsToCsv(filtered)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "suallar.csv"; link.click(); URL.revokeObjectURL(url); }
            catch { window.alert("İxrac tamamlanmadı."); }
          }}>CSV-yə ixrac ({filtered.length})</Button>
          <Button
            onClick={openNew}
            className="gap-1.5 bg-brand-700 hover:bg-brand-800 text-white"
          >
            <Plus className="size-4" />
            Yeni Sual
          </Button>
        </div>
      </div>

      <QuestionBankFilters questions={questions} value={filters} onChange={setFilters} />

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

                {q.verification === "rejected" && <p className="text-sm text-danger-fg">Rədd səbəbi: {q.reviewHistory?.at(-1)?.reason ?? "Səbəb tarixçədə yoxdur."}</p>}
                {/* Sual mətni */}
                <p className="line-clamp-2 text-base font-medium text-neutral-900">
                  {q.text}
                </p>

                <QuestionImage image={q.image} />
                {/* Variantlar (qısa) */}
                <ul className="space-y-1 text-xs text-neutral-500">
                  {q.options.slice(0, 4).map((o, i) => (
                    <li
                      key={i}
                      className={`truncate ${(Array.isArray(q.correct) ? q.correct.includes(i) : i === q.correct) ? "font-semibold text-brand-700" : ""}`}
                    >
                      {String.fromCharCode(65 + i)}) {o}<QuestionImage image={q.optionImages?.[i]} />
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
                    {[...new Set([...SUBJECTS, ...questions.map((q) => q.subject).filter((value): value is string => !!value)])].map((s) => (
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
                    {[...new Set([...GRADES, ...questions.map((q) => q.grade).filter((value): value is string => !!value)])].map((g) => (
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

            {formError && <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft p-3 text-sm text-danger-fg">{formError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="question-type">Sualın növü</Label>
                <Select value={form.type} onValueChange={(value) => { setForm((q) => normalizeQuestionType(q, value as QuestionType)); setFormError(""); }}>
                  <SelectTrigger id="question-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Tək düzgün cavab</SelectItem>
                    <SelectItem value="true_false">Doğru / Yanlış</SelectItem>
                    <SelectItem value="multiple">Bir neçə düzgün cavab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="question-points">Bal dəyəri</Label>
                <Input id="question-points" type="number" min="0.01" step="any" value={Number.isFinite(form.points) ? form.points : ""} onChange={(e) => setForm((q) => ({ ...q, points: e.target.value === "" ? NaN : Number(e.target.value) }))} />
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

            <div className="grid gap-2"><Label htmlFor="question-topic">Mövzu</Label><Input id="question-topic" value={form.topic ?? ""} onChange={(e) => setForm((q) => ({ ...q, topic: e.target.value }))} /><Label htmlFor="question-tags">Etiketlər (nöqtəli vergüllə)</Label><Input id="question-tags" value={(form.tags ?? []).join(";")} onChange={(e) => setForm((q) => ({ ...q, tags: e.target.value.split(";") }))} /></div>
            <QuestionMediaEditor question={form} onChange={setForm} />
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-medium text-neutral-500">
                {form.type === "multiple" ? "Cavab variantları (bir və ya bir neçə düzgün cavab seçin):" : "Cavab variantları (bir düzgün cavab seçin):"}
              </legend>
              {form.type === "multiple" ? (
                <div className="space-y-2">
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50/50 px-3 py-2">
                      <Checkbox aria-label={`${String.fromCharCode(65 + index)} variantı düzgündür`} checked={Array.isArray(form.correct) && form.correct.includes(index)} onCheckedChange={(checked) => setForm((q) => {
                        const correct = Array.isArray(q.correct) ? q.correct : [];
                        return { ...q, correct: checked === true ? [...new Set([...correct, index])] : correct.filter((i) => i !== index) };
                      })} />
                      <span className="w-5 text-xs font-semibold text-neutral-500">{String.fromCharCode(65 + index)}</span>
                      <Input aria-label={`Variant ${String.fromCharCode(65 + index)}`} value={option} onChange={(e) => setForm((q) => ({ ...q, options: q.options.map((o, i) => i === index ? e.target.value : o) }))} placeholder={`Variant ${String.fromCharCode(65 + index)}`} className="flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <RadioGroup aria-label="Düzgün cavab" value={String(form.correct)} onValueChange={(value) => setForm((q) => ({ ...q, correct: Number(value) }))} className="gap-2">
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50/50 px-3 py-2">
                      <RadioGroupItem aria-label={`${String.fromCharCode(65 + index)} variantı düzgündür`} value={String(index)} id={`opt-${index}`} />
                      <span className="w-5 text-xs font-semibold text-neutral-500">{String.fromCharCode(65 + index)}</span>
                      {form.type === "true_false" ? <Label htmlFor={`opt-${index}`} className="flex-1 py-2">{option}</Label> :
                        <Input aria-label={`Variant ${String.fromCharCode(65 + index)}`} value={option} onChange={(e) => setForm((q) => ({ ...q, options: q.options.map((o, i) => i === index ? e.target.value : o) }))} placeholder={`Variant ${String.fromCharCode(65 + index)}`} className="flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />}
                    </div>
                  ))}
                </RadioGroup>
              )}
            </fieldset>
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
              className="bg-brand-700 hover:bg-brand-800 text-white"
            >
              Yadda Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>CSV-dən Sual İdxalı</DialogTitle>
            <DialogDescription>
              CSV faylını seçin və bütün sətirləri yoxlayın. Bir xəta və ya təkrar olduqda heç bir sual əlavə edilmir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {csvError && <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft p-3 text-sm text-danger-fg">{csvError}</p>}
            {csvSuccess && <p role="status" className="rounded-md border border-success/25 bg-success-soft p-3 text-sm text-success-fg">{csvSuccess}</p>}
            {csvPreview ? (
              <>
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <h3 className="font-medium text-neutral-900 mb-2">Önizləmə</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-neutral-700">
                      <span className="font-medium">{csvPreview.success.length}</span> sual format yoxlamasından keçdi. Hamısı birlikdə idxal ediləcək.
                    </p>
                    {csvPreview.errors.length > 0 && (
                      <p className="text-danger-fg">
                        <span className="font-medium">{csvPreview.errors.length}</span> sətirdə xəta.
                      </p>
                    )}
                    {csvPreview.errors.length > 0 && (
                      <details open className="mt-2">
                        <summary className="text-xs text-neutral-500 cursor-pointer">Xətaları göstər</summary>
                        <ul role="alert" className="mt-1 text-xs text-danger-fg space-y-1">
                          {csvPreview.errors.map((e, idx) => (
                            <li key={idx}>Sətir {e.row}: {e.error}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setCsvPreview(null); setCsvError(""); }}>
                    Yenidən seç
                  </Button>
                  <Button onClick={handleCsvImport} disabled={csvImporting || csvPreview.errors.length > 0 || csvPreview.success.length === 0}>
                    {csvImporting ? "İmport edilir…" : "İmport et"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="rounded-md border border-neutral-200 bg-white p-4">
                    <h3 className="font-medium text-neutral-900 mb-2">CSV Şablonu</h3>
                    <p className="text-sm text-neutral-500 mb-3">
                      Aşağıdakı şablonu endirib, sualları daxil edin. &ldquo;type&rdquo; sütunu: single, true_false, multiple.
                      &ldquo;correct&rdquo; sütunu: single/true_false üçün indeks (0-based), multiple üçün nöqtəli vergüllə ayrılmış indekslər (məs. 0;2).
                    </p>
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                      <Download className="size-4 mr-2" />
                      Şablonu endir
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="csv-file" className="block text-sm font-medium text-neutral-700">CSV faylı seçin</label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleCsvFileSelect}
                      className="w-full"
                    />
                    {csvFile && (
                      <p className="text-xs text-neutral-500">Seçilən: {csvFile.name}</p>
                    )}
                    <Label htmlFor="csv-paste">Excel / Word cədvəlini başlıq sətri ilə yapışdırın (CSV/TSV)</Label>
                    <Textarea id="csv-paste" rows={5} value={csvText} onChange={(e) => { setCsvFile(null); setCsvText(e.target.value); setCsvError(""); setCsvSuccess(""); }} />
                    <p className="text-xs text-neutral-500">UTF-8 CSV/TSV, ən çox 2 MiB. .xlsx/.docx, daxili şəkil və Word düsturları çevrilmir. metadata sütununu saxlayın.</p>
                    <Button
                      onClick={handleCsvPreview}
                      disabled={!csvFile && !csvText.trim()}
                      className="w-full"
                    >
                      Önizlə
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
