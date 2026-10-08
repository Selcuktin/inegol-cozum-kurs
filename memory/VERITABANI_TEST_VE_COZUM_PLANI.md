# İnegöl Çözüm Kurs — Veritabanı, İşlev ve Bağlam Testi / Çözüm Planı

**Kapsam:** Mevcut `/app` kaynak kodu ve önizleme; sadece test/inceleme. **Hiçbir gerçek öğrenci veya muhasebe kaydı değiştirilmedi; uygulama kodu düzeltilmedi.**  
**Kanıt düzeyi:** “Tekrar üretildi” test veya salt okunur istekle görüldü; “koddan saptandı” gerçek D1 üzerinde henüz tekrar edilmedi. Önizleme ile kurumun Cloudflare'daki canlı ortamı aynı kabul edilmemelidir.

## Ne test edildi, nerede sınır var?

| Alan | Sonuç | Kapsam sınırı |
|---|---|---|
| Masaüstü/mobil açılış | Giriş ekranı açılıyor, 390px'de taşma yok | Oturum sonrası ekranlar açılamadı |
| Önizleme API'si | `/api/auth/me`, `/api/status`, `/api/contracts/deleted-keys` **502** | Cloudflare D1 erişim testi değildir; bu ortamda `/app/backend` bulunmuyor |
| Var olan otomatik testler | **11 paket / 123 test başarılı** | Büyük kısmı `localStorage` / JSON örneklerine bakar, gerçek D1 okuma-yazması değildir |
| Derleme | `CI=true yarn build` başarısız (React hook lint uyarıları); `CI=false yarn build` başarılı, uyarılı | Ürün mantığının doğruluğunu kanıtlamaz |
| Geçici SQLite şeması | 20 tablo açıldı; 2 örnek öğrenci, 65 örnek sözleşme, 70 örnek gelir | **Yalnızca `frontend/schema.sql` örnek verisi; canlı D1 sayıları değildir** |
| Şema mutabakatı | 65/65 sözleşmenin öğrenci ID'si örnek öğrencilerde yok; 70/70 gelirin `contract_id` alanı boş; sözleşme numarasına göre 5 gelir eşleşmiyor; 3 gelirde brüt ≠ tahsilat + kalan; 65 sözleşme bağlı dönemin bitişinden sonra tarihli; ilişkisel FK tanımı 0 | Örnek veri geçmiş sistemden kısmi aktarılmış olabilir; canlıdaki sayılar ayrıca ölçülmeli |

Yerel şema sayımları tekrar: `python3 /app/tests/schema_integrity_check.py`. Tam test notları: `/app/test_reports/iteration_1.json`.

## Bulgular ve düzeltme önceliği

### P0 — Önce güvenli erişim ve para akışı

1. **Önizleme API'si çalışmıyor — tekrar üretildi.** React derleme sunucusu giriş ekranını sunuyor, ancak tüm kontrol edilen `/api` çağrıları 502. Supervisor `backend` var olmayan `/app/backend` dizinini bekliyor; asıl API Cloudflare Pages Function. **Çözüm:** FastAPI/Mongo ekleyerek farklı ürün yaratmayın; test ortamında Pages Functions'ı yerel D1 kopyası ile çalıştırın veya önizleme `/api` yolunu işleyen uygun servise yönlendirin. D1 bağlaması ve şema göçü tamamlanmadan veri taşıma/yazma testi yapmayın. **Kabul:** `/api/status` 200, kimliksiz `/api/auth/me` 401, yetkili test oturumuyla okuma isteği 200 ve test D1 verisi.

2. **API'de yetki denetimi yazma akışlarında uygulanmıyor — koddan saptandı.** `frontend/functions/api/[[route]].js:1033-1035,1379-1429,1438-1516,1584-1685,2695-2755`: `getCurrentUser` çağrısı `null` dönse bile çoğu uç yazmayı sürdürüyor. Öğrenci ve finans okuma yollarının çoğu da rol denetimsiz. `App.js:180-205` yalnızca arayüz görünürlüğünü düzenliyor. **Çözüm:** API girişinde ortak 401/403 yetki kontrolü, her route için rol tablosu; yedekleme/geri yükleme yalnız yönetici. Mevcut hızlı giriş parolalarının kaynak kodunda tutulması ayrıca kaldırılmalı. **Kabul:** kimliksiz okuma ve yazma 401, yanlış rol 403, yetkili rol başarılı; izinsiz istek DB'yi değiştirmez. Bu canlıda saldırı yaşandığına ilişkin kanıt değildir.

