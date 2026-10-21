# DESIGN.md — Hilal Kursları / Kitabça

**Aestetik istiqamət:** ciddi, sakit, etibarlı idarəetmə paneli — Linear/Stripe
keyfiyyətində. İşıqlı neytral zəmin, bordo brend aksenti, qızılı ikincil vurğu.
Dekorativ gradient yoxdur; rəng yalnız məna daşıyır.

**Son yeniləmə:** 2026-10-21

---

## 1. Rəng

### Brend (bordo) — `brand-*`

| Token | Hex | İstifadə |
|---|---|---|
| `brand-50` | `#faf6f8` | seçilmiş sətir arxa fonu, hover |
| `brand-100` | `#f3e9ed` | yumşaq brend fonu |
| `brand-200` | `#e4cdd6` | seçim highlight, `::selection` |
| `brand-300` | `#cda9b8` | pasif brend |
| `brand-400` | `#b17b8f` | dekorativ |
| `brand-500` | `#8a4a63` | ikincil brend |
| `brand-600` | `#6e3450` | fokus halqası, hover |
| `brand-700` | `#4a1a2c` | **əsas brend** — CTA, aktiv nav, link |
| `brand-800` | `#3a1524` | CTA hover, tünd panel |
| `brand-900` | `#26101a` | yan panel (canlı imtahanlar bloku) |

### Qızılı aksent — `gold-*`

