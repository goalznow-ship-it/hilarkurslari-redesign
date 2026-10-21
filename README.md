# Kitabça — Hilal Kursları onlayn imtahan platforması

Azərbaycan dilində onlayn imtahan platforması. İki istifadəçi tipi var:

- **Tələbə** — FİN kodu və bilet kodu ilə imtahana daxil olur, sualları cavablandırır,
  nəticəsini dərhal görür.
- **Əməkdaş (admin/koordinator)** — kitabça hazırlayır, imtahanları idarə edir,
  nəticələri izləyir.

Brend: **bordo** (`#4A1A2C` ətrafı) + **qızılı** aksent. Hissiyyat: ciddi, sakit, etibarlı.

---

## Texnologiya

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, Radix UI, lucide-react |
| Formalar | react-hook-form + zod |
| Qrafik | Recharts 3 |
| Şrift | Inter (`latin-ext` — ə, ı, ö, ü, ş, ç, ğ, İ) |

## İşə salmaq

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
npm start        # production server
```

## Marşrutlar

| Route | Kim üçün | İçərik |
|---|---|---|
| `/` | Tələbə | İmtahana giriş: FİN + bilet kodu |
| `/online-exam` | Tələbə | İmtahanın keçirilməsi (sual naviqasiyası, taymer) |
| `/online-exam/result?rid=…` | Tələbə | Nəticə və sual təhlili |
| `/admin/login` | Əməkdaş | Panel girişi (demo: `admin` / `admin123`) |
| `/account` | Əməkdaş | İdarəetmə paneli: canlı imtahanlar, KPI-lər, qrafik |
| `/account/exams` | Əməkdaş | İmtahanlar — kart grid (status, kopyala/sil) |
| `/account/exams/new`, `/account/exams/[id]` | Əməkdaş | İmtahan redaktəsi |
| `/account/online-exams` | Əməkdaş | Onlayn rejim, giriş pəncərəsi, bilet və nəticə sayı |
| `/account/classes` | Əməkdaş | Siniflər & Qruplar (CRUD) |
| `/account/questions` | Əməkdaş | Sual bankı (axtarış, filtr, redaktə) |
| `/account/questions/verification` | Əməkdaş | Sual təsdiqi növbəsi |
| `/account/results` | Əməkdaş | Nəticələr (`?examId=` filtri ilə) |
| `/account/users` | Əməkdaş | İstifadəçilər (admin / koordinator / müəllim) |
| `/account/reports`, `/companies`, `/years` | Əməkdaş | Hazırlanan bölmələr |

## Məlumat modeli

Demo məlumatlar **brauzer `localStorage`-ında** saxlanılır (`kitabca.*` açarları),
server bazısı yoxdur. Hər istifadəçi öz məlumatını görür.

| Açar | Məzmun |
|---|---|
| `kitabca.exams` | İmtahanlar: başlıq, kod, sinif/blok, tədris ili, variant sayı, PDF və onlayn vəziyyəti, suallar |
| `kitabca.results` | Nəticələr: FİN, bilet kodu, düzgün cavab sayı, bal, vaxt |
| `kitabca.questionBank` | Sual bankı: mətn, variantlar, fənn, sinif, çətinlik, təsdiq vəziyyəti |
| `kitabca.classes` | Siniflər & qruplar: ad, sınıf, şöbə, müəllim, şagird sayı, tədris ili |
| `kitabca.users` | İstifadəçilər: ad, e-poçt, rol, aktivlik |
| `kitabca.admin.session` | Admin sessiyası |

Köhnə məlumatlar yeni sahələr əlavə olunanda avtomatik miqrasiya olunur
(`status`, `code`, `onlineEnabled`, `createdAt`, `verification`).

## Tələbə giriş axını

1. **FİN kod** — 7 simvol, avtomatik böyük hərf (`AB12CD3`).
2. **Bilet kodu** — `XXXX-XXXX` maska, paste dəstəyi.
3. Aktiv imtahan **avtomatik tapılır**; yalnız bir neçə açıq imtahan varsa seçim
   addımı göstərilir.
4. Daxil ol → cavablar avtomatik yoxlanılır → nəticə ekranı.

Xəta mesajları: *Kod tapılmadı*, *İmtahan hələ başlamayıb*, *İmtahan bitib*,
*Bu bilet kodu bu imtahan üçün qeyd olunmayıb*.

## Dizayn sistemi

Tokenlar `app/globals.css` daxilindədir: bordo şkalası (50–900), isti neytral şkala,
semantik rənglər (success/warning/danger/info), 3 kölgə səviyyəsi, 8/12/16 radius,
yalnız 5 şrift ölçüsü (12/14/16/20/28).

Bütün UI komponentləri **bir faylda** toplanıb: `components/ui/index.tsx`
(Button, Input, Textarea, Label, Field, Select, Checkbox, RadioGroup, Badge, Card,
Table, Skeleton, EmptyState, StatCard, Toast, Dialog).

Ətraflı dizayn qaydaları: [`DESIGN.md`](./DESIGN.md).

## Struktur

```
app/
  page.tsx                  # tələbə girişi
  online-exam/              # imtahan keçirilməsi + nəticə
  admin/login/              # əməkdaş girişi
  account/(dashboard)/      # admin paneli
components/
  ui/index.tsx              # vahid UI sistemi
  admin/DashboardShell.tsx  # sidebar + üst panel + ⌘K axtarış
  ExamForm.tsx              # imtahan redaktə formu
lib/
  store.ts                  # localStorage store + miqrasiyalar
  helpers.ts                # format, validasiya, vəziyyət etiketləri
  types.ts                  # tiplər
```
