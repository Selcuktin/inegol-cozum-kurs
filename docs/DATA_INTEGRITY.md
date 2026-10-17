# Veri bütünlüğü ve kayıt akışı

## Kaynağın sahibi

Kalıcı öğrenci, sözleşme, gelir, taksit ve tahsilat kayıtlarının kaynağı D1'dir.
Tarayıcının belleği yalnızca okuma görüntüsüdür. `localStorage` iş kayıtlarını
saklamaz; oturum, tercih ve sekmeler arası değişiklik bildirimi için kullanılır.
Bir servisin `get*` çağrısı kayıt oluşturmaz, eski ekran parametrelerini belleğe
yazmaz ve ağ isteği başlatmaz. Başarılı bir boş liste de geçerli sonuçtur.

`GET /api/dashboard`, listeleri ve mali toplamları aynı D1 `batch` işlemiyle okur.
`useAppData` ve muhasebe servisinin tam yenilemesi bu görüntüyü kullanır.
Gelir ve taksit alanları servis sınırında ekranın kullandığı adlara çevrilir.
Gelir detayı kayıt bulunamayınca başka öğrenciye, ilk gelire veya üretilmiş bir
ödeme planına geçmez. Eşleştirme sözleşme/gelir/öğrenci kimliğiyle yapılır.

## Okuma ve yazma sırası

`src/lib/dataSync.js`, Axios ve `apiFetch` isteklerinin ortak sıralama sınırıdır.
Yazma sırasında başlayan okumalar yazmanın bitmesini bekler. Yazmadan önce
başlamış ve geç dönen okumalar yeniden okunur; eski sonuç güncel veri diye
yayımlanmaz. Sürekli değişiklik halinde üç denemeden sonra görünür hata döner.
Yazma isteği otomatik tekrarlanmaz.

Yazma sonu, diğer sekmenin bildirimi ve pencereye dönüş, ilgili okumaları
geçersiz kılar. Oturum veya API adresi değişince önceki hesabın belleği bırakılır.
`useDataRefresh` eski ekranın/filtrenin ve kapanmış bileşenin yanıtını kabul etmez.
Sunucu, kimlik doğrulamalı verileri tarayıcı veya ortak önbelleğe koydurmaz.

Bu mekanizma cihazlar arasında anlık mesajlaşma sağlamaz. Başka cihazdan gelen
değişiklik, sonraki okuma/pencereye dönüşte görülür; eski formun yazması ayrıca
sunucudaki çakışma kontrolünden geçer.

## Düzenleme ve hata davranışı

Öğrenci düzenlemesi yalnızca kullanıcının değiştirdiği alanları gönderir.
`_expected` alanı form açılırken görülen değerleri taşır. Öğrenci, sınıf,
öğretmen, ders programı, yoklama, ödev teslimi, cevap anahtarı ve randevu durumu
güncellemelerinde uyuşmayan değerler `409 RECORD_CHANGED` üretir.
Kontrol ile yazma arasındaki yarış da aynı D1 işleminin içinde denetlenir.
Eski istemciler için `_expected` isteğe bağlıdır; böyle bir istek yalnızca
sunucunun okuma/yazma aralığındaki değişikliklere karşı korunur.

Mali planlar ayrıca kayıtlı plan ve tahsil edilmiş taksitlere göre denetlenir.
İptal edilmiş sözleşmenin mali planı değiştirilmez. Bir toplu işlemde tek satır
hata verirse işlemin tamamı geri alınır. Yeni sözleşme aynı dönemin iptal edilmiş
geçmiş kaydını kullanmaz; mevcut aktif plan yeni kayıt isteğiyle değiştirilmez.

Tahsilat formları aynı form yeniden gönderildiğinde aynı işlem kimliğini korur.
Sunucu bu kimlikle ikinci tahsilatı oluşturmaz; farklı tutar/öğrenci için aynı
kimliğin kullanılması çakışmadır. İşlem kaydedilip sonraki okuma başarısız olursa
`WRITE_COMMITTED` hatası kaydın sunucuda olduğunu açıklar. Bağlantı cevabı hiç
ulaşmazsa sonuç belirsizdir; yeni bir işlem açmadan kayıt kontrol edilmelidir.

## Tekrar çalıştırılabilir kontroller

Node 22.13 veya üstü gerekir. Üretim veritabanına test kaydı yazılmaz.

```powershell
cd frontend
npm test -- --runInBand
$env:CI='true'; npm run build
cd ..
node tests/audit_real_sqlite.mjs
node tests/system_integrity.mjs
```

| Katman | Kontrol edilen davranışlar |
| --- | --- |
| Bileşen/servis | Formdan istek, eski yanıt sırası, sekme bildirimi, oturum değişimi, kirli form, sıfır/boş sonuç, gelir kimliği, takvim ayı, tekrar gönderim |
| Gerçek yönlendirici + SQLite | Öğrenci/sözleşme/gelir/taksit/tahsilat ilişkileri, yetki, doğrulama, iptal, dosya/rapor/yedek uçları, işlem geri alma |
| Uzun işlem dizileri | 40 sabit tohumla tahsilat, iptal, özel plan, öğrenci mali düzenleme ve tekrar okuma; her adımda kuruş ve kayıt ilişkileri |
| Hata enjeksiyonu | Doğrulamadan sonra değişen kayıt, toplu işlemin ortasında veritabanı hatası, bozuk JSON, bağlantı hatası |

GitHub yayın iş akışı bu iki gerçek SQLite taramasını da çalıştırır. Başarılı
test sayısı tüm olası davranışların kanıtı değildir. Fiziksel yazıcı, harici
mesajlaşma sağlayıcısı ve gerçek mobil tarayıcı ayrıca doğrulanmalıdır.
