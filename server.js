require('dotenv').config();
process.env.TZ = 'Europe/Istanbul';
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ksk_jwt_secret_key_123!';

// JWT Authentication Middlewares
function verifyUser(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Oturum açmanız gerekmektedir!' });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Geçersiz veya süresi geçmiş oturum!' });
        if (decoded.role !== 'user') return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz bulunmamaktadır!' });
        req.user = decoded;
        next();
    });
}

function verifyBusiness(req, res, next) {
    const adminToken = req.headers['x-admin-token'];
    if (adminToken) {
        db.query("SELECT * FROM super_admins WHERE username = ?", [adminToken], (err, admins) => {
            if (!err && admins.length > 0) {
                req.adminUser = admins[0];
                return next(); // Admin is allowed to bypass business authorization
            }
            return res.status(403).json({ success: false, message: 'Geçersiz yönetici yetkisi!' });
        });
        return;
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'İşletme oturumu açmanız gerekmektedir!' });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Geçersiz veya süresi geçmiş işletme oturumu!' });
        if (decoded.role !== 'business') return res.status(403).json({ success: false, message: 'Bu işlem için işletme yetkisi gerekmektedir!' });
        
        const reqFieldKey = req.params.fieldKey || req.body.fieldKey;
        if (reqFieldKey && reqFieldKey !== decoded.fieldKey) {
            return res.status(403).json({ success: false, message: 'Farklı bir işletmeye ait ayarları değiştiremezsiniz!' });
        }
        
        req.business = decoded;
        next();
    });
}

function verifyReservationPermission(req, res, next) {
    const adminToken = req.headers['x-admin-token'];
    if (adminToken) {
        db.query("SELECT * FROM super_admins WHERE username = ?", [adminToken], (err, admins) => {
            if (!err && admins.length > 0) {
                req.isAdmin = true;
                return next();
            }
            return res.status(403).json({ success: false, message: 'Geçersiz yetki!' });
        });
        return;
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli!' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Geçersiz oturum!' });
        req.auth = decoded;
        next();
    });
}

// fetch polyfill for Node < 18
if (!globalThis.fetch) {
    try {
        globalThis.fetch = require('node-fetch');
    } catch (e) {
        console.warn('⚠️ node-fetch not available, using https:// fallback for Turnstile');
    }
}

const app = express();
const port = process.env.PORT || 5000;
const host = '0.0.0.0';

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
// .env ve server.js erişimini engelle
app.use((req, res, next) => {
    if (req.path === '/.env' || req.path === '/server.js' || req.path.startsWith('/node_modules/')) {
        return res.status(403).send('Forbidden');
    }
    next();
});
app.use(express.static(__dirname, { dotfiles: 'ignore' }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/isletme', (req, res) => {
    res.sendFile(__dirname + '/isletme.html');
});

app.get('/isletme.html', (req, res) => {
    res.redirect('/isletme');
});

app.get('/işletme', (req, res) => {
    res.redirect('/isletme');
});

app.get('/yonetici', (req, res) => {
    res.sendFile(__dirname + '/yonetici.html');
});

app.get('/yonetici.html', (req, res) => {
    res.redirect('/yonetici');
});

app.get('/yönetici', (req, res) => {
    res.redirect('/yonetici');
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
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'ksk_db',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 30000,
    maxIdle: 5,
    idleTimeout: 60000,
    multipleStatements: true,
    charset: 'utf8mb4'
});

db.on('error', (err) => {
    console.error('⚠️ MySQL Pool Hatası:', err.message);
});

