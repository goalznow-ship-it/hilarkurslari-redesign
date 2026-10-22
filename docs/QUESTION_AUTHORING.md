# Sual müəllifliyi və saxlama sərhədləri

Sual mətni və variantlar Unicode mətnidir. Azərbaycan hərfləri, `x²`, `√`, `≤`, `π`, alt indekslər və başqa simvollar saxlanır. Simvol düymələri simvolu sual mətninin sonuna əlavə edir. LaTeX, MathML və Word equation çevrilməsi yoxdur; HTML icra edilmir.

## Şəkillər

`Question.image` və indekslə uyğun gələn `Question.optionImages` elementləri `{ url, alt }` saxlayır. Alternativ mətn məcburidir. Ünvan HTTPS və ya sayt daxilində `/...` olmalıdır; ən çox 2048 simvol, alternativ mətn ən çox 500 simvoldur. `data:`, base64, `blob:`, HTTP və protokolsuz xarici ünvan qəbul edilmir.

Fayl yükləmə və server media anbarı yoxdur. Şəkil baytları localStorage-a yazılmır. Xarici mənbə dəyişə/silinə bilər; URL tarixçədə saxlanılsa da şəkil baytlarının tarixi surəti saxlanmır. Xarici host istifadəçinin şəbəkə məlumatını görə bilər; referrer göndərilmir. Sabit və istifadəsinə icazə verilmiş mənbə seçilməlidir. Nümayiş ölçüsü məhduddur, xarici faylın həqiqi şəbəkə ölçüsü yoxlanmır. Base64 faylları mövcud bankdan avtomatik silinmir.

Bank üçün 4 MiB konservativ UTF-16 mətn büdcəsi var. Bu, brauzerin quota zəmanəti deyil: imtahanlar/nəticələr də həmin origin yaddaşını bölüşür. Brauzer yazma xətası yenə yarana bilər; belə halda uğur göstərilmir. Şəkilli sual imtahana köçürüləndə yalnız URL/metadata kopyalanır.

## Excel / Word cədvəlləri

UTF-8 CSV (vergül/nöqtəli vergül) və TSV (tab) idxal edilir. Excel/Word cədvəlini başlıq sətri ilə yapışdırmaq olar. `.xlsx`, `.xls`, `.docx`, `.doc`, daxili şəkillər və düstur obyektləri birbaşa parse edilmir. Fayl həddi 2 MiB, yapışdırılmış mətn həddi 2×1024² UTF-16 vahididir; sətirlər bütövlükdə yoxlanır. Bir xəta/dublikat olduqda 0 sual yazılır; uğurlu idxal bütün bankı bir localStorage əməliyyatı ilə yazır.

Əsas sütunlar: `text,type,option1,option2,correct`. Variantlar `option3` ... `option100` ilə artırıla bilər. `correct` sıfırdan başlayan indeksdir; multiple üçün `0;2` kimi dəstdir. Mətn/variantlar boş qala bilməz; şəkilli variantın da mətn etiketi olmalıdır.

Əlavə sütunlar: `subject,topic,tags,grade,difficulty,explanation,points,image_url,image_alt`. Variant şəkilləri `option1_image_url,option1_image_alt` və digər uyğun indekslərlə verilə bilər. `tags` nöqtəli vergüllə ayrılır.

İxrac bütün variantları və `metadata` JSON sütununda tam sual surətini saxlayır. Bu sütun variant şəkilləri, tarix, təsdiq vəziyyəti və əlavə metadata üçün itkisiz daşınma üçündür; silinməməlidir. Təsdiq/rədd edilmiş və ya yoxlama tarixçəsi olan metadata yalnız administrator/koordinator tərəfindən idxal edilə bilər; digər rollar üçün bütün paket rədd edilir. İdxal yeni ID verir; görünən sütunlar redaktə ediləndə onlar üstündür. Mövcud suala ID ilə update deyil, yeni sual əlavə etmədir. UTF-8 BOM və spreadsheet formula escape ixracda tətbiq edilir. Formula hüceyrələri icra edilmir. Formula kimi başlayan mətnlər metadata ilə geri bərpa olunur.

## Sual təsdiqi və digər iş axınları

- Sual təsdiqi: administrator/koordinator pending sualı yoxlayıb təsdiqləyir. Müəllim/satıcı təsdiq edə bilməz. Redaktə sualı yenidən pending edir. Təsdiq bank üçündür; əvvəlki imtahan/nəticə surətlərini dəyişmir. Təsdiq imtahana daxil etmə üçün məcburi blok deyil. Rədd üçün səbəb məcburidir. Reviewer ID/adı, ISO vaxtı və qərar sualın reviewHistory siyahısına əlavə edilir; redaktə əvvəlki tarixçəni saxlayır. Bu, dəyişdirilməz server audit jurnalı deyil.
- İstifadəçilər: yaratma/redaktə/silmə, aktivlik, şifrə və satıcı təyinatı mövcuddur. LocalStorage brauzerlərarası hesab sistemi deyil.
- Satış: təyinat, FİN/bilet, təkrarların yoxlanması, tarixçə və hesabat mövcuddur. Ödəniş provayderi/geri qaytarma və server tranzaksiyası yoxdur.
- Şirkətlər: administrator ad, unikal kod və aktivlik saxlayır; imtahan və istifadəçi companyId ilə əlaqələnir. Köhnə qeydlər avtomatik təyin edilmir. Arxiv şirkət yeni təyinat üçün seçilmir, mövcud təyinat saxlanıla bilər. Fiziki silmə yoxdur. Bu, təşkilatlararası təhlükəsizlik izolyasiyası deyil.
- Tədris illəri: administrator YYYY-YYYY (ardıcıl illər) reyestrini idarə edir. Köhnə imtahan/sinif mətnləri və cari il yalnız oxunaraq siyahıya əlavə olunur; reyestrə avtomatik yazılmır. İstifadə olunan və ya tarixi/default dəyərdən alınan ilin adı dəyişdirilə bilməz; arxivləşdirmə tarixi mətnləri saxlayır. İmtahan və sinif redaktorunda aktiv illər və həmin qeydin mövcud arxiv ili seçilir. Fiziki silmə yoxdur. İmtahan kartı və sinif filtrləri əvvəlki academicYear mətnindən istifadə edir.
- Yeni nəticələr companyId/academicYear, satışlar companyId surətini saxlayır. Reyestr dəyişiklikləri əvvəlki nəticələri, sessiyaları və satışları yenidən yazmır.

Bütün icazələr brauzerdədir və dəyişdirilə bilər. Cross-tab oxu-dəyiş-yaz əməliyyatları yarışa bilər. LocalStorage istehsal autentifikasiyası, server icazələri, paylaşılmış anbar və tranzaksiya zəmanəti vermir. Köhnə şəkilsiz suallar/nəticələr oxunur; snapshot-u olmayan köhnə nəticələr cari imtahan suallarına söykənir.
