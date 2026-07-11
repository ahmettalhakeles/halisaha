-- =====================================================
-- KSK - TABLO OLUŞTURMA (VERİ KORUMALI) v2
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone VARCHAR(17) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  age INT DEFAULT NULL,
  position VARCHAR(50) DEFAULT NULL,
  experience VARCHAR(50) DEFAULT NULL,
  height INT DEFAULT NULL,
  weight INT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_phone (phone),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  dateText VARCHAR(50) NOT NULL,
  hourText VARCHAR(50) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  pitchNumber INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_status ENUM('odenmedi','odendi') DEFAULT 'odenmedi',
  reservation_price INT DEFAULT 0,
  user_id INT DEFAULT NULL,
  type VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'active',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_details (
  id INT NOT NULL AUTO_INCREMENT,
  reservation_id INT NOT NULL,
  pitchNumber INT NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  status ENUM('active','completed','cancelled','postponed') DEFAULT 'active',
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY reservation_id (reservation_id),
  CONSTRAINT reservation_details_ibfk_1 FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forum_posts (
  id INT NOT NULL AUTO_INCREMENT,
  dateText VARCHAR(50) NOT NULL,
  hourText VARCHAR(50) NOT NULL,
  position VARCHAR(50) NOT NULL,
  payment VARCHAR(50) NOT NULL,
  user_id INT DEFAULT NULL,
  msg TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('aktif','bulundu','suresi_gecti') DEFAULT 'aktif',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forum_comments (
  id INT NOT NULL AUTO_INCREMENT,
  post_type VARCHAR(20) NOT NULL DEFAULT '',
  post_id INT NOT NULL,
  commenter_name VARCHAR(100) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_post (post_type, post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_seekers (
  id INT NOT NULL AUTO_INCREMENT,
  playerName VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  position ENUM('KALECI','DEFANS','ORTA SAHA','FORVET') NOT NULL,
  user_id INT DEFAULT NULL,
  availableHours TEXT NOT NULL,
  availableDates TEXT NOT NULL,
  requestedFee VARCHAR(50) DEFAULT 'ÜCRETSIZ',
  msg TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('aktif','bulundu','suresi_gecti') DEFAULT 'aktif',
  height INT DEFAULT NULL,
  weight INT DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_seekers (
  id INT NOT NULL AUTO_INCREMENT,
  teamName VARCHAR(255) NOT NULL,
  ageGroup VARCHAR(50) NOT NULL,
  matchSize VARCHAR(10) NOT NULL,
  skillLevel VARCHAR(50) NOT NULL,
  availableDays TEXT DEFAULT NULL,
  timeRange TEXT DEFAULT NULL,
  captainName VARCHAR(255) NOT NULL,
  message TEXT DEFAULT NULL,
  user_id INT DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_reviews (
  id INT NOT NULL AUTO_INCREMENT,
  player_id INT NOT NULL,
  reviewerName VARCHAR(100) NOT NULL,
  rating INT NOT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  fieldKey VARCHAR(50) NOT NULL,
  pitchNumber INT NOT NULL,
  reservation_id INT NOT NULL,
  rating_turf INT NOT NULL,
  rating_lighting INT NOT NULL,
  rating_facilities INT NOT NULL,
  rating_service INT NOT NULL,
  comment TEXT DEFAULT NULL,
  is_anonymous TINYINT DEFAULT 0,
  owner_reply TEXT DEFAULT NULL,
  owner_reply_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY reservation_id (reservation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  pitchNumber INT NOT NULL,
  dayOfWeek VARCHAR(50) NOT NULL DEFAULT 'PAZARTESİ',
  hourText VARCHAR(50) NOT NULL,
  subscriberName VARCHAR(100) NOT NULL,
  subscriberPhone VARCHAR(20) DEFAULT NULL,
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_subscription_day (fieldKey, pitchNumber, dayOfWeek, hourText)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pitch_settings (
  fieldKey VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT '123456',
  isClosed TINYINT NOT NULL DEFAULT 0,
  isDeleted TINYINT NOT NULL DEFAULT 0,
  openingHour VARCHAR(5) NOT NULL DEFAULT '09:00',
  closingHour VARCHAR(5) NOT NULL DEFAULT '23:00',
  disabledHours TEXT DEFAULT NULL,
  aboneHours TEXT DEFAULT NULL,
  pricing VARCHAR(100) DEFAULT '2600/3000',
  field_count INT DEFAULT 1,
  total_reservations INT DEFAULT 0,
  last_login TIMESTAMP NULL DEFAULT NULL,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  PRIMARY KEY (fieldKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pitch_objects (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  pitchNumber INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  coordinates VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  isClosed TINYINT NOT NULL DEFAULT 0,
  isDeleted TINYINT NOT NULL DEFAULT 0,
  hasService VARCHAR(50) NOT NULL,
  openingHour VARCHAR(5) NOT NULL DEFAULT '09:00',
  closingHour VARCHAR(5) NOT NULL DEFAULT '23:00',
  disabledHours TEXT DEFAULT NULL,
  aboneHours TEXT DEFAULT NULL,
  closedDays VARCHAR(255) DEFAULT '[]',
  refreshments VARCHAR(255) DEFAULT '',
  cleats VARCHAR(50) DEFAULT 'Krampon Kiralanmaz',
  shower VARCHAR(50) DEFAULT 'Duş Yok',
  market VARCHAR(50) DEFAULT 'Market Yok',
  morningPrice INT DEFAULT 2500,
  eveningPrice INT DEFAULT 3000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  PRIMARY KEY (id),
  UNIQUE KEY unique_pitch (fieldKey, pitchNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS field_daily_hours (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  dayOfWeek TINYINT NOT NULL,
  openingHour VARCHAR(10) DEFAULT '15:00',
  closingHour VARCHAR(10) DEFAULT '02:00',
  PRIMARY KEY (id),
  UNIQUE KEY uniq_field_day (fieldKey, dayOfWeek)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS field_blacklists (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_field_phone (fieldKey, phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS field_comments (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  commenter_name VARCHAR(100) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_statistics (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  total_reservations INT DEFAULT 0,
  completed_reservations INT DEFAULT 0,
  cancelled_reservations INT DEFAULT 0,
  postponed_reservations INT DEFAULT 0,
  active_reservations INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_daily_stat (fieldKey, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_login_logs (
  id INT NOT NULL AUTO_INCREMENT,
  fieldKey VARCHAR(50) NOT NULL,
  admin_name VARCHAR(100) NOT NULL,
  login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL DEFAULT NULL,
  duration_seconds INT DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS super_admins (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id INT NOT NULL AUTO_INCREMENT,
  admin_username VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_name VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_action_type (action_type),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
  target_field_key VARCHAR(50) DEFAULT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default super admin is created in server.js startup if not exists

-- Seed data for fields (sadece yoksa ekle)
INSERT IGNORE INTO pitch_settings (fieldKey, password, isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count, total_reservations, last_login, average_rating)
VALUES
('final', 'final123', 0, '12:00', '23:00', '[]', '[]', '2500/2800', 2, 0, NULL, 0.00),
('arena', 'arena123', 0, '10:00', '22:00', '[]', '[]', '2500/2800', 1, 0, NULL, 0.00),
('ciragan', 'ciragan123', 0, '12:00', '23:00', '[]', '[]', '2500/2800', 1, 0, NULL, 0.00),
('olimpiyat', 'olimpiyat123', 0, '08:00', '23:00', '[]', '[]', '2500/2800', 1, 0, NULL, 0.00),
('sporium05', 'sporium123', 0, '14:00', '23:00', '[]', '[]', '2500/2800', 1, 0, NULL, 0.00),
('ziyaret', 'ziyaret123', 0, '15:00', '00:00', '[]', '[]', '2500/2800', 1, 0, NULL, 0.00);

INSERT IGNORE INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours, closedDays, refreshments, cleats, shower, market, morningPrice, eveningPrice, average_rating)
VALUES
('final', 1, 'Final Halısaha - SAHA 1', 'Hacilar Meydani, Merkez, Amasya', '40.66015930710386, 35.79187401098129', '03582120001', 0, 'Servis: Var', '12:00', '23:00', '[]', '[]', '[]', 'sınırsız semaver çay', 'Krampon Kiralanmaz', 'Duş Yok', 'Market Yok', 2500, 2800, 0.00),
('final', 2, 'Final Halısaha - SAHA 2', 'Hacilar Meydani, Merkez, Amasya', '40.66015930710386, 35.79187401098129', '03582120001', 0, 'Servis: Var', '12:00', '23:00', '[]', '[]', '[]', 'sınırsız semaver çay', 'Krampon Kiralanmaz', 'Duş Yok', 'Market Yok', 2500, 2800, 0.00),
('arena', 1, 'Arena Halısaha - SAHA 1', 'Akbilek, Merkez, Amasya', '40.69411694565239, 35.8179294637939', '05051234562', 0, 'Servis: Yok', '10:00', '22:00', '[]', '[]', '[]', '', 'Krampon Kiralanmaz', 'Duş Yok', 'Market Yok', 2500, 2800, 0.00),
('ciragan', 1, 'Çırağan Halısaha - SAHA 1', 'Seyhcui, Merkez, Amasya', '40.6528721257016, 35.79966936221245', '05051234563', 0, 'Servis: Var', '12:00', '23:00', '[]', '[]', '[]', 'sınırsız semaver çay', 'Krampon Kiralanır', 'Duş Var', 'Market Var', 2500, 2800, 0.00),
('olimpiyat', 1, 'Olimpiyat Halısaha - SAHA 1', 'Fatih, Merkez, Amasya', '40.68148422172459, 35.82695848316526', '05051234564', 0, 'Servis: Yok', '08:00', '23:00', '[]', '[]', '[]', '', 'Krampon Kiralanmaz', 'Duş Yok', 'Market Yok', 2500, 2800, 0.00),
('sporium05', 1, 'Sporium 05 Halısaha - SAHA 1', 'Kursunlu, Merkez, Amasya', '40.61455229320892, 35.825450789697356', '05051234565', 0, 'Servis: Var', '14:00', '23:00', '[]', '[]', '[]', '', 'Krampon Kiralanmaz', 'Duş Yok', 'Market Yok', 2500, 2800, 0.00),
('ziyaret', 1, 'Ziyaret Halısaha - SAHA 1', 'Ziyaret Beldesi, Amasya', '40.688429882215665, 35.86403902395539', '05051234566', 0, 'Servis: Var', '15:00', '00:00', '[]', '[]', '[]', '', 'Krampon Kiralanmaz', 'Duş Yok', 'Market Yok', 2500, 2800, 0.00);