db.getConnection((err, connection) => {
    if (err) return console.error('❌ MySQL Bağlantı Hatası:', err.message);
    console.log('MySQL veritabanina basariyla baglanildi!');
    
    // Set charset and ensure column lengths are correct (fixes login 401 truncation issue)
    connection.query("SET NAMES utf8mb4");
    connection.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL", (alterErr) => {
        if (alterErr) console.warn("⚠️ users tablosu alter edilemedi:", alterErr.message);
    });
    connection.query("ALTER TABLE super_admins MODIFY COLUMN password VARCHAR(255) NOT NULL", (alterErr) => {
        if (alterErr) console.warn("⚠️ super_admins tablosu alter edilemedi:", alterErr.message);
    });
    
    // Run database migration (safe - uses IF NOT EXISTS)
    let migrationSql;
    try {
        migrationSql = fs.readFileSync(__dirname + '/database_complete.sql', 'utf8');
    } catch (readErr) {
        console.error('❌ Migration SQL dosyası okunamadı:', readErr.message);
    }
    if (migrationSql) {
        connection.query(migrationSql, (migrateErr) => {
            if (migrateErr) console.error('❌ Migration hatası:', migrateErr.message);
            else console.log('Veritabanı migration tamamlandı.');
        });
    }
    
    // Check and add age column
    connection.query("SHOW COLUMNS FROM users LIKE 'age'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN age INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.age kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add position column
    connection.query("SHOW COLUMNS FROM users LIKE 'position'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN position VARCHAR(50) DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.position kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add experience column
    connection.query("SHOW COLUMNS FROM users LIKE 'experience'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN experience VARCHAR(50) DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.experience kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add height column in users
    connection.query("SHOW COLUMNS FROM users LIKE 'height'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN height INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.height kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add weight column in users
    connection.query("SHOW COLUMNS FROM users LIKE 'weight'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN weight INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ users.weight kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add height column in match_seekers
    connection.query("SHOW COLUMNS FROM match_seekers LIKE 'height'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE match_seekers ADD COLUMN height INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ match_seekers.height kolonu eklenemedi:", errAlter);
                
            });
        }
    });

    // Check and add weight column in match_seekers
    connection.query("SHOW COLUMNS FROM match_seekers LIKE 'weight'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE match_seekers ADD COLUMN weight INT DEFAULT NULL", (errAlter) => {
                if (errAlter) console.error("❌ match_seekers.weight kolonu eklenemedi:", errAlter);
                
            });
        }
    });

    // Check and add refreshments column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'refreshments'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN refreshments VARCHAR(255) DEFAULT ''", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.refreshments kolonu eklenemedi:", errAlter);
                
            });
        }
    });

    // Check and add cleats column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'cleats'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN cleats VARCHAR(50) DEFAULT 'Krampon Kiralanmaz'", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.cleats kolonu eklenemedi:", errAlter);
                
            });
        }
    });

    // Check and add shower column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'shower'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN shower VARCHAR(50) DEFAULT 'Duş Yok'", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.shower kolonu eklenemedi:", errAlter);
                
            });
        }
    });

    // Check and add market column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'market'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN market VARCHAR(50) DEFAULT 'Market Yok'", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.market kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add isDeleted column in pitch_objects
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'isDeleted'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN isDeleted TINYINT DEFAULT 0", (errAlter) => {
                if (errAlter) console.error("❌ pitch_objects.isDeleted kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add isDeleted column in pitch_settings
    connection.query("SHOW COLUMNS FROM pitch_settings LIKE 'isDeleted'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE pitch_settings ADD COLUMN isDeleted TINYINT DEFAULT 0", (errAlter) => {
                if (errAlter) console.error("❌ pitch_settings.isDeleted kolonu eklenemedi:", errAlter);
            });
        }
    });

    // Check and add dayOfWeek column in subscriptions
    connection.query("SHOW COLUMNS FROM subscriptions LIKE 'dayOfWeek'", (errCheck, results) => {
        if (!errCheck && results.length === 0) {
            connection.query("ALTER TABLE subscriptions ADD COLUMN dayOfWeek VARCHAR(50) DEFAULT 'PAZARTESİ'", (errAlter) => {
                if (errAlter) console.error("❌ subscriptions.dayOfWeek kolonu eklenemedi:", errAlter);
                else {
                    
                    connection.query("ALTER TABLE subscriptions DROP INDEX unique_subscription", (errDrop) => {
                        connection.query("ALTER TABLE subscriptions ADD UNIQUE KEY unique_subscription_day (fieldKey, pitchNumber, dayOfWeek, hourText)", (errAddKey) => {
                            if (errAddKey) console.error("❌ New unique_subscription_day key could not be added:", errAddKey);
                            
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
                    
                });
            }
        });
    });

    // Add closedDays column to pitch_objects table
    connection.query("SHOW COLUMNS FROM pitch_objects LIKE 'closedDays'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE pitch_objects ADD COLUMN closedDays VARCHAR(255) DEFAULT '[]'", (ea) => {
                if (ea) console.error("❌ pitch_objects.closedDays eklenemedi:", ea);
                
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
                    
                });
            }
        });
    });

    // Add user_name, user_phone, user_email to forum_posts
    ['forum_posts'].forEach(table => {
        connection.query(`SHOW COLUMNS FROM ${table} LIKE 'user_name'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(`ALTER TABLE ${table} ADD COLUMN user_name VARCHAR(100) DEFAULT NULL`, (ea) => {
                    if (ea) console.error(`❌ ${table}.user_name eklenemedi:`, ea);
                    
                });
            }
        });
        connection.query(`SHOW COLUMNS FROM ${table} LIKE 'user_phone'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(`ALTER TABLE ${table} ADD COLUMN user_phone VARCHAR(20) DEFAULT NULL`, (ea) => {
                    if (ea) console.error(`❌ ${table}.user_phone eklenemedi:`, ea);
                    
                });
            }
        });
        connection.query(`SHOW COLUMNS FROM ${table} LIKE 'user_email'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(`ALTER TABLE ${table} ADD COLUMN user_email VARCHAR(100) DEFAULT NULL`, (ea) => {
                    if (ea) console.error(`❌ ${table}.user_email eklenemedi:`, ea);
                    
                });
            }
        });
    });

    // Add columns to users table
    const userCols = [
        { col: 'is_email_verified', def: 'ALTER TABLE users ADD COLUMN is_email_verified TINYINT(1) DEFAULT 0' },
        { col: 'status', def: "ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'" },
        { col: 'created_at', def: "ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" }
    ];
    userCols.forEach(({ col, def }) => {
        connection.query(`SHOW COLUMNS FROM users LIKE '${col}'`, (ec, r) => {
            if (!ec && r.length === 0) {
                connection.query(def, (ea) => {
                    if (ea) console.error(`❌ users.${col} eklenemedi:`, ea);
                    
                });
            }
        });
    });

    // Make phone unique in users table
    connection.query("SHOW INDEX FROM users WHERE Key_name = 'unique_phone'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE users ADD UNIQUE KEY unique_phone (phone)", (ea) => {
                if (ea) console.error("❌ users.phone unique yapılamadı:", ea);
                
            });
        }
    });

    // Add type column to reservations table (normal/abone)
    connection.query("SHOW COLUMNS FROM reservations LIKE 'type'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE reservations ADD COLUMN type VARCHAR(20) DEFAULT 'normal'", (ea) => {
                if (ea) console.error("❌ reservations.type eklenemedi:", ea);
                
            });
        }
    });

    // Add status column to reservations table (active/cancelled) for soft-delete
    connection.query("SHOW COLUMNS FROM reservations LIKE 'status'", (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query("ALTER TABLE reservations ADD COLUMN status VARCHAR(20) DEFAULT 'active'", (ea) => {
                if (ea) console.error("❌ reservations.status eklenemedi:", ea);
                
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
        
    });

    // Create field_photos table if not exists
    connection.query(`CREATE TABLE IF NOT EXISTS field_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fieldKey VARCHAR(50) NOT NULL,
        url MEDIUMTEXT NOT NULL,
        caption VARCHAR(255) DEFAULT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_field (fieldKey)
    )`, (ec) => {
        if (ec) console.error('❌ field_photos tablosu oluşturulamadı:', ec);
        
    });

    // Create business_passwords table
    connection.query(`CREATE TABLE IF NOT EXISTS business_passwords (
        fieldKey VARCHAR(50) PRIMARY KEY,
        hashed_password VARCHAR(255) NOT NULL
    )`, (ec) => {
        if (ec) {
            console.error('❌ business_passwords tablosu oluşturulamadı:', ec);
            return;
        }
        
        // Seed demo passwords if empty
        connection.query('SELECT COUNT(*) as cnt FROM business_passwords', (sec, sres) => {
            if (sec) return;
            if (sres[0].cnt === 0) {
                const demoPasswords = {
                    final: 'final123',
                    arena: 'arena123',
                    ciragan: 'ciragan123',
                    olimpiyat: 'olimpiyat123',
                    sporium05: 'sporium123',
                    ziyaret: 'ziyaret123'
                };
                const stmt = 'INSERT INTO business_passwords (fieldKey, hashed_password) VALUES ?';
                const values = Object.entries(demoPasswords).map(([k, v]) => [k, bcrypt.hashSync(v, 10)]);
                connection.query(stmt, [values], (ie) => {
                    if (ie) console.error('❌ Demo şifreler eklenemedi:', ie);
                    
                });
            }
        });
    });

    // Add average_rating column to pitch_settings and pitch_objects
    connection.query(`SHOW COLUMNS FROM pitch_settings LIKE 'average_rating'`, (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query(`ALTER TABLE pitch_settings ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00`, (ea) => {
                if (ea) console.error("❌ pitch_settings.average_rating eklenemedi:", ea);
                
            });
        }
    });
    connection.query(`SHOW COLUMNS FROM pitch_objects LIKE 'average_rating'`, (ec, r) => {
        if (!ec && r.length === 0) {
            connection.query(`ALTER TABLE pitch_objects ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00`, (ea) => {
                if (ea) console.error("❌ pitch_objects.average_rating eklenemedi:", ea);
                
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
    const path = require('path');
    const markerFile = path.join(__dirname, '.db_migrated');
    if (!fs.existsSync(markerFile)) {
        connection.query('DELETE FROM reservations', (err) => {
            if (err) console.error("❌ Rezervasyon silme hatası:", err);
        });
        connection.query('DELETE FROM subscriptions', (err) => {
            if (err) console.error("❌ Abonelik silme hatası:", err);
        });
        connection.query("UPDATE pitch_objects SET openingHour='15:00', closingHour='02:00'");
        connection.query("UPDATE pitch_settings SET openingHour='15:00', closingHour='02:00'");
        try {
            fs.writeFileSync(markerFile, 'done');
            
        } catch (fErr) {
            console.error("❌ Marker dosyası oluşturulamadı:", fErr);
        }
    }

    // Varsayılan süper yönetici hesabını oluştur
    const defaultAdminPass = bcrypt.hashSync('admin123', 10);
    db.query("INSERT IGNORE INTO super_admins (username, password, display_name) VALUES (?, ?, ?)", ['admin', defaultAdminPass, 'Süper Yönetici'], (adminErr) => {
        if (adminErr) console.error('❌ Varsayılan admin oluşturulamadı:', adminErr.message);
        
    });

    connection.release();

    // Sunucuyu başlat (veritabanı bağlantısı kurulduktan sonra)
    processWeeklySubscriptions();
    setInterval(processWeeklySubscriptions, 60 * 60 * 1000);

    app.listen(port, host, () => {
        console.log(`⚡ Arka plan sunucusu http://${host}:${port} adresinde çalışıyor!`);
    });

});

