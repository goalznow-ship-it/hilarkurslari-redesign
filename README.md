# Hilal Kursları — Kitabça Sistemi

Azərbaycan dilində tələbə imtahanları və əməkdaş idarəetmə paneli. Mövcud loqo, bordo/qızılı dizayn və marşrutlar saxlanılıb.

**Status: NOT READY FOR PRODUCTION.** Cari test sübutları və buraxılış maneələri [auditdə](docs/PRODUCTION_READINESS_AUDIT.md), icra nəticələri [hesabatda](docs/PRODUCTION_READINESS_REPORT.md), davam nöqtəsi [checkpoint-də](docs/OVERNIGHT_PROGRESS.md) göstərilib.

## Arxitektura

Next.js App Router, React, TypeScript, Tailwind 4, PostgreSQL və Prisma 5.22. Əsas admin səhifələri serverdən autentifikasiya olunmuş snapshot yükləyir; dəyişikliklər server API-lərindən keçir. Brauzer yaddaşı biznes məlumatlarının mənbəyi deyil. `localStorage` yalnız sidebar seçimi və açıq şəkildə seçilən legacy ixrac üçün istifadə edilir. `lib/store.ts` köhnə məlumat uyğunluğu və saf validasiya/CSV/scoring funksiyaları üçün saxlanılıb; onun demo autentifikasiyası tətbiqin giriş yolu deyil.

Tələbə kataloqu yalnız aktiv imtahan xülasələrini göstərir. Suallar FIN/bilet təsdiqindən sonra təhlükəsiz DTO ilə verilir. Cavablar, vaxt, qiymətləndirmə, attempt və nəticələr serverdə idarə edilir. Köhnəlmiş yazılar konfliktlə rədd edilir. Satış/start/bilet dəyişiklikləri exam lock-u paylaşır; nəticə submission-u idempotentdir.

## Quraşdırma

Yoxlanmış mühit: Node 22, PostgreSQL 18. PostgreSQL-in production xidməti və sirləri ayrıca operator tərəfindən təmin edilməlidir.

1. `npm ci` işlədin.
2. `.env.example` faylını private, Git tərəfindən ignore olunan `.env` faylına köçürün. Real DATABASE_URL, təsadüfi AUTH_SECRET və kanonik NEXT_PUBLIC_APP_URL daxil edin. Sirləri loglara və Git-ə yazmayın.
3. `npm run db:generate` işlədin. Bu, generasiyadan sonra yeni client artefaktlarını da yoxlayır. Sandbox alt-prosesi bloklayırsa, icazəli normal mühit tələb olunur; təkcə exit 0 artefaktın yeniləndiyini sübut etmir.
4. `npm run db:validate` işlədin.
5. Yalnız ayrıca təsdiqlənmiş hədəf bazada backup və konflikt yoxlamasından sonra `npx prisma migrate deploy` işlədin. `db push`, reset və məlumat silmə migration proseduru deyil.

Case-insensitive identifikator migration-ı e-poçt və kod unikallığı əlavə edir. Mövcud case-only konfliktlər varsa təhlükəsiz şəkildə dayanır; onları səssiz silmir və ya birləşdirmir.

Yeni year FK-ləri yeni təyinatları qoruyur. Mövcud reyestrsiz tarixi year label-ləri `NOT VALID` uyğunluğu ilə saxlanılır və dəyişməyən təyinatla redaktə oluna bilər; operator yoxlamasından əvvəl onları avtomatik silmək/yenidən yazmaq olmaz.

## İlk administrator və staff

`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` dəyişənlərini private şəkildə verib `node scripts/bootstrap-admin.mjs` işlədin. Şifrə 12–256 simvol olmalıdır. Mövcud administrator varsa bootstrap imtina edir. Universal şifrə və avtomatik production seed yoxdur. Faktiki alqoritm versiyalı Node `scrypt`-dir (N=16384, r=8, p=5), Argon2id deyil. Parametrlər [OWASP siyahısındadır](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt). Köhnə server scrypt formatı düzgün login zamanı atomik yenilənir; browser SHA-256 qəbul edilmir.

Yeni əməkdaş üçün şifrəni boş saxlamaq təhlükəsiz bir dəfəlik setup keçidi yaradır. Keçid yalnız səlahiyyətli administratora göstərilir; 24 saat qüvvədədir, DB-də yalnız hash saxlanılır. Uyğun əməkdaşa private kanalla çatdırılmalıdır. Yenidən buraxılan keçid əvvəlkini ləğv edir; uğurlu setup köhnə sessiyaları ləğv edir. E-poçt çatdırılması avtomatik qurulmayıb.

## İcra

- `npm run dev -- --webpack`: development. Soyuq route kompilyasiyası vaxt tələb edə bilər.
- `npm run build`: yoxlanmış webpack production build. Lokal Tailwind 4 PostCSS konfiqurasiyası istifadə edilir.
- `npm start`: tələb olunan konfiqurasiyanı yoxlayıb production serverini başladır. Production origin HTTPS olmalıdır.
- `npm run build:turbo`: ayrıca Turbopack diaqnostikası. Cari agent mühitində CSS worker port-binding EPERM ilə bloklanır; yoxlamalar söndürülməyib.

