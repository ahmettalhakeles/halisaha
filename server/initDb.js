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

    console.log('Veritabanı migration tamamlandı.');
}

module.exports = { initDatabase };