// 6 Adet Izole Multi-Tenant Saha Veri Yapisi (Giriş Şifreleri ve Detaylar)
const fieldsData = {
    "final": {
        name: "Final Halısaha",
        address: "Hacilar Meydani, Merkez, Amasya",
        coordinates: "40.66015930710386, 35.79187401098129",
        phone: "03582120001",
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

// Validation helpers
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePhone(phone) {
    return /^05[0-9]{9}$/.test(phone);
}

// KULLANICI KAYIT VE GİRİŞ
app.post('/api/register', (req, res) => {
    console.log("Gelen veri:", req.body);
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Geçersiz e-posta formatı! Lütfen geçerli bir e-posta girin.' });
    }
    if (!validatePhone(phone)) {
        return res.status(400).json({ success: false, message: 'Geçersiz telefon formatı! Telefon 05 ile başlamalı ve 11 haneli olmalıdır.' });
    }

    // Telefon no karaliste kontrolü
    const checkBanSql = 'SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?';
    db.query(checkBanSql, [phone], (errBan, banRes) => {
        if (errBan) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        const banCount = banRes[0] ? banRes[0].count : 0;
        if (banCount >= 3) {
            return res.status(403).json({ success: false, message: 'Bu telefon numarası suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const sqlQuery = 'INSERT INTO users (name, phone, email, password, is_email_verified) VALUES (?, ?, ?, ?, 1)';
        db.query(sqlQuery, [name, phone, email, hashedPassword], (err, result) => {
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

            const token = jwt.sign({ id: result.insertId, email: email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ 
                success: true, 
                message: 'Kayıt başarılı! Giriş yapıldı.',
                token,
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
    const sqlQuery = 'SELECT id, name, phone, email, age, position, experience, is_email_verified, status, password FROM users WHERE email = ?';
    db.query(sqlQuery, [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
        
        const user = results[0];
        if (user.status === 'globally_banned') {
            return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
        }
        
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
        }
        
        const { password: _, ...safeUser } = user;
        const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: safeUser });
    });
});

// KULLANICI PROFİLİ GÜNCELLEME
app.put('/api/users/profile', (req, res) => {
    const { id, name, phone, age, height, weight, position, experience } = req.body;
    if (!id) {
        return res.status(400).json({ success: false, message: 'Kullanıcı ID gereklidir!' });
    }

    if (phone && !validatePhone(phone)) {
        return res.status(400).json({ success: false, message: 'Geçersiz telefon formatı! Telefon 05 ile başlamalı ve 11 haneli olmalıdır.' });
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
app.put('/api/business-profile/:fieldKey', verifyBusiness, (req, res) => {
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
app.put('/api/field-daily-hours/:fieldKey', verifyBusiness, (req, res) => {
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
    const sqlQuery = 'SELECT * FROM pitch_settings WHERE isDeleted = 0';
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
app.put('/api/pitch-settings/:fieldKey', verifyBusiness, (req, res) => {
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
app.put('/api/pitch-objects/:fieldKey/:pitchNumber', verifyBusiness, (req, res) => {
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
    const sqlQuery = 'SELECT * FROM pitch_objects WHERE isDeleted = 0';
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
app.post('/api/reservations', verifyUser, resLimitPerMin, resLimitPerSec, (req, res) => {
    const { fieldKey, pitchNumber, dateText, hourText, user_name, user_id, user_phone, reservation_price, turnstileToken } = req.body;

    if (!fieldKey || !pitchNumber || !dateText || !hourText || !user_name) {
        return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
    }

    if (req.user.id !== parseInt(user_id)) {
        return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz bulunmamaktadır!' });
    }

    // 1. Cloudflare Turnstile Doğrulaması
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
        console.error('TURNSTILE_SECRET_KEY environment variable is not set!');
        return res.status(500).json({ success: false, message: 'Sunucu yapılandırma hatası!' });
    }
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

        db.getConnection((connErr, conn) => {
            if (connErr) {
                console.error("DB connection error:", connErr);
                return res.status(500).json({ success: false, message: 'Veritabanı bağlantı hatası!' });
            }

            conn.beginTransaction((txErr) => {
                if (txErr) {
                    conn.release();
                    return res.status(500).json({ success: false, message: 'İşlem başlatılamadı!' });
                }

                const rollbackAndRelease = (status, msg) => {
                    conn.rollback(() => {
                        conn.release();
                        res.status(status).json({ success: false, message: msg });
                    });
                };

                // 2. Kullanıcı Durum ve Aktivasyon Kontrolleri
                conn.query('SELECT is_email_verified, status FROM users WHERE id = ?', [user_id], (errUser, userResults) => {
                    if (errUser || userResults.length === 0) {
                        return rollbackAndRelease(500, 'Kullanıcı doğrulama hatası veya kullanıcı bulunamadı!');
                    }

                    const user = userResults[0];
                    if (user.status === 'globally_banned') {
                        return rollbackAndRelease(403, 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!');
                    }

                    // 3. Yerel Kara Liste (Blacklist) Kontrolü
                    conn.query('SELECT id FROM field_blacklists WHERE fieldKey = ? AND phone_number = ?', [fieldKey, user_phone], (errBlack, blackResults) => {
                        if (errBlack) return rollbackAndRelease(500, 'Veritabanı hatası!');
                        if (blackResults.length > 0) {
                            return rollbackAndRelease(403, 'Bu halı saha tarafından engellendiğiniz için rezervasyon yapamazsınız!');
                        }

                        // 4. Rezervasyon Sayı Limit Kontrolleri
                        conn.query("SELECT dateText, hourText FROM reservations WHERE user_id = ?", [user_id], (errResAll, allUserResList) => {
                            if (errResAll) return rollbackAndRelease(500, 'Limit kontrol hatası!');

                            const newPlayDate = getActualPlayDate(dateText, hourText);
                            if (!newPlayDate) return rollbackAndRelease(400, 'Geçersiz rezervasyon tarihi veya saati!');

                            const sameDayCount = allUserResList.filter(r => {
                                const playDate = getActualPlayDate(r.dateText, r.hourText);
                                return playDate && playDate.toDateString() === newPlayDate.toDateString();
                            }).length;

                            if (sameDayCount >= 3) {
                                return rollbackAndRelease(400, 'Günlük rezervasyon hakkınız dolmuştur! Bir gün için en fazla 3 rezervasyon yapabilirsiniz (iptal edilenler dahil).');
                            }

                            conn.query("SELECT dateText, hourText FROM reservations WHERE user_id = ? AND status != 'cancelled'", [user_id], (errResActive, activeUserResList) => {
                                if (errResActive) return rollbackAndRelease(500, 'Limit kontrol hatası!');

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
                                    return rollbackAndRelease(400, 'Aktif rezervasyon limitinize ulaştınız! Aynı anda en fazla 2 aktif rezervasyonunuz olabilir.');
                                }

                                // 5. Tarih ve Saat Çakışma Kontrolleri
                                const resDate = parseTurkishDateString(dateText);
                                if (resDate) {
                                    const hourPart = hourText.split(' - ')[0];
                                    const [h, m] = hourPart.split(':').map(Number);
                                    resDate.setHours(h, m, 0, 0);
                                    if (resDate.getTime() + 60 * 60 * 1000 < now.getTime()) {
                                        return rollbackAndRelease(400, 'Geçmiş bir tarihe rezervasyon yapılamaz!');
                                    }
                                }

                                let dayOfWeekVal = 'PAZARTESİ';
                                if (newPlayDate) {
                                    dayOfWeekVal = getTurkishDayName(newPlayDate);
                                }

                                conn.query('SELECT isClosed, closedDays, isDeleted FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = ?', [fieldKey, pitchNumber], (errClosed, closedResults) => {
                                    if (errClosed) return rollbackAndRelease(500, 'Saha durum sorgu hatası!');
                                    if (closedResults.length > 0) {
                                        const pitchInfo = closedResults[0];
                                        if (pitchInfo.isClosed === 1 || pitchInfo.isDeleted === 1) {
                                            return rollbackAndRelease(400, 'Bu saha bakım/kapalı modundadır veya silinmiştir, rezervasyon yapılamaz!');
                                        }
                                        let closedDaysArr = [];
                                        try {
                                            closedDaysArr = typeof pitchInfo.closedDays === 'string' ? JSON.parse(pitchInfo.closedDays || '[]') : (pitchInfo.closedDays || []);
                                        } catch (e) {}
                                        if (Array.isArray(closedDaysArr) && closedDaysArr.includes(dayOfWeekVal)) {
                                            return rollbackAndRelease(400, 'Bu saha seçilen günde bakım/kapalı modundadır, rezervasyon yapılamaz!');
                                        }
                                    }

                                    // SELECT ... FOR UPDATE to avoid race conditions
                                    const resConflictSql = "SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND status != 'cancelled' FOR UPDATE";
                                    conn.query(resConflictSql, [fieldKey, pitchNumber, dateText, hourText], (errCheck, existingRes) => {
                                        if (errCheck) return rollbackAndRelease(500, 'Çakışma kontrolü hatası!');
                                        if (existingRes.length > 0) {
                                            return rollbackAndRelease(409, 'Bu saat aralığı zaten dolu!');
                                        }

                                        const subConflictSql = 'SELECT id FROM subscriptions WHERE fieldKey = ? AND pitchNumber = ? AND dayOfWeek = ? AND hourText = ?';
                                        conn.query(subConflictSql, [fieldKey, pitchNumber, dayOfWeekVal, hourText], (errSub, existingSub) => {
                                            if (errSub) return rollbackAndRelease(500, 'Abonelik kontrolü hatası!');
                                            if (existingSub.length > 0) {
                                                return rollbackAndRelease(409, 'Bu saat dilimi haftalık aboneliğe aittir!');
                                            }

                                            // 6. Fiyat Belirleme
                                            conn.query('SELECT morningPrice, eveningPrice FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = ?', [fieldKey, pitchNumber], (errPrice, pitchResults) => {
                                                let finalPrice = reservation_price;
                                                if (!finalPrice && !errPrice && pitchResults.length > 0) {
                                                    const slotStartHour = parseInt(hourText.split(':')[0]);
                                                    const isEvening = slotStartHour >= 17 || slotStartHour < 6;
                                                    finalPrice = isEvening ? pitchResults[0].eveningPrice : pitchResults[0].morningPrice;
                                                }
                                                if (!finalPrice) finalPrice = 2500;

                                                // 7. Rezervasyonu Kaydet
                                                const sqlQuery = 'INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_id, user_phone, reservation_price, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                                                conn.query(sqlQuery, [fieldKey, pitchNumber, dateText, hourText, user_name, user_id, user_phone || null, finalPrice, 'odenmedi'], (errInsert, result) => {
                                                    if (errInsert) {
                                                        console.error("SQL Ekleme Hatası:", errInsert);
                                                        return rollbackAndRelease(500, 'Rezervasyon kaydedilemedi!');
                                                    }

                                                    conn.commit((commitErr) => {
                                                        if (commitErr) {
                                                            return rollbackAndRelease(500, 'İşlem onaylanamadı!');
                                                        }
                                                        conn.release();
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
app.put('/api/reservations/:id/payment', verifyBusiness, (req, res) => {
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
app.put('/api/reservations/:id', verifyReservationPermission, (req, res) => {
    const { id } = req.params;
    const { dateText, hourText, pitchNumber } = req.body;

    if (!dateText || !hourText) {
        return res.status(400).json({ success: false, message: 'Tarih ve saat zorunludur!' });
    }

    // ÖNCESİ KONFİRMASYON: Aynı saha ve pitchNumber için çakışma kontrolü
    const checkSql = 'SELECT id, user_name, user_id, fieldKey, pitchNumber FROM reservations WHERE id = ?';
    db.query(checkSql, [id], (err, existingRes) => {
        if (err || existingRes.length === 0) {
            return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
        }

        const resObj = existingRes[0];
        const isOwner = req.auth && req.auth.role === 'user' && resObj.user_id === req.auth.id;
        const isBusiness = req.auth && req.auth.role === 'business' && resObj.fieldKey === req.auth.fieldKey;
        const isAdmin = req.isAdmin;

        if (!isOwner && !isBusiness && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Bu işlemi yapmaya yetkiniz bulunmamaktadır!' });
        }

        const oldPitchNumber = resObj.pitchNumber;

        // Eğer saha numarası değişiyorsa, yeni pitchNumber için çakışma kontrolü yap
        if (pitchNumber && pitchNumber !== oldPitchNumber) {
            const conflictSql = "SELECT id, user_name FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND id != ? AND status != 'cancelled'";
            db.query(conflictSql, [resObj.fieldKey, pitchNumber, dateText, hourText, id], (err, conflicts) => {
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
            db.query(conflictSql, [resObj.fieldKey, oldPitchNumber, dateText, hourText, id], (err, conflicts) => {
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
app.delete('/api/reservations/:id', verifyReservationPermission, (req, res) => {
    const { id } = req.params;

    db.query('SELECT user_id, fieldKey FROM reservations WHERE id = ?', [id], (errRes, existingRes) => {
        if (errRes || existingRes.length === 0) {
            return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı!' });
        }

        const resObj = existingRes[0];
        const isOwner = req.auth && req.auth.role === 'user' && resObj.user_id === req.auth.id;
        const isBusiness = req.auth && req.auth.role === 'business' && resObj.fieldKey === req.auth.fieldKey;
        const isAdmin = req.isAdmin;

        if (!isOwner && !isBusiness && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Bu işlemi yapmaya yetkiniz bulunmamaktadır!' });
        }

        const sqlQuery = "UPDATE reservations SET status='cancelled' WHERE id = ?";
        db.query(sqlQuery, [id], (err, result) => {
            if (err) {
                console.error("SQL Hatası:", err);
                return res.status(500).json({ success: false, message: 'Rezervasyon silinemedi!' });
            }
            res.json({ success: true, message: 'Rezervasyon başarıyla iptal edildi!' });
        });
    });
});

// =======================================================
// FORUM İLANLARI API
// =======================================================

app.post('/api/forum', (req, res) => {
    const { dateText, hourText, position, payment, phone, msg, user_id, user_name, user_phone, user_email } = req.body;

    const sqlQuery = 'INSERT INTO forum_posts (dateText, hourText, position, payment, phone, msg, user_id, status, user_name, user_phone, user_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sqlQuery, [dateText, hourText, position, payment, phone || null, msg, user_id || null, 'aktif', user_name || null, user_phone || null, user_email || null], (err, result) => {
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
            if (selErr) {
                return res.status(500).json({ success: false, message: 'Abonelik verisi güncellenirken hata!' });
            }
            if (selResults.length === 0) {
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
        WHERE ms.status = 'aktif'
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
    let sql = "SELECT * FROM team_seekers WHERE status = 'aktif'";
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

    const field = fieldsData[fieldKey];
    if (!field) {
        return res.status(404).json({ success: false, message: 'İşletme bulunamadı!' });
    }

    // Veritabanındaki hashlenmiş şifre ile kontrol et
    const pwSql = 'SELECT hashed_password FROM business_passwords WHERE fieldKey = ?';
    db.query(pwSql, [fieldKey], (pwErr, pwResults) => {
        if (pwErr || pwResults.length === 0) {
            return res.status(500).json({ success: false, message: 'Şifre verisi bulunamadı!' });
        }
        if (!bcrypt.compareSync(password, pwResults[0].hashed_password)) {
            return res.status(401).json({ success: false, message: 'Hatalı şifre!' });
        }

        // Son giriş tarihini güncelle
        const sqlUpdate = 'UPDATE pitch_settings SET last_login = NOW() WHERE fieldKey = ?';
        db.query(sqlUpdate, [fieldKey], (err) => {
            if (err) console.error("Son giriş güncelleme hatası:", err);
        });

        const token = jwt.sign({ fieldKey: fieldKey, role: 'business' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            message: 'Giriş başarılı!',
            token,
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
});

// İstatistikleri getir
app.get('/api/business-stats/:fieldKey', verifyBusiness, (req, res) => {
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
app.get('/api/business-reservations/:fieldKey', verifyBusiness, (req, res) => {
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
app.get('/api/business-debts/:fieldKey', verifyBusiness, (req, res) => {
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
// SAHA FOTOĞRAF YÜKLEME / LİSTELEME / SİLME
// =======================================================

app.post('/api/field-photos/upload', (req, res) => {
    const { fieldKey, imageData, caption } = req.body;
    if (!fieldKey || !imageData) {
        return res.status(400).json({ success: false, message: 'fieldKey ve imageData zorunludur!' });
    }

    const sqlQuery = 'INSERT INTO field_photos (fieldKey, url, caption, sort_order) VALUES (?, ?, ?, ?)';
    db.query(sqlQuery, [fieldKey, imageData, caption || null, 0], (err, result) => {
        if (err) {
            console.error('Fotoğraf yükleme hatası:', err);
            return res.status(500).json({ success: false, message: 'Fotoğraf yüklenemedi!' });
        }
        res.json({ success: true, id: result.insertId, message: 'Fotoğraf yüklendi.' });
    });
});

app.get('/api/field-photos/:fieldKey', (req, res) => {
    const { fieldKey } = req.params;
    db.query('SELECT id, url, caption, sort_order, created_at FROM field_photos WHERE fieldKey = ? ORDER BY sort_order ASC, id ASC', [fieldKey], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: results });
    });
});

app.delete('/api/field-photos/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM field_photos WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Fotoğraf silinemedi!' });
        res.json({ success: true, message: 'Fotoğraf silindi.' });
    });
});

app.put('/api/field-photos/:id/order', (req, res) => {
    const { id } = req.params;
    const { sort_order } = req.body;
    db.query('UPDATE field_photos SET sort_order = ? WHERE id = ?', [sort_order, id], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Sıra güncellenemedi!' });
        res.json({ success: true });
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
app.get('/api/stats-content/:fieldKey', verifyBusiness, (req, res) => {
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

// =======================================================
// SÜPER YÖNETİCİ PANELİ API ENDPOINTS
// =======================================================

// Admin auth middleware
function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token) return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli!' });
    db.query("SELECT * FROM super_admins WHERE username = ?", [token], (err, admins) => {
        if (err || admins.length === 0) return res.status(403).json({ success: false, message: 'Geçersiz token!' });
        req.adminUser = admins[0];
        next();
    });
}

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre zorunludur!' });
    db.query("SELECT * FROM super_admins WHERE username = ?", [username], (err, admins) => {
        if (err || admins.length === 0) return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı!' });
        const admin = admins[0];
        if (!bcrypt.compareSync(password, admin.password)) return res.status(401).json({ success: false, message: 'Hatalı şifre!' });
        res.json({ success: true, admin: { username: admin.username, display_name: admin.display_name }, token: admin.username });
    });
});

// Dashboard istatistikleri
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
    let response = { success: true, data: {} };
    let pending = 8;
    function checkDone() { if (--pending === 0) res.json(response); }

    db.query("SELECT COUNT(*) AS total FROM pitch_objects", (err, r) => { response.data.totalPitches = r?.[0]?.total || 0; checkDone(); });
    db.query("SELECT COUNT(*) AS total FROM pitch_objects WHERE isClosed = 0", (err, r) => { response.data.activePitches = r?.[0]?.total || 0; checkDone(); });
    db.query("SELECT COUNT(*) AS total FROM users", (err, r) => { response.data.totalUsers = r?.[0]?.total || 0; checkDone(); });
    
    // Rezervasyon kırılımı
    db.query(`
        SELECT 
            SUM(CASE WHEN created_at >= CURDATE() THEN 1 ELSE 0 END) AS today,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS weekly,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS monthly,
            COUNT(*) AS total
        FROM reservations WHERE status = 'active'
    `, (err, r) => {
        response.data.reservationsBreakdown = {
            today: r?.[0]?.today || 0,
            weekly: r?.[0]?.weekly || 0,
            monthly: r?.[0]?.monthly || 0,
            total: r?.[0]?.total || 0
        };
        checkDone();
    });

    // Sahalara göre gelir kırılımı
    db.query(`
        SELECT r.fieldKey, p.name AS field_name,
            SUM(CASE WHEN r.payment_status = 'odendi' THEN r.reservation_price ELSE 0 END) AS paid,
            SUM(CASE WHEN r.payment_status = 'odenmedi' THEN r.reservation_price ELSE 0 END) AS unpaid
        FROM reservations r
        LEFT JOIN pitch_settings p ON r.fieldKey = p.fieldKey
        WHERE r.status = 'active'
        GROUP BY r.fieldKey, p.name
    `, (err, r) => {
        response.data.revenueStats = r || [];
        checkDone();
    });

    // En aktif sahalar
    db.query(`
        SELECT r.fieldKey, p.name AS field_name, COUNT(*) AS count
        FROM reservations r
        LEFT JOIN pitch_settings p ON r.fieldKey = p.fieldKey
        WHERE r.status = 'active'
        GROUP BY r.fieldKey, p.name
        ORDER BY count DESC LIMIT 5
    `, (err, r) => {
        response.data.activeFields = r || [];
        checkDone();
    });

    // En çok rezervasyon yapan kullanıcılar
    db.query(`
        SELECT user_name, user_phone, COUNT(*) AS count, SUM(reservation_price) AS spend
        FROM reservations
        WHERE status = 'active'
        GROUP BY user_phone, user_name
        ORDER BY count DESC LIMIT 5
    `, (err, r) => {
        response.data.topUsers = r || [];
        checkDone();
    });

    // Son 30 günlük trend
    db.query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
        FROM reservations
        WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `, (err, r) => {
        response.data.trendStats = r || [];
        checkDone();
    });
});

// Tüm sahaları listele
app.get('/api/admin/fields', requireAdmin, (req, res) => {
    db.query("SELECT p.*, (SELECT COUNT(*) FROM pitch_objects WHERE fieldKey = p.fieldKey AND isDeleted = 0) AS pitch_count FROM pitch_settings p WHERE p.isDeleted = 0 ORDER BY p.fieldKey", (err, fields) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: fields });
    });
});

// Silinen sahaları listele
app.get('/api/admin/deleted-fields', requireAdmin, (req, res) => {
    db.query("SELECT p.*, (SELECT COUNT(*) FROM pitch_objects WHERE fieldKey = p.fieldKey) AS pitch_count FROM pitch_settings p WHERE p.isDeleted = 1 ORDER BY p.fieldKey", (err, fields) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: fields });
    });
});

// Saha ekle
app.post('/api/admin/fields', requireAdmin, (req, res) => {
    const { fieldKey, name, address, coordinates, phone, openingHour, closingHour, pitchCount, morningPrice, eveningPrice } = req.body;
    if (!fieldKey || !name) return res.status(400).json({ success: false, message: 'Saha anahtarı ve adı zorunludur!' });
    const key = fieldKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    db.query("INSERT IGNORE INTO pitch_settings (fieldKey, isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count) VALUES (?, 0, ?, ?, '[]', '[]', ?, ?)", 
        [key, openingHour || '09:00', closingHour || '23:00', `${morningPrice || 2500}/${eveningPrice || 3000}`, pitchCount || 1], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Saha eklenemedi! (Zaten var olabilir)' });
        for (let i = 1; i <= (pitchCount || 1); i++) {
            db.query("INSERT IGNORE INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour) VALUES (?, ?, ?, ?, ?, ?, 0, 'Servis: Yok', ?, ?)",
                [key, i, `${name} - SAHA ${i}`, address || '', coordinates || '', phone || '', openingHour || '09:00', closingHour || '23:00']);
        }
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'field_add', 'field', ?, ?)", 
            [req.adminUser.username, name, `${name} sahası eklendi`]);
        res.json({ success: true, message: 'Saha başarıyla eklendi!' });
    });
});

// Saha sil (soft delete)
app.delete('/api/admin/fields/:key', requireAdmin, (req, res) => {
    const { key } = req.params;
    db.query("UPDATE pitch_settings SET isDeleted = 1 WHERE fieldKey = ?", [key], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Saha silinemedi!' });
        db.query("UPDATE pitch_objects SET isDeleted = 1 WHERE fieldKey = ?", [key]);
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'field_delete', 'field', ?, ?)", 
            [req.adminUser.username, key, `${key} sahası silindi (soft delete)`]);
        res.json({ success: true, message: 'Saha başarıyla silindi ve geçmişe taşındı!' });
    });
});

// Saha geri getir (restore)
app.post('/api/admin/fields/:key/restore', requireAdmin, (req, res) => {
    const { key } = req.params;
    db.query("UPDATE pitch_settings SET isDeleted = 0 WHERE fieldKey = ?", [key], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Saha geri yüklenemedi!' });
        db.query("UPDATE pitch_objects SET isDeleted = 0 WHERE fieldKey = ?", [key]);
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'field_restore', 'field', ?, ?)", 
            [req.adminUser.username, key, `${key} sahası geri yüklendi`]);
        res.json({ success: true, message: 'Saha başarıyla geri yüklendi!' });
    });
});

// Saha görünürlük değiştir
app.put('/api/admin/fields/:key/visibility', requireAdmin, (req, res) => {
    const { key } = req.params;
    db.query("UPDATE pitch_settings SET isClosed = NOT isClosed WHERE fieldKey = ?", [key], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Güncellenemedi!' });
        db.query("UPDATE pitch_objects SET isClosed = NOT isClosed WHERE fieldKey = ?", [key]);
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'field_visibility', 'field', ?, ?)", 
            [req.adminUser.username, key, `${key} görünürlüğü değiştirildi`]);
        res.json({ success: true, message: 'Görünürlük güncellendi!' });
    });
});

// Tüm kullanıcıları listele (arama ve gelişmiş filtreler ile)
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const { search, status, startDate, endDate, sortBy, suspicious } = req.query;
    
    let sql = `
        SELECT u.*, 
            (SELECT COUNT(*) FROM reservations WHERE user_phone = u.phone) AS total_reservations,
            (SELECT COUNT(*) FROM reservations WHERE user_phone = u.phone AND status = 'cancelled' AND created_at >= NOW() - INTERVAL 30 DAY) AS cancelled_reservations_30_days,
            (SELECT COUNT(DISTINCT fieldKey) FROM field_blacklists WHERE phone_number = u.phone) AS blacklist_count
        FROM users u 
        WHERE 1=1
    `;
    const params = [];
    
    if (search) {
        sql += " AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status) {
        sql += " AND u.status = ?";
        params.push(status);
    }
    
    if (startDate) {
        sql += " AND u.created_at >= ?";
        params.push(startDate + ' 00:00:00');
    }
    
    if (endDate) {
        sql += " AND u.created_at <= ?";
        params.push(endDate + ' 23:59:59');
    }
    
    if (suspicious === 'true') {
        sql += " AND ((SELECT COUNT(*) FROM reservations WHERE user_phone = u.phone AND status = 'cancelled' AND created_at >= NOW() - INTERVAL 30 DAY) >= 3 OR (SELECT COUNT(DISTINCT fieldKey) FROM field_blacklists WHERE phone_number = u.phone) >= 3 OR u.status = 'globally_banned')";
    }
    
    if (sortBy === 'oldest') {
        sql += " ORDER BY u.created_at ASC";
    } else if (sortBy === 'most_reservations') {
        sql += " ORDER BY total_reservations DESC";
    } else if (sortBy === 'least_reservations') {
        sql += " ORDER BY total_reservations ASC";
    } else {
        sql += " ORDER BY u.created_at DESC";
    }
    
    sql += " LIMIT 500";
    
    db.query(sql, params, (err, users) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: users });
    });
});

// Kullanıcı detayı
app.get('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    let response = { success: true, data: {} };
    let pending = 3;
    function checkDone() { if (--pending === 0) res.json(response); }

    db.query("SELECT * FROM users WHERE id = ?", [id], (err, users) => {
        if (err || users.length === 0) { pending = 0; return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' }); }
        response.data.user = users[0];
        checkDone();
    });
    db.query("SELECT r.*, p.name AS field_name FROM reservations r LEFT JOIN pitch_objects p ON r.fieldKey = p.fieldKey AND r.pitchNumber = p.pitchNumber WHERE r.user_phone = (SELECT phone FROM users WHERE id = ?) ORDER BY r.created_at DESC LIMIT 50", [id], (err, reservations) => {
        if (!err) response.data.reservations = reservations;
        checkDone();
    });
    db.query("SELECT r.*, p.name AS field_name FROM reviews r LEFT JOIN pitch_objects p ON r.fieldKey = p.fieldKey AND r.pitchNumber = p.pitchNumber WHERE r.user_id = ? ORDER BY r.created_at DESC", [id], (err, reviews) => {
        if (!err) response.data.reviews = reviews;
        checkDone();
    });
});

// Kullanıcı sil
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.query("SELECT name, phone FROM users WHERE id = ?", [id], (err, users) => {
        if (err || users.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
        db.query("DELETE FROM users WHERE id = ?", [id], (delErr) => {
            if (delErr) return res.status(500).json({ success: false, message: 'Silinemedi!' });
            db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'user_delete', 'user', ?, ?)", 
                [req.adminUser.username, users[0].name, `${users[0].name} (${users[0].phone}) silindi`]);
            res.json({ success: true, message: 'Kullanıcı silindi!' });
        });
    });
});

// Kullanıcı ban/unban
app.put('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.query("SELECT name, status FROM users WHERE id = ?", [id], (err, users) => {
        if (err || users.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
        const newStatus = users[0].status === 'banned' ? 'active' : 'banned';
        db.query("UPDATE users SET status = ? WHERE id = ?", [newStatus, id], (updErr) => {
            if (updErr) return res.status(500).json({ success: false, message: 'Güncellenemedi!' });
            const action = newStatus === 'banned' ? 'ban' : 'unban';
            db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, ?, 'user', ?, ?)", 
                [req.adminUser.username, `user_${action}`, users[0].name, `${users[0].name} ${newStatus === 'banned' ? 'yasaklandı' : 'yasak kaldırıldı'}`]);
            res.json({ success: true, message: newStatus === 'banned' ? 'Kullanıcı yasaklandı!' : 'Kullanıcı yasağı kaldırıldı!', status: newStatus });
        });
    });
});

// Aktivite günlüğü
app.get('/api/admin/activity-log', requireAdmin, (req, res) => {
    const { type } = req.query;
    let sql = "SELECT * FROM admin_activity_log";
    const params = [];
    if (type) { sql += " WHERE action_type LIKE ?"; params.push(`%${type}%`); }
    sql += " ORDER BY created_at DESC LIMIT 200";
    db.query(sql, params, (err, logs) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: logs });
    });
});

// Aktivite günlüğüne yaz (client tarafından)
app.post('/api/admin/activity-log', requireAdmin, (req, res) => {
    const { action_type, target_type, target_name, description } = req.body;
    db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, ?, ?, ?, ?)",
        [req.adminUser.username, action_type, target_type, target_name, description], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Log yazılamadı!' });
        res.json({ success: true });
    });
});

// Global kara liste
app.get('/api/admin/global-blacklist', requireAdmin, (req, res) => {
    const sql = "SELECT fb.phone_number, COUNT(DISTINCT fb.fieldKey) AS block_count, GROUP_CONCAT(DISTINCT fb.fieldKey SEPARATOR ', ') AS fields, u.name, u.status FROM field_blacklists fb LEFT JOIN users u ON fb.phone_number = u.phone GROUP BY fb.phone_number HAVING block_count >= 1 ORDER BY block_count DESC";
    db.query(sql, (err, list) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: list });
    });
});

// Manuel global ban
app.post('/api/admin/global-blacklist', requireAdmin, (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Telefon zorunludur!' });
    db.query("UPDATE users SET status = 'globally_banned' WHERE phone = ?", [phone], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Güncellenemedi!' });
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'global_ban', 'user', ?, ?)", 
            [req.adminUser.username, phone, `${phone} global olarak yasaklandı`]);
        res.json({ success: true, message: 'Kullanıcı global olarak yasaklandı!' });
    });
});

// Global ban kaldır
app.delete('/api/admin/global-blacklist/:phone', requireAdmin, (req, res) => {
    const { phone } = req.params;
    db.query("UPDATE users SET status = 'active' WHERE phone = ?", [phone], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Güncellenemedi!' });
        db.query("DELETE FROM field_blacklists WHERE phone_number = ?", [phone]);
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'global_unban', 'user', ?, ?)", 
            [req.adminUser.username, phone, `${phone} global yasağı kaldırıldı`]);
        res.json({ success: true, message: 'Global yasak kaldırıldı ve tüm kara liste kayıtları temizlendi!' });
    });
});

// Duyuru gönder
app.post('/api/admin/announcements', requireAdmin, (req, res) => {
    const { title, message, target_audience, target_field_key } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Başlık ve mesaj zorunludur!' });
    db.query("INSERT INTO announcements (title, message, target_audience, target_field_key, created_by) VALUES (?, ?, ?, ?, ?)",
        [title, message, target_audience || 'all', target_field_key || null, req.adminUser.username], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Duyuru gönderilemedi!' });
        
        // Aktivite günlüğü kaydı
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'announcement_send', 'all', ?, ?)", 
            [req.adminUser.username, title, `Yeni duyuru gönderildi: ${title}`]);
            
        res.json({ success: true, message: 'Duyuru başarıyla gönderildi!' });
    });
});

// Duyuru listesi
app.get('/api/admin/announcements', requireAdmin, (req, res) => {
    db.query("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100", (err, list) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: list });
    });
});

// Saha bazlı gelir raporu
app.get('/api/admin/revenue', requireAdmin, (req, res) => {
    const { period } = req.query;
    let dateFilter = "";
    if (period === 'today') dateFilter = "WHERE DATE(created_at) = CURDATE()";
    else if (period === 'week') dateFilter = "WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
    else if (period === 'month') dateFilter = "WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
    const sql = `SELECT fieldKey, COUNT(*) AS total_res, COALESCE(SUM(reservation_price), 0) AS total_revenue, SUM(CASE WHEN payment_status = 'odenmedi' THEN reservation_price ELSE 0 END) AS total_debt FROM reservations ${dateFilter} GROUP BY fieldKey ORDER BY total_revenue DESC`;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data });
    });
});

// Saha paneline admin erişimi (business panel bilgilerini döndür)
app.get('/api/admin/field-access/:key', requireAdmin, (req, res) => {
    const { key } = req.params;
    if (!fieldsData[key]) return res.status(404).json({ success: false, message: 'Saha bulunamadı!' });
    db.query("SELECT * FROM pitch_settings WHERE fieldKey = ?", [key], (err, settings) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        db.query("INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, 'field_access', 'field', ?, ?)", 
            [req.adminUser.username, fieldsData[key].name, `${fieldsData[key].name} paneline admin erişimi`]);
        res.json({ success: true, field: fieldsData[key], settings: settings[0] || {} });
    });
});

// Global error handler - always return JSON
app.use((err, req, res, next) => {
    console.error("Sunucu Hatası:", err);
    res.status(500).json({ success: false, message: 'Sunucu hatası oluştu!' });
});

// =======================================================
// ABONELİK CRON JOB - Her saat başı kontrol et
// =======================================================
let _cronRunning = false;
function processWeeklySubscriptions() {
    if (_cronRunning) return;
    _cronRunning = true;

    const dayNames = ["PAZAR","PAZARTESİ","SALI","ÇARŞAMBA","PERŞEMBE","CUMA","CUMARTESİ"];
    const now = new Date();
    const todayName = dayNames[now.getDay()];

    const sql = 'SELECT * FROM subscriptions WHERE dayOfWeek = ?';
    db.query(sql, [todayName], (err, subs) => {
        if (err) { console.error("Cron: Abonelik sorgu hatası:", err); _cronRunning = false; return; }
        if (subs.length === 0) { _cronRunning = false; return; }

        const dateText = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr-TR');
        let pending = subs.length;

        subs.forEach(sub => {
            const checkSql = 'SELECT id FROM reservations WHERE fieldKey = ? AND pitchNumber = ? AND dateText = ? AND hourText = ? AND type = ?';
            db.query(checkSql, [sub.fieldKey, sub.pitchNumber, dateText, sub.hourText, 'abone'], (checkErr, existing) => {
                if (checkErr) { console.error("Cron: Çakışma kontrolü hatası:", checkErr); pending--; if (pending === 0) _cronRunning = false; return; }
                if (existing.length > 0) { pending--; if (pending === 0) _cronRunning = false; return; }

                const insertSql = 'INSERT INTO reservations (fieldKey, pitchNumber, dateText, hourText, user_name, user_phone, reservation_price, payment_status, status, type) VALUES (?, ?, ?, ?, ?, ?, 0, "odenmedi", "active", "abone")';
                db.query(insertSql, [sub.fieldKey, sub.pitchNumber, dateText, sub.hourText, sub.subscriberName, sub.subscriberPhone], (insErr) => {
                    if (insErr) console.error("Cron: Abone rezervasyon kaydı oluşturma hatası:", insErr);
                    else console.log(`Cron: Abone kaydı oluşturuldu - ${sub.subscriberName} ${dateText} ${sub.hourText}`);
                    pending--;
                    if (pending === 0) _cronRunning = false;
                });
            });
        });
    });
}

// Herkese açık duyurular
app.get('/api/announcements', (req, res) => {
    db.query("SELECT id, title, message, created_at FROM announcements WHERE target_audience = 'all' ORDER BY created_at DESC LIMIT 50", (err, list) => {
        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        res.json({ success: true, data: list });
    });
});


