"use client";
import { useEffect, useState } from "react";
import { getAcademicYears, getCompanies, getCurrentUser, newId, saveAcademicYear, saveCompany } from "@/lib/backend-store";
import type { AcademicYear, Company } from "@/lib/types";
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "@/components/ui";

type RecordRow = Company | AcademicYear;
export default function RegistryManager({ kind }: { kind: "companies" | "years" }) {
  const company = kind === "companies";
  const title = company ? "Şirkətlər" : "Tədris İlləri";
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [search, setSearch] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try { setRecords(company ? getCompanies() : getAcademicYears()); setAllowed(getCurrentUser()?.role === "admin" && !getCurrentUser()?.companyId); }
      catch { setError("Reyestr yüklənmədi. Səhifəni yeniləyin."); }
      finally { setLoading(false); }
    }, 0);
    return () => clearTimeout(timer);
  }, [company]);
  const start = (record: RecordRow | null) => {
    setEditing(record); setName(record ? "name" in record ? record.name : record.label : ""); setCode(record && "code" in record ? record.code : ""); setActive(record?.active ?? true); setError(""); setSuccess(""); setOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSuccess("");
    const base = { id: editing?.id ?? newId(), active, createdAt: editing?.createdAt ?? "" };
    const result = company ? await saveCompany({ ...base, name, code }, !!editing) : await saveAcademicYear({ ...base, label: name }, !!editing);
    if (!result.success || !result.record) { setError(result.error ?? "Dəyişiklik saxlanılmadı."); return; }
    const record = result.record;
    setRecords((rows) => rows.some((row) => row.id === record.id) ? rows.map((row) => row.id === record.id ? record : row) : [...rows, record]);
    setOpen(false); setSuccess("Dəyişiklik saxlanıldı. Mövcud əlaqələr və tarixçə qorundu.");
  };
  const filtered = records.filter((row) => ("name" in row ? `${row.name} ${row.code}` : row.label).toLocaleLowerCase("az").includes(search.trim().toLocaleLowerCase("az")));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-bold text-neutral-900">{title}</h1><p className="mt-1 text-sm text-neutral-500">Arxivləşdirmə mövcud imtahanları, istifadəçiləri və tarixçəni silmir. Fiziki silmə təqdim edilmir.</p></div>{allowed && <Button onClick={() => start(null)}>{company ? "Yeni şirkət" : "Yeni tədris ili"}</Button>}</div>
    {error && !open && <p role="alert" className="text-sm text-danger-fg">{error}</p>}{success && <p role="status" className="text-sm text-success-fg">{success}</p>}
    <Input aria-label={`${title} axtarışı`} placeholder="Axtar…" value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-sm" />
    {loading ? <p>Yüklənir…</p> : filtered.length === 0 ? <p className="text-sm text-neutral-500">Uyğun qeyd yoxdur.</p> : <div className="grid gap-3 md:grid-cols-2">{filtered.map((row) => <Card key={row.id}><CardContent className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{"name" in row ? row.name : row.label}</p>{"code" in row && <p className="text-sm text-neutral-500">{row.code}</p>}<Badge variant={row.active ? "success" : "neutral"}>{row.active ? "Aktiv" : "Arxiv"}</Badge>{!row.createdAt && <p className="mt-1 text-xs text-neutral-500">Tarixi/default dəyər; reyestrə avtomatik yazılmayıb.</p>}</div>{allowed && <Button variant="outline" onClick={() => start(row)}>Redaktə et</Button>}</CardContent></Card>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Qeydi redaktə et" : company ? "Yeni şirkət" : "Yeni tədris ili"}</DialogTitle><DialogDescription>Arxiv qeydləri yeni təyinatlar üçün seçilmir. İstifadə olunan ilin adını dəyişmək mümkün deyil.</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
        <div className="space-y-2"><Label htmlFor="registry-name">{company ? "Şirkət adı" : "Tədris ili (YYYY-YYYY)"}</Label><Input id="registry-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        {company && <div className="space-y-2"><Label htmlFor="registry-code">Unikal şirkət kodu</Label><Input id="registry-code" value={code} maxLength={40} onChange={(event) => setCode(event.target.value)} required /></div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Aktiv</label>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Ləğv et</Button><Button type="submit">Yadda saxla</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </div>;
}
