require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Body parsing error handler - always return JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Geçersiz JSON verisi gönderildi!' });
    }
    next();
});

// Bot / Abuse Limiting for Reservations: 2 per second, 10 per minute per IP
const resLimitPerMin = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Dakikada en fazla 30 rezervasyon talebi gönderebilirsiniz!' },
    standardHeaders: true,
    legacyHeaders: false
});

const resLimitPerSec = rateLimit({
    windowMs: 1000,
    max: 5,
    message: { success: false, message: 'Saniyede en fazla 5 rezervasyon talebi gönderebilirsiniz!' },
    standardHeaders: true,
    legacyHeaders: false
});

// MySQL Bağlantı Havuzu (Auto-Reconnect Destekli)
const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ksk_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

db.getConnection((err, connection) => {
    if (err) return console.error('❌ MySQL Bağlantı Hatası:', err.message);
    console.log('🚀 XAMPP MySQL Veritabanına başarıyla bağlanıldı!');
    
    // Check and add age column
    connection.query("SHOW COLUMNS FROM users LIKE 'age'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN age INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.age kolonu eklenemedi:", errAlter);
                else console.log("✅ users.age kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add position column
    connection.query("SHOW COLUMNS FROM users LIKE 'position'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN position VARCHAR(50) DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.position kolonu eklenemedi:", errAlter);
                else console.log("✅ users.position kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add experience column
    connection.query("SHOW COLUMNS FROM users LIKE 'experience'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN experience VARCHAR(50) DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.experience kolonu eklenemedi:", errAlter);
                else console.log("✅ users.experience kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add height column in users
    connection.query("SHOW COLUMNS FROM users LIKE 'height'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN height INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.height kolonu eklenemedi:", errAlter);
                else console.log("✅ users.height kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add weight column in users
    connection.query("SHOW COLUMNS FROM users LIKE 'weight'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN weight INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.weight kolonu eklenemedi:", errAlter);
                else console.log("✅ users.weight kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add height column in match_seekers
    connection.query("SHOW COLUMNS FROM match_seekers LIKE 'height'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE match_seekers ADD COLUMN height INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ match_seekers.height kolonu eklenemedi:", errAlter);
                else console.log("✅ match_seekers.height kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add weight column in match_seekers
    connection.query("SHOW COLUMNS FROM match_seekers LIKE 'weight'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE match_seekers ADD COLUMN weight INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ match_seekers.weight kolonu eklenemedi:", errAlter);
                else console.log("✅ match_seekers.weight kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add refreshments column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'refreshments'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN refreshments VARCHAR(255) DEFAULT ''", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.refreshments kolonu eklenemedi:", errAlter);
                else console.log("✅ pitch_objects.refreshments kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add cleats column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'cleats'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN cleats VARCHAR(50) DEFAULT 'Krampon Kiralanmaz'", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.cleats kolonu eklenemedi:", errAlter);
                else console.log("✅ pitch_objects.cleats kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add shower column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'shower'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN shower VARCHAR(50) DEFAULT 'Duş Yok'", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.shower kolonu eklenemedi:", errAlter);
                else console.log("✅ pitch_objects.shower kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add market column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'market'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN market VARCHAR(50) DEFAULT 'Market Yok'", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.market kolonu eklenemedi:", errAlter);
                else console.log("✅ pitch_objects.market kolonu veritabanına başarıyla eklendi.");
            });
        }
    });

    // Check and add dayOfWeek column in subscriptions
    connection.query("SHOW COLUMNS FROM subscriptions LIKE 'dayOfWeek'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE subscriptions ADD COLUMN dayOfWeek VARCHAR(50) DEFAULT 'PAZARTESİ'", (errAlter) => {
                if (errAlter) console.error("❌ subscriptions.dayOfWeek kolonu eklenemedi:", errAlter);
                else {
                    console.log("✅ subscriptions.dayOfWeek kolonu veritabanına başarıyla eklendi.");
                    connection.query("ALTER TABLE subscriptions DROP INDEX unique_subscription", (errDrop) => {
                        connection.query("ALTER TABLE subscriptions ADD UNIQUE KEY unique_subscription_day (fieldKey, pitchNumber, dayOfWeek, hourText)", (errAddKey) => {
                            if (errAddKey) console.error("❌ New unique_subscription_day key could not be added:", errAddKey);
                            else console.log("✅ New unique_subscription_day key added.");
                        });
                    });
                }
            });
        }
    });

    // Add payment_status, reservation_price, user_id, user_phone to reservations
    const reservationCols = [
        { col: 'payment_status', def: "ALTER TABLE reservations ADD COLUMN payment_status ENUM('odenmedi','odendi') DEFAULT 'odenmedi'" },
        { col: 'reservation_price', def: 'ALTER TABLE reservations ADD COLUMN reservation_price INT DEFAULT 0' },
        { col: 'user_id', def: 'ALTER TABLE reservations ADD COLUMN user_id INT DEFAULT NULL' },
        { col: 'user_phone', def: 'ALTER TABLE reservations ADD COLUMN user_phone VARCHAR(20) DEFAULT NULL' }
    ];
    reservationCols.forEach(({ col, def }) => {
        connection.query(`SHOW COLUMNS FROM reservations LIKE '${col}'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(def, (ea) => {
                    if (ea) console.error(`❌ reservations.${col} eklenemedi:`, ea);
                    else console.log(`✅ reservations.${col} eklendi.`);
                });
            }
        });
    });

    // Add closedDays column to pitch_objects table
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'closedDays'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN closedDays VARCHAR(255) DEFAULT '[]'", (ea) => {
                if (ea) console.error("❌ pitch_objects.closedDays eklenemedi:", ea);
                else console.log("✅ pitch_objects.closedDays eklendi.");
            });
        }
    });

    // Add status, user_id to forum_posts and match_seekers
    // Create team_seekers table if not exists
    connection.query(`
        CREATE TABLE IF NOT EXISTS team_seekers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            teamName VARCHAR(255) NOT NULL,
            ageGroup VARCHAR(50) NOT NULL,
            matchSize VARCHAR(10) NOT NULL,
            skillLevel VARCHAR(50) NOT NULL,
            availableDays TEXT,
            timeRange VARCHAR(100),
            captainName VARCHAR(255) NOT NULL,
            message TEXT,
            user_id INT DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'aktif',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ team_seekers tablosu oluşturulamadı:', err);
        else console.log('✅ team_seekers tablosu hazır.');
    });

    ['forum_posts', 'match_seekers', 'team_seekers'].forEach(table => {
        const runUpdateExpired = () => {
            connection.query(`UPDATE ${table} SET status = 'suresi_gecti' WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`, (errUpdate) => {
                if (errUpdate) console.error(`❌ ${table} expired update failed:`, errUpdate);
            });
        };

        connection.query(`SHOW COLUMNS FROM ${table} LIKE 'status'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(`ALTER TABLE ${table} ADD COLUMN status ENUM('aktif','bulundu','suresi_gecti') DEFAULT 'aktif'`, (ea) => {
                    if (ea) console.error(`❌ ${table}.status eklenemedi:`, ea);
                    else {
                        console.log(`✅ ${table}.status eklendi.`);
                        runUpdateExpired();
                    }
                });
            } else if (!ec) {
                runUpdateExpired();
            }
        });
        connection.query(`SHOW COLUMNS FROM ${table} LIKE 'user_id'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(`ALTER TABLE ${table} ADD COLUMN user_id INT DEFAULT NULL`, (ea) => {
                    if (ea) console.error(`❌ ${table}.user_id eklenemedi:`, ea);
                    else console.log(`✅ ${table}.user_id eklendi.`);
                });
            }
        });
    });

    // Add columns to users table
    const userCols = [
        { col: 'is_email_verified', def: 'ALTER TABLE users ADD COLUMN is_email_verified TINYINT(1) DEFAULT 0' },
        { col: 'otp_code', def: 'ALTER TABLE users ADD COLUMN otp_code VARCHAR(6) DEFAULT NULL' },
        { col: 'otp_expiry', def: 'ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP NULL DEFAULT NULL' },
        { col: 'google_id', def: 'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) DEFAULT NULL' },
        { col: 'apple_id', def: 'ALTER TABLE users ADD COLUMN apple_id VARCHAR(255) DEFAULT NULL' },
        { col: 'status', def: "ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'" }
    ];
    userCols.forEach(({ col, def }) => {
        connection.query(`SHOW COLUMNS FROM users LIKE '${col}'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(def, (ea) => {
                    if (ea) console.error(`❌ users.${col} eklenemedi:`, ea);
                    else console.log(`✅ users.${col} eklendi.`);
                });
            }
        });
    });

    // Make phone unique in users table
    connection.query("SHOW INDEX FROM users WHERE Key_name = 'unique_phone'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE users ADD UNIQUE KEY unique_phone (phone)", (ea) => {
                if (ea) console.error("❌ users.phone unique yapılamadı:", ea);
                else console.log("✅ users.phone unique yapıldı.");
            });
        }
    });

    // Add type column to reservations table (normal/abone)
    connection.query("SHOW COLUMNS FROM reservations LIKE 'type'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE reservations ADD COLUMN type VARCHAR(20) DEFAULT 'normal'", (ea) => {
                if (ea) console.error("❌ reservations.type eklenemedi:", ea);
                else console.log("✅ reservations.type eklendi.");
            });
        }
    });

    // Add status column to reservations table (active/cancelled) for soft-delete
    connection.query("SHOW COLUMNS FROM reservations LIKE 'status'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE reservations ADD COLUMN status VARCHAR(20) DEFAULT 'active'", (ea) => {
                if (ea) console.error("❌ reservations.status eklenemedi:", ea);
                else console.log("✅ reservations.status eklendi.");
            });
        }
    });

    // Create reviews table if not exists
    connection.query(`CREATE TABLE IF NOT EXISTS reviews (
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
    )`, (ec) => {
        if (ec) console.error('❌ reviews tablosu oluşturulamadı:', ec);
        else console.log('✅ reviews tablosu hazır.');
    });

    // Create field_blacklists table if not exists
    connection.query(`CREATE TABLE IF NOT EXISTS field_blacklists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fieldKey VARCHAR(50) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_field_phone (fieldKey, phone_number)
    )`, (ec) => {
        if (ec) console.error('❌ field_blacklists tablosu oluşturulamadı:', ec);
        else console.log('✅ field_blacklists tablosu hazır.');
    });

    // Add average_rating column to pitch_settings and pitch_objects
    connection.query(`SHOW COLUMNS FROM pitch_settings LIKE 'average_rating'`, (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query(`ALTER TABLE pitch_settings ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00`, (ea) => {
                if (ea) console.error("❌ pitch_settings.average_rating eklenemedi:", ea);
                else console.log("✅ pitch_settings.average_rating eklendi.");
            });
        }
    });
    connection.query(`SHOW COLUMNS FROM pitch_objects LIKE 'average_rating'`, (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query(`ALTER TABLE pitch_objects ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00`, (ea) => {
                if (ea) console.error("❌ pitch_objects.average_rating eklenemedi:", ea);
                else console.log("✅ pitch_objects.average_rating eklendi.");
            });
        }
    });

    // Create forum_comments table if not exists
    connection.query(`CREATE TABLE IF NOT EXISTS forum_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_type ENUM('forum','match_seeker','team_seeker') NOT NULL,
        post_id INT NOT NULL,
        commenter_name VARCHAR(100) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_post (post_type, post_id)
    )`, (ec) => {
        if (ec) console.error('❌ forum_comments tablosu oluşturulamadı:', ec);
        else console.log('✅ forum_comments tablosu hazır.');
    });

    // Create field_comments table if not exists
    connection.query(`CREATE TABLE IF NOT EXISTS field_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fieldKey VARCHAR(50) NOT NULL,
        commenter_name VARCHAR(100) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (ec) => {
        if (ec) console.error('❌ field_comments tablosu oluşturulamadı:', ec);
        else console.log('✅ field_comments tablosu hazır.');
    });

    // Create field_daily_hours table if not exists
    connection.query(`CREATE TABLE IF NOT EXISTS field_daily_hours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fieldKey VARCHAR(50) NOT NULL,
        dayOfWeek TINYINT NOT NULL COMMENT '0=Pazar,1=Pazartesi,...,6=Cumartesi',
        openingHour VARCHAR(10) DEFAULT '15:00',
        closingHour VARCHAR(10) DEFAULT '02:00',
        UNIQUE KEY uniq_field_day (fieldKey, dayOfWeek)
    )`, (ec) => {
        if (ec) console.error('❌ field_daily_hours tablosu oluşturulamadı:', ec);
        else {
            console.log('✅ field_daily_hours tablosu hazır.');
            // Populate default daily hours for all fields if empty
            const fields = ['final', 'arena', 'ciragan', 'olimpiyat', 'sporium05', 'ziyaret'];
            fields.forEach(fk => {
                for (let day = 0; day <= 6; day++) {
                    connection.query(`INSERT IGNORE INTO field_daily_hours (fieldKey, dayOfWeek, openingHour, closingHour) VALUES (?, ?, '15:00', '02:00')`, [fk, day]);
                }
            });
        }
    });

    // Expired posts update handled safely inside column checks above

    // One-time migration to clear all reservations/subscriptions and set default operating hours
    const fs = require('fs');
    const path = require('path');
    const markerFile = path.join(__dirname, '.db_migrated');
    if (!fs.existsSync(markerFile)) {
        connection.query('DELETE FROM reservations', (err) => {
            if (!err) console.log('✅ Tüm rezervasyonlar temizlendi.');
            else console.error("❌ Rezervasyon silme hatası:", err);
        });
        connection.query('DELETE FROM subscriptions', (err) => {
            if (!err) console.log('✅ Tüm abonelikler temizlendi.');
            else console.error("❌ Abonelik silme hatası:", err);
        });
        connection.query("UPDATE pitch_objects SET openingHour='15:00', closingHour='02:00'", (err) => {
            if (!err) console.log('✅ pitch_objects saatleri güncellendi.');
        });
        connection.query("UPDATE pitch_settings SET openingHour='15:00', closingHour='02:00'", (err) => {
            if (!err) console.log('✅ pitch_settings saatleri güncellendi.');
        });
        try {
            fs.writeFileSync(markerFile, 'done');
            console.log('✅ Veritabanı temizleme ve saat ayarlama markeri oluşturuldu.');
        } catch (fErr) {
            console.error("❌ Marker dosyası oluşturulamadı:", fErr);
        }
    }

    connection.release();

});

// 6 Adet Izole Multi-Tenant Saha Veri Yapisi (Giriş Şifreleri ve Detaylar)
const fieldsData = {
    "final": {
        name: "Final Halısaha",
        address: "Hacilar Meydani, Merkez, Amasya",
        coordinates: "40.66015930710386, 35.79187401098129",
        phone: "03582120001",
        password: "final123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "12:00",
        closingHour: "23:00",
        aboneHours: ["19:00 - 20:00", "21:00 - 22:00"],
        disabledHours: ["13:00 - 14:00"],
        pitchCount: 2,
        pricing: "2500/2800"
    },
    "arena": {
        name: "Arena Halısaha",
        address: "Akbilek, Merkez, Amasya",
        coordinates: "40.69411694565239, 35.8179294637939",
        phone: "05051234562",
        password: "arena123",
        isClosed: false,
        hasService: "Servis: Yok",
        openingHour: "10:00",
        closingHour: "22:00",
        aboneHours: ["20:00 - 21:00"],
        disabledHours: [],
        pitchCount: 1,
        pricing: "2500/2800"
    },
    "ciragan": {
        name: "Çırağan Halısaha",
        address: "Seyhcui, Merkez, Amasya",
        coordinates: "40.6528721257016, 35.79966936221245",
        phone: "05051234563",
        password: "ciragan123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "12:00",
        closingHour: "23:00",
        aboneHours: ["22:00 - 23:00"],
        disabledHours: [],
        pitchCount: 1,
        pricing: "2500/2800"
    },
    "olimpiyat": {
        name: "Olimpiyat Halısaha",
        address: "Fatih, Merkez, Amasya",
        coordinates: "40.68148422172459, 35.82695848316526",
        phone: "05051234564",
        password: "olimpiyat123",
        isClosed: false,
        hasService: "Servis: Yok",
        openingHour: "08:00",
        closingHour: "23:00",
        aboneHours: [],
        disabledHours: [],
        pitchCount: 1,
        pricing: "2500/2800"
    },
    "sporium05": {
        name: "Sporium 05 Halısaha",
        address: "Kursunlu, Merkez, Amasya",
        coordinates: "40.61455229320892, 35.825450789697356",
        phone: "05051234565",
        password: "sporium123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "14:00",
        closingHour: "23:00",
        aboneHours: ["18:00 - 19:00"],
        disabledHours: [],
        pitchCount: 1,
        pricing: "2500/2800"
    },
    "ziyaret": {
        name: "Ziyaret Halısaha",
        address: "Ziyaret Beldesi, Amasya",
        coordinates: "40.688429882215665, 35.86403902395539",
        phone: "05051234566",
        password: "ziyaret123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "15:00",
        closingHour: "00:00",
        aboneHours: [],
        disabledHours: [],
        pitchCount: 1,
        pricing: "2500/2800"
    }
};

// HELPER: OTP E-posta simülasyonu
function sendOTPEmail(email, code) {
    console.log(`✉️ [OTP GÖNDERİLDİ] E-posta: ${email} | Kod: ${code} (Geçerlilik süresi: 10 dakika)`);
}

// HELPER: Sosyal Giriş Başarılı İşleme
function handleSocialAuthSuccess(req, res, provider, providerId, email, name) {
    // 1. Kullanıcı e-postasıyla kayıtlı mı kontrol et
    const selectSql = 'SELECT * FROM users WHERE email = ?';
    db.query(selectSql, [email], (err, results) => {
        if (err) return res.redirect('/?error=database_error');
        
        if (results.length > 0) {
            const user = results[0];
            if (user.status === 'globally_banned') {
                return res.redirect('/?error=globally_banned');
            }
            
            // Eğer telefon numarası yoksa profil tamamlama ekranına gönder
            if (!user.phone) {
                return res.redirect(`/?needs_phone=true&email=${encodeURIComponent(email)}&userId=${user.id}`);
            }
            
            // Sosyal ID güncelle
            const idCol = provider === 'google' ? 'google_id' : 'apple_id';
            if (!user[idCol]) {
                db.query(`UPDATE users SET ${idCol} = ? WHERE id = ?`, [providerId, user.id]);
            }
            
            // Giriş yaptır ve token ver
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET || 'jwt_key');
            return res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
        } else {
            // Yeni kullanıcı oluştur (pasif ve telefon yok)
            const idCol = provider === 'google' ? 'google_id' : 'apple_id';
            const insertSql = `INSERT INTO users (name, phone, email, password, is_email_verified, ${idCol}) VALUES (?, '', ?, 'social_login_pwd', 1, ?)`;
            db.query(insertSql, [name, email, providerId], (insErr, result) => {
                if (insErr) {
                    console.error("OAuth Register Error:", insErr);
                    return res.redirect('/?error=oauth_registration_failed');
                }
                const newUserId = result.insertId;
                return res.redirect(`/?needs_phone=true&email=${encodeURIComponent(email)}&userId=${newUserId}`);
            });
        }
    });
}