3. **Tahsilat iki kere yazılabiliyor — koddan saptandı.** `App.js:4100-4111` ve `components/MuhasebeV2Dashboard.js:1064-1082` önce `POST /payments` yapıyor; sonra `edesisAccountingService.js:840-856` içindeki `recordCollection` bir kez daha `POST /payments` başlatıyor. API iki istekte de `students.paid_amount` değerini artırıyor (`[[route]].js:1438-1472`). Ayrı tahsilat ekranı (`EdesisTahsilatListesi.js:1088-1101`) ise sadece yerel başarıyı esas alıp uzaktan isteği beklemiyor. **Çözüm:** tek yazar API; tek ödeme ID'si/idempotency anahtarı; ödeme/öğrenci borcu/gelir/taksit satırlarını işlemsel güncelleme; yerel ekranı sunucu yanıtından yenileme. **Kabul:** bir tıklama ve istek tekrarı toplamda tek ödeme, tek bakiye düşüşü; silme/iptal önceki toplamı doğru geri alır; ikinci cihaz aynı sonucu görür.

4. **Ücret sözleşmesi çelişkili — koddan saptandı.** `EdesisStudentModal.js:132-146,236-275` ek ücret ve indirim sonrası tutarı `total_fee` alanına koyarken ayrıca `extra_fees` ve `discount_amount` gönderiyor. API `[[route]].js:102-110` bu ek ücret/indirimi bir kez daha uyguluyor; fakat otomatik sözleşmeyi `total_fee` ile kuruyor (`1183-1232`). Örnek: 35.000 + 8.000 ek = 43.000 TL sözleşme, öğrenci kalan borcu 51.000 TL görünebilir. **Çözüm:** `total_fee` yalnız baz ücret olsun, `effective_total` yalnız sunucuda hesaplanıp sözleşme/gelir/öğrenci/taksitte ortak kullanılsın; düzenleme sırasında ilişkili tutarları tutarlı güncelleyin. **Kabul:** baz + ek − indirim = sözleşme brütü = gelir brütü = ödeme öncesi kalan, tekrar kaydetmede değişmez.

### P1 — Kayıtların birbirini doğru göstermesi

5. **Üç farklı veri kaynağı ve çift sözleşme üretimi — koddan saptandı.** API öğrenciyi eklerken sözleşme/gelir oluşturuyor (`[[route]].js:1152-1236`); `App.js:4072-4093` ve `EdesisStudentModal.js:243-293` ayrıca tarayıcıya `AccountingService.addNewIncome` kaydı yazıyor. Düzenleme yolunda da sözleşme ekleme PATCH'ten önce çalışıyor. `edesisStudentService.js:209-345` JSON, tarayıcı ve sunucu kayıtlarını isim bazında birleştiriyor; aynı adlı iki öğrencinin birbirine karışma riski var. **Çözüm:** D1 kayıtları tek doğruluk kaynağı; geçmiş Edesis JSON'u yalnız açıkça etiketlenmiş ve ID eşleştirilmiş içe aktarım için; istemcide kayıt üretme yerine API dönen ID/numara gösterilsin. **Kabul:** yeni kayıt ve düzenleme sonrasında aynı öğrenci ID'sine bağlı tam bir sözleşme ve gelir, farklı tarayıcıda aynı veriler; ada göre çakışma yok.

6. **Silme başarısız olsa bile ekranda silinmiş görünebilir — koddan saptandı.** `edesisStudentService.js:93-150` önce yerel anahtarları işaretliyor, `fetch` yanıt kodunu hiç kontrol etmiyor; `edesisAccountingService.js:882-974` sözleşme silmesini beklemeden yerel tombstone yazıyor. API `/students/:id` `[[route]].js:1422-1431` ID **veya isimle** bağlı kayıtları siliyor; aynı isimli başka öğrenci etkilenebilir. **Çözüm:** yalnız değişmez ID ile eşleştirme; sunucu başarılı olduktan sonra istemciyi yenileme, hata durumunda geri alma; ilişkili işlemleri tek DB işlemi ve audit ile yönetme. **Kabul:** aynı isimli iki öğrenci ayrı kalır; ağ hatasında yanlış başarı gösterilmez; iki cihazda silinme tutarlıdır.

