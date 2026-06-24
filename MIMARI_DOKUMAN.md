# Halı Saha Rezervasyon Sistemi — Mimari Doküman

## 1. Sistem Genel Bakış

**Amaç:** Kullanıcıların halı saha rezervasyonu yapabildiği, işletmelerin saha yönetimini gerçekleştirebildiği, oyuncu bulma ve maç arama ilanlarının paylaşılabildiği çok kullanıcılı web uygulaması.

**Mimari Stil:** Tek Sayfa Uygulaması (SPA) + REST API
- **Frontend:** Statik HTML/CSS/JS (dosya sistemi üzerinden sunulur, panel tabanlı bölünmüş)
- **Backend:** Node.js + Express 5 REST API
- **Veritabanı:** MySQL (XAMPP ile yerel)
- **Kimlik Doğrulama:** Session-based + Google/Apple OAuth

---

## 2. Katman Mimarisi

```
┌─────────────────────────────────────────────────┐
│                  İSTEMCİ (Browser)               │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ index.html │  │ style.css│  │  script.js   │  │
│  │  (Yapı)    │  │  (Stil)  │  │  (Mantık)    │  │
│  └───────────┘  └──────────┘  └──────────────┘  │
│         ↕ fetch() / DOM manipülasyonu            │
├─────────────────────────────────────────────────┤
│                REST API (127.0.0.1:5000)          │
│  ┌─────────────────────────────────────────────┐  │
│  │         Express 5 Sunucu (server.js)         │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────┐  │  │
│  │  │CORS  │ │Rate  │ │JSON  │ │Router     │  │  │
│  │  │      │ │Limit │ │Parse │ │(Endpoint)│  │  │
│  │  └──────┘ └──────┘ └──────┘ └───────────┘  │  │
│  └─────────────────────────────────────────────┘  │
│         ↕ mysql2 (mysql2/promise)                 │
│  ┌─────────────────────────────────────────────┐  │
│  │         MySQL (XAMPP)                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │  │
│  │  │users/pitch│ │reservat.│ │subscriptions │ │  │
│  │  │forum/match│ │reviews  │ │pitch_objects │ │  │
│  │  └──────────┘ └──────────┘ └──────────────┘ │  │
│  └─────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│           DIŞ SERVİSLER                          │
│  Cloudflare Turnstile    Google/Apple OAuth      │
└─────────────────────────────────────────────────┘
```

### 2.1 Sunum Katmanı (Frontend)