// KULLANICI KAYIT VE GİRİŞ
app.post('/api/register', (req, res) => {
    console.log("Gelen veri:", req.body);
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });
    }

    // Telefon no karaliste kontrolü
    const checkBanSql = 'SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?';
    db.query(checkBanSql, [phone], (errBan, banRes) => {
        if (errBan) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        const banCount = banRes[0] ? banRes[0].count : 0;
        if (banCount >= 3) {
            return res.status(403).json({ success: false, message: 'Bu telefon numarası suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
        }

        // 6 haneli OTP kodu üret
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika geçerli

        const sqlQuery = 'INSERT INTO users (name, phone, email, password, is_email_verified, otp_code, otp_expiry) VALUES (?, ?, ?, ?, 1, ?, ?)';
        db.query(sqlQuery, [name, phone, email, password, otpCode, otpExpiry], (err, result) => {
            if (err) {
                console.error("SQL Hatası:", err);
                if (err.code === 'ER_DUP_ENTRY') {
                    let field = 'telefon numarası veya e-posta';
                    if (err.message.includes('unique_phone') || err.message.includes('phone')) {
                        field = 'telefon numarası';
                    } else if (err.message.includes('email')) {
                        field = 'e-posta adresi';
                    }
                    return res.status(409).json({ success: false, message: `Bu ${field} zaten kullanımda! (Hata detayı: ${err.message})` });
                }
                return res.status(500).json({ success: false, message: 'Kayıt olurken veritabanı hatası oluştu!' });
            }

            // OTP kodunu göndermeyi devre dışı bıraktık
            // sendOTPEmail(email, otpCode);

            res.json({ 
                success: true, 
                message: 'Kayıt başarılı! Giriş yapıldı.',
                unverified: false,
                user: {
                    id: result.insertId,
                    name: name,
                    email: email,
                    phone: phone,
                    age: null,
                    position: null,
                    experience: null
                }
            });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sqlQuery = 'SELECT id, name, phone, email, age, position, experience, is_email_verified, status FROM users WHERE email = ? AND password = ?';
    db.query(sqlQuery, [email, password], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
        
        const user = results[0];
        if (user.status === 'globally_banned') {
            return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
        }
        
        if (false && user.is_email_verified === 0) {
            // Yeni OTP kodu üret ve kaydet
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
            
            db.query('UPDATE users SET otp_code = ?, otp_expiry = ? WHERE id = ?', [otpCode, otpExpiry, user.id], (updErr) => {
                if (!updErr) sendOTPEmail(user.email, otpCode);
            });
            
            return res.status(403).json({ 
                success: false, 
                unverified: true, 
                userId: user.id, 
                email: user.email,
                message: 'Lütfen hesabınızı doğrulamak için e-postanıza gönderilen OTP kodunu girin!' 
            });
        }
        
        res.json({ success: true, user });
    });
});

// OTP DOĞRULAMA ENDPOINT'İ
app.post('/api/auth/verify-otp', (req, res) => {
    const { userId, email, otpCode } = req.body;
    if (!otpCode) {
        return res.status(400).json({ success: false, message: 'OTP kodu gereklidir!' });
    }

    const query = userId 
        ? 'SELECT id, name, phone, email, age, position, experience, otp_code, otp_expiry FROM users WHERE id = ?'
        : 'SELECT id, name, phone, email, age, position, experience, otp_code, otp_expiry FROM users WHERE email = ?';
    const param = userId || email;

    db.query(query, [param], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
        }

        const user = results[0];
        if (user.otp_code !== otpCode) {
            return res.status(400).json({ success: false, message: 'Geçersiz doğrulama kodu!' });
        }

        if (new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ success: false, message: 'Doğrulama kodunun süresi dolmuştur! Lütfen tekrar giriş yapıp yeni kod isteyin.' });
        }

        db.query('UPDATE users SET is_email_verified = 1, otp_code = NULL, otp_expiry = NULL WHERE id = ?', [user.id], (updErr) => {
            if (updErr) return res.status(500).json({ success: false, message: 'E-posta doğrulanamadı!' });
            
            res.json({ 
                success: true, 
                message: 'E-posta adresiniz doğrulandı! Giriş yapabilirsiniz.', 
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    age: user.age,
                    position: user.position,
                    experience: user.experience
                }
            });
        });
    });
});

