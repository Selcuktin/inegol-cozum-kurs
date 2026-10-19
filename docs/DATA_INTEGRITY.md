# Veri bütünlüğü ve kayıt akışı

## Kaynağın sahibi

Kalıcı öğrenci, sözleşme, gelir, taksit ve tahsilat kayıtlarının kaynağı D1'dir.
Tarayıcının belleği yalnızca okuma görüntüsüdür. `localStorage` iş kayıtlarını
saklamaz; oturum, tercih ve sekmeler arası değişiklik bildirimi için kullanılır.
Bir servisin `get*` çağrısı kayıt oluşturmaz, eski ekran parametrelerini belleğe
yazmaz ve ağ isteği başlatmaz. Başarılı bir boş liste de geçerli sonuçtur.

`GET /api/dashboard`, listeleri ve mali toplamları aynı D1 `batch` işlemiyle okur.
`useAppData` ve muhasebe servisinin tam yenilemesi bu görüntüyü kullanır.
Gelir eşleştirmesinin `contract_id` ve `sozlesme_no` alanları ayrı indeksler
kullanır. Mevcut kurulumda `0002_add_relational_indexes.sql` içindeki bu iki
`CREATE INDEX IF NOT EXISTS` ifadesi uygulanmalıdır. CI, ana dal yayınından önce
yalnız bekleyen D1 migration'larını çalıştırır; elle Pages yayını tek başına
şema güncellemez. Eski veritabanı için önce doğrulanmış `d1_migrations` başlangıcı
gerekir; geçmiş veri migration'ları körlemesine tekrarlanmaz. Yeni kurulum için `schema.sql` de aynı
indeksleri içerir. `node tests/income_indexes.mjs`, gerçek dashboard sonuçlarının
değişmediğini ve iki arama dalının indeks kullandığını yerel SQLite'ta doğrular.
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
Mali snapshot servis ve kök ekran arasında paylaşılır. LGS ekranı tek başına
açılırken mali snapshot okunmaz; mali ekran/işlem açıldığında yüklenir. Sekmeler
arası bildirim işlem yolunu da taşır; LGS yazması diğer sekmede gereksiz mali
yenileme başlatmaz. Taksit okumalarının sürümü sözleşme anahtarına göre ayrıdır.
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

Bir taksitte birden fazla kısmi ödeme olabilir. Makbuz listesi tutar/tarih/işlem
kimliğini ve iptal durumunu gösterir; aynı tutarlı iki gerçek ödeme birleştirilmez.
Birden fazla aktif ödeme varsa iptal isteği seçilen `payment_id` değerini taşır;
sunucu taksit kimliğinden sessizce son ödemeyi seçmez. İptal kaydı silinmez.

## Toplu işlemlerin sorgu bütçesi

Yoklama, ödev teslimi ve sınav sonucu listeleri JSON üzerinden toplu yazılır;
öğrenci başına ayrı sorgu veya ayrı işlem açılmaz. Öğrenci kimlikleri tek okumada
kontrol edilir. Yoklama/teslimin önceki kayıtları da tek sorguyla okunur ve
aynı toplu işlem içinde yeniden denetlenir. Sonuç, liste uzunluğuyla büyümeyen
sorgu sayısı ve bütünüyle geri alınabilen yazmadır.

