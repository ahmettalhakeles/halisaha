const fs = require('fs');
const path = require('path');

async function initDatabase(connection) {
    // Tablolari olustur (yoksa)
    try {
        const sqlPath = path.join(__dirname, '..', 'database_complete.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await connection.query(sql);
        console.log('Tablo olusturma tamamlandi.');
    } catch (err) {
        console.error('Tablo olusturma hatasi:', err.message);
    }

    // Migration: ALTER TABLE statements (idempotent - skip if already exists)
    const migrations = [
        // users table
        { check: "SHOW COLUMNS FROM users LIKE 'age'",        alter: "ALTER TABLE users ADD COLUMN age INT DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM users LIKE 'position'",   alter: "ALTER TABLE users ADD COLUMN position VARCHAR(50) DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM users LIKE 'experience'", alter: "ALTER TABLE users ADD COLUMN experience VARCHAR(50) DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM users LIKE 'height'",     alter: "ALTER TABLE users ADD COLUMN height INT DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM users LIKE 'weight'",     alter: "ALTER TABLE users ADD COLUMN weight INT DEFAULT NULL" },
        // match_seekers table
        { check: "SHOW COLUMNS FROM match_seekers LIKE 'height'", alter: "ALTER TABLE match_seekers ADD COLUMN height INT DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM match_seekers LIKE 'weight'", alter: "ALTER TABLE match_seekers ADD COLUMN weight INT DEFAULT NULL" },
        // pitch_objects table
        { check: "SHOW COLUMNS FROM pitch_objects LIKE 'refreshments'", alter: "ALTER TABLE pitch_objects ADD COLUMN refreshments VARCHAR(255) DEFAULT ''" },
        { check: "SHOW COLUMNS FROM pitch_objects LIKE 'cleats'",       alter: "ALTER TABLE pitch_objects ADD COLUMN cleats VARCHAR(50) DEFAULT 'Krampon Kiralanmaz'" },
        { check: "SHOW COLUMNS FROM pitch_objects LIKE 'shower'",       alter: "ALTER TABLE pitch_objects ADD COLUMN shower VARCHAR(50) DEFAULT 'Duş Yok'" },
        { check: "SHOW COLUMNS FROM pitch_objects LIKE 'market'",       alter: "ALTER TABLE pitch_objects ADD COLUMN market VARCHAR(50) DEFAULT 'Market Yok'" },
        { check: "SHOW COLUMNS FROM pitch_objects LIKE 'average_rating'", alter: "ALTER TABLE pitch_objects ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00" },
        // pitch_settings table
        { check: "SHOW COLUMNS FROM pitch_settings LIKE 'password'",      alter: "ALTER TABLE pitch_settings ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '123456'" },
        { check: "SHOW COLUMNS FROM pitch_settings LIKE 'isDeleted'",     alter: "ALTER TABLE pitch_settings ADD COLUMN isDeleted TINYINT NOT NULL DEFAULT 0" },
        { check: "SHOW COLUMNS FROM pitch_settings LIKE 'field_count'",   alter: "ALTER TABLE pitch_settings ADD COLUMN field_count INT DEFAULT 1" },
        { check: "SHOW COLUMNS FROM pitch_settings LIKE 'average_rating'",alter: "ALTER TABLE pitch_settings ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00" },
        { check: "SHOW COLUMNS FROM pitch_settings LIKE 'last_login'",    alter: "ALTER TABLE pitch_settings ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL" },
        // subscriptions table
        { check: "SHOW COLUMNS FROM subscriptions LIKE 'dayOfWeek'",       alter: "ALTER TABLE subscriptions ADD COLUMN dayOfWeek VARCHAR(50) DEFAULT 'PAZARTESİ'" },
        { check: "SHOW COLUMNS FROM subscriptions LIKE 'user_id'",         alter: "ALTER TABLE subscriptions ADD COLUMN user_id INT DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM subscriptions LIKE 'subscriberPhone'", alter: "ALTER TABLE subscriptions ADD COLUMN subscriberPhone VARCHAR(20) DEFAULT NULL" },
        // reservations table
        { check: "SHOW COLUMNS FROM reservations LIKE 'payment_status'",    alter: "ALTER TABLE reservations ADD COLUMN payment_status ENUM('odenmedi','odendi') DEFAULT 'odenmedi'" },
        { check: "SHOW COLUMNS FROM reservations LIKE 'reservation_price'", alter: "ALTER TABLE reservations ADD COLUMN reservation_price INT DEFAULT 0" },
        { check: "SHOW COLUMNS FROM reservations LIKE 'user_id'",           alter: "ALTER TABLE reservations ADD COLUMN user_id INT DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM reservations LIKE 'play_date'",         alter: "ALTER TABLE reservations ADD COLUMN play_date DATE DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM reservations LIKE 'status'",            alter: "ALTER TABLE reservations ADD COLUMN status VARCHAR(20) DEFAULT 'active'" },
        { check: "SHOW COLUMNS FROM reservations LIKE 'status'",            alter: "ALTER TABLE reservations MODIFY COLUMN status ENUM('pending_payment','active','completed','cancelled','postponed') DEFAULT 'active'" },
        { check: "SHOW COLUMNS FROM reservations LIKE 'type'",              alter: "ALTER TABLE reservations ADD COLUMN type VARCHAR(20) DEFAULT 'normal'" },
        // forum_posts table
        { check: "SHOW COLUMNS FROM forum_posts LIKE 'play_date'", alter: "ALTER TABLE forum_posts ADD COLUMN play_date DATE DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM forum_posts LIKE 'phone'",     alter: "ALTER TABLE forum_posts ADD COLUMN phone VARCHAR(20) DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM forum_posts LIKE 'user_id'",   alter: "ALTER TABLE forum_posts ADD COLUMN user_id INT DEFAULT NULL" },
        // player_reviews table
        { check: "SHOW COLUMNS FROM player_reviews LIKE 'player_id'", alter: "ALTER TABLE player_reviews ADD COLUMN player_id INT NOT NULL DEFAULT 0" },
        // reviews table
        { check: "SHOW COLUMNS FROM reviews LIKE 'owner_reply'",    alter: "ALTER TABLE reviews ADD COLUMN owner_reply TEXT DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM reviews LIKE 'owner_reply_at'", alter: "ALTER TABLE reviews ADD COLUMN owner_reply_at DATETIME DEFAULT NULL" },
        { check: "SHOW COLUMNS FROM reviews LIKE 'is_anonymous'",   alter: "ALTER TABLE reviews ADD COLUMN is_anonymous TINYINT DEFAULT 0" },
        // New tables/columns for fixes
        { check: "SHOW TABLES LIKE 'field_photos'", alter: "CREATE TABLE field_photos (id INT AUTO_INCREMENT PRIMARY KEY, fieldKey VARCHAR(50) NOT NULL, url LONGTEXT NOT NULL, caption VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" },
        { check: "SHOW TABLES LIKE 'super_admins'", alter: "CREATE TABLE super_admins (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, display_name VARCHAR(100) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" },
        { check: "SHOW COLUMNS FROM announcements LIKE 'status'", alter: "ALTER TABLE announcements ADD COLUMN status VARCHAR(20) DEFAULT 'active'" },
        
        // Split Payment Tables
        { check: "SHOW TABLES LIKE 'payment_groups'", alter: "CREATE TABLE payment_groups (id INT AUTO_INCREMENT PRIMARY KEY, reservation_id INT NOT NULL, share_code VARCHAR(8) NOT NULL UNIQUE, total_amount INT NOT NULL, share_amount INT NOT NULL, status ENUM('pending','active','completed','expired') DEFAULT 'pending', paid_count TINYINT DEFAULT 0, first_paid_at DATETIME NULL, deadline DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(share_code), INDEX(reservation_id), INDEX(status), FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" },
        { check: "SHOW TABLES LIKE 'payment_shares'", alter: "CREATE TABLE payment_shares (id INT AUTO_INCREMENT PRIMARY KEY, group_id INT NOT NULL, payer_name VARCHAR(100), amount INT NOT NULL, paid_at DATETIME DEFAULT CURRENT_TIMESTAMP, ip_address VARCHAR(45), FOREIGN KEY (group_id) REFERENCES payment_groups(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" }
    ];

    for (const { check, alter } of migrations) {
        try {
            const [rows] = await connection.query(check);
            if (rows.length === 0) {
                try {
                    await connection.query(alter);
                    console.log('Migration OK:', alter.substring(0, 60));
                } catch (e) {
                    // Already exists or non-critical
                }
            }
        } catch (err) {
            // Table might not exist yet, skip
        }
    }

    // Drop OAuth/OTP columns if they exist
    try {
        const [columns] = await connection.query("SHOW COLUMNS FROM users");
        const colNames = columns.map(c => c.Field);
        
        const colsToDrop = ['google_id', 'apple_id', 'is_email_verified', 'otp_code', 'otp_expiry'];
        for (const col of colsToDrop) {
            if (colNames.includes(col)) {
                await connection.query(`ALTER TABLE users DROP COLUMN ${col}`);
                console.log(`Dropped column ${col} from users table.`);
            }
        }
    } catch (err) {
        console.error('Error dropping OAuth/OTP columns:', err.message);
    }

    // Name splitting migration
    try {
        const [columns] = await connection.query("SHOW COLUMNS FROM users");
        const colNames = columns.map(c => c.Field);
        
        if (colNames.includes('name') && !colNames.includes('first_name')) {
            console.log('Running name to first_name/last_name split migration...');
            
            // 1. Add new columns
            await connection.query("ALTER TABLE users ADD COLUMN first_name VARCHAR(50) DEFAULT NULL");
            await connection.query("ALTER TABLE users ADD COLUMN last_name VARCHAR(50) DEFAULT NULL");
            
            // 2. Read and split names
            const [users] = await connection.query("SELECT id, name FROM users");
            for (const user of users) {
                const rawName = (user.name || '').trim();
                const parts = rawName.split(/\\s+/);
                let firstName = '';
                let lastName = '';
                
                if (parts.length > 1) {
                    lastName = parts.pop();
                    firstName = parts.join(' ');
                } else {
                    firstName = parts[0] || '';
                    lastName = '';
                }
                
                await connection.query("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?", [firstName, lastName, user.id]);
            }
            
            // 3. Drop legacy name column
            await connection.query("ALTER TABLE users DROP COLUMN name");
            
            // 4. Set NOT NULL constraint on new columns
            await connection.query("ALTER TABLE users MODIFY COLUMN first_name VARCHAR(50) NOT NULL");
            await connection.query("ALTER TABLE users MODIFY COLUMN last_name VARCHAR(50) NOT NULL");
            
            console.log('Name split migration completed successfully!');
        }
    } catch (err) {
        console.error('Name split migration failed:', err.message);
    }

    // Seed passwords for pitch_settings (only if still default)
    const passwordSeeds = [
        { fieldKey: 'final',     password: 'final123' },
        { fieldKey: 'arena',     password: 'arena123' },
        { fieldKey: 'ciragan',   password: 'ciragan123' },
        { fieldKey: 'olimpiyat', password: 'olimpiyat123' },
        { fieldKey: 'sporium05', password: 'sporium123' },
        { fieldKey: 'ziyaret',   password: 'ziyaret123' },
    ];
    for (const { fieldKey, password } of passwordSeeds) {
        try {
            await connection.query(
                "UPDATE pitch_settings SET password = ? WHERE fieldKey = ? AND (password = '123456' OR password IS NULL OR password = '')",
                [password, fieldKey]
            );
        } catch (e) {}
    }

    // subscription unique key check
    try {
        const [indexRows] = await connection.query("SHOW INDEX FROM subscriptions WHERE Key_name = 'unique_subscription_day'");
        if (indexRows.length === 0) {
            try { await connection.query("ALTER TABLE subscriptions DROP INDEX unique_subscription"); } catch (e) {}
            try { await connection.query("ALTER TABLE subscriptions ADD UNIQUE KEY unique_subscription_day (fieldKey, pitchNumber, dayOfWeek, hourText)"); } catch (e) {}
        }
    } catch (err) {}

    // Seed default super admin
    try {
        const bcrypt = require('bcryptjs');
        const adminHash = bcrypt.hashSync('admin123', 10);
        await connection.query(
            "INSERT IGNORE INTO super_admins (username, password, display_name) VALUES ('admin', ?, 'Sistem Yöneticisi')",
            [adminHash]
        );
    } catch (e) {
        console.error('Super admin seeding error:', e.message);
    }

    // Backfill play_date for legacy reservations
    try {
        const [resRows] = await connection.query("SELECT id, dateText, hourText, created_at FROM reservations WHERE play_date IS NULL");
        if (resRows.length > 0) {
            console.log(`Eski rezervasyonlar için play_date güncellemesi başlatılıyor: ${resRows.length} kayıt...`);
            for (const row of resRows) {
                const parsed = parseLegacyPlayDate(row.dateText, row.hourText, row.created_at);
                const playDateStr = formatDateToYYYYMMDD(parsed);
                if (playDateStr) {
                    await connection.query("UPDATE reservations SET play_date = ? WHERE id = ?", [playDateStr, row.id]);
                }
            }
            console.log(`play_date migrasyonu başarıyla tamamlandı.`);
        }
    } catch (e) {
        console.error('play_date migrasyon hatası:', e.message);
    }

    // Sync pitch_objects with deleted pitch_settings
    try {
        await connection.query(
            `UPDATE pitch_objects po 
             JOIN pitch_settings ps ON po.fieldKey = ps.fieldKey 
             SET po.isDeleted = ps.isDeleted`
        );
        console.log('Saha silinme durumları senkronize edildi.');
    } catch (e) {
        console.error('Saha silinme durumu senkronizasyon hatası:', e.message);
    }

    console.log('Veritabanı migration tamamlandı.');
}

function parseLegacyPlayDate(dateText, hourText, createdAt) {
    if (!dateText) return null;
    try {
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateText)) {
            const [dd, mm, yyyy] = dateText.split('.');
            return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
        }

        const turkishMonthsDotted = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
        const turkishMonthsUndotted = ['OCAK', 'SUBAT', 'MART', 'NISAN', 'MAYIS', 'HAZIRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];
        
        const parts = dateText.trim().split(' ');
        if (parts.length < 2) return null;
        const day = parseInt(parts[0]);
        
        const monthStr = parts[1].toLocaleUpperCase('tr-TR');
        
        const normalize = (str) => {
            return str
                .replace(/İ/g, 'I')
                .replace(/Ş/g, 'S')
                .replace(/Ç/g, 'C')
                .replace(/Ğ/g, 'G')
                .replace(/Ü/g, 'U')
                .replace(/Ö/g, 'O');
        };
        
        let monthIdx = turkishMonthsDotted.indexOf(monthStr);
        if (monthIdx === -1) {
            monthIdx = turkishMonthsUndotted.indexOf(monthStr);
        }
        if (monthIdx === -1) {
            monthIdx = turkishMonthsUndotted.indexOf(normalize(monthStr));
        }
        
        if (monthIdx === -1 && monthStr.length >= 3) {
            const sub3 = monthStr.substring(0, 3);
            const dotted3 = turkishMonthsDotted.map(m => m.substring(0, 3));
            const undotted3 = turkishMonthsUndotted.map(m => m.substring(0, 3));
            
            monthIdx = dotted3.indexOf(sub3);
            if (monthIdx === -1) {
                monthIdx = undotted3.indexOf(sub3);
            }
            if (monthIdx === -1) {
                monthIdx = undotted3.indexOf(normalize(sub3));
            }
        }
        
        if (monthIdx === -1) return null;
        
        let year;
        if (parts.length >= 3) {
            year = parseInt(parts[2]);
        } else {
            const refDate = createdAt ? new Date(createdAt) : new Date();
            year = refDate.getFullYear();
            if (monthIdx < refDate.getMonth()) {
                year += 1;
            }
        }
        
        if (isNaN(year)) return null;
        
        let d = new Date(year, monthIdx, day);
        
        if (hourText) {
            const hourPart = hourText.split(' - ')[0];
            const [h] = hourPart.split(':').map(Number);
            if (h < 6) {
                d.setDate(d.getDate() + 1);
            }
        }
        return d;
    } catch (e) {
        return null;
    }
}

function formatDateToYYYYMMDD(d) {
    if (!d || isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

module.exports = { initDatabase };