7. **Örnek şemada ilişki ve bakiye boşlukları — tekrar üretildi, yalnız örnek veri.** `schema.sql` ile yapılan bellek SQLite testi: yukarıdaki 65/5/70/3 sayıları; `students`, `contracts`, `student_incomes` için FK yok. **Çözüm:** önce canlı D1'in salt okunur istatistiklerini çıkartıp örnek aktarım ile gerçek veriyi ayırın; haricî Edesis kimliklerini eşleme tablosuna taşıyın; yedek alın, kademeli migration ve yetim kayıt onarımı sonrası FK/UNIQUE/CHECK ve tutar mutabakatı ekleyin. **Kabul:** referansı olmaması gerekmeyen güncel kayıtlarda orphan=0 ve kabul edilen iptal/iade istisnaları dışında tutar farkı ≤0,01 TL.

8. **Dashboard yanlış gösterebilir — koddan saptandı.** `[[route]].js:134` içindeki `|| true` tüm öğrencilere `has_contract=true` verir. `[[route]].js:391-423` veri sayısı/tutarı 0 iken geçmiş sabit rakamlara döner. `schema.sql:343-344` “aktif” dönem 2024-2025 tarihli, sözleşme örnekleri 2026-2027. **Çözüm:** sahte sıfır yerine gerçek 0/hata durumu; gerçek sözleşme varlığı ve seçilen döneme göre filtre; tüm KPI'lar aynı SQL kaynaklarından hesaplanmalı. **Kabul:** boş test DB'de sıfır görünür, sözleşmesiz öğrencide false, dönem değişiminde yalnız ilgili kayıtlar sayılır.

9. **Vade ve sınıf bağlamı hataları — koddan saptandı.** `edesisAccountingService.js:648-695` gelir vadesi kullanıcı tarihini alıyor ama taksitleri kayıt gününden türetiyor; `[[route]].js:1047` sınıf adı / sınıf ID'si ternary önceliği nedeniyle sınıf adı varken bile `String(classroomId)` yazabilir. **Çözüm:** ilk taksit tarihini tek API kuralı yapın, ay sonu/Şubat sınırlarını test edin; sınıfı doğrulanmış ID ve ad ile ilişkilendirin. **Kabul:** seçilen ilk vade taksit-1 ile aynı, sınıf adı ekranda doğru; ay geçişleri istikrarlı.

### P2 — Ürünün doğrulanabilir olması

10. **Mevcut testler entegrasyonu ölçmüyor.** `frontend/src/__tests__` testleri çalışıyor; fakat D1, iki cihaz ve gerçek API istekleri yok. Yeni izole D1 testlerinde kayıt→sözleşme→taksit→kısmi/tam tahsilat→iptal/silme→rapor; iki aynı ad, istek tekrarı, bağlantı kesintisi ve yetkiler sınanmalı. `CI=true` build'i durduran hook uyarıları (`App.js`, `EdesisModules.js`, bazı bileşenler) düzeltilmeli; kuralları susturmak çözüm değil.

11. **Yedek geri yükleme kısmi başarısızlığı gizleyebilir — koddan saptandı.** `[[route]].js:2695-2762` tabloları tek tek silip yükler, hataları loglayıp yine `ok:true` dönebilir; “20:00 yedeği” sadece `GET /backup` çağrısında (`2607-2651`) tetiklenir. **Çözüm:** çevrim dışı, izole kopyada işlem/rollback ve manifest doğrulaması; zamanlama iddiasını gerçek tetikleyiciyle eşleştirin. **Kabul:** kısmi geri yüklemede başarı dönmez, önceki duruma geri alınabilir ve boş günlerde yedek planı izlenir.

## Önerilen yürütme sırası / kontrol kapıları

1. **G0: İzole veri ortamı.** Cloudflare Pages Functions + D1 yerel kopyası, güvenli test hesapları ve yedek; veri yazma yalnız bu ortama. Canlı D1 sorguları sadece salt okunur ve yetkili kullanıcı onayıyla.
2. **G1: Erişim ve şema.** Önizleme 502 kaldırılır; route yetkileri 401/403; salt okunur gerçek veri mutabakatı alınır; temizleme/göç haritası hazırlanır.
3. **G2: Tek işlem akışı.** Bir öğrenci→bir sözleşme/gelir→plan; bir tahsilat→bir hareket ve eşit bakiyeler; retry/silme/başka tarayıcı testleri geçer.
4. **G3: Raporlama ve güvence.** Sıfır veri, dönem, vade, rapor ve yedekleme testleri; 123 mevcut test + yeni D1 entegrasyon testleri ve CI derlemesi yeşil.

**Not:** `/app/memory/test_credentials.md` önceki MongoDB dönemine ait ve güncel D1 test hesabı kanıtı değildir; oradaki yerel oturum talimatlarıyla gerçek hesaplara giriş denemesi yapılmamalıdır. Koddan görülen bulguların gerçek verideki etkisi, G0 sağlandıktan sonra ölçülebilir.