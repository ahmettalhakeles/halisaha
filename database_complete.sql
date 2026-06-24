-- =====================================================
-- KSK - TÜM VERİTABANI TABLOLARI VE GÜNCELLEMELER
-- =====================================================

-- =====================================================
-- 1. USERS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(17) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_email_verified TINYINT(1) DEFAULT 0,
    otp_code VARCHAR(6) DEFAULT NULL,
    otp_expiry TIMESTAMP NULL DEFAULT NULL,
    google_id VARCHAR(255) DEFAULT NULL,
    apple_id VARCHAR(255) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'active',
    UNIQUE KEY unique_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. RESERVATIONS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fieldKey VARCHAR(50) NOT NULL,
    dateText VARCHAR(50) NOT NULL,
    hourText VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    pitchNumber INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. FORUM_POSTS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dateText VARCHAR(50) NOT NULL,
    hourText VARCHAR(50) NOT NULL,
    position VARCHAR(50) NOT NULL,
    payment VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    msg TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. PITCH_SETTINGS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS pitch_settings (
    fieldKey VARCHAR(50) PRIMARY KEY,
    isClosed TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Bugün kapalıyız / bakım modu',
    openingHour VARCHAR(5) NOT NULL DEFAULT '09:00' COMMENT 'Açılış saatleri (24 saat format)',
    closingHour VARCHAR(5) NOT NULL DEFAULT '23:00' COMMENT 'Kapanış saatleri (24 saat format)',
    disabledHours TEXT COMMENT 'Genel kullanıma kapatılan/engellenen saatler (JSON array)',
    aboneHours TEXT COMMENT 'Haftalık sabit abonelere ayrılan saatler (JSON array)',
    pricing VARCHAR(100) DEFAULT '2600/3000' COMMENT 'Fiyat tarifesi (örn: 2500/3000)',
    field_count INT DEFAULT 1 COMMENT 'Saha sayısı (1 veya 2)',
    total_reservations INT DEFAULT 0 COMMENT 'Toplam rezervasyon sayısı',
    last_login TIMESTAMP NULL DEFAULT NULL COMMENT 'Son giriş tarihi'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. PITCH_OBJECTS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS pitch_objects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fieldKey VARCHAR(50) NOT NULL,
    pitchNumber INT NOT NULL COMMENT 'Saha numarası (1 veya 2)',
    name VARCHAR(100) NOT NULL COMMENT 'Saha adı',
    address VARCHAR(255) NOT NULL,
    coordinates VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    isClosed TINYINT(1) NOT NULL DEFAULT 0,
    hasService VARCHAR(50) NOT NULL,
    openingHour VARCHAR(5) NOT NULL DEFAULT '09:00',
    closingHour VARCHAR(5) NOT NULL DEFAULT '23:00',
    disabledHours TEXT,
    aboneHours TEXT,
    closedDays VARCHAR(255) DEFAULT '[]',
    refreshments VARCHAR(255) DEFAULT '',
    cleats VARCHAR(50) DEFAULT 'Krampon Kiralanmaz',
    shower VARCHAR(50) DEFAULT 'Duş Yok',
    market VARCHAR(50) DEFAULT 'Market Yok',
    morningPrice INT DEFAULT 2500,
    eveningPrice INT DEFAULT 3000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pitch (fieldKey, pitchNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. RESERVATION_DETAILS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS reservation_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    pitchNumber INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    status ENUM('active', 'completed', 'cancelled', 'postponed') DEFAULT 'active',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. DAILY_STATISTICS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fieldKey VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    total_reservations INT DEFAULT 0,
    completed_reservations INT DEFAULT 0,
    cancelled_reservations INT DEFAULT 0,
    postponed_reservations INT DEFAULT 0,
    active_reservations INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_daily_stat (fieldKey, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. ADMIN_LOGIN_LOGS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fieldKey VARCHAR(50) NOT NULL,
    admin_name VARCHAR(100) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL DEFAULT NULL,
    duration_seconds INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. SUBSCRIPTIONS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fieldKey VARCHAR(50) NOT NULL,
    pitchNumber INT NOT NULL COMMENT 'Saha numarası (1 veya 2)',
    dayOfWeek VARCHAR(50) NOT NULL DEFAULT 'PAZARTESİ' COMMENT 'Abone olunan gün',
    hourText VARCHAR(50) NOT NULL COMMENT 'Abone olunan saat dilimi',
    subscriberName VARCHAR(100) NOT NULL COMMENT 'Abone olan kişinin ismi',
    subscriberPhone VARCHAR(20) NOT NULL COMMENT 'Abone telefon numarası',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_subscription_day (fieldKey, pitchNumber, dayOfWeek, hourText)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. MATCH_SEEKERS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS match_seekers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    playerName VARCHAR(100) NOT NULL COMMENT 'Oyuncu isim soyisim',
    age INT NOT NULL COMMENT 'Oyuncu yaşı',
    position ENUM('KALECI','DEFANS','ORTA SAHA','FORVET') NOT NULL COMMENT 'Mevki',
    phone VARCHAR(20) NOT NULL COMMENT 'Telefon numarası (WhatsApp)',
    availableHours TEXT NOT NULL COMMENT 'Müsait saatler JSON array',
    availableDates TEXT NOT NULL COMMENT 'Müsait tarihler JSON array',
    requestedFee VARCHAR(50) DEFAULT 'ÜCRETSIZ' COMMENT 'İstediği ücret',
    msg TEXT COMMENT 'Ekstra mesaj',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. PLAYER_REVIEWS TABLOSU (OYUNCU PROFİLİ VE PUANLAMA)
-- =====================================================
CREATE TABLE IF NOT EXISTS player_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    playerPhone VARCHAR(20) NOT NULL COMMENT 'Puanlanan oyuncunun telefonu',
    reviewerName VARCHAR(100) NOT NULL COMMENT 'Puanlayan kişinin ismi',
    rating INT NOT NULL COMMENT '1-5 arası puan',
    comment TEXT COMMENT 'Yorum',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11.B. REVIEWS TABLOSU (SAHA PUANLAMA VE YORUM)
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    fieldKey VARCHAR(50) NOT NULL,
    pitchNumber INT NOT NULL,
    reservation_id INT UNIQUE NOT NULL,
    rating_turf INT NOT NULL,
    rating_lighting INT NOT NULL,
    rating_facilities INT NOT NULL,
    rating_service INT NOT NULL,
    comment TEXT,
    is_anonymous TINYINT(1) DEFAULT 0,
    owner_reply TEXT DEFAULT NULL,
    owner_reply_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11.C. FIELD_BLACKLISTS TABLOSU (KARA LİSTE)
-- =====================================================
CREATE TABLE IF NOT EXISTS field_blacklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fieldKey VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_field_phone (fieldKey, phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11.D. FORUM_COMMENTS TABLOSU (FORUM YORUM)
-- =====================================================
CREATE TABLE IF NOT EXISTS forum_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_type ENUM('forum','match_seeker') NOT NULL,
    post_id INT NOT NULL,
    commenter_name VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post (post_type, post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11.E. FIELD_COMMENTS TABLOSU (SAHA YORUM)
-- =====================================================
CREATE TABLE IF NOT EXISTS field_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fieldKey VARCHAR(50) NOT NULL,
    commenter_name VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE pitch_settings ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE pitch_objects ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;

-- =====================================================
-- 12. MEVCUT VERİLERİ EKLEME
-- =====================================================

-- Pitch Settings (İşletme Ayarları)
INSERT INTO pitch_settings (fieldKey, isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count, total_reservations, last_login)
VALUES
('final', 0, '12:00', '23:00', '["13:00 - 14:00"]', '[]', '2500/2800', 2, 0, NULL),
('arena', 0, '10:00', '22:00', '[]', '[]', '2500/2800', 1, 0, NULL),
('ciragan', 0, '12:00', '23:00', '[]', '[]', '2500/2800', 1, 0, NULL),
('olimpiyat', 0, '08:00', '23:00', '[]', '[]', '2500/2800', 1, 0, NULL),
('sporium05', 0, '14:00', '23:00', '[]', '[]', '2500/2800', 1, 0, NULL),
('ziyaret', 0, '15:00', '00:00', '[]', '[]', '2500/2800', 1, 0, NULL)
ON DUPLICATE KEY UPDATE
isClosed=VALUES(isClosed), openingHour=VALUES(openingHour), closingHour=VALUES(closingHour),
disabledHours=VALUES(disabledHours), aboneHours=VALUES(aboneHours), pricing=VALUES(pricing), field_count=VALUES(field_count), total_reservations=VALUES(total_reservations), last_login=VALUES(last_login);

-- Pitch Objects (Çoklu Saha Verileri)
INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours)
VALUES
('final', 1, 'Final Halısaha - SAHA 1', 'Hacilar Meydani, Merkez, Amasya', '40.66015930710386, 35.79187401098129', '03582120001', 0, 'Servis: Var', '12:00', '23:00', '["13:00 - 14:00"]', '[]'),
('final', 2, 'Final Halısaha - SAHA 2', 'Hacilar Meydani, Merkez, Amasya', '40.66015930710386, 35.79187401098129', '03582120001', 0, 'Servis: Var', '12:00', '23:00', '[]', '[]')
ON DUPLICATE KEY UPDATE
name=VALUES(name), address=VALUES(address), coordinates=VALUES(coordinates), phone=VALUES(phone), isClosed=VALUES(isClosed), hasService=VALUES(hasService), openingHour=VALUES(openingHour), closingHour=VALUES(closingHour), disabledHours=VALUES(disabledHours), aboneHours=VALUES(aboneHours);

INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours)
VALUES
('arena', 1, 'Arena Halısaha - SAHA 1', 'Akbilek, Merkez, Amasya', '40.69411694565239, 35.8179294637939', '05051234562', 0, 'Servis: Yok', '10:00', '22:00', '[]', '[]'),
('arena', 2, 'Arena Halısaha - SAHA 2', 'Akbilek, Merkez, Amasya', '40.69411694565239, 35.8179294637939', '05051234562', 0, 'Servis: Yok', '10:00', '22:00', '[]', '[]')
ON DUPLICATE KEY UPDATE
name=VALUES(name), address=VALUES(address), coordinates=VALUES(coordinates), phone=VALUES(phone), isClosed=VALUES(isClosed), hasService=VALUES(hasService), openingHour=VALUES(openingHour), closingHour=VALUES(closingHour), disabledHours=VALUES(disabledHours), aboneHours=VALUES(aboneHours);

INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours)
VALUES
('ciragan', 1, 'Çırağan Halısaha - SAHA 1', 'Seyhcui, Merkez, Amasya', '40.6528721257016, 35.79966936221245', '05051234563', 0, 'Servis: Var', '12:00', '23:00', '[]', '[]'),
('ciragan', 2, 'Çırağan Halısaha - SAHA 2', 'Seyhcui, Merkez, Amasya', '40.6528721257016, 35.79966936221245', '05051234563', 0, 'Servis: Var', '12:00', '23:00', '[]', '[]')
ON DUPLICATE KEY UPDATE
name=VALUES(name), address=VALUES(address), coordinates=VALUES(coordinates), phone=VALUES(phone), isClosed=VALUES(isClosed), hasService=VALUES(hasService), openingHour=VALUES(openingHour), closingHour=VALUES(closingHour), disabledHours=VALUES(disabledHours), aboneHours=VALUES(aboneHours);

INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours)
VALUES
('olimpiyat', 1, 'Olimpiyat Halısaha - SAHA 1', 'Fatih, Merkez, Amasya', '40.68148422172459, 35.82695848316526', '05051234564', 0, 'Servis: Yok', '08:00', '23:00', '[]', '[]'),
('olimpiyat', 2, 'Olimpiyat Halısaha - SAHA 2', 'Fatih, Merkez, Amasya', '40.68148422172459, 35.82695848316526', '05051234564', 0, 'Servis: Yok', '08:00', '23:00', '[]', '[]')
ON DUPLICATE KEY UPDATE
name=VALUES(name), address=VALUES(address), coordinates=VALUES(coordinates), phone=VALUES(phone), isClosed=VALUES(isClosed), hasService=VALUES(hasService), openingHour=VALUES(openingHour), closingHour=VALUES(closingHour), disabledHours=VALUES(disabledHours), aboneHours=VALUES(aboneHours);

INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours)
VALUES
('sporium05', 1, 'Sporium 05 Halısaha - SAHA 1', 'Kursunlu, Merkez, Amasya', '40.61455229320892, 35.825450789697356', '05051234565', 0, 'Servis: Var', '14:00', '23:00', '[]', '[]')
ON DUPLICATE KEY UPDATE
name=VALUES(name), address=VALUES(address), coordinates=VALUES(coordinates), phone=VALUES(phone), isClosed=VALUES(isClosed), hasService=VALUES(hasService), openingHour=VALUES(openingHour), closingHour=VALUES(closingHour), disabledHours=VALUES(disabledHours), aboneHours=VALUES(aboneHours);

INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours)
VALUES
('ziyaret', 1, 'Ziyaret Halısaha - SAHA 1', 'Ziyaret Beldesi, Amasya', '40.688429882215665, 35.86403902395539', '05051234566', 0, 'Servis: Var', '15:00', '00:00', '[]', '[]')
ON DUPLICATE KEY UPDATE
name=VALUES(name), address=VALUES(address), coordinates=VALUES(coordinates), phone=VALUES(phone), isClosed=VALUES(isClosed), hasService=VALUES(hasService), openingHour=VALUES(openingHour), closingHour=VALUES(closingHour), disabledHours=VALUES(disabledHours), aboneHours=VALUES(aboneHours);
