"use client";

import { useEffect, useState } from "react";
import { Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Label } from "@/components/ui";
import { exportLegacyData } from "@/lib/migration-format";

interface MigrationPreview {
  companies: { create: number; update: number; skip: number; conflicts: string[] };
  academicYears: { create: number; update: number; skip: number; conflicts: string[] };
  users: { create: number; update: number; skip: number; conflicts: string[] };
  exams: { create: number; update: number; skip: number; conflicts: string[] };
  questions: { create: number; update: number; skip: number; conflicts: string[] };
  classes: { create: number; update: number; skip: number; conflicts: string[] };
  ticketSales: { create: number; update: number; skip: number; conflicts: string[] };
  results: { create: number; update: number; skip: number; conflicts: string[] };
  errors: string[];
  manualReenrollment: string[];
}


export default function MigrationPage() {
  const [authorized,setAuthorized]=useState(false);
  const [authBusy,setAuthBusy]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  useEffect(()=>{let cancelled=false;fetch("/api/auth/me",{credentials:"include",cache:"no-store"}).then(response=>response.json()).then(data=>{if(!cancelled)setAuthorized(data.user?.role==="admin"&&!data.user?.companyId);}).catch(()=>{});return()=>{cancelled=true;};},[]);
  const [reenrollStaff,setReenrollStaff]=useState(false);
  const [enrollments,setEnrollments]=useState<Array<{userId:string;token:string}>>([]);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<unknown>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const blob = new Blob([JSON.stringify(exportLegacyData(localStorage), null, 2)], {type:"application/json"});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `migration-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess("İxrac uğurla tamamlandı.");
    } catch {
      setError("İxrac zamanı xəta baş verdi.");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setSuccess(null);
      setPreview(null); setPreviewData(null);
    }
  };

  const handlePreview = async () => {
    if (!file) { setError("Fayl seçin."); return; }
    setError(null);
    setSuccess(null);
    setImportingData(true);
    try {
      if(file.size>10*1024*1024)throw new Error("Fayl çox böyükdür.");
      const text = await file.text();
      const data = JSON.parse(text);
      const preview = await fetch("/api/migration/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Reenroll-Staff":reenrollStaff?"1":"0" },
        body: JSON.stringify(data),
        credentials: "include",
      }).then(r => r.json());
      if (preview.preview) {
        setPreview(preview.preview);
        setPreviewData(data);
      } else {
        setError(preview.error || "Önizləmə uğursuz.");
      }
    } catch {
      setError("Fayl oxunmadı və ya format yanlışdır.");
    } finally { setImportingData(false); }
  };

  const handleImport = async () => {
    if (!file || !previewData) { setError("Öncə fayl seçin və önizləyin."); return; }
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/migration/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Reenroll-Staff":reenrollStaff?"1":"0" },
        body: JSON.stringify(previewData),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if(result.preview)setPreview(result.preview);
        setError(result.errors?.join(", ") || "İdxal uğursuz.");
        return;
      }
      setEnrollments(result.enrollments??[]);
      setSuccess(`İdxal uğurla tamamlandı: ${Object.entries(result.counts).map(([k,v]) => `${k}: ${v}`).join(", ")}${result.preview?.manualReenrollment?.length ? ". İstifadəçi hesabları yaradılmadı; manual yenidən qeydiyyat tələb olunur." : ""}`);
      setFile(null);
      setPreview(null);
      setPreviewData(null);
    } catch {
      setError("İdxal zamanı xəta baş verdi.");
    } finally {
      setImporting(false);
    }
  };

  const renderSection = (title: string, icon: React.ReactNode) => {
    if (!preview) return null;
    const section = preview[title as keyof MigrationPreview];
    if (!section || Array.isArray(section)) return null;
    const d = section;
    const total = d.create + d.update + d.skip;
    if (total === 0) return null;
    return (
      <div className="border-b border-neutral-100 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-neutral-900">{title}</span>
          </div>
          <Badge variant={d.conflicts.length > 0 ? "warning" : "success"}>{total} qeyd</Badge>
        </div>
        <div className="mt-2 flex gap-4 text-sm text-neutral-600">
          {d.create > 0 && <span className="text-emerald-600">Yeni: {d.create}</span>}
          {d.update > 0 && <span className="text-blue-600">Yenilənəcək: {d.update}</span>}
          {d.skip > 0 && <span className="text-neutral-500">Keçiləcək: {d.skip}</span>}
        </div>
        {d.conflicts.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-warning-fg">Xətalar ({d.conflicts.length})</summary>
            <ul className="mt-1 text-xs text-danger-fg space-y-1">
              {d.conflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Məlumat Migrastiyası</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Brauzer-localStorage-dakı köhnə məlumatları ixrac edin, yoxlayın və serverə idxal edin.
          </p>
        </div>
      </div>

      {!authorized && <Card><CardContent className="space-y-3">
        <p className="text-sm text-neutral-600">Önizləmə və idxal üçün server administrator sessiyası tələb olunur. Köhnə brauzer sessiyası server icazəsi vermir.</p>
        <form className="space-y-3" onSubmit={async(event)=>{event.preventDefault();setAuthBusy(true);setError(null);setSuccess(null);try{const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({email,password})});const data=await response.json();if(!response.ok||data.user?.role!=="admin"||data.user?.companyId)throw new Error("Server administrator girişi alınmadı.");setAuthorized(true);setPassword("");}catch{setError("Server administrator girişi alınmadı. Məlumatları və server bağlantısını yoxlayın.");}finally{setAuthBusy(false);}}}>
          <Label htmlFor="migration-email">Server administrator e-poçtu</Label><Input id="migration-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} required />
          <Label htmlFor="migration-password">Server şifrəsi</Label><Input id="migration-password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required />
          <Button type="submit" loading={authBusy}>Serverə daxil ol</Button>
        </form>
      </CardContent></Card>}
      {authorized && <p role="status" className="text-sm text-success-fg">Server administrator sessiyası aktivdir.</p>}
      {error && (
        <Card className="border-danger bg-danger-soft">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-danger" />
              <div>
                <p role="alert" className="font-medium text-danger">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {success && (
        <Card className="border-emerald bg-emerald-soft">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="size-5 text-emerald-600" />
              <div>
                <p role="status" className="font-medium text-emerald-800">{success}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="size-4" />İxrac (Export)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-600">
              Bütün məlumatları (şirkətlər, illər, istifadəçilər, imtahanlar, suallar, siniflər, bilet satışları, nəticələr)
              versiyalənmiş JSON faylı kimi ixrac edin. Bu fayl serverə idxal üçün nəzərdə tutulub.
            </p>
            <Button onClick={handleExport} loading={exporting} className="w-full" disabled={exporting}>
              <Download className="size-4 mr-2" /> JSON faylı kimi ixrac et
            </Button>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="size-4" />İdxal (Import)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-600">
              Köhnə brauzerdə ixrac edilmiş JSON faylını seçin. Əvvəlicə önizləmə göstəriləcək,
              xətalar yoxlanılacaq, sonra təsdiqdən sonra idxal edəcəksiniz.
            </p>
            <div className="space-y-3">
              <input
                type="file"
                disabled={importing || importingData}
                accept=".json"
                onChange={handleFileSelect}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              />
              {file && (
                <div className="flex items-center justify-between p-2 rounded-md bg-neutral-50">
                  <span className="text-sm text-neutral-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reenrollStaff} disabled={importing||importingData} onChange={event=>{setReenrollStaff(event.target.checked);setPreview(null);setEnrollments([]);setError(null);setSuccess(null);}}/>Əməkdaş profillərini yoxladım: köhnə ID-lərlə təhlükəsiz yenidən qeydiyyat (ən çox 100). Köhnə şifrələr qəbul edilmir; məxfi 24 saatlıq keçidləri əməkdaşlara özüm çatdıracağam.</label>
              <div className="flex gap-2">
                <Button onClick={handlePreview} loading={importingData} disabled={!authorized || !file || importingData || importing} variant="outline">
                  <FileText className="size-4 mr-2" />Önizlə
                </Button>
                <Button onClick={handleImport} loading={importing} disabled={!authorized || !file || !preview || importing || importingData || preview.errors.length>0 || Object.values(preview).some(section=>!Array.isArray(section)&&section.conflicts.length>0)} className="bg-brand-700 hover:bg-brand-800 text-white">
                  <Upload className="size-4 mr-2" />İdxal et
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!!enrollments.length && <Card><CardContent><p role="status">Hesablar təhlükəsiz şifrə qurulması tələb edir. Keçidləri yalnız uyğun əməkdaşa məxfi kanalla göndərin; brauzer yaddaşına yazılmır.</p>{enrollments.map(item=><div key={item.userId} className="my-3"><Label>{item.userId}</Label><Input aria-label={`Qurulma keçidi ${item.userId}`} readOnly value={typeof window==='undefined'?'':window.location.origin+'/password-setup#token='+item.token}/></div>)}<Button variant="outline" onClick={()=>setEnrollments([])}>Keçidləri gizlət</Button></CardContent></Card>}

      {preview && (
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="size-4" />Önizləmə Nəticələri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {renderSection("companies", <span>🏢</span>)}
              {renderSection("academicYears", <span>📅</span>)}
              {renderSection("users", <span>👥</span>)}
              {renderSection("exams", <span>📝</span>)}
              {renderSection("questions", <span>❓</span>)}
              {renderSection("classes", <span>🏫</span>)}
              {renderSection("ticketSales", <span>🎫</span>)}
              {renderSection("results", <span>📊</span>)}
            </div>
            {!!preview.manualReenrollment?.length && <ul role="status" className="text-sm text-warning-fg">{preview.manualReenrollment.map((message,index)=><li key={index}>{message}</li>)}</ul>}
            {preview.errors.length > 0 && (
              <Card className="border-danger bg-danger-soft mt-4">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-danger" />
                    <div>
                      <p className="font-medium text-danger">Ümumi xətalar:</p>
                      <ul className="mt-1 text-sm space-y-1">
                        {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-neutral-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Qaydalar və Məsləhətlər</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-600">
          <ul className="list-disc list-inside space-y-1">
            <li>İdxal həmənhi bir transaction ilə edilir: bir xəta olduqda heç bir məlumat yazılmır.</li>
            <li>Eyni qeydlər keçilir; fərqli mövcud qeydlər üzərinə yazılmır.</li>
            <li>Şifrə, heş və token ixrac/idxal edilmir. Yeni istifadəçilər hesab yaradılmadan manual yenidən qeydiyyata yönləndirilir.</li>
            <li>Brauzer localStorage və sessionStorage avtomatik təmizlənmir.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}