**Mimari Yaklaşım:** Panel tabanlı bölünmüş HTML (C# WinForms benzeri).
Geliştirme parçalarda yapılır, `build.js` ile tek `index.html`'e birleştirilir.

```
┌─────────────────────────────────────────────────┐
│                 GELİŞTİRME                       │
│  html/                                           │
│  ├── _header.html            (panel ayrı)         │
│  ├── _customer-panel.html    (panel ayrı)         │
│  ├── _business-panel.html    (panel ayrı)         │
│  ├── _modals.html            (panel ayrı)         │
│  ├── _footer.html            (panel ayrı)         │
│  └── build.js          → index.html (derlenmiş)   │
└─────────────────────────────────────────────────┘
```

**Dosyalar:**
| Dosya | Rol | Satır |
|-------|-----|-------|
| `html/_header.html` | `<head>`, meta, CSS, header, navigasyon | ~100 |
| `html/_customer-panel.html` | Müşteri paneli (booking, players, matches, teams) | ~293 |
| `html/_business-panel.html` | İşletme paneli (stats, reservations, debts, settings) | ~377 |
| `html/_modals.html` | Tüm modal'lar (login, register, profile, confirm) | ~395 |
| `html/_footer.html` | Script bağlantısı, kapanış tag'leri | ~7 |
| `html/build.js` | Parçaları birleştirir → `index.html` | |
| `index.html` | **Derlenen çıktı** (düzenlenmez) | ~1171 |
| `style.css` | Tüm görsel stil, animasyonlar, responsive tasarım | ~2200 |
| `script.js` | Tüm iş mantığı, API çağrıları, DOM manipülasyonu | ~3400 |

**Build Komutu:**
```bash
npm run build    # → html/build.js → index.html
```

**Önemli Global Değişkenler:**
```
masterHoursList     → 24 saat dilimi (06:00 - 05:00)
fieldsData          → Statik saha verileri (6 adet)
pitchObjectsList    → Dinamik saha verileri (API'den yüklenir)
userReservations    → Tüm rezervasyonlar
loggedInUser        → Oturumdaki kullanıcı adı
currentUser         → Oturumdaki kullanıcı nesnesi
currentSelectedFieldKey / currentSelectedPitchNumber / currentSelectedHourBtn
```

### 2.2 İş Mantığı Katmanı (Backend)

**Sunucu:** `server.js` — ~2400 satır Express 5 uygulaması

**Middleware zinciri:**
```javascript
cors()                   → CORS başlıkları
express.json()           → JSON body parse
express-rate-limit       → Rate limiting (rezervasyon)
Hata yakalama middleware → JSON hata yanıtları
```

**Veritabanı Bağlantısı:**
```javascript
mysql2.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: process.env.DB_NAME || 'ksk_db',
    waitForConnections: true,
    connectionLimit: 10
})
```

### 2.3 Veri Katmanı (MySQL)

**Database:** `halisaha_kiralama` (`.env` ile yapılandırılır, fallback: `ksk_db`)

**Tablolar:**
| Tablo | İçerik | İlişkiler |
|-------|--------|-----------|
| `users` | Kullanıcı hesapları | reservations.user_id → users.id |
| `pitch_objects` | Saha özellikleri (fiyat, saat, kapalı günler) | field_key ile bağlı |
| `pitch_settings` | İşletme ayarları (field_count, pricing) | — |
| `reservations` | Rezervasyon kayıtları | user_id, fieldKey, pitchNumber |
| `subscriptions` | Haftalık abonelikler | fieldKey, pitchNumber |
| `forum_posts` | Oyuncu bulma ilanları | user_id |
| `match_seekers` | Maç arama ilanları | user_id |
| `field_comments` | Saha yorumları | fieldKey |
| `forum_comments` | İlan yorumları | post_id + type |
| `player_reviews` | Oyuncu değerlendirmeleri | playerPhone |
| `reviews` | Saha puanlamaları | reservation_id |
| `field_blacklists` | Saha kara listeleri | fieldKey, phone_number |
| `field_daily_hours` | Günlük çalışma saatleri | fieldKey + dayOfWeek |

---

## 3. API Referansı

### 3.1 Kullanıcı İşlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/register` | Kullanıcı kaydı (isim, telefon, email, şifre) |
| POST | `/api/login` | Kullanıcı girişi |
| POST | `/api/check-phone` | Telefon numarası kontrolü (OAuth) |
| PUT | `/api/users/profile` | Profil güncelleme (isim, telefon, yaş, boy, kilo, mevki, tecrübe) |
| POST | `/api/complete-profile` | OAuth sonrası profil tamamlama |

### 3.2 Rezervasyon İşlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/pitch-list` | Saha listesi (pitch_objects) |
| GET | `/api/reservations` | Tüm rezervasyonlar |
| GET | `/api/reservations/user/:userId` | Kullanıcıya özel rezervasyonlar |
| POST | `/api/reservations` | Rezervasyon oluştur (+ Turnstile doğrulaması) |
| PUT | `/api/reservations/:id` | Rezervasyon erteleme |
| DELETE | `/api/reservations/:id` | Rezervasyon iptali (soft-delete, status→cancelled) |
| GET | `/api/business-reservations/:fieldKey` | İşletme bazında rezervasyonlar |

### 3.3 Abonelik İşlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/subscriptions/:fieldKey` | Abonelik listesi |
| POST | `/api/subscriptions` | Abonelik oluştur (+ reservations kaydı) |
| DELETE | `/api/subscriptions/:id` | Abonelik sil (+ reservation iptal) |

### 3.4 Forum / Maç Arayan İşlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/forum` | Oyuncu bulma ilanı oluştur |
| GET | `/api/forum` | İlanları listele (filtrelemeli) |
| PUT | `/api/forum/:id/found` | İlanı "bulundu" işaretle |
| POST | `/api/match-seekers` | Maç arama ilanı oluştur |
| GET | `/api/match-seekers` | İlanları listele (filtrelemeli) |
| PUT | `/api/match-seekers/:id/found` | İlanı "bulundu" işaretle |

### 3.5 Yorum / Değerlendirme

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/field-comments/:fieldKey` | Saha yorumlarını getir |
| POST | `/api/field-comments` | Saha yorumu ekle |
| GET | `/api/forum-comments/:type/:postId` | İlan yorumlarını getir |
| POST | `/api/forum-comments` | İlan yorumu ekle |
| GET/POST | `/api/player-reviews` | Oyuncu değerlendirmeleri |

### 3.6 İşletme Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/business-login` | İşletme girişi |
| GET | `/api/operating-hours/:fieldKey` | Çalışma saatlerini getir |
| POST/PUT | `/api/operating-hours` | Çalışma saatlerini kaydet |
| PUT | `/api/business-profile/:fieldKey` | İşletme profili güncelle |
| POST | `/api/save-all-business-settings` | Toplu işletme ayarları kaydet |

---

## 4. Veri Akış Şemaları

### 4.1 Rezervasyon Akışı

```
Kullanıcı → Saha Kartına Tıklar
    ↓
selectField(key)
    ↓
pitchCount === 1 ? onDateOrFieldChange() : pitch seçimi bekle
    ↓
onDateOrFieldChange()
    ├─ Tarih/saha/pitch doğrulama
    ├─ Fiyat bilgisi yükleme
    ├─ Abone saatlerini kontrol
    ├─ Dolu saatleri kontrol
    └─ Grid render
    ↓
Kullanıcı → Saat Seçer + Turnstile Doğrular
    ↓
completeBooking()
    ├─ Aynı gün limit kontrol (max 3)
    ├─ Aktif toplam limit kontrol (max 2)
    ├─ Turnstile doğrulama
    ├─ Fiyat hesaplama (gündüz/akşam)
    └─ POST /api/reservations
    ↓
Server Side:
    ├─ Turnstile server-side doğrulama
    ├─ Kullanıcı durum kontrolü (banlı mı?)
    ├─ Kara liste kontrolü
    ├─ Limit kontrolleri (tekrar)
    ├─ Çakışma kontrolü
    ├─ Abonelik çakışma kontrolü
    └─ INSERT INTO reservations
    ↓
Başarılı → Modal göster → userReservations güncelle
```

### 4.2 Abonelik Akışı

```
İşletme → Abonelik formu doldurur
    ↓
saveSubscription()
    ↓
POST /api/subscriptions
    ├─ INSERT INTO subscriptions
    ├─ UPDATE pitch_objects.aboneHours
    ├─ INSERT INTO reservations (type='abone', price=0)
    └─ Response
    ↓
Müşteri tarafı:
    ├─ onDateOrFieldChange() → abone saatlerini (ABONE) olarak işaretler
    └─ completeBooking() → abone saatinde hata verir
```

### 4.3 OAuth Giriş Akışı

```
Kullanıcı → Google/Apple ile Giriş
    ↓
google_login.html / apple_login.html
    ↓
OAuth callback → Token + Kullanıcı Bilgisi
    ↓
Yönlendirme: index.html?token=...&user=...
    ↓
window.onload:
    ├─ Token localStorage'a kaydedilir
    ├─ Kullanıcı bilgisi işlenir
    ├─ Telefon eksikse → profil tamamlama modal'ı
    └─ Oturum başlatılır
```

---

## 5. Güvenlik Katmanı

### 5.1 Rate Limiting
```javascript
const resLimitPerMin = rateLimit({
    windowMs: 60 * 1000, max: 5,
    message: { success: false, message: 'Çok fazla istek!' }
});
const resLimitPerSec = rateLimit({
    windowMs: 1000, max: 1,
    message: { success: false, message: 'Çok hızlı işlem yapıyorsunuz!' }
});
```

### 5.2 Turnstile Doğrulaması
- Frontend: Cloudflare Turnstile widget'ı
- Backend: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
- Test key kullanılır: `1x0000000000000000000000000000000AA`

### 5.3 Şifre Güvenliği
- Plain text şifreler (proje başlangıç aşamasında, ileride bcrypt önerilir)
- OAuth kullanıcıları: `password = 'social_login_pwd'`

### 5.4 Soft Delete
- Rezervasyon iptali: `UPDATE reservations SET status='cancelled'`
- İptal edilen rezervasyonlar limit hesaplamasına dahil

---

## 6. Önemli İş Kuralları

| Kural | Açıklama |
|-------|----------|
| Rezervasyon limiti | Aynı gün max 3, toplam aktif max 2 |
| İptal hakkı | İptal edilen rezervasyon da limit hakkından düşer |
| Abonelik | Haftalık, aynı gün+saat bloke edilir |
| Abone fiyatı | 0 TL (rezervasyon kaydı tip=abone) |
| Saha seçimi | pitchCount=1 → direkt, pitchCount=2 → dropdown |
| Saat dilimleri | 06:00-05:00 arası 24 slot, gece 06'dan küçükse +1 gün |
| Fiyatlandırma | Gündüz (06-17): morningPrice, Akşam (17-06): eveningPrice |
| Kara liste | Saha bazında telefon numarası engelleme |
| Oyunculuk | Maç arayan ilanında yaş/boy/kilo/mevki bilgisi |

---

## 7. Ön Yüz Bileşen Mimarisi

### 7.1 Sayfa Yapısı

```
index.html (build.js tarafından derlenir, düzenlenmez)
├── _header.html
│   ├── Logo + KSK başlık
│   ├── Hava durumu widget'ı
│   ├── Giriş/Kayıt butonları (kullanıcı)
│   └── İşletme girişi / çıkış butonları
│
├── _customer-panel.html (MÜŞTERİ)
│   ├── Sekme menüsü: Rezervasyon / Oyuncu Bul / Maç Bul / Takım Bul
│   ├── Sekme 1: Rezervasyon
│   │   ├── Saha Seçimi (fieldsGrid → field-card)
│   │   ├── Tarih Seçici (datePicker)
│   │   ├── Saha Seçici (pitchSelector)
│   │   ├── Fiyat önizleme
│   │   ├── Saat Grid'i (hoursGrid)
│   │   └── Turnstile + Gönder butonu
│   ├── Sekme 2: Oyuncu Bul (forum form + ilan listesi)
│   ├── Sekme 3: Maç Bul (maç arayan formu + ilan listesi)
│   └── Sekme 4: Takım Bul (takım formu + ilan listesi)
│
├── _business-panel.html (İŞLETME)
│   ├── Sekme menüsü: İstatistik/Rezervasyon/Borç/Yorum/Kara Liste/
│   │                     Fiyat/Saat&Engel/Abonelik/Ayarlar
│   ├── İstatistikler (toplam/bu ay/bugün/son 7 gün + kazanç)
│   ├── Rezervasyonlar (grid görünüm + erteleme/iptal)
│   ├── Borç Yönetimi (filtre: tümü/bugün/haftalık/aylık)
│   ├── Yorum Yönetimi (cevaplama)
│   ├── Kara Liste (telefon bazlı engelleme)
│   ├── Fiyat Tarifesi (gündüz/akşam ayrı)
│   ├── Saat & Engel Ayarları (günlük saat, kilit)
│   ├── Abonelik Yönetimi (oluştur/sil)
│   └── İşletme Ayarları (iletişim, servis, koordinat)
│
├── _modals.html
│   ├── Kullanıcı Giriş (email + şifre / Google / Apple)
│   ├── Kullanıcı Kayıt (isim, telefon, email, şifre)
│   ├── İşletme Giriş (saha key + şifre)
│   ├── OTP Doğrulama
│   ├── Profil Tamamlama (OAuth sonrası)
│   ├── Oyuncu Profili + Değerlendirme
│   ├── Kullanıcı Profili (düzenleme + geçmiş)
│   ├── Rezervasyon Başarı
│   ├── Rezervasyon Onay
│   ├── Saat Engelleme
│   └── Genel Onay
│
└── _footer.html
    └── script.js bağlantısı
```

### 7.2 CSS Bileşenleri

```
style.css (~2200 satır)
├── Değişkenler (--primary-green, --neon-green, --warning-orange vb.)
├── Genel Stiller (reset, tipografi, grid)
├── Navigasyon
├── Saha Kartları (field-card)
├── Rezervasyon Paneli (booking-panel, hours-grid)
├── Forum / Maç Kartları (post-card, match-seeker-card)
├── İşletme Paneli (admin-res-item, tab-content)
├── Profil Paneli
├── Modal'lar
├── Responsive (max-width: 768px)
└── Animasyonlar (loading, hover, shake)
```

---

## 8. Veritabanı Detayı

### 8.1 users tablosu
```sql
id INT PK AUTO_INCREMENT
name VARCHAR(100)
phone VARCHAR(20) UNIQUE
email VARCHAR(100)
password VARCHAR(255)
is_email_verified TINYINT(1) DEFAULT 0
otp_code VARCHAR(6)
otp_expiry TIMESTAMP
google_id VARCHAR(255)
apple_id VARCHAR(255)
age INT
height INT              -- Boy (cm)
weight INT              -- Kilo (kg)
position VARCHAR(50)
experience VARCHAR(50)
status VARCHAR(50) DEFAULT 'active'
cancelled_reservations INT DEFAULT 0
```

### 8.2 reservations tablosu
```sql
id INT PK AUTO_INCREMENT
fieldKey VARCHAR(50)
pitchNumber INT DEFAULT 1
dateText VARCHAR(100)
hourText VARCHAR(20)
user_name VARCHAR(100)
user_id INT
user_phone VARCHAR(20)
reservation_price DECIMAL(10,2) DEFAULT 0.00
payment_status ENUM('odendi','odenmedi','gecikme') DEFAULT 'odenmedi'
status ENUM('active','completed','cancelled','postponed') DEFAULT 'active'
type VARCHAR(20) DEFAULT 'normal'   -- 'normal' veya 'abone'
created_at TIMESTAMP
```

### 8.3 Önemli İlişkiler

```
users.id ───────────────────────────── reservations.user_id
users.phone ───────────────────────── player_reviews.playerPhone
pitch_objects.fieldKey ────────────── reservations.fieldKey
pitch_objects.fieldKey ────────────── subscriptions.fieldKey
forum_posts.id ────────────────────── forum_comments.postId (type='forum')
match_seekers.id ──────────────────── forum_comments.postId (type='match_seeker')
reservations.id ───────────────────── reviews.reservation_id (UNIQUE)
```

---

## 9. Deployment ve Çalıştırma

### 9.1 Gereksinimler
- Node.js 18+
- XAMPP (MySQL + Apache)
- Tarayıcı (Chrome önerilir)

### 9.2 Kurulum
```bash
git clone <repo>
cd birincideneme
npm install
# .env dosyasını düzenle (DB_NAME, TURNSTILE keys)
```

### 9.3 Çalıştırma
```bash
# 1. HTML parçalarını derle (geliştirme sırasında her değişiklikten sonra)
npm run build    # → html/build.js → index.html

# 2. XAMPP'te MySQL'i başlat
# 3. Node.js sunucusunu başlat
npm start        # → API: http://127.0.0.1:5000

# 4. index.html'i aç (dosya sistemi veya Live Server ile)
#    Örn: file:///C:/Users/.../index.html
#    Veya: http://127.0.0.1:5500/index.html (Live Server)
```

### 9.4 Veritabanı İlk Kurulum
```bash
# MySQL'de veritabanı oluştur
mysql -u root -e "CREATE DATABASE halisaha_kiralama"

# SQL dump'ı içe aktar (tablolar + seed data)
mysql -u root halisaha_kiralama < database_complete.sql

# Veya: server.js ilk çalıştırmada tabloları otomatik oluşturur
# (CREATE TABLE IF NOT EXISTS + ALTER TABLE migration)
```

---

## 10. Build Pipeline

```
html/_header.html
html/_customer-panel.html
html/_business-panel.html        build.js        index.html
html/_modals.html           ──→  (birleştir)  ──→  (derlenmiş)
html/_footer.html

Geliştirme akışı:
1. html/ içindeki parçalarda düzenleme yap
2. npm run build  (veya: node html/build.js)
3. index.html güncellenir
4. Live Server ile test et
```

**Neden bu yaklaşım?**
- C# WinForms'taki gibi her panel ayrı dosyada → okunurluk artar
- Mevcut mimari değişmez (hala statik HTML + fetch API)
- script.js'de tek satır değişiklik gerekmez
- `init.js` ile mevcut index.html'den parçalar tekrar çıkarılabilir

---

## 11. Önemli Notlar ve Kısıtlamalar

1. **Express 5 Kullanımı:** Express 5'in varsayılan hata yönetimi HTML döndürür. Bu nedenle global JSON hata middleware'i eklenmiştir.
2. **Plain Text Şifreler:** Şu an için şifreler plain text saklanmaktadır. Üretim ortamı için bcrypt önerilir.
3. **CORS:** Tüm origin'lere açıktır (`cors()`). Üretimde kısıtlanmalıdır.
4. **Turnstile Test Key'i:** `1x0000000000000000000000000000000AA` test key'idir. Gerçek site key'i Cloudflare panelinden alınmalıdır.
5. **Saat Mantığı:** Gece 06:00'dan küçük saatler bir sonraki güne ait kabul edilir (`getActualPlayDate` fonksiyonu).
6. **Çoklu Saha:** `pitchCount: 2` olan sahalarda kullanıcı önce pitch seçmelidir.