// SOSYAL GİRİŞ PROFİL TAMAMLAMA ENDPOINT'İ
app.put('/api/auth/complete-profile', (req, res) => {
    const { userId, phone } = req.body;
    if (!userId || !phone) {
        return res.status(400).json({ success: false, message: 'Kullanıcı ID ve telefon numarası zorunludur!' });
    }

    // Telefon no karaliste kontrolü
    const checkBanSql = 'SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?';
    db.query(checkBanSql, [phone], (errBan, banRes) => {
        if (errBan) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        const banCount = banRes[0] ? banRes[0].count : 0;
        if (banCount >= 3) {
            return res.status(403).json({ success: false, message: 'Bu telefon numarası suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
        }

        // Telefon benzersizlik kontrolü
        db.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId], (errPhone, phoneRes) => {
            if (errPhone) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (phoneRes.length > 0) {
                return res.status(409).json({ success: false, message: 'Bu telefon numarası zaten başka bir hesap tarafından kullanılıyor!' });
            }

            db.query('UPDATE users SET phone = ?, is_email_verified = 1, status = \'active\' WHERE id = ?', [phone, userId], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'Profil güncellenemedi!' });
                
                db.query('SELECT id, name, phone, email, age, position, experience FROM users WHERE id = ?', [userId], (errUser, userResults) => {
                    if (errUser || userResults.length === 0) return res.status(500).json({ success: false, message: 'Kullanıcı detayları alınamadı!' });
                    res.json({ success: true, message: 'Profiliniz başarıyla tamamlandı!', user: userResults[0] });
                });
            });
        });
    });
});

// GOOGLE & APPLE OAUTH ROUTER
app.get(['/api/auth/google', '/api/auth/Google'], (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)}&` +
        `response_type=code&` +
        `scope=openid%20profile%20email`;
    res.redirect(googleAuthUrl);
});

app.get(['/api/auth/google/callback', '/api/auth/Google/callback'], async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.redirect('/?error=no_code');
    }

    let googleUser = {
        id: "google_123456789",
        email: "googleuser@example.com",
        name: "Google Oyuncusu"
    };

    if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'google_dummy_client_secret' && !code.startsWith('mock_')) {
        try {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `code=${code}&client_id=${process.env.GOOGLE_CLIENT_ID}&client_secret=${process.env.GOOGLE_CLIENT_SECRET}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)}&grant_type=authorization_code`
            });
            const tokens = await tokenResponse.json();
            if (tokens.id_token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.decode(tokens.id_token);
                if (decoded) {
                    googleUser = {
                        id: decoded.sub,
                        email: decoded.email,
                        name: decoded.name || decoded.given_name || 'Google Kullanıcısı'
                    };
                }
            }
        } catch (e) {
            console.error("Google Token Exchange error:", e);
            return res.redirect('/?error=google_auth_failed');
        }
    } else {
        if (code === 'mock_google_code') {
            googleUser = {
                id: "google_mock_user_998",
                email: "mockgoogle@gmail.com",
                name: "Ahmet Google"
            };
        }
    }

    handleSocialAuthSuccess(req, res, 'google', googleUser.id, googleUser.email, googleUser.name);
});

app.all(['/api/auth/apple/callback', '/api/auth/Apple/callback'], express.urlencoded({ extended: true }), (req, res) => {
    const code = req.body.code || req.query.code;
    const id_token = req.body.id_token || req.query.id_token;
    const user = req.body.user || req.query.user;
    let appleUser = {
        id: "apple_123456789",
        email: "appleuser@example.com",
        name: "Apple Oyuncusu"
    };

    if (code === 'mock_apple_code') {
        appleUser = {
            id: "apple_mock_user_777",
            email: "mockapple@icloud.com",
            name: "Talha Apple"
        };
    } else if (id_token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(id_token);
            if (decoded) {
                appleUser.id = decoded.sub;
                appleUser.email = decoded.email || '';
                if (user) {
                    try {
                        const parsedUser = JSON.parse(user);
                        if (parsedUser.name) {
                            appleUser.name = `${parsedUser.name.firstName || ''} ${parsedUser.name.lastName || ''}`.trim() || 'Apple Kullanıcısı';
                        }
                    } catch(e) {}
                }
            }
        } catch (err) {
            console.error("Apple Token Decode Error:", err);
            return res.redirect('/?error=apple_auth_failed');
        }
    } else {
        return res.redirect('/?error=apple_auth_failed');
    }

    handleSocialAuthSuccess(req, res, 'apple', appleUser.id, appleUser.email, appleUser.name);
});

// KULLANICI PROFİLİ GÜNCELLEME
app.put('/api/users/profile', (req, res) => {
    const { id, name, phone, age, height, weight, position, experience } = req.body;
    if (!id) {
        return res.status(400).json({ success: false, message: 'Kullanıcı ID gereklidir!' });
    }

    const sqlQuery = 'UPDATE users SET name = ?, phone = ?, age = ?, height = ?, weight = ?, position = ?, experience = ? WHERE id = ?';
    db.query(sqlQuery, [name, phone, age ? parseInt(age) : null, height || null, weight || null, position || null, experience || null, id], (err, result) => {
        if (err) {
            console.error("Profil güncelleme hatası:", err);
            return res.status(500).json({ success: false, message: 'Profil güncellenirken veritabanı hatası oluştu!' });
        }
        res.json({
            success: true,
            message: 'Profil başarıyla güncellendi!',
            user: { id, name, phone, age, height, weight, position, experience }
        });
    });
});

// Güncelle: İşletme Telefon, Servis ve Konum Ayarları
app.put('/api/business-profile/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const { phone, hasService, coordinates, refreshments, cleats, shower, market } = req.body;
    
    if (!phone || !hasService || !coordinates) {
        return res.status(400).json({ success: false, message: 'Telefon, servis ve koordinat bilgisi gereklidir!' });
    }
    
    const sqlQuery = 'UPDATE pitch_objects SET phone = ?, hasService = ?, coordinates = ?, refreshments = ?, cleats = ?, shower = ?, market = ? WHERE fieldKey = ?';
    db.query(sqlQuery, [phone, hasService, coordinates, refreshments || '', cleats || 'Krampon Kiralanmaz', shower || 'Duş Yok', market || 'Market Yok', fieldKey], (err, result) => {
        if (err) {
            console.error("İşletme profili güncelleme hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, message: 'İşletme ayarları başarıyla güncellendi!' });
    });
});

// Günlük saha saatlerini getir
app.get('/api/field-daily-hours/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    db.query('SELECT * FROM field_daily_hours WHERE fieldKey = ? ORDER BY dayOfWeek ASC', [fieldKey], (err, results) => {
        if (err) {
            console.error("Günlük saatleri getirme hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

// Tüm günlük saha saatlerini getir
app.get('/api/all-daily-hours', (req, res) => {
    db.query('SELECT * FROM field_daily_hours', (err, results) => {
        if (err) {
            console.error("Tüm günlük saatleri getirme hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

// Günlük saha saatlerini kaydet
app.put('/api/field-daily-hours/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const { days } = req.body; // Array of { dayOfWeek, openingHour, closingHour }
    
    if (!days || !Array.isArray(days)) {
        return res.status(400).json({ success: false, message: 'Geçersiz veri formatı!' });
    }

    const queries = days.map(d => {
        return new Promise((resolve, reject) => {
            db.query(`INSERT INTO field_daily_hours (fieldKey, dayOfWeek, openingHour, closingHour) 
                      VALUES (?, ?, ?, ?) 
                      ON DUPLICATE KEY UPDATE openingHour = VALUES(openingHour), closingHour = VALUES(closingHour)`,
                [fieldKey, d.dayOfWeek, d.openingHour, d.closingHour],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(queries)
        .then(() => {
            res.json({ success: true, message: 'Günlük saat ayarları kaydedildi!' });
        })
        .catch(err => {
            console.error("Günlük saatleri kaydetme hatası:", err);
            res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        });
});

// =======================================================
// PITCH AYARLARI API ENDPOINTLERİ
// =======================================================

// Tüm pitch ayarlarını getir
app.get('/api/pitch-settings', (req, res) => {
    const sqlQuery = 'SELECT * FROM pitch_settings';
    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

// Belirli bir saha ayarını getir
app.get('/api/pitch-settings/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const sqlQuery = 'SELECT * FROM pitch_settings WHERE fieldKey = ?';
    db.query(sqlQuery, [fieldKey], (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Saha bulunamadı!' });
        }
        res.json({ success: true, data: results[0] });
    });
});

// İşletme ayarlarını güncelle
app.put('/api/pitch-settings/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const { isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count } = req.body;

    const sqlQuery = 'UPDATE pitch_settings SET isClosed = ?, openingHour = ?, closingHour = ?, disabledHours = ?, aboneHours = ?, pricing = ?, field_count = ? WHERE fieldKey = ?';
    db.query(sqlQuery, [isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count, fieldKey], (err, result) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Saha bulunamadı!' });
        }

        // Eğer saha sayısı 2'ye çıkarıldıysa, pitch_objects tablosunda 2. sahanın varlığını kontrol et/oluştur
        if (parseInt(field_count) === 2) {
            const checkPitchQuery = 'SELECT id FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = 2';
            db.query(checkPitchQuery, [fieldKey], (checkErr, checkResults) => {
                if (checkErr) {
                    console.error("Saha 2 kontrol hatası:", checkErr);
                    return res.json({ success: true, message: 'Ayarlar güncellendi fakat Saha 2 kontrol edilemedi.' });
                }
                if (checkResults.length === 0) {
                    const insertPitchQuery = `
                        INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours, morningPrice, eveningPrice, closedDays)
                        VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2500, 3000, '[]')
                    `;
                    const field = fieldsData[fieldKey] || {};
                    const name = `${field.name || 'Halı Saha'} - SAHA 2`;
                    const address = field.address || '';
                    const coordinates = field.coordinates || '';
                    const phone = field.phone || '';
                    const hasService = field.hasService || 'Servis: Yok';
                    const defaultOpen = openingHour || field.openingHour || '09:00';
                    const defaultClose = closingHour || field.closingHour || '23:00';
                    const defaultIsClosed = isClosed !== undefined ? isClosed : 0;

                    db.query(
                        insertPitchQuery,
                        [fieldKey, name, address, coordinates, phone, defaultIsClosed, hasService, defaultOpen, defaultClose, '[]', '[]'],
                        (insErr) => {
                            if (insErr) {
                                console.error("Saha 2 oluşturma hatası:", insErr);
                                return res.json({ success: true, message: 'Ayarlar güncellendi fakat Saha 2 oluşturulamadı.' });
                            }
                            console.log(`Saha 2 dynamically created for ${fieldKey}`);
                            return res.json({ success: true, message: 'Ayarlar başarıyla güncellendi ve Saha 2 oluşturuldu!' });
                        }
                    );
                } else {
                    return res.json({ success: true, message: 'Ayarlar başarıyla güncellendi!' });
                }
            });
        } else {
            res.json({ success: true, message: 'Ayarlar başarıyla güncellendi!' });
        }
    });
});

// Belirli bir pitch nesnesinin (sub-pitch) ayarlarını güncelle
app.put('/api/pitch-objects/:fieldKey/:pitchNumber', (req, res) => {
    const { fieldKey, pitchNumber } = req.params;
    const { isClosed, openingHour, closingHour, disabledHours, aboneHours, morningPrice, eveningPrice, closedDays } = req.body;
    const closedDaysStr = typeof closedDays === 'string' ? closedDays : JSON.stringify(closedDays || []);

    const sqlQuery = `
        UPDATE pitch_objects 
        SET isClosed = ?, openingHour = ?, closingHour = ?, disabledHours = ?, aboneHours = ?, morningPrice = ?, eveningPrice = ?, closedDays = ? 
        WHERE fieldKey = ? AND pitchNumber = ?
    `;
    db.query(
        sqlQuery, 
        [isClosed, openingHour, closingHour, disabledHours, aboneHours, morningPrice, eveningPrice, closedDaysStr, fieldKey, pitchNumber], 
        (err, result) => {
            if (err) {
                console.error("SQL Hatası:", err);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }
            if (result.affectedRows === 0) {
                // Eğer kayıt yoksa, önce eklemeyi dene (Upsert)
                const insertQuery = `
                    INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours, morningPrice, eveningPrice, closedDays)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const field = fieldsData[fieldKey] || {};
                const name = `${field.name || 'Halı Saha'} - SAHA ${pitchNumber}`;
                const address = field.address || '';
                const coordinates = field.coordinates || '';
                const phone = field.phone || '';
                const hasService = field.hasService || 'Servis: Yok';

                db.query(
                    insertQuery,
                    [fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours, morningPrice, eveningPrice, closedDaysStr],
                    (insErr) => {
                        if (insErr) {
                            console.error("SQL Insert Hatası:", insErr);
                            return res.status(500).json({ success: false, message: 'Veritabanı oluşturma hatası!' });
                        }
                        return res.json({ success: true, message: 'Saha başarıyla oluşturuldu ve ayarlandı!' });
                    }
                );
            } else {
                res.json({ success: true, message: 'Saha ayarları başarıyla güncellendi!' });
            }
        }
    );
});

