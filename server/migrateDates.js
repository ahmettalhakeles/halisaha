require('dotenv').config();
const db = require('./db');

function parseTurkishDateString(dateStr) {
    if (!dateStr) return null;
    const turkishMonthsDotted = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
    const turkishMonthsUndotted = ['OCAK', 'SUBAT', 'MART', 'NISAN', 'MAYIS', 'HAZIRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];
    
    const parts = dateStr.trim().split(' ');
    if (parts.length < 2) return null;
    const day = parseInt(parts[0]);
    
    const monthStr = parts[1].toLocaleUpperCase('tr-TR');
    
    // Normalization helper
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
    
    // 3-letter abbreviation fallback
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
    
    // Try to parse year if it exists in parts[2]
    let year;
    if (parts.length >= 3) {
        year = parseInt(parts[2]);
    } else {
        const today = new Date();
        year = today.getFullYear();
        if (monthIdx < today.getMonth()) {
            year += 1;
        }
    }
    
    if (isNaN(year)) return null;
    
    // Returns YYYY-MM-DD
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

async function runMigration() {
    console.log("Starting date migration...");

    try {
        console.log("Adding play_date columns...");
        try {
            await new Promise((resolve, reject) => {
                db.query('ALTER TABLE reservations ADD COLUMN play_date DATE DEFAULT NULL', (err) => {
                    if (err && err.code !== 'ER_DUP_FIELDNAME') return reject(err);
                    resolve();
                });
            });
        } catch (e) {
            console.log("Column play_date already exists in reservations or error:", e.message);
        }

        try {
            await new Promise((resolve, reject) => {
                db.query('ALTER TABLE forum_posts ADD COLUMN play_date DATE DEFAULT NULL', (err) => {
                    if (err && err.code !== 'ER_DUP_FIELDNAME') return reject(err);
                    resolve();
                });
            });
        } catch (e) {
            console.log("Column play_date already exists in forum_posts or error:", e.message);
        }

        console.log("Migrating reservations...");
        const reservations = await new Promise((resolve, reject) => {
            db.query('SELECT id, dateText, hourText FROM reservations', (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        for (const res of reservations) {
            if (res.dateText) {
                let ymd = parseTurkishDateString(res.dateText);
                // Also check if it's already DD.MM.YYYY
                if (/^\d{2}\.\d{2}\.\d{4}$/.test(res.dateText)) {
                    const [dd, mm, yyyy] = res.dateText.split('.');
                    ymd = `${yyyy}-${mm}-${dd}`;
                }
                
                // If the hour starts past midnight (00, 01, 02), we need to shift the date by 1 day because the match starts the next calendar day
                if (ymd && res.hourText) {
                    const hourPart = res.hourText.split(' - ')[0];
                    const [h] = hourPart.split(':').map(Number);
                    if (h < 6) {
                        const d = new Date(ymd);
                        d.setDate(d.getDate() + 1);
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        ymd = `${d.getFullYear()}-${mm}-${dd}`;
                    }
                }

                if (ymd) {
                    await new Promise((resolve, reject) => {
                        db.query('UPDATE reservations SET play_date = ? WHERE id = ?', [ymd, res.id], (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });
                }
            }
        }
        console.log(`Migrated ${reservations.length} reservations.`);

        console.log("Migrating forum_posts...");
        const forumPosts = await new Promise((resolve, reject) => {
            db.query('SELECT id, dateText FROM forum_posts', (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        for (const post of forumPosts) {
            if (post.dateText) {
                let ymd = parseTurkishDateString(post.dateText);
                if (/^\d{2}\.\d{2}\.\d{4}$/.test(post.dateText)) {
                    const [dd, mm, yyyy] = post.dateText.split('.');
                    ymd = `${yyyy}-${mm}-${dd}`;
                }
                if (ymd) {
                    await new Promise((resolve, reject) => {
                        db.query('UPDATE forum_posts SET play_date = ? WHERE id = ?', [ymd, post.id], (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });
                }
            }
        }
        console.log(`Migrated ${forumPosts.length} forum_posts.`);

        console.log("Migrating match_seekers...");
        const matchSeekers = await new Promise((resolve, reject) => {
            db.query('SELECT id, availableDates FROM match_seekers', (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        for (const seeker of matchSeekers) {
            if (seeker.availableDates) {
                try {
                    const dates = JSON.parse(seeker.availableDates);
                    if (Array.isArray(dates)) {
                        const newDates = dates.map(d => {
                            let ymd = parseTurkishDateString(d);
                            if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) {
                                const [dd, mm, yyyy] = d.split('.');
                                ymd = `${yyyy}-${mm}-${dd}`;
                            }
                            return ymd || d; 
                        });

                        await new Promise((resolve, reject) => {
                            db.query('UPDATE match_seekers SET availableDates = ? WHERE id = ?', [JSON.stringify(newDates), seeker.id], (err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                    }
                } catch (e) {
                    // Ignore JSON parse errors for corrupt records
                }
            }
        }
        console.log(`Migrated ${matchSeekers.length} match_seekers.`);

        console.log("Migration completed successfully.");
        process.exit(0);

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigration();
