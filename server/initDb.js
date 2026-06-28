const fs = require('fs');
const path = require('path');

async function initDatabase(connection) {
    const queries = [
        "SHOW COLUMNS FROM users LIKE 'age'",
        "SHOW COLUMNS FROM users LIKE 'position'",
        "SHOW COLUMNS FROM users LIKE 'experience'",
        "SHOW COLUMNS FROM users LIKE 'height'",
        "SHOW COLUMNS FROM users LIKE 'weight'",
        "SHOW COLUMNS FROM match_seekers LIKE 'height'",
        "SHOW COLUMNS FROM match_seekers LIKE 'weight'",
        "SHOW COLUMNS FROM pitch_objects LIKE 'refreshments'",
        "SHOW COLUMNS FROM pitch_objects LIKE 'cleats'",
        "SHOW COLUMNS FROM pitch_objects LIKE 'shower'",
        "SHOW COLUMNS FROM pitch_objects LIKE 'market'",
        "SHOW COLUMNS FROM subscriptions LIKE 'dayOfWeek'",
        "SHOW COLUMNS FROM reservations LIKE 'payment_status'",
        "SHOW COLUMNS FROM reservations LIKE 'reservation_price'",
        "SHOW COLUMNS FROM reservations LIKE 'user_id'"
    ];

    const alterStatements = {
        age: "ALTER TABLE users ADD COLUMN age INT DEFAULT NULL",
        position: "ALTER TABLE users ADD COLUMN position VARCHAR(50) DEFAULT NULL",
        experience: "ALTER TABLE users ADD COLUMN experience VARCHAR(50) DEFAULT NULL",
        height_users: "ALTER TABLE users ADD COLUMN height INT DEFAULT NULL",
        weight_users: "ALTER TABLE users ADD COLUMN weight INT DEFAULT NULL",
        height_ms: "ALTER TABLE match_seekers ADD COLUMN height INT DEFAULT NULL",
        weight_ms: "ALTER TABLE match_seekers ADD COLUMN weight INT DEFAULT NULL",
        refreshments: "ALTER TABLE pitch_objects ADD COLUMN refreshments VARCHAR(255) DEFAULT ''",
        cleats: "ALTER TABLE pitch_objects ADD COLUMN cleats VARCHAR(50) DEFAULT 'Krampon Kiralanmaz'",
        shower: "ALTER TABLE pitch_objects ADD COLUMN shower VARCHAR(50) DEFAULT 'Duş Yok'",
        market: "ALTER TABLE pitch_objects ADD COLUMN market VARCHAR(50) DEFAULT 'Market Yok'",
        dayOfWeek: "ALTER TABLE subscriptions ADD COLUMN dayOfWeek VARCHAR(50) DEFAULT 'PAZARTESİ'",
        payment_status: "ALTER TABLE reservations ADD COLUMN payment_status ENUM('odenmedi','odendi') DEFAULT 'odenmedi'",
        reservation_price: "ALTER TABLE reservations ADD COLUMN reservation_price INT DEFAULT 0",
        user_id: "ALTER TABLE reservations ADD COLUMN user_id INT DEFAULT NULL"
    };

    const checkMap = {
        age: 'age', position: 'position', experience: 'experience',
        height_users: 'height', weight_users: 'weight',
        height_ms: 'height', weight_ms: 'weight',
        refreshments: 'refreshments', cleats: 'cleats', shower: 'shower', market: 'market',
        dayOfWeek: 'dayOfWeek',
        payment_status: 'payment_status', reservation_price: 'reservation_price', user_id: 'user_id'
    };

    for (const [key, query] of Object.entries(queries)) {
        try {
            const [rows] = await connection.query(query);
            if (rows.length === 0) {
                const colName = Object.values(checkMap)[Object.keys(checkMap).indexOf(Object.keys(queries)[key])];
                const alterSql = alterStatements[Object.keys(alterStatements)[key]];
                if (alterSql) {
                    await connection.query(alterSql);
                }
            }
        } catch (err) {
            // Table might not exist yet, skip
        }
    }

    // subscription unique key check
    try {
        const [indexRows] = await connection.query("SHOW INDEX FROM subscriptions WHERE Key_name = 'unique_subscription_day'");
        if (indexRows.length === 0) {
            try {
                await connection.query("ALTER TABLE subscriptions DROP INDEX unique_subscription");
            } catch (e) {}
            try {
                await connection.query("ALTER TABLE subscriptions ADD UNIQUE KEY unique_subscription_day (fieldKey, pitchNumber, dayOfWeek, hourText)");
            } catch (e) {}
        }
    } catch (err) {}

    console.log('Veritabanı migration tamamlandı.');
}

module.exports = { initDatabase };