Production reverse proxy kanonik Host/origin-i qorumaq və birbaşa origin girişini məhdudlaşdırmaq üçün konfiqurasiya edilməlidir. Private API-lər `no-store`, səhifələr `no-referrer` və frame/sniff müdafiəsi qaytarır. Xarici proxy/CDN logları və keşləri ayrıca yoxlanmalıdır.

## Rollar və şirkətlər

- Global administrator bütün təşkilatı və migration-ı idarə edir.
- Şirkət administratoru yalnız öz şirkətinin exam, sual, sinif, staff, nəticə və satış məlumatları ilə işləyir.
- Koordinator/müəllim öz səlahiyyət və şirkət sərhədində exam/sual/siniflərlə işləyir; sual təsdiqi admin/koordinator üçündür. Müəllim staff və maliyyə hesabatlarına daxil olmur.
- Satıcı yalnız təyin olunmuş imtahanların mövcud biletlərini və öz satış tarixçəsini alır. Başqa satıcının şagird məlumatları verilmir.

Legacy `companyId=null` məlumatları global səviyyədə qalır; avtomatik tenant təyinatı edilmir. API serverdə scope və rolu yoxlayır; brauzer rol dəyişməsi icazə vermir. Qlobal reyestrlərin dəyişdirilməsi və migration global admin üçündür.

## Legacy məlumatların köçürülməsi

Hər köhnə cihaz/brauzer ayrıca məlumat saxlayır; Git/ZIP onu əhatə etmir. Köhnə sistemin istifadə olunduğu hər brauzerdə `/account/migration` səhifəsindən version 1 JSON ixrac edin. Yaddaşı təmizləməyin.

Global admin faylı serverdə önizləyir. Hər sətir, ID/kod, əlaqə və konflikt yoxlanır; commit planı yenidən hesablanır. İdxal transaction daxilindədir; fərqli mövcud məlumat üzərinə yazılmır. Tarixi nəticələr real sual snapshot-u tələb edir. Uyğunsuz qeydlər ayrıca düzəldilməli, itirilməməlidir.

Standart rejim staff hesabı yaratmır. Profillər yoxlanıldıqdan sonra ayrıca secure re-enrollment checkbox-u aktivləşdirilə bilər: ən çox 100 staff, əvvəlki ID və satış əlaqələri saxlanır, naməlum təsadüfi credential və yeni setup token-i yaradılır. Köhnə şifrə/hash/session/token heç vaxt qəbul edilmir. Setup keçidləri yalnız uğurlu commit-dən sonra adminin cari ekranında göstərilir; itirilərsə staff səhifəsindən yenisi buraxılır. Browser storage avtomatik silinmir.

CSV/TSV sual idxalı serverdə bütöv batch olaraq yoxlanır; bir etibarsız/təkrar sətir və ya yazı xətası bütün transaction-ı dayandırır.

## Vaxtı bitən cəhdlər və rate limit

`POST /api/attempts/finalize-expired` vaxtı bitmiş, yekunlaşmamış cəhdləri saxlanmış cavablardan qiymətləndirir. Panelin nəticələr səhifəsində əl ilə çağırıla bilər. Xarici scheduler üçün ayrıca güclü CRON_SECRET və `Authorization: Bearer` istifadə olunur. Hər çağırış ən çox 100 cəhd işləyir; `failed` sayına operator baxmalıdır. Canlı scheduler bu tapşırıqda qurulmayıb.

Login və tələbə girişi üçün PostgreSQL atomik rate limit bütün instansiyalar arasında paylaşılır. TRUSTED_CLIENT_IP_HEADER yalnız ingress onu məcburi əvəz etdikdə aktiv edilməlidir. Əks halda ümumi təhlükəsiz bucket istifadə edilir; real trafik üçün ölçmə/tənzimləmə lazımdır. Redis tələb edilmir. Cleanup və backup proseduru [buradadır](docs/BACKUP_RESTORE.md).

## Yoxlamalar

```bash
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run db:validate
npm run db:generate
npm run build
git diff --check
```

DB testləri yalnız ayrıca lokal `hilal_recovery` və ya `hilal_test` bazasında işləyir:

```bash
TEST_DATABASE_URL='<disposable-local-url>' npm run test:integration
TEST_DATABASE_URL='<disposable-hilal_test-url>' node tests/bootstrap-check.mjs
TEST_DATABASE_URL='<disposable-local-url>' node tests/operations.mjs
```

`tests/browser-fixture.mjs seed|cleanup` yalnız sintetik fixture-ləri idarə edir. `tests/browser.py` hazır localhost serverində Playwright yoxlamasıdır. `BROWSER_BASE_URL` lokal HTTPS origin də ola bilər. `tests/https-proxy.mjs` və sintetik sertifikat yalnız lokal production testidir; production reverse proxy deyil. Fixture credential faylı private `/tmp` yolundadır; onu paylaşmayın.

Dependency audit-də qalan advisories, canlı TLS/ingress, encrypted backup/scheduler/monitoring və real yük yoxlaması tamamlanmadan production hazırlığı elan edilmir. Mövcud paralel Auth.js dependency dəyişiklikləri silinməyib; cari autentifikasiya onları istifadə etmir.