`gold-100` (#f9edcf) badge fonu · `gold-300` (#e5c169) ikon · `gold-400` (#d4a63f)
progres/CTA · `gold-700` (#6f4d13) qızılı mətn üzərində.

### Neytral (isti boz) — `neutral-*`

`neutral-50` səhifə fonu · `neutral-100` ikincil fon · `neutral-200` sərhəd ·
`neutral-300` input sərhədi · `neutral-400` dekorativ ikon ·
**`neutral-500` (#6f6760) placeholder və ikincil mətn — ağ üzərində 5.1:1 (WCAG AA)** ·
`neutral-600/700/800/900` mətn səviyyələri.

### Semantik

| | base | soft (fon) | fg (mətn) |
|---|---|---|---|
| success | `#0f7355` | `#e7f4ee` | `#0b5a42` |
| warning | `#a96b0e` | `#fcf3e2` | `#8a5608` |
| danger | `#b3261e` | `#fbeae8` | `#97201a` |
| info | `#1f5fa8` | `#eaf1fa` | `#1a5493` |

`soft` + `fg` hər zaman bir-birinin üstündə ≥ 4.5:1 kontrast verir.

---

## 2. Tipoqrafiya

**Inter**, `latin-ext` altçəkilməsi ilə (`ə ı ö ü ş ç ğ İ` dəstəklənir).

**Yalnız 5 ölçü** (`--text-*` tokenləri ilə məhdudlaşdırılıb):

| Token | px | İstifadə |
|---|---|---|
| `text-xs` | 12 | metadata, köməkçi mətn, badge |
| `text-sm` | 14 | gövdə mətni, form sahələri, cədvəl |
| `text-base` | 16 | əsas mətn, səhifə başlığı altı |
| `text-lg` | 20 | bölmə başlıqları |
| `text-xl` | 28 | səhifə başlığı, KPI rəqəmləri |

`2xl` və daha böyük siniflər eyni 28px-ə eynilənir — şrift şkalası qırılmır.
Rəqəmlər `.tnum` (`font-variant-numeric: tabular-nums`) ilə sütun düzümünü saxlayır.

---

## 3. Fəza (spacing), radius, kölgə

- **Spacing:** 4px əsaslı (`--spacing: 0.25rem`), 8px addımları əsasdır.
- **Radius:** `rounded-sm` 8px · `rounded-md` 12px · `rounded-lg`/`xl` 16px ·
  `rounded-full` yalnız pill/avatar üçün.
- **Kölgə (3 səviyyə, tintlənmiş — qara deyil):**
  - `shadow-xs` — kart, input (hairline)
  - `shadow-sm` — dropdown, popover
  - `shadow-md` — hover-u qalxan kart, modal

---

## 4. Komponentlər

Hər şey `components/ui/index.tsx` faylında:

`Button` (primary / gold / secondary / outline / ghost / danger / link; sm-md-lg-icon;
`loading` və `asChild`) · `Input` · `Textarea` · `Label` · `Field` (label + kontrol +
xəta/köməkçi) · `Select` (Radix) · `Checkbox` · `RadioGroup` · `Badge`
(default/neutral/success/warning/danger/info/gold/outline) · `Card` (+Header/Title/
Description/Content/Footer) · `Table` (+Header/Body/Row/Head/Cell) · `Skeleton` ·
`EmptyState` · `StatCard` (delta badge + link) · `Toast` (+Provider/useToast) · `Dialog`.

**Qaydalar:**
- Hər interaktiv elementdə `focus-visible` halqası (2px `brand-600` + 2px offset).
- Əməliyyat düymələri: bir səhifədə **bir əsas CTA** (`brand-700`).
- Boş vəziyyət hər yerdə `EmptyState` ilə — heç vaxt “lorem ipsum”.
- Əməliyyat sətirləri `hover:bg-neutral-50`, mobil isə kart siyahısına dönür.

---

## 5. Səhifə qaydaları

**Admin paneli**
- Yan panel: ağ fon, şəffaf loqo (ağ qutu yox), oxunaqlan bölmə başlıqları,
  aktiv elementdə sol 2px brend aksenti + `aria-current="page"`, yığılma (collapse)
  və altında istifadəçi kartı.
- Üst panel: breadcrumb + global axtarış (`⌘K` / `Ctrl+K`), bildirişlər.
  Sabit “şirkət çipi” yoxdur — şirkət seçicisi yalnız səhifə başlığındadır.
- Səhifə başlığı: solda başlıq + qısa izah, sağda **bir** əsas CTA və
  (müvafiq olduqda) tarix aralığı seçicisi.
- Dashboard: canlı imtahanlar bloku ən yuxarıda (tünd `brand-800`), sonra 4 KPI,
  sonra qrafik + diqqət bloku, sonda sıralanmalı və səhifələnən cədvəl.

**Tələbə səhifəsi**
- Desktop: iki sütun — solda bordo brend paneli (qaydalar, “Uğurlar!”),
  sağda forma. Mobil: tək sütun.
- Validasiya `react-hook-form` + `zod`; xətalar inline, real `<label>` bağlantısı ilə.
- Placeholder qısa və formatı göstərir (`AB12CD3`), uppercase/letter-spacing yoxdur.
- Demo mətni yalnız `NODE_ENV !== "production"` olduqda görünür.

---

## 6. Hərəkət və a11y

- Mikro-animasiyalar **150–250ms**, yalnız `transform`/`opacity`/`background-color`.
- `prefers-reduced-motion: reduce` — bütün animasiya və keçidlər söndürülür.
- Bütün forman sahələrində real `<label>`; səhvlər `role="alert"`.
- Boş/klaviatura ilə idarə olunan komponentlərdə `aria-current`, `aria-pressed`,
  `aria-expanded`, `aria-busy`, `aria-live` istifadə olunur.
- Cədvəllər mobil-də yatay scroll deyil, **kart siyahısı** olur.

---

## 7. Qadağalar

- Bənövşəyi gradient və ya hər yerdə eyni “rəngli kart” nümunəsi yoxdur.
- Dekorativ ikonlar yoxdur — ikon hər zaman məna uyğundur.
- Emoji yoxdur.
- Müəqqəli mətn (`lorem ipsum`, `John Doe`, `$99.99`) yoxdur.
- Hər səhifədə yalnız bir əsas CTA.
- Köhnə `#4a1c2c` hardcoded rəng və `slate-*` palitrası yoxdur — yalnız tokenlar.
