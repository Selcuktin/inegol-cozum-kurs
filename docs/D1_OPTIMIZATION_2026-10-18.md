# D1 tüketimi ve eşzamanlı okuma azaltma — Çözüm

18 Ekim 2026. Kaynak branch: `codex/data-safe-audit-2026-10-15`,
commit `f1aa8e5`. Bu optimizasyon PR'ı o branch'i baz alır (ana veri
bütünlüğü PR #1 üzerine kuruludur). Üretime deploy/migration yapılmadı.

## Canlı ölçümün doğru yorumu

UTC 17 Ekim GraphQL ölçümü: **4.157.940 satır okuma**, 433 satır yazma,
2.746 okuma sorgusu. Hesap toplamı 4.249.597 satırdır.
18 Ekim yaklaşık 12.02 TRT ölçümünde bu DB için yeni gün grubu dönmedi.
Eski günün tüketimi yeni güne taşınmış sayaç değildir.

Son 24 saat Query Insights'ta dashboard sözleşme listesi 109 çalışmada 1.660.336,
sözleşme özet toplamı 87 çalışmada 1.515.453 satır okumuştu. Pencereler UTC gün
toplamıyla aynı değildir; bu iki sonuç günlük toplam diye birleştirilemez.
İki sorguda sözleşme başına `student_incomes` araması yüksek taramaya neden olmuş.

Ancak indeks düzeltmesi önceki çalışmada zaten yapılmış: 17 Ekim 23.22 TRT
`f1aa8e5` commit'i ve canlı `sqlite_master` kontrolü
`idx_student_incomes_contract_id`, `idx_student_incomes_sozlesme_no` indekslerini
doğruluyor. Bunları yeniden oluşturacak migration/üretim DDL uygulanmadı.
Geçmiş maliyet, indekslerin bugünkü etkisizliği diye yorumlanmadı.

## Yeni değişiklik

Ortak Axios synchronization sınırı aynı hesap/generation içindeki aynı anda
çalışan özdeş GET isteklerini tek ağ isteğinde birleştirir. Örneğin dashboard'ın
iki eşzamanlı yüklenmesi 13 sorguluk batch'i iki kez göndermek zorunda değildir.
Tamamlanmış yanıt saklanmaz; sonraki refresh yeni istek yapar.

URL/parametre, Authorization/HTTP auth, yanıt türü, timeout ve credential/XSRF
ayarları ayrı kimliklerdir. İptal sinyali, özel durum kabul fonksiyonu veya GET
body'si olan istekler birleştirilmez. Yazma/oturum değişimi generation'ı değiştirir:
eski yanıt kabul edilmez, güncel okuma yeniden yapılır. Edge/public cache eklenmedi;
özel öğrenci ve finans verisi farklı kullanıcılara paylaştırılmaz.

## Kanıt

- İki özdeş eşzamanlı Axios okuması: iki HTTP yerine bir adapter çağrısı.
  Sonraki refresh tekrar çağrı yapar; farklı filtre/Authorization/HTTP auth
  birleşmez. Araya yazma girerse iki abone de güncel generation'ı alır.
- `tests/d1-query-budget.mjs`: 133 sentetik sözleşmede gerçek yerel workerd
  D1 binding ile eski indeks eksikliği ve mevcut 0002 migration'ı karşılaştırılır.
  İki gerçek dashboard sorgusu toplam **36.720 → 1.203 rows_read**;
  finansal sonuçlar birebir aynı, migration tekrarı güvenli.
- Wrangler CLI'nin local SQL yanıtı yalnız duration verebildiğinden satır
  ölçümü CLI duration'dan türetilmez; `getPlatformProxy` binding meta'sı kullanılır.
- Yerel Jest, gerçek SQLite finans senaryoları, üretim build ve yerel D1
  kontrolü çalıştırıldı. Güncel sayılar ve GitHub CI sonucu PR'da raporlanır.
- Mevcut yarn.lock audit sonucu: 8 moderate + 11 high = 19 bağımlılık uyarısı;
  lockfile bu PR'da değiştirilmedi. Audit temiz diye raporlanmaz.

Ölçülen fixture kazanımı, canlı hesapta aynı günlük tasarrufun garantisi değildir.
Üretim load/write/delete testi ve hassas veri export'u yapılmadı.
Backup sıklığı/değeri değiştirilmedi.

## Yayın / geri dönüş

Yeni şema migration'ı ve secret gerekmez; var olan indeksler doğrulandı.
Önce temel PR #1 ve bu PR'ın ilişkisi, CI ve audit bulguları incelenir.
Bu repoda main'e merge otomatik Pages deploy tetiklediğinden, sahibin üretim
onayı alınmadan main merge edilmez. Feature tabanlı PR'larda da CI çalışır;
deploy adımının yalnız main koşulu korunur.
Onaylı yayın sonrası metrikler benzer trafik penceresinde karşılaştırılır.
Sorunda önceki Pages deployment'ına dönülür; finans verisi geri yüklenmez.