120 öğrencilik üç senaryo, test adaptöründe 50 sorguluk üst sınırla çalışır;
parametre sınırı da her sorguda ayrıca denetlenir. Bu bütçe
[Cloudflare D1 sınırlarına](https://developers.cloudflare.com/d1/platform/limits/)
göre seçilmiştir. Gerçek edge CPU süresi ve günlük hesap kotası ayrı sınırlardır.

## Tekrar çalıştırılabilir kontroller

Node 22.13 veya üstü gerekir. Üretim veritabanına test kaydı yazılmaz.

```powershell
cd frontend
npm test -- --runInBand
$env:CI='true'; npm run build
cd ..
node tests/audit_real_sqlite.mjs
node tests/system_integrity.mjs
node tests/admin_workflows.mjs
```

| Katman | Kontrol edilen davranışlar |
| --- | --- |
| Bileşen/servis | Formdan istek, eski yanıt sırası, sekme bildirimi, oturum değişimi, kirli form, sıfır/boş sonuç, gelir kimliği, takvim ayı, tekrar gönderim |
| Gerçek yönlendirici + SQLite | Öğrenci/sözleşme/gelir/taksit/tahsilat ilişkileri, yetki, doğrulama, iptal, dosya/rapor/yedek uçları, işlem geri alma |
| Uzun işlem dizileri | 40 sabit tohumla tahsilat, iptal, özel plan, öğrenci mali düzenleme ve tekrar okuma; her adımda kuruş ve kayıt ilişkileri |
| Hata enjeksiyonu | Doğrulamadan sonra değişen kayıt, toplu işlemin ortasında veritabanı hatası, bozuk JSON, bağlantı hatası |

GitHub yayın iş akışı üç gerçek SQLite taramasını da çalıştırır. Başarılı
test sayısı tüm olası davranışların kanıtı değildir. Fiziksel yazıcı, harici
mesajlaşma sağlayıcısı ve gerçek mobil tarayıcı ayrıca doğrulanmalıdır.

## Yönetim, dönem ve rapor kontrolleri

`admin_workflows.mjs` ağ cevabı kaybolmuş tahsilat/giderin yeniden gönderilmesini,
eş zamanlı gider kayıtlarını, dönem sözleşmesi oluşturmayı, iptal edilen borçla
korunan nakit geçmişini, büyük listeleri ve PDF/CSV sonuçlarını gerçek SQLite
üzerinde kontrol eder. Yeni sözleşmenin öğrenciye bağlanması, öğrenci dönemini de
aynı işlemde günceller. Mevcut kayıtlara toplu dönem düzeltmesi uygulanmaz.

Gider formları her açılışta bir işlem kimliği alır; tekrar denemeler bu kimliği
korur. Sunucu aynı kimlikle farklı bir gideri kabul etmez. Ortak `Button` bileşeni
`disabled`, `type` ve diğer yerel düğme alanlarını gerçek düğmeye aktarır.

Aylık önizleme başarılı boş listeleri korur; örnek gider üretmez, iptal tahsilatı
ve iptal sözleşmenin vadesini toplama katmaz. Nakit raporu eski dönemden gelen
gerçek tahsilatı tarihine göre içerir; bu tutar yeni dönem borcunu düşürmez.
İptal, otomatik iade hareketi oluşturmaz; bu denetim gerçek para iadesi akışı
oluşturmaz. İptal makbuzu çıktısında iptal durumu görünür ve geçerli makbuz
olarak e-posta gönderilemez.

CSV alanları tarayıcı ve sunucuda aynı `csvCell` ile kaçırılır. Rapor/export
okumaları bir D1 batch içinde alınır; muhasebe hesabının tüm kayıtlar dışa
aktarması yönetici denetim günlüğünü içermez. Sayfa parametreleri doğrulanır;
liste küçülünce geçerli sayfaya dönülür. Dört ana listenin baskısı filtrelenen
tüm satırları içerir, baskı bittiğinde normal sayfalama geri gelir.

PDF ilk 20 satırda kesilmez; giderleri de içerir, kuruşları korur, sayfa ve xref
ofsetlerini hesaplar. İndirilebilir PDF, gömülü Ubuntu yazı tipi alt kümesi ve
ToUnicode eşlemesiyle Türkçe harfleri korur. Latin/Türkçe dışındaki yazı sistemleri
için alt kümenin genişletilmesi gerekir. Çalışma anında yeni PDF bağımlılığı yoktur.
Senet çıktısı kayıtlı taksitleri kullanır; boş plan için ödeme planı üretmez.
Sözleşme bağlantısı bulunamayan kimliği, hatırlanan öğrenci adıyla eşleştirmez.

`usePrintTarget`, baskı sırasında son açılan belgeyi ve onun üst eleman yolunu
işaretler; arka plandaki ekranları gizler. İşaretler baskı sonrası ve bileşen
kapanışında temizlenir. Sözleşme/makbuz sabit yüksekliğe kesilmez. Taksitlerden
toplam tutarlı makbuz üretilmez; her gerçek tahsilat kendi kimlik ve tutarıyla açılır.
Ödeme planı dökümü de senet gibi kayıtlı planı kullanır. Makbuzdaki yazdırma
düzenlemeleri kalıcı tahsilatı değiştirmez; başka belgeye geçince sıfırlanır.
Sözleşme öğrenci kimliği yeniden biçimlendirme sırasında kaybolmaz; kimlik,
eski numara eşleşmesinden önce gelir. İptal sözleşmenin MEB/plan çıktısı arşiv
olarak işaretlenir. MEB önizlemesinde eksik düzenleme tarihi/numarası/sınıf/dönem
uydurulmaz. Gelir detayındaki taksit makbuzu da kayıtlı tahsilatı kullanır;
makbuz e-posta isteği ortak oturumlu API istemcisinden geçer.

İsteğe bağlı görsel kontrol (geliştirme araçları: WeasyPrint/Pango, pypdf, Poppler):

```powershell
cd frontend
$env:PRINT_FIXTURES='1'; npm test -- --runInBand --runTestsByPath src/__tests__/print_integrity.test.js
cd ..
python tests/verify_print_layout.py
```

Bu komut anonim belge örneklerini gerçek bileşenlerden alır; sözleşme, uzun
açıklamalı makbuz, üç senet ve 120 taksitli planı bağımsız baskı motorunda doğrular.
Fiziksel yazıcı/Chromium çıktısının yerine geçmez. Font alt kümesi geliştirme
zamanında `frontend/scripts/build_report_font.py` ile yeniden üretilebilir;
gerekli font lisansı asset klasöründedir.

Yoklama uygulamanın gezinmesinden ve öğrenci profilinden kaldırılmıştır;
veritabanındaki tarihçe ve yedekleri korunur. Optik okuma, sınav/karne,
kalibrasyon ve ders programı korunur. Bu tur yeni akademik işlev testi eklenmez;
mevcut regresyon testleri yayın kontrolünün parçası olmaya devam eder.
