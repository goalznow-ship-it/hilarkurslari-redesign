"use client";
import type { Question } from "@/lib/types";
import type { QuestionFilters } from "@/lib/questions";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

export default function QuestionBankFilters({ questions, value, onChange }: { questions: Question[]; value: QuestionFilters; onChange: (filters: QuestionFilters) => void }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
    <Input aria-label="Sual axtarışı" placeholder="Mətn, mövzu, etiket axtar…" className="w-full sm:w-56" value={value.search ?? ""} onChange={(e) => onChange({ ...value, search: e.target.value })} />
    {([['subject', 'Fənn'], ['grade', 'Sinif'], ['topic', 'Mövzu'], ['difficulty', 'Çətinlik'], ['type', 'Növ']] as const).map(([field, label]) => {
      const options = field === 'type' ? ['single', 'true_false', 'multiple'] : [...new Set(questions.map((q) => q[field]).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'az'));
      const labels: Record<string, string> = { single: 'Tək cavab', true_false: 'Doğru / Yanlış', multiple: 'Çoxseçimli' };
      return <Select key={field} value={value[field] ?? "all"} onValueChange={(next) => onChange({ ...value, [field]: next })}>
        <SelectTrigger aria-label={`${label} filtri`} className="h-9 w-36"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">{label}: hamısı</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{field === 'type' ? labels[option] : option}</SelectItem>)}</SelectContent>
      </Select>;
    })}
    <Button type="button" variant="ghost" size="sm" onClick={() => onChange({})}>Filtrləri sıfırla</Button>
  </div>;
}
