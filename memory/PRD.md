# İnegöl Çözüm Kurs Yönetim Sistemi PRD

## Orijinal problem tanımı
İNEGÖL ÇZÜM KURS işletme sahibiyim işimiz eğitim. Gelen giden muhasebe durumunu anlık takip edeceğim; veli ve öğrenci ad soyad telefon, okul bilgileri gibi bilgileri kaydedeceğim. PDF olarak verilecek sözleşmeyi otomatik veren, makbuz veren ve genel toplamdan düşen; sınıf oluşturabileceğim, otomatik çıktı alabileceğim bir kurs programı istiyorum. Banka seçimi, nakit, çek ve kredi kartı seçenekleri; tahsilat takibi; öğrenci fotoğrafını PC kamerası ile aktarabilme isteniyor.

## Mimari kararlar
- React 19 + FastAPI + MongoDB kullanıldı.
- Frontend tüm API çağrılarını `REACT_APP_BACKEND_URL` üzerinden `/api` ile yapar.
- Öğrenci, sınıf, tahsilat ve gider kayıtları MongoDB koleksiyonlarında UUID tabanlı kayıtlarla tutulur; Mongo `_id` alanı response’lara taşınmaz.
- Belgeler tarayıcı yazdırma akışıyla hazırlanır; kullanıcı yazdırma ekranından PDF olarak kaydedebilir.
- Kamera akışı tarayıcı `getUserMedia` ile alınır; izin verilmezse form çalışmaya devam eder.

## Kullanıcı personası
- **Kurs işletme yöneticisi:** Günlük tahsilat, gider, kalan bakiye ve geciken ödemeleri hızlı görmek ister.
- **Kurs kayıt personeli:** Öğrenci/veli bilgilerini, okul-sınıf ve program bilgilerini kaydeder; sözleşme ve makbuz çıktısı alır.

## Sabit çekirdek gereksinimler
- Türkçe ve kurumsal, hızlı yönetim paneli
- Dashboard: tahsilat, kalan alacak, aktif öğrenci, gider özeti
- Öğrenci/veli kayıtları: ad-soyad, telefon, okul, sınıf, TC, adres, program, ücret, taksit
- Öğrenci ve veli araması
- Sınıf oluşturma ve derslik/öğretmen/kontenjan bilgileri
- Nakit, çek, kredi kartı ve banka transferi tahsilatı
- Banka, tarih, tutar, açıklama bilgileri ve otomatik kalan bakiye
- Pozitif tutar ve aşırı tahsilat doğrulaması
- Yaklaşan/geciken ödeme görünümü
- Sözleşme ve ayrı tahsilat makbuzu önizlemesi
- Logo alanı için kurumsal başlık yapısı
- Kamera ile öğrenci fotoğrafı çekme
- Mobil uyumlu menü ve yatay taşma olmadan görünüm

## Uygulananlar
### 2026-09-29
- Yönetim paneli, responsive sidebar ve mobil menü oluşturuldu.
- Dashboard, öğrenci bul, tahsilat, sınıflar ve sözleşme/makbuz ekranları eklendi.
- Demo öğrenci ve sınıf kayıtlarıyla ilk açılış görünümü hazırlandı.
- Öğrenci/veli kayıt formu ve MongoDB öğrenci endpoint’leri oluşturuldu.
- Tahsilat formu, ödeme yöntemleri, banka alanı, tarih, açıklama ve kalan bakiye güncellemesi eklendi.
- Gider ve sınıf kayıt endpoint’leri eklendi.
- Pozitif tutar, kalan bakiyeyi aşmama ve modal içi görünür hata yönetimi eklendi.
- Sözleşme ile makbuz için ayrı yazdırma önizlemeleri oluşturuldu.
- Kamera izin akışı ve fotoğraf yakalama kontrolü eklendi.
- Mobil taşma ve mobil menü sorunları düzeltildi.
- Backend ve frontend regresyon testleri tamamlandı.

## Öncelikli backlog
### P0 — Sonraki temel iş
- Gönderilecek gerçek sözleşme PDF şablonunu yükleyip alan eşleştirme yapmak.
- Gerçek kurs logosu ve kurum renklerini ayarlara bağlamak.
- Gider ekleme ekranını dashboard üzerinde görünür hızlı aksiyona bağlamak.

### P1 — Operasyonel geliştirmeler
- Taksit planını ayrı kayıtlar halinde üretip her vade için durum takibi yapmak.
- Öğrenci detay ekranında sözleşme, ödeme geçmişi ve fotoğrafı birlikte göstermek.
- Excel/CSV öğrenci ve tahsilat raporu dışa aktarma.
- Aylık tarih filtresini kullanıcı seçimine bağlamak.

### P2 — İleri seviye geliştirmeler
- Kullanıcı rolleri ve güvenli oturum açma.
- Toplu makbuz ve sözleşme çıktısı.
- SMS/e-posta ile yaklaşan ödeme bildirimi.
- Muhasebe dönem kapanışı ve arşiv raporları.

## Sonraki görev listesi
1. Gerçek PDF sözleşme ve logoyu almak.
2. Taksit planı ekranını eklemek.
3. Gider hızlı ekleme ve gider raporunu görünür hale getirmek.
4. Öğrenci detay ekranını genişletmek.