// =======================================================
// MULTI-PITCH PITCH NESNELERİ API
// =======================================================

// Tüm pitch nesnelerini getir
app.get('/api/pitch-list', (req, res) => {
    const sqlQuery = 'SELECT * FROM pitch_objects';
    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

// =======================================================
// REZERVASYONLAR API (ÇOKLU SAHA DESTEĞİ)
// =======================================================

// YENİ REZERVASYON EKLEME
// HELPER: Türkçeleştirilmiş tarih metnini Date objesine çevirme
function parseTurkishDateString(dateStr) {
    if (!dateStr) return null;
    const months = {
        'OCAK': 0, 'ŞUBAT': 1, 'MART': 2, 'NİSAN': 3, 'MAYIS': 4, 'HAZİRAN': 5,
        'TEMMUZ': 6, 'AĞUSTOS': 7, 'EYLÜL': 8, 'EKİM': 9, 'KASIM': 10, 'ARALIK': 11,
        'SUBAT': 1, 'NISAN': 3, 'HAZIRAN': 5, 'AGUSTOS': 7, 'EYLUL': 8, 'EKIM': 9
    };
    const parts = dateStr.trim().toLocaleUpperCase('tr-TR').split(' ');
    if (parts.length < 2) return null;
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const month = months[monthStr];
    if (month === undefined) return null;
    
    const today = new Date();
    let year = today.getFullYear();
    if (month < today.getMonth() - 2) {
        year += 1;
    } else if (month > today.getMonth() + 10) {
        year -= 1;
    }
    return new Date(year, month, day);
}

// HELPER: Play date crossover helper
function getActualPlayDate(dateText, hourText) {
    const d = parseTurkishDateString(dateText);
    if (!d) return null;
    const hourPart = hourText.split(' - ')[0];
    const [h, m] = hourPart.split(':').map(Number);
    if (h < 6) {
        d.setDate(d.getDate() + 1);
    }
    return d;
}

// HELPER: Tarihin Türkçe gün adını getirme
function getTurkishDayName(date) {
    const days = ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ'];
    return days[date.getDay()];
}

// YENİ REZERVASYON EKLEME (GÜVENLİK, LİMİT VE BAN KONTROLLERİ DAHİL)
app.post('/api/reservations', resLimitPerMin, resLimitPerSec, (req, res) => {
    const { fieldKey, pitchNumber, dateText, hourText, user_name, user_id, user_phone, reservation_price, turnstileToken } = req.body;

    if (!fieldKey || !pitchNumber || !dateText || !hourText || !user_name) {
        return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
    }

    // 1. Cloudflare Turnstile Doğrulaması
    const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // Test key
    if (!turnstileToken) {
        return res.status(400).json({ success: false, message: 'Güvenlik doğrulaması (Turnstile) eksik!' });
    }

    fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${turnstileToken}`
    })
    .then(resp => resp.json())
    .then(turnstileData => {
        if (!turnstileData.success) {
            return res.status(400).json({ success: false, message: 'Güvenlik doğrulaması (Turnstile) başarısız!' });
        }

        // 2. Kullanıcı Durum ve Aktivasyon Kontrolleri
        if (!user_id) {
            return res.status(401).json({ success: false, message: 'Rezervasyon yapabilmek için lütfen giriş yapın!' });
        }

        db.query('SELECT is_email_verified, status FROM users WHERE id = ?', [user_id], (errUser, userResults) => {
            if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (userResults.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });

            const user = userResults[0];
            if (user.status === 'globally_banned') {
                return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
            }
            if (false && user.is_email_verified === 0) {
                return res.status(403).json({ success: false, message: 'Lütfen rezervasyon yapabilmek için e-posta adresinizi doğrulayın!' });
            }

            // 3. Yerel Kara Liste (Blacklist) Kontrolü
            db.query('SELECT id FROM field_blacklists WHERE fieldKey = ? AND phone_number = ?', [fieldKey, user_phone], (errBlack, blackResults) => {
                if (errBlack) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (blackResults.length > 0) {
                    return res.status(403).json({ success: false, message: 'Bu halı saha tarafından engellendiğiniz için rezervasyon yapamazsınız!' });
                }

                // 4. Rezervasyon Sayı Limit Kontrolleri
                // A. Aynı Gün İçin Limit (Maks 3) - İptal edilenler DAHİL sayılır (suistimali önlemek için)
                db.query("SELECT dateText, hourText FROM reservations WHERE user_id = ?", [user_id], (errResAll, allUserResList) => {
                    if (errResAll) return res.status(500).json({ success: false, message: 'Limit kontrol hatası!' });

                    const newPlayDate = getActualPlayDate(dateText, hourText);
                    if (!newPlayDate) return res.status(400).json({ success: false, message: 'Geçersiz rezervasyon tarihi veya saati!' });

                    const sameDayCount = allUserResList.filter(r => {
                        const playDate = getActualPlayDate(r.dateText, r.hourText);
                        return playDate && playDate.toDateString() === newPlayDate.toDateString();
                    }).length;

                    if (sameDayCount >= 3) {
                        return res.status(400).json({ success: false, message: 'Günlük rezervasyon hakkınız dolmuştur! Bir gün için en fazla 3 rezervasyon yapabilirsiniz (iptal edilenler dahil).' });
                    }

                    // B. İleriye Dönük Aktif Rezervasyon Limiti (Maks 2) - Sadece aktif (iptal edilmemiş) rezervasyonlar
                    db.query("SELECT dateText, hourText FROM reservations WHERE user_id = ? AND status != 'cancelled'", [user_id], (errResActive, activeUserResList) => {
                        if (errResActive) return res.status(500).json({ success: false, message: 'Limit kontrol hatası!' });

                        const now = new Date();
                        const activeFutureCount = activeUserResList.filter(r => {
                            const playDate = getActualPlayDate(r.dateText, r.hourText);
                            if (!playDate) return false;
                            const hourPart = r.hourText.split(' - ')[1] || '23:59';
                            const [h, m] = hourPart.split(':').map(Number);
                            playDate.setHours(h, m, 0, 0);
                            return playDate.getTime() >= now.getTime();
                        }).length;

                        if (activeFutureCount >= 2) {
                            return res.status(400).json({ success: false, message: 'Aktif rezervasyon limitinize ulaştınız! Aynı anda en fazla 2 aktif rezervasyonunuz olabilir.' });
                        }

                    // 5. Tarih ve Saat Çakışma Kontrolleri
                    const resDate = parseTurkishDateString(dateText);
                    if (resDate) {
                        const hourPart = hourText.split(' - ')[0];
                        const [h, m] = hourPart.split(':').map(Number);
                        resDate.setHours(h, m, 0, 0);
                        if (resDate.getTime() + 60 * 60 * 1000 < now.getTime()) {
                            return res.status(400).json({ success: false, message: 'Geçmiş bir tarihe rezervasyon yapılamaz!' });
                        }
                    }

                    let dayOfWeekVal = 'PAZARTESİ';
                    if (newPlayDate) {
                        dayOfWeekVal = getTurkishDayName(newPlayDate);
                    }

                        db.query('SELECT isClosed, closedDays FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = ?', [fieldKey, pitchNumber], (errClosed, closedResults) => {
                            if (!errClosed && closedResults.length > 0) {
                                const pitchInfo = closedResults[0];
                                if (pitchInfo.isClosed === 1) {
                                    return res.status(400).json({ success: false, message: 'Bu saha bakım/kapalı modundadır, rezervasyon yapılamaz!' });
                                }
                                let closedDaysArr = [];
                                try {
                                    closedDaysArr = typeof pitchInfo.closedDays === 'string' ? JSON.parse(pitchInfo.closedDays || '[]') : (pitchInfo.closedDays || []);
                                } catch (e) {}
                                if (Array.isArray(closedDaysArr) && closedDaysArr.includes(dayOfWeekVal)) {
                                    return res.status(400).json({ success: false, message: 'Bu saha seçilen günde bakım/kapalı modundadır, rezervasyon yapılamaz!' });
                                }
                            }

                            const resConflictSql = "SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND status != 'cancelled'";
                            db.query(resConflictSql, [fieldKey, pitchNumber, dateText, hourText], (errCheck, existingRes) => {
                                if (errCheck) return res.status(500).json({ success: false, message: 'Çakışma kontrolü hatası!' });
                                if (existingRes.length > 0) {
                                    return res.status(409).json({ success: false, message: 'Bu saat aralığı zaten dolu!' });
                                }

                                const subConflictSql = 'SELECT id FROM subscriptions WHERE fieldKey = ? AND pitchNumber = ? AND dayOfWeek = ? AND hourText = ?';
                                db.query(subConflictSql, [fieldKey, pitchNumber, dayOfWeekVal, hourText], (errSub, existingSub) => {
                                    if (errSub) return res.status(500).json({ success: false, message: 'Abonelik kontrolü hatası!' });
                                    if (existingSub.length > 0) {
                                        return res.status(409).json({ success: false, message: 'Bu saat dilimi haftalık aboneliğe aittir!' });
                                    }

                                    // 6. Fiyat Belirleme
                                    db.query('SELECT morningPrice, eveningPrice FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = ?', [fieldKey, pitchNumber], (errPrice, pitchResults) => {
                                        let finalPrice = reservation_price;
                                        if (!finalPrice && !errPrice && pitchResults.length > 0) {
                                            const slotStartHour = parseInt(hourText.split(':')[0]);
                                            const isEvening = slotStartHour >= 17 || slotStartHour < 6;
                                            finalPrice = isEvening ? pitchResults[0].eveningPrice : pitchResults[0].morningPrice;
                                        }
                                        if (!finalPrice) finalPrice = 2500;

                                        // 7. Rezervasyonu Kaydet
                                        const sqlQuery = 'INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_id, user_phone, reservation_price, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                        db.query(sqlQuery, [fieldKey, pitchNumber, dateText, hourText, user_name, user_id, user_phone || null, finalPrice, 'odenmedi'], (errInsert, result) => {
                                            if (errInsert) {
                                                console.error("SQL Ekleme Hatası:", errInsert);
                                                return res.status(500).json({ success: false, message: 'Rezervasyon kaydedilemedi!' });
                                            }
                                            res.json({ success: true, message: 'Rezervasyon başarıyla kaydedildi!', id: result.insertId });
                                        });
                                    });
                                });
                            });
                        });
                    });
                    });
                });
            });
        })
        .catch(err => {
            console.error("Turnstile Siteverify Error:", err);
            return res.status(500).json({ success: false, message: 'Güvenlik doğrulama servis hatası!' });
        });
    });

// KULLANICININ KENDİ REZERVASYONLARINI ÇEKME
app.get('/api/reservations/user/:userId', (req, res) => {
    const { userId } = req.params;
    const sqlQuery = 'SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC';
    db.query(sqlQuery, [parseInt(userId)], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: results });
    });
});

// ÖDEME DURUMUNU GÜNCELLE (İŞLETME PANELİ)
app.put('/api/reservations/:id/payment', (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;
    if (!['odenmedi', 'odendi'].includes(payment_status)) {
        return res.status(400).json({ success: false, message: 'Geçersiz ödeme durumu!' });
    }
    db.query('UPDATE reservations SET payment_status = ? WHERE id = ?', [payment_status, id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, message: 'Ödeme durumu güncellendi!' });
    });
});

// REZERVASYONLARI TÜMÜNÜ ÇEKME
app.get('/api/reservations', (req, res) => {
    const sqlQuery = 'SELECT * FROM reservations ORDER BY created_at DESC';
    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true, data: results });
    });
});

// =======================================================
// REZERVASYON ERTELEME VE İPTAL
// =======================================================

// REZERVASYON ERTELEME (POSTPONE)
app.put('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    const { dateText, hourText, pitchNumber } = req.body;

    if (!dateText || !hourText) {
        return res.status(400).json({ success: false, message: 'Tarih ve saat zorunludur!' });
    }

    // ÖNCESİ KONFİRMASYON: Aynı saha ve pitchNumber için çakışma kontrolü
    const checkSql = 'SELECT id, user_name, fieldKey, pitchNumber FROM reservations WHERE id = ?';
    db.query(checkSql, [id], (err, existingRes) => {
        if (err || existingRes.length === 0) {
            return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
        }

        const oldPitchNumber = existingRes[0].pitchNumber;

        // Eğer saha numarası değişiyorsa, yeni pitchNumber için çakışma kontrolü yap
        if (pitchNumber && pitchNumber !== oldPitchNumber) {
            const conflictSql = "SELECT id, user_name FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND id != ? AND status != 'cancelled'";
            db.query(conflictSql, [existingRes[0].fieldKey, pitchNumber, dateText, hourText, id], (err, conflicts) => {
                if (err) {
                    console.error("Çakışma kontrolü hatası:", err);
                    return res.status(500).json({ success: false, message: 'Çakışma kontrolü hatası!' });
                }
                if (conflicts.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: `Bu saat ve saha zaten dolu! Kullanıcı: ${conflicts[0].user_name}`
                    });
                }

                // Çakışma yoksa güncelleme yap
                updateReservation(id, dateText, hourText, pitchNumber, res);
            });
        } else {
            // Aynı saha numarası - sadece tarih/saat kontrolü
            const conflictSql = "SELECT id, user_name FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND id != ? AND status != 'cancelled'";
            db.query(conflictSql, [existingRes[0].fieldKey, oldPitchNumber, dateText, hourText, id], (err, conflicts) => {
                if (err) {
                    console.error("Çakışma kontrolü hatası:", err);
                    return res.status(500).json({ success: false, message: 'Çakışma kontrolü hatası!' });
                }
                if (conflicts.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: `Bu saat zaten dolu! Kullanıcı: ${conflicts[0].user_name}`
                    });
                }

                // Çakışma yoksa güncelleme yap
                updateReservation(id, dateText, hourText, oldPitchNumber, res);
            });
        }
    });
});

function updateReservation(id, dateText, hourText, pitchNumber, res) {
    db.query('SELECT fieldKey FROM reservations WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
        }
        const fieldKey = results[0].fieldKey;
        
        db.query('SELECT morningPrice, eveningPrice FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = ?', [fieldKey, pitchNumber], (err2, pitchResults) => {
            let morningPrice = 2500;
            let eveningPrice = 2800;
            if (!err2 && pitchResults.length > 0) {
                morningPrice = pitchResults[0].morningPrice;
                eveningPrice = pitchResults[0].eveningPrice;
            }
            
            const slotStartHour = parseInt(hourText.split(':')[0]);
            const isEvening = slotStartHour >= 17 || slotStartHour < 6;
            const newPrice = isEvening ? eveningPrice : morningPrice;
            
            const sqlQuery = 'UPDATE reservations SET dateText = ?, hourText = ?, pitchNumber = ?, reservation_price = ? WHERE id = ?';
            db.query(sqlQuery, [dateText, hourText, pitchNumber, newPrice, id], (err3) => {
                if (err3) {
                    console.error("SQL Hatası:", err3);
                    return res.status(500).json({ success: false, message: 'Rezervasyon güncellenemedi!' });
                }
                res.json({ success: true, message: 'Rezervasyon başarıyla ertelendi!' });
            });
        });
    });
}

// REZERVASYON İPTAL (iptal edilenler de limit hakkından düşsün diye soft-delete)
app.delete('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    const sqlQuery = "UPDATE reservations SET status='cancelled' WHERE id = ?";
    db.query(sqlQuery, [id], (err, result) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Rezervasyon silinemedi!' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
        }
        res.json({ success: true, message: 'Rezervasyon başarıyla iptal edildi!' });
    });
});

// =======================================================
// FORUM İLANLARI API
// =======================================================

app.post('/api/forum', (req, res) => {
    const { dateText, hourText, position, payment, phone, msg, user_id } = req.body;

    const sqlQuery = 'INSERT INTO forum_posts (dateText, hourText, position, payment, phone, msg, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sqlQuery, [dateText, hourText, position, payment, phone || null, msg, user_id || null, 'aktif'], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'İlan kaydedilemedi!' });
        res.json({ success: true, message: 'İlan başarıyla eklendi!', id: result.insertId });
    });
});

app.get('/api/forum', (req, res) => {
    const sqlQuery = 'SELECT * FROM forum_posts ORDER BY created_at DESC';
    db.query(sqlQuery, (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: results });
    });
});

// Forum ilanını BULUNDU olarak işaretle
app.put('/api/forum/:id/found', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    // Kullanıcı kontrolü: sadece ilanı açan kişi bulundu diyebilir
    const checkSql = 'SELECT user_id FROM forum_posts WHERE id = ?';
    db.query(checkSql, [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
        if (results[0].user_id && results[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
        }
        db.query('UPDATE forum_posts SET status = ? WHERE id = ?', ['bulundu', id], (updErr) => {
            if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
            res.json({ success: true, message: 'İlan bulundu olarak işaretlendi!' });
        });
    });
});

// =======================================================
// FORUM YORUMLARI API
// =======================================================

app.get('/api/forum-comments/:type/:postId', (req, res) => {
    const { type, postId } = req.params;
    db.query('SELECT * FROM forum_comments WHERE post_type = ? AND post_id = ? ORDER BY created_at ASC', [type, postId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: results });
    });
});

app.post('/api/forum-comments', (req, res) => {
    const { post_type, post_id, commenter_name, comment } = req.body;
    if (!post_type || !post_id || !commenter_name || !comment) {
        return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
    }
    db.query('INSERT INTO forum_comments (post_type, post_id, commenter_name, comment) VALUES (?, ?, ?, ?)',
        [post_type, post_id, commenter_name, comment], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Yorum kaydedilemedi!' });
            res.json({ success: true, message: 'Yorum başarıyla eklendi!' });
        });
});

// =======================================================
// SAHA YORUMLARI API
// =======================================================

app.get('/api/field-comments/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    db.query('SELECT * FROM field_comments WHERE fieldKey = ? ORDER BY created_at ASC', [fieldKey], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: results });
    });
});

app.post('/api/field-comments', (req, res) => {
    const { fieldKey, commenter_name, comment } = req.body;
    if (!fieldKey || !commenter_name || !comment) {
        return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
    }
    db.query('INSERT INTO field_comments (fieldKey, commenter_name, comment) VALUES (?, ?, ?)',
        [fieldKey, commenter_name, comment], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Yorum kaydedilemedi!' });
            res.json({ success: true, message: 'Yorum başarıyla eklendi!' });
        });
});

// =======================================================
// ABONELİK YÖNETİMİ API
// =======================================================

// Tüm abonelikleri listele (belirli bir halı saha için)
app.get('/api/subscriptions/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const sqlQuery = 'SELECT * FROM subscriptions WHERE fieldKey = ? ORDER BY pitchNumber ASC, FIELD(dayOfWeek, "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ", "PAZAR"), hourText ASC';
    db.query(sqlQuery, [fieldKey], (err, results) => {
        if (err) {
            console.error("Abonelikleri çekme hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

function normalizePhone(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('90') && cleaned.length > 10) cleaned = cleaned.slice(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
    return cleaned;
}

// Kullanıcının telefonuna göre aboneliklerini getir (normalize edilmiş karşılaştırma)
app.get('/api/subscriptions/by-phone/:phone', (req, res) => {
    const inputPhone = normalizePhone(req.params.phone);
    const sqlQuery = 'SELECT * FROM subscriptions ORDER BY FIELD(dayOfWeek, "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ", "PAZAR"), hourText ASC';
    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("Abonelikleri çekme hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        const matched = results.filter(sub => normalizePhone(sub.subscriberPhone) === inputPhone);
        res.json({ success: true, data: matched });
    });
});

// Yeni abonelik oluştur
app.post('/api/subscriptions', (req, res) => {
    const { fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, subscriberPhone } = req.body;

    if (!fieldKey || !pitchNumber || !hourText || !subscriberName || !subscriberPhone) {
        return res.status(400).json({ success: false, message: 'Lütfen tüm alanları doldurunuz!' });
    }

    const subDay = dayOfWeek || 'PAZARTESİ';

    // 1. Aboneliği veritabanına ekle
    const sqlInsert = 'INSERT INTO subscriptions (fieldKey, pitchNumber, dayOfWeek, hourText, subscriberName, subscriberPhone) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sqlInsert, [fieldKey, pitchNumber, subDay, hourText, subscriberName, subscriberPhone], (err) => {
        if (err) {
            console.error("Abonelik ekleme hatası:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'Bu saat diliminde bu sahaya ait zaten bir abonelik mevcut!' });
            }
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }

        // 2. pitch_objects tablosundaki 'aboneHours' dizisine bu saati de ekleyelim ki müşteri tarafında bloke olsun
        const selectObjQuery = 'SELECT aboneHours FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = ?';
        db.query(selectObjQuery, [fieldKey, pitchNumber], (selErr, selResults) => {
            if (selErr || selResults.length === 0) {
                return res.json({ success: true, message: 'Abonelik başarıyla oluşturuldu!' });
            }

            let aboneHours = [];
            try {
                aboneHours = JSON.parse(selResults[0].aboneHours || '[]');
            } catch (pErr) {
                aboneHours = [];
            }

            const blockText = `${subDay} ${hourText}`;
            if (!aboneHours.includes(blockText)) {
                aboneHours.push(blockText);
                const updateObjQuery = 'UPDATE pitch_objects SET aboneHours = ? WHERE fieldKey = ? AND pitchNumber = ?';
                db.query(updateObjQuery, [JSON.stringify(aboneHours), fieldKey, pitchNumber], (updErr) => {
                    if (updErr) console.error("Pitch objects aboneHours güncelleme hatası:", updErr);
                });
            }

            // Abone kaydını reservations tablosuna da ekle (tip: abone)
            const dayNames = ["PAZAR","PAZARTESİ","SALI","ÇARŞAMBA","PERŞEMBE","CUMA","CUMARTESİ"];
            const now = new Date();
            const targetDayIdx = dayNames.indexOf(subDay);
            const currentDayIdx = now.getDay();
            let daysUntil = targetDayIdx - currentDayIdx;
            if (daysUntil <= 0) daysUntil += 7;
            const nextDate = new Date(now);
            nextDate.setDate(now.getDate() + daysUntil);
            const dateText = nextDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');

            const insResSql = 'INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_phone, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, 0, "odenmedi", "active", "abone")';
            db.query(insResSql, [fieldKey, pitchNumber, dateText, hourText, subscriberName, subscriberPhone], (insErr) => {
                if (insErr) console.error("Abone rezervasyon kaydı oluşturma hatası:", insErr);
            });

            res.json({ success: true, message: 'Abonelik başarıyla oluşturuldu ve saat bloke edildi!' });
        });
    });
});

// Abonelik sil
app.delete('/api/subscriptions/:id', (req, res) => {
    const { id } = req.params;

    // 1. Önce abonelik detaylarını al
    const selectQuery = 'SELECT * FROM subscriptions WHERE id = ?';
    db.query(selectQuery, [id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Abonelik bulunamadı!' });
        }

        const { fieldKey, pitchNumber, dayOfWeek, hourText } = results[0];

        // 2. Aboneliği sil
        const deleteQuery = 'DELETE FROM subscriptions WHERE id = ?';
        db.query(deleteQuery, [id], (delErr) => {
            if (delErr) {
                console.error("Abonelik silme hatası:", delErr);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }

            // 3. pitch_objects tablosundaki 'aboneHours' dizisinden bu saati temizleyelim
            const selectObjQuery = 'SELECT aboneHours FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = ?';
            db.query(selectObjQuery, [fieldKey, pitchNumber], (selErr, selResults) => {
                if (selErr || selResults.length === 0) {
                    return res.json({ success: true, message: 'Abonelik silindi!' });
                }

                let aboneHours = [];
                try {
                    aboneHours = JSON.parse(selResults[0].aboneHours || '[]');
                } catch (pErr) {
                    aboneHours = [];
                }

                const blockText = `${dayOfWeek || 'PAZARTESİ'} ${hourText}`;
                aboneHours = aboneHours.filter(h => h !== blockText);

                const updateObjQuery = 'UPDATE pitch_objects SET aboneHours = ? WHERE fieldKey = ? AND pitchNumber = ?';
                db.query(updateObjQuery, [JSON.stringify(aboneHours), fieldKey, pitchNumber], (updErr) => {
                    if (updErr) console.error("Pitch objects aboneHours silme güncelleme hatası:", updErr);
                });

                // Reservations tablosundaki abone kaydını iptal et
                db.query("UPDATE reservations SET status='cancelled' WHERE fieldKey=? AND pitchNumber=? AND hourText=? AND type='abone'", [fieldKey, pitchNumber, hourText], (updResErr) => {
                    if (updResErr) console.error("Abone rezervasyon iptal hatası:", updResErr);
                });

                res.json({ success: true, message: 'Abonelik silindi ve saat boşa çıkarıldı!' });
            });
        });
    });
});

// =======================================================
// MAÇ ARANIYOR (MATCH SEEKERS) API
// =======================================================

// Tüm maç arayanları listele (filtreleme destekli)
app.get('/api/match-seekers', (req, res) => {
    const { position, minAge, maxAge, minFee, maxFee, date, hour } = req.query;
    let sql = `
        SELECT ms.*, 
               COALESCE(avg_table.avg_rating, 0) as averageRating,
               COALESCE(avg_table.review_count, 0) as reviewCount
        FROM match_seekers ms
        LEFT JOIN (
            SELECT playerPhone, AVG(rating) as avg_rating, COUNT(*) as review_count
            FROM player_reviews
            GROUP BY playerPhone
        ) avg_table ON ms.phone = avg_table.playerPhone
        WHERE 1=1
    `;
    const params = [];

    if (position) {
        sql += ' AND ms.position = ?';
        params.push(position);
    }
    if (minAge) {
        sql += ' AND ms.age >= ?';
        params.push(parseInt(minAge));
    }
    if (maxAge) {
        sql += ' AND ms.age <= ?';
        params.push(parseInt(maxAge));
    }
    if (date) {
        sql += ' AND ms.availableDates LIKE ?';
        params.push(`%${date}%`);
    }
    if (hour) {
        sql += ' AND ms.availableHours LIKE ?';
        params.push(`%${hour}%`);
    }

    sql += ' ORDER BY ms.created_at DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Maç arayanlar çekme hatası:', err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }

        // Fiyat filtresi (requestedFee sayısal değilse client-side)
        let filtered = results;
        if (minFee || maxFee) {
            filtered = results.filter(r => {
                const fee = parseInt(r.requestedFee) || 0;
                if (r.requestedFee === 'ÜCRETSIZ' || r.requestedFee === 'ÜCRETSİZ') return (!minFee || parseInt(minFee) <= 0);
                if (minFee && fee < parseInt(minFee)) return false;
                if (maxFee && fee > parseInt(maxFee)) return false;
                return true;
            });
        }

        res.json({ success: true, data: filtered });
    });
});

// Yeni maç arayan ilanı oluştur
app.post('/api/match-seekers', (req, res) => {
    const { playerName, age, position, phone, availableHours, availableDates, requestedFee, msg, user_id, height, weight } = req.body;

    if (!playerName || !age || !position || !availableHours || !availableDates) {
        return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurunuz!' });
    }

    const sqlInsert = `INSERT INTO match_seekers (playerName, age, position, phone, availableHours, availableDates, requestedFee, msg, user_id, status, height, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sqlInsert, [
        playerName, parseInt(age), position, phone || null,
        typeof availableHours === 'string' ? availableHours : JSON.stringify(availableHours),
        typeof availableDates === 'string' ? availableDates : JSON.stringify(availableDates),
        requestedFee || 'ÜCRETSIZ',
        msg || '',
        user_id || null,
        'aktif',
        height || null,
        weight || null
    ], (err, result) => {
        if (err) {
            console.error('Maç arayan ekleme hatası:', err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, message: 'Maç arama ilanı başarıyla oluşturuldu!', id: result.insertId });
    });
});

// Maç arayan ilanı bulundu işareti
app.put('/api/match-seekers/:id/found', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    const checkSql = 'SELECT user_id FROM match_seekers WHERE id = ?';
    db.query(checkSql, [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
        if (results[0].user_id && results[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
        }
        db.query('UPDATE match_seekers SET status = ? WHERE id = ?', ['bulundu', id], (updErr) => {
            if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
            res.json({ success: true, message: 'İlan bulundu olarak işaretlendi!' });
        });
    });
});

// Maç arayan ilanını sil
app.delete('/api/match-seekers/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM match_seekers WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Maç arayan silme hatası:', err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
        }
        res.json({ success: true, message: 'İlan başarıyla silindi!' });
    });
});

// =======================================================
// TAKIM ARA (TEAM SEEKERS) API
// =======================================================

// Tüm takım ilanlarını listele
app.get('/api/team-seekers', (req, res) => {
    const { skillLevel } = req.query;
    let sql = 'SELECT * FROM team_seekers WHERE 1=1';
    const params = [];

    if (skillLevel) {
        sql += ' AND skillLevel = ?';
        params.push(skillLevel);
    }

    sql += ' ORDER BY created_at DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Takım arayanlar çekme hatası:', err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

// Yeni takım ilanı oluştur
app.post('/api/team-seekers', (req, res) => {
    const { teamName, ageGroup, matchSize, skillLevel, availableDays, timeRange, captainName, message, user_id } = req.body;

    if (!teamName || !ageGroup || !matchSize || !skillLevel || !captainName) {
        return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları (Takım Adı, Yaş Grubu, Maç Boyutu, Seviye, Kaptan) doldurunuz!' });
    }

    const sqlInsert = `INSERT INTO team_seekers (teamName, ageGroup, matchSize, skillLevel, availableDays, timeRange, captainName, message, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sqlInsert, [
        teamName,
        ageGroup,
        matchSize,
        skillLevel,
        typeof availableDays === 'string' ? availableDays : JSON.stringify(availableDays || []),
        timeRange || '',
        captainName,
        message || '',
        user_id || null,
        'aktif'
    ], (err, result) => {
        if (err) {
            console.error('Takım arayan ekleme hatası:', err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, message: 'Takım arama ilanı başarıyla oluşturuldu!', id: result.insertId });
    });
});

// Takım ilanı bulundu işareti
app.put('/api/team-seekers/:id/found', (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    const checkSql = 'SELECT user_id FROM team_seekers WHERE id = ?';
    db.query(checkSql, [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
        if (results[0].user_id && results[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
        }
        db.query('UPDATE team_seekers SET status = ? WHERE id = ?', ['bulundu', id], (updErr) => {
            if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
            res.json({ success: true, message: 'İlan bulundu olarak işaretlendi!' });
        });
    });
});

// Takım ilanını sil
app.delete('/api/team-seekers/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM team_seekers WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Takım arayan silme hatası:', err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
        }
        res.json({ success: true, message: 'İlan başarıyla silindi!' });
    });
});

// =======================================================
// GOOGLE & APPLE OAUTH SIGN-IN API
// =======================================================
app.post('/api/oauth-login', (req, res) => {
    const { name, email, phone, provider } = req.body;
    if (!name || !email || !phone) {
        return res.status(400).json({ success: false, message: 'Ad, e-posta ve telefon alanları zorunludur!' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error("OAuth login check error:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }

        if (results.length > 0) {
            db.query('UPDATE users SET name = ?, phone = ? WHERE email = ?', [name, phone, email], (updErr) => {
                if (updErr) console.error("OAuth user update error:", updErr);
                
                // Fetch the full updated user profile
                db.query('SELECT id, name, phone, email, age, position, experience FROM users WHERE email = ?', [email], (selErr, selResults) => {
                    if (selErr || selResults.length === 0) {
                        return res.json({ success: true, message: 'Giriş başarılı!', user: { name, email, phone } });
                    }
                    return res.json({ success: true, message: 'Giriş başarılı!', user: selResults[0] });
                });
            });
        } else {
            const mockPassword = `${provider}_oauth_${Math.floor(Math.random() * 1000000)}`;
            db.query('INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)', [name, phone, email, mockPassword], (insErr, insResult) => {
                if (insErr) {
                    console.error("OAuth register error:", insErr);
                    return res.status(500).json({ success: false, message: 'Kayıt veritabanı hatası!' });
                }
                
                return res.json({
                    success: true,
                    message: 'Yeni kayıt ve giriş başarılı!',
                    user: {
                        id: insResult.insertId,
                        name,
                        email,
                        phone,
                        age: null,
                        position: null,
                        experience: null
                    }
                });
            });
        }
    });
});

// =======================================================
// OYUNCU PUANLAMA VE YORUM (PLAYER RATINGS) API
// =======================================================
app.get('/api/player-reviews/:phone', (req, res) => {
    const { phone } = req.params;
    db.query('SELECT * FROM player_reviews WHERE playerPhone = ? ORDER BY created_at DESC', [phone], (err, results) => {
        if (err) {
            console.error("Yorum çekme hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }

        let totalRating = 0;
        results.forEach(r => totalRating += r.rating);
        const averageRating = results.length > 0 ? parseFloat((totalRating / results.length).toFixed(1)) : 0;

        res.json({
            success: true,
            data: {
                phone: phone,
                reviews: results,
                averageRating: averageRating,
                reviewCount: results.length
            }
        });
    });
});

app.post('/api/player-reviews', (req, res) => {
    const { playerPhone, reviewerName, rating, comment } = req.body;
    if (!playerPhone || !reviewerName || !rating) {
        return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurunuz!' });
    }

    const ratingVal = parseInt(rating);
    if (ratingVal < 1 || ratingVal > 5) {
        return res.status(400).json({ success: false, message: 'Puan 1-5 arasında olmalıdır!' });
    }

    const sqlInsert = 'INSERT INTO player_reviews (playerPhone, reviewerName, rating, comment) VALUES (?, ?, ?, ?)';
    db.query(sqlInsert, [playerPhone, reviewerName, ratingVal, comment || ''], (err) => {
        if (err) {
            console.error("Yorum ekleme hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, message: 'Değerlendirmeniz başarıyla kaydedildi!' });
    });
});


// =======================================================
// İŞLETME PANELİ API ENDPOINTLERİ
// =======================================================

// İşletme giriş
app.post('/api/business-login', (req, res) => {
    const { fieldKey, password } = req.body;

    if (!fieldKey || !password) {
        return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });
    }

    // İşletme şifresi (fieldsData'daki password ile kontrol edelim)
    const field = fieldsData[fieldKey];
    if (!field) {
        return res.status(404).json({ success: false, message: 'İşletme bulunamadı!' });
    }

    // Şifre kontrolü (Demo amaçlı password parametresi kullanılıyor)
    // Gerçek uygulamada veritabanında hashlenmiş şifre kontrolü yapılmalı
    if (field.password && field.password !== password) {
        return res.status(401).json({ success: false, message: 'Hatalı şifre!' });
    }

    // Son giriş tarihini güncelle
    const sqlUpdate = 'UPDATE pitch_settings SET last_login = NOW() WHERE fieldKey = ?';
    db.query(sqlUpdate, [fieldKey], (err) => {
        if (err) console.error("Son giriş güncelleme hatası:", err);
    });

    res.json({
        success: true,
        message: 'Giriş başarılı!',
        business: {
            fieldKey: fieldKey,
            name: field.name,
            address: field.address,
            phone: field.phone,
            hasService: field.hasService,
            pricing: field.pricing || '2600 TL',
            fieldCount: field.pitchCount || 1,
            isOpen: !field.isClosed,
            openingHour: field.openingHour,
            closingHour: field.closingHour,
            aboneHours: field.aboneHours,
            disabledHours: field.disabledHours
        }
    });
});

// İstatistikleri getir
app.get('/api/business-stats/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;

    // Toplam rezervasyon sayısı
    const countSql = 'SELECT COUNT(*) as total FROM reservations WHERE fieldKey = ?';
    db.query(countSql, [fieldKey], (err, countResult) => {
        if (err) {
            console.error("İstatistik hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }

        // Bu ayın rezervasyon sayısı
        const monthlySql = `
            SELECT COUNT(*) as monthly_count
            FROM reservations
            WHERE fieldKey = ? AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `;
        db.query(monthlySql, [fieldKey], (err, monthlyResult) => {
            if (err) {
                console.error("Aylık istatistik hatası:", err);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }

            // Bugün rezervasyon sayısı
            const todaySql = `
                SELECT COUNT(*) as today_count
                FROM reservations
                WHERE fieldKey = ? AND DATE(created_at) = CURDATE()
            `;
            db.query(todaySql, [fieldKey], (err, todayResult) => {
                if (err) {
                    console.error("Günlük istatistik hatası:", err);
                    return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                }

                res.json({
                    success: true,
                    data: {
                        totalReservations: countResult[0].total,
                        monthlyReservations: monthlyResult[0].monthly_count,
                        todayReservations: todayResult[0].today_count,
                        fieldKey: fieldKey
                    }
                });
            });
        });
    });
});

// Rezervasyon detaylarını getir
app.get('/api/business-reservations/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const sqlQuery = 'SELECT * FROM reservations WHERE fieldKey = ? ORDER BY dateText ASC, hourText ASC';
    db.query(sqlQuery, [fieldKey], (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

// İşletme borç listesi (oynanış tarihine göre filtrelenmiş)
app.get('/api/business-debts/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const { filter } = req.query; // 'daily', 'weekly', 'monthly', 'all'
    
    const sqlQuery = `SELECT * FROM reservations WHERE fieldKey = ? AND status != 'cancelled' ORDER BY dateText ASC, hourText ASC`;
    db.query(sqlQuery, [fieldKey], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
        const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOf30DaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

        let filtered = results;
        if (filter === 'daily') {
            filtered = results.filter(r => {
                const pDate = getActualPlayDate(r.dateText, r.hourText) || new Date(r.created_at);
                return pDate.toDateString() === now.toDateString();
            });
        } else if (filter === 'weekly') {
            filtered = results.filter(r => {
                const pDate = getActualPlayDate(r.dateText, r.hourText) || new Date(r.created_at);
                const pTime = pDate.getTime();
                return pTime >= startOf7DaysAgo.getTime() && pTime <= endOfToday.getTime();
            });
        } else if (filter === 'monthly') {
            filtered = results.filter(r => {
                const pDate = getActualPlayDate(r.dateText, r.hourText) || new Date(r.created_at);
                const pTime = pDate.getTime();
                return pTime >= startOf30DaysAgo.getTime() && pTime <= endOfToday.getTime();
            });
        }
        
        res.json({ success: true, data: filtered });
    });
});

// =======================================================
// İSTATİSTİK TABLOSU YÖNETİMİ
// =======================================================

// Günlük istatistik oluştur/çalıştır
app.post('/api/update-daily-stats', (req, res) => {
    const { fieldKey } = req.body;

    if (!fieldKey) {
        return res.status(400).json({ success: false, message: 'Saha key zorunludur!' });
    }

    const today = new Date().toISOString().split('T')[0];

    const checkSql = 'SELECT * FROM daily_statistics WHERE fieldKey = ? AND date = ?';
    db.query(checkSql, [fieldKey, today], (err, existingStats) => {
        if (err) {
            console.error("İstatistik kontrol hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }

        let insertSql, insertParams;

        if (existingStats.length > 0) {
            insertSql = `
                UPDATE daily_statistics
                SET total_reservations = (SELECT COUNT(*) FROM reservations WHERE fieldKey = ?),
                    active_reservations = (SELECT COUNT(*) FROM reservations WHERE fieldKey = ? AND status = 'active'),
                    updated_at = NOW()
                WHERE fieldKey = ? AND date = ?
            `;
            insertParams = [fieldKey, fieldKey, fieldKey, today];
        } else {
            insertSql = `
                INSERT INTO daily_statistics (fieldKey, date, total_reservations, active_reservations)
                VALUES (?, ?, (SELECT COUNT(*) FROM reservations WHERE fieldKey = ?), (SELECT COUNT(*) FROM reservations WHERE fieldKey = ? AND status = 'active'))
            `;
            insertParams = [fieldKey, today, fieldKey, fieldKey];
        }

        db.query(insertSql, insertParams, (err) => {
            if (err) {
                console.error("İstatistik güncelleme hatası:", err);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }

            res.json({ success: true, message: 'İstatistikler güncellendi!' });
        });
    });
});

// Günlük istatistikleri getir
app.get('/api/daily-stats/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const sqlQuery = 'SELECT * FROM daily_statistics WHERE fieldKey = ? ORDER BY date DESC LIMIT 7';
    db.query(sqlQuery, [fieldKey], (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, data: results });
    });
});

// =======================================================
// İSTATİSTİKLER - İÇERİK TABLOSU VERİSİ (ÖDENEN/ÖDENMEYEN AYRILMIŞ)
// =======================================================
app.get('/api/stats-content/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;

    const sqlQuery = `
        SELECT r.pitchNumber, r.hourText, r.created_at, r.dateText, r.reservation_price, r.payment_status, po.morningPrice, po.eveningPrice
        FROM reservations r
        LEFT JOIN pitch_objects po ON r.fieldKey COLLATE utf8mb4_unicode_ci = po.fieldKey COLLATE utf8mb4_unicode_ci AND r.pitchNumber = po.pitchNumber
        WHERE r.fieldKey = ? AND r.status != 'cancelled'
    `;

    db.query(sqlQuery, [fieldKey], (err, results) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }

        let stats = {
            total: 0,
            totalEarningsPaid: 0, totalEarningsUnpaid: 0,
            thisMonth: 0,
            thisMonthEarningsPaid: 0, thisMonthEarningsUnpaid: 0,
            today: 0,
            todayEarningsPaid: 0, todayEarningsUnpaid: 0,
            last7Days: 0,
            last7DaysEarningsPaid: 0, last7DaysEarningsUnpaid: 0
        };

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        const endOfTodayTime = startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1;

        results.forEach(resRow => {
            const mPrice = resRow.morningPrice !== null ? resRow.morningPrice : 2500;
            const ePrice = resRow.eveningPrice !== null ? resRow.eveningPrice : 3000;

            let slotStartHour = 0;
            if (resRow.hourText) {
                const parts = resRow.hourText.split(':');
                if (parts.length > 0) slotStartHour = parseInt(parts[0]) || 0;
            }
            const isEvening = slotStartHour >= 17 || slotStartHour < 6;
            const price = Number(resRow.reservation_price || (isEvening ? ePrice : mPrice));
            const isPaid = resRow.payment_status === 'odendi';

            const resDate = getActualPlayDate(resRow.dateText, resRow.hourText) || new Date(resRow.created_at);

            stats.total++;
            if (isPaid) stats.totalEarningsPaid += price;
            else stats.totalEarningsUnpaid += price;

            // Bugün kontrolü (Oynanış tarihi bugün olanlar)
            if (resDate.toDateString() === now.toDateString()) {
                stats.today++;
                if (isPaid) stats.todayEarningsPaid += price;
                else stats.todayEarningsUnpaid += price;
            }

            // Son 7 gün kontrolü (Geçmiş 7 gün içindeki maçlar, bugün dahil)
            const resDateTime = resDate.getTime();
            if (resDateTime >= startOfWeek.getTime() && resDateTime <= endOfTodayTime) {
                stats.last7Days++;
                if (isPaid) stats.last7DaysEarningsPaid += price;
                else stats.last7DaysEarningsUnpaid += price;
            }

            // Bu ay kontrolü (Maç tarihi bu ay olanlar)
            if (resDate.getMonth() === now.getMonth() && resDate.getFullYear() === now.getFullYear()) {
                stats.thisMonth++;
                if (isPaid) stats.thisMonthEarningsPaid += price;
                else stats.thisMonthEarningsUnpaid += price;
            }
        });

        res.json({ success: true, data: stats });
    });
});

// =======================================================
// YORUM VE PUANLAMA (REVIEWS & RATINGS) API
// =======================================================

// Saha yorumlarını çek
app.get('/api/reviews/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const sql = `
        SELECT r.*, u.name AS userName 
        FROM reviews r 
        LEFT JOIN users u ON r.user_id = u.id 
        WHERE r.fieldKey = ? 
        ORDER BY r.created_at DESC
    `;
    db.query(sql, [fieldKey], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Yorumlar yüklenemedi!' });
        
        const mapped = results.map(row => {
            return {
                id: row.id,
                user_id: row.user_id,
                fieldKey: row.fieldKey,
                pitchNumber: row.pitchNumber,
                reservation_id: row.reservation_id,
                rating_turf: row.rating_turf,
                rating_lighting: row.rating_lighting,
                rating_facilities: row.rating_facilities,
                rating_service: row.rating_service,
                comment: row.comment,
                is_anonymous: row.is_anonymous,
                owner_reply: row.owner_reply,
                owner_reply_at: row.owner_reply_at,
                created_at: row.created_at,
                userName: row.is_anonymous ? 'Anonim Oyuncu' : (row.userName || 'Bilinmeyen Kullanıcı')
            };
        });
        
        res.json({ success: true, data: mapped });
    });
});

// Yeni yorum ekleme (Geçmiş maç kontrolü, 7 gün sınırı ve aggregate güncellemeleri)
app.post('/api/reviews', (req, res) => {
    const { user_id, reservation_id, rating_turf, rating_lighting, rating_facilities, rating_service, comment, is_anonymous } = req.body;
    
    if (!user_id || !reservation_id || !rating_turf || !rating_lighting || !rating_facilities || !rating_service) {
        return res.status(400).json({ success: false, message: 'Lütfen tüm değerlendirme alanlarını doldurunuz!' });
    }
    
    db.query('SELECT * FROM reservations WHERE id = ? AND user_id = ?', [reservation_id, user_id], (errRes, results) => {
        if (errRes || results.length === 0) {
            return res.status(404).json({ success: false, message: 'Böyle bir rezervasyon bulunamadı veya size ait değil!' });
        }
        
        const r = results[0];
        const playDate = getActualPlayDate(r.dateText, r.hourText);
        if (!playDate) {
            return res.status(400).json({ success: false, message: 'Rezervasyon tarihi geçersiz!' });
        }
        
        const now = new Date();
        const hourPart = r.hourText.split(' - ')[1] || '23:59';
        const [h, m] = hourPart.split(':').map(Number);
        playDate.setHours(h, m, 0, 0);
        
        if (playDate.getTime() > now.getTime()) {
            return res.status(400).json({ success: false, message: 'Henüz oynanmamış maçlara yorum yapamazsınız!' });
        }
        
        const limitTime = playDate.getTime() + 7 * 24 * 60 * 60 * 1000;
        if (now.getTime() > limitTime) {
            return res.status(400).json({ success: false, message: 'Maçın üzerinden 7 günden fazla süre geçtiği için artık yorum yapamazsınız!' });
        }
        
        const insertSql = 'INSERT INTO reviews (user_id, fieldKey, pitchNumber, reservation_id, rating_turf, rating_lighting, rating_facilities, rating_service, comment, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(insertSql, [user_id, r.fieldKey, r.pitchNumber, reservation_id, rating_turf, rating_lighting, rating_facilities, rating_service, comment || '', is_anonymous ? 1 : 0], (errIns) => {
            if (errIns) {
                console.error("Yorum ekleme hatası:", errIns);
                if (errIns.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ success: false, message: 'Bu rezervasyon için zaten yorum yapılmış!' });
                }
                return res.status(500).json({ success: false, message: 'Yorum kaydedilemedi!' });
            }
            
            updateFieldRatingAggregates(r.fieldKey, r.pitchNumber, () => {
                res.json({ success: true, message: 'Değerlendirmeniz başarıyla kaydedildi!' });
            });
        });
    });
});

// Saha sahibi yorum cevabı ekleme/güncelleme
app.post('/api/reviews/:id/reply', (req, res) => {
    const { id } = req.params;
    const { owner_reply } = req.body;
    
    if (!owner_reply || !owner_reply.trim()) {
        return res.status(400).json({ success: false, message: 'Cevap metni boş olamaz!' });
    }
    
    const sql = 'UPDATE reviews SET owner_reply = ?, owner_reply_at = NOW() WHERE id = ?';
    db.query(sql, [owner_reply.trim(), id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Cevap kaydedilemedi!' });
        res.json({ success: true, message: 'Cevabınız başarıyla kaydedildi!' });
    });
});

// Helper: Saha ve Pitch Ortalama Puan Güncellemesi
function updateFieldRatingAggregates(fieldKey, pitchNumber, callback) {
    const pitchAvgSql = `
        SELECT AVG((rating_turf + rating_lighting + rating_facilities + rating_service) / 4) AS avgRating 
        FROM reviews 
        WHERE fieldKey = ? AND pitchNumber = ?
    `;
    db.query(pitchAvgSql, [fieldKey, pitchNumber], (err, results) => {
        if (!err && results.length > 0 && results[0].avgRating !== null) {
            const pitchAvg = parseFloat(results[0].avgRating).toFixed(2);
            db.query('UPDATE pitch_objects SET average_rating = ? WHERE fieldKey = ? AND pitchNumber = ?', [pitchAvg, fieldKey, pitchNumber]);
        }
        
        const fieldAvgSql = `
            SELECT AVG((rating_turf + rating_lighting + rating_facilities + rating_service) / 4) AS avgRating 
            FROM reviews 
            WHERE fieldKey = ?
        `;
        db.query(fieldAvgSql, [fieldKey], (err2, results2) => {
            if (!err2 && results2.length > 0 && results2[0].avgRating !== null) {
                const fieldAvg = parseFloat(results2[0].avgRating).toFixed(2);
                db.query('UPDATE pitch_settings SET average_rating = ? WHERE fieldKey = ?', [fieldAvg, fieldKey]);
            }
            if (callback) callback();
        });
    });
}

// =======================================================
// KARA LİSTE (BLACKLIST) API ENDPOINTLERİ
// =======================================================

// Telefon numarasına göre kara listedeki tüm sahaları getir
app.get('/api/blacklists/by-phone/:phone', (req, res) => {
    const { phone } = req.params;
    const sql = 'SELECT fieldKey FROM field_blacklists WHERE phone_number = ?';
    db.query(sql, [phone], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: results.map(r => r.fieldKey) });
    });
});

// Saha kara listesini çek
app.get('/api/blacklist/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    const sql = 'SELECT * FROM field_blacklists WHERE fieldKey = ? ORDER BY created_at DESC';
    db.query(sql, [fieldKey], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: results });
    });
});

// Kara listeye numara ekle (ve global engelleme tetikleyicisi)
app.post('/api/blacklist', (req, res) => {
    const { fieldKey, phone_number } = req.body;
    if (!fieldKey || !phone_number) {
        return res.status(400).json({ success: false, message: 'Saha ve telefon numarası zorunludur!' });
    }
    
    const sql = 'INSERT INTO field_blacklists (fieldKey, phone_number) VALUES (?, ?)';
    db.query(sql, [fieldKey, phone_number], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'Bu telefon numarası zaten engellenmiş!' });
            }
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        
        updateGlobalBanStatus(phone_number, (banErr) => {
            if (banErr) console.error("Global ban güncellenemedi:", banErr);
            res.json({ success: true, message: 'Telefon numarası kara listeye eklendi!' });
        });
    });
});

// Kara listeden numara kaldır
app.delete('/api/blacklist/:fieldKey/:phone_number', (req, res) => {
    const { fieldKey, phone_number } = req.params;
    
    const sql = 'DELETE FROM field_blacklists WHERE fieldKey = ? AND phone_number = ?';
    db.query(sql, [fieldKey, phone_number], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        
        updateGlobalBanStatus(phone_number, (banErr) => {
            if (banErr) console.error("Global ban güncellenemedi:", banErr);
            res.json({ success: true, message: 'Engelleme başarıyla kaldırıldı!' });
        });
    });
});

// Helper: Küresel Ban (Globally Banned) durum güncellemesi (3 farklı saha tarafından engellenme kontrolü)
function updateGlobalBanStatus(phone, callback) {
    if (!phone) {
        if (callback) callback(null);
        return;
    }
    const sql = 'SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?';
    db.query(sql, [phone], (err, results) => {
        if (err) {
            if (callback) callback(err);
            return;
        }
        const count = results[0] ? results[0].count : 0;
        const newStatus = count >= 3 ? 'globally_banned' : 'active';
        db.query("UPDATE users SET status = ? WHERE phone = ?", [newStatus, phone], (updErr) => {
            if (callback) callback(updErr);
        });
    });
}

// Global error handler - always return JSON
app.use((err, req, res, next) => {
    console.error("Sunucu Hatası:", err);
    res.status(500).json({ success: false, message: 'Sunucu hatası oluştu!' });
});

// =======================================================
// ABONELİK CRON JOB - Her saat başı kontrol et
// =======================================================
function processWeeklySubscriptions() {
    const dayNames = ["PAZAR","PAZARTESİ","SALI","ÇARŞAMBA","PERŞEMBE","CUMA","CUMARTESİ"];
    const now = new Date();
    const todayName = dayNames[now.getDay()];

    const sql = 'SELECT * FROM subscriptions WHERE dayOfWeek = ?';
    db.query(sql, [todayName], (err, subs) => {
        if (err) { console.error("Cron: Abonelik sorgu hatası:", err); return; }
        if (subs.length === 0) return;

        const dateText = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');

        subs.forEach(sub => {
            // Check if reservation already exists for this subscription this week
            const checkSql = 'SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND type = ?';
            db.query(checkSql, [sub.fieldKey, sub.pitchNumber, dateText, sub.hourText, 'abone'], (checkErr, existing) => {
                if (checkErr) { console.error("Cron: Çakışma kontrolü hatası:", checkErr); return; }
                if (existing.length > 0) return; // Already exists

                const insertSql = 'INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_phone, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, 0, "odenmedi", "active", "abone")';
                db.query(insertSql, [sub.fieldKey, sub.pitchNumber, dateText, sub.hourText, sub.subscriberName, sub.subscriberPhone], (insErr) => {
                    if (insErr) console.error("Cron: Abone rezervasyon kaydı oluşturma hatası:", insErr);
                    else console.log(`Cron: Abone kaydı oluşturuldu - ${sub.subscriberName} ${dateText} ${sub.hourText}`);
                });
            });
        });
    });
}

// Run every hour (check if today matches subscription day)
processWeeklySubscriptions(); // Initial run on startup
setInterval(processWeeklySubscriptions, 60 * 60 * 1000); // Every hour

app.listen(port, () => {
    console.log(`⚡ Arka plan sunucusu http://127.0.0.1:${port} adresinde çalışıyor!`);
});
