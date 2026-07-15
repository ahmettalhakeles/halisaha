const { checkAndCancelExpiredPayments } = require('./payment');

function initBusinessRoutes(app, db) {
    const fieldsData = require('../fieldsData');

    // Get match seekers with filters
    app.get('/api/weekly-schedule/:fieldKey', async (req, res) => {
        await checkAndCancelExpiredPayments(db);
        const { fieldKey } = req.params;
        const { weekStart, weekEnd, pitchNumber } = req.query;

        if (!weekStart || !weekEnd) {
            return res.status(400).json({ success: false, message: 'weekStart ve weekEnd parametreleri gerekli!' });
        }

        const pitchFilter = pitchNumber ? ' AND r.pitchNumber = ?' : '';
        const params = pitchNumber ? [fieldKey, weekStart, weekEnd, parseInt(pitchNumber)] : [fieldKey, weekStart, weekEnd];

        const resSql = `
            SELECT r.*, 
                   r.user_name AS reserverName,
                   u.phone AS reserverPhone,
                   r.dateText,
                   r.play_date,
                   r.hourText,
                   r.pitchNumber,
                   r.type,
                   r.payment_status,
                   r.reservation_price,
                   r.status
            FROM reservations r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.fieldKey = ?
              AND r.play_date >= ? AND r.play_date <= ?
              AND (r.status IS NULL OR (r.status != 'cancelled' AND r.status != 'pending_payment'))
              ${pitchFilter}
            ORDER BY r.play_date ASC, r.hourText ASC
        `;

        const hoursSql = 'SELECT * FROM field_daily_hours WHERE fieldKey = ?';
        const settingsSql = 'SELECT * FROM pitch_objects WHERE fieldKey = ? ORDER BY pitchNumber ASC';
        const pitchSettingsSql = 'SELECT field_count FROM pitch_settings WHERE fieldKey = ?';

        db.query(hoursSql, [fieldKey], (hErr, hoursRows) => {
            if (hErr) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });

            db.query(settingsSql, [fieldKey], (sErr, settingsRows) => {
                if (sErr) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });

                db.query(pitchSettingsSql, [fieldKey], (psErr, pitchSettingsRows) => {
                    if (psErr) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                    const pitchCount = pitchSettingsRows.length > 0 ? (parseInt(pitchSettingsRows[0].field_count) || 1) : 1;

                    db.query(resSql, params, (rErr, resRows) => {
                        if (rErr) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });

                        const dailyHours = {};
                        hoursRows.forEach(h => {
                            dailyHours[h.dayOfWeek] = { opening: h.openingHour, closing: h.closingHour };
                        });

                        const disabledHours = [];
                        settingsRows.forEach(s => {
                            if (s.disabledHours) {
                                try {
                                    const parsed = JSON.parse(s.disabledHours);
                                    if (Array.isArray(parsed)) parsed.forEach(h => disabledHours.push({ pitchNumber: s.pitchNumber, hour: h }));
                                } catch (e) {}
                            }
                        });

                        res.json({ success: true, reservations: resRows, dailyHours, disabledHours, pitchCount: pitchCount });
                    });
                });
            });
        });
    });

    // Get business reservations (date-filtered)
    app.get('/api/business-reservations/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        const { weekStart, weekEnd, pitchNumber } = req.query;

        if (!weekStart || !weekEnd) {
            return res.status(400).json({ success: false, message: 'weekStart ve weekEnd parametreleri gerekli!' });
        }

        const pitchFilter = pitchNumber ? ' AND r.pitchNumber = ?' : '';
        const params = pitchNumber ? [fieldKey, weekStart, weekEnd, parseInt(pitchNumber)] : [fieldKey, weekStart, weekEnd];

        const resSql = `
            SELECT r.*, 
                   r.user_name AS reserverName,
                   u.phone AS reserverPhone,
                   r.dateText,
                   r.play_date,
                   r.hourText,
                   r.pitchNumber,
                   r.type,
                   r.payment_status,
                   r.reservation_price,
                   r.status
            FROM reservations r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.fieldKey = ?
              AND r.play_date >= ? AND r.play_date <= ?
              AND (r.status IS NULL OR (r.status != 'cancelled' AND r.status != 'pending_payment'))
              ${pitchFilter}
            ORDER BY r.play_date ASC, r.hourText ASC
        `;

        db.query(resSql, params, (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // İşletme borç listesi
    app.get('/api/business-debts/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        const { filter } = req.query;
        
        const sqlQuery = "SELECT * FROM reservations WHERE fieldKey = ? AND status != 'cancelled' ORDER BY play_date ASC, hourText ASC";
        db.query(sqlQuery, [fieldKey], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
            const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
            const startOf30DaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

            const tzOffset = now.getTimezoneOffset() * 60000;
            const todayStr = new Date(now.getTime() - tzOffset).toISOString().split('T')[0];
            const startOf7DaysAgoStr = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000 - tzOffset).toISOString().split('T')[0];
            const startOf30DaysAgoStr = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000 - tzOffset).toISOString().split('T')[0];

            let filtered = results;
            if (filter === 'daily') {
                filtered = results.filter(r => {
                    const pStr = getPlayDateString(r.play_date, r.dateText, r.hourText, r.created_at);
                    return pStr === todayStr;
                });
            } else if (filter === 'weekly') {
                filtered = results.filter(r => {
                    const pStr = getPlayDateString(r.play_date, r.dateText, r.hourText, r.created_at);
                    return pStr && pStr >= startOf7DaysAgoStr && pStr <= todayStr;
                });
            } else if (filter === 'monthly') {
                filtered = results.filter(r => {
                    const pStr = getPlayDateString(r.play_date, r.dateText, r.hourText, r.created_at);
                    return pStr && pStr >= startOf30DaysAgoStr && pStr <= todayStr;
                });
            }
            
            res.json({ success: true, data: filtered });
        });
    });

    // Get match seekers with filters
    app.get('/api/match-seekers', (req, res) => {
        const { position, minAge, maxAge, minFee, maxFee, date, hour } = req.query;
        let sql = `
            SELECT ms.*, 
                   COALESCE(avg_table.avg_rating, 0) as averageRating,
                   COALESCE(avg_table.review_count, 0) as reviewCount
            FROM match_seekers ms
            LEFT JOIN (
                SELECT player_id, AVG(rating) as avg_rating, COUNT(*) as review_count
                FROM player_reviews
                GROUP BY player_id
            ) avg_table ON ms.user_id = avg_table.player_id
            WHERE 1=1
        `;
        const params = [];

        if (position && position !== 'TÜMÜ') {
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
        if (minFee) {
            sql += ' AND ms.requestedFee >= ?';
            params.push(parseInt(minFee));
        }
        if (maxFee) {
            sql += ' AND ms.requestedFee <= ?';
            params.push(parseInt(maxFee));
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
                console.error('Maç arayan listeleme hatası:', err);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }

            let filtered = results;

            // Filter out past postings (where all availableDates are in the past)
            const todayStr = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(ms => {
                try {
                    const dates = JSON.parse(ms.availableDates);
                    if (Array.isArray(dates)) {
                        return dates.some(d => {
                            // If it's standard YYYY-MM-DD
                            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                                return d >= todayStr;
                            }
                            return true; // Keep legacy formats Best Effort
                        });
                    }
                } catch (e) {}
                return true;
            });

            if (minFee || maxFee) {
                filtered = filtered.filter(r => {
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

    // Create match seeker
    app.post('/api/match-seekers', (req, res) => {
        const { playerName, age, position, phone, availableHours, availableDates, requestedFee, msg, user_id, height, weight } = req.body;

        if (!playerName || !age || !position || !availableHours || !availableDates) {
            return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurunuz!' });
        }

        if (user_id) {
            db.query('SELECT id, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
                if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (userResult.length > 0 && userResult[0].status === 'globally_banned') {
                    return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır!' });
                }
                doInsert();
            });
        } else {
            doInsert();
        }

        function doInsert() {
            db.query(
                `INSERT INTO match_seekers (playerName, age, position, availableHours, availableDates, requestedFee, msg, user_id, status, height, weight)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?, ?)`,
                [
                    playerName, parseInt(age), position,
                    typeof availableHours === 'string' ? availableHours : JSON.stringify(availableHours),
                    typeof availableDates === 'string' ? availableDates : JSON.stringify(availableDates),
                    requestedFee || 'ÜCRETSIZ', msg || null, user_id || null,
                    height || null, weight || null
                ],
                (err, result) => {
                    if (err) {
                        console.error('Maç arayan ekleme hatası:', err);
                        return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                    }
                    res.json({ success: true, message: 'Maç arama ilanı başarıyla oluşturuldu!', id: result.insertId });
                }
            );
        }
    });

    // Mark match seeker as found
    app.put('/api/match-seekers/:id/found', (req, res) => {
        const { id } = req.params;
        const { user_id } = req.body;

        db.query('SELECT user_id FROM match_seekers WHERE id = ?', [id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
            if (results[0].user_id && parseInt(results[0].user_id) !== parseInt(user_id)) {
                return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
            }
            db.query("UPDATE match_seekers SET status = 'bulundu' WHERE id = ?", [id], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
                res.json({ success: true, message: 'İlan bulundu olarak işaretlendi!' });
            });
        });
    });

    // Delete match seeker
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

    // Get team seekers
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
                console.error('Takım arayan listeleme hatası:', err);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }
            res.json({ success: true, data: results });
        });
    });

    // Create team seeker
    app.post('/api/team-seekers', (req, res) => {
        const { teamName, ageGroup, matchSize, skillLevel, availableDays, timeRange, captainName, message, user_id } = req.body;

        if (!teamName || !ageGroup || !matchSize || !skillLevel || !captainName) {
            return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurunuz!' });
        }

        if (user_id) {
            db.query('SELECT id, status FROM users WHERE id = ?', [user_id], (errUser, userResult) => {
                if (errUser) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (userResult.length > 0 && userResult[0].status === 'globally_banned') {
                    return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır!' });
                }
                doInsert();
            });
        } else {
            doInsert();
        }

        function doInsert() {
            db.query(
                `INSERT INTO team_seekers (teamName, ageGroup, matchSize, skillLevel, availableDays, timeRange, captainName, message, user_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')`,
                [teamName, ageGroup, matchSize, skillLevel, availableDays || null, timeRange || null, captainName, message || null, user_id || null],
                (err, result) => {
                    if (err) {
                        console.error('Takım arayan ekleme hatası:', err);
                        return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                    }
                    res.json({ success: true, message: 'Takım arama ilanı başarıyla oluşturuldu!', id: result.insertId });
                }
            );
        }
    });

    // Mark team seeker as found
    app.put('/api/team-seekers/:id/found', (req, res) => {
        const { id } = req.params;
        const { user_id } = req.body;

        db.query('SELECT user_id FROM team_seekers WHERE id = ?', [id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
            if (results[0].user_id && parseInt(results[0].user_id) !== parseInt(user_id)) {
                return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
            }
            db.query("UPDATE team_seekers SET status = 'bulundu' WHERE id = ?", [id], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
                res.json({ success: true, message: 'İlan bulundu olarak işaretlendi!' });
            });
        });
    });

    // Delete team seeker
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

    // Stats content (detailed)
    app.get('/api/stats-content/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;

        db.query(
            `SELECT r.pitchNumber, r.hourText, r.created_at, r.dateText, r.play_date, r.reservation_price, r.payment_status, po.morningPrice, po.eveningPrice
             FROM reservations r
             LEFT JOIN pitch_objects po ON r.fieldKey COLLATE utf8mb4_unicode_ci = po.fieldKey COLLATE utf8mb4_unicode_ci AND r.pitchNumber = po.pitchNumber
             WHERE r.fieldKey = ? AND r.status != 'cancelled'`,
            [fieldKey],
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });

                const now = new Date();
                const stats = { 
                    total: 0, today: 0, thisMonth: 0, last7Days: 0,
                    totalEarningsPaid: 0, totalEarningsUnpaid: 0,
                    todayEarningsPaid: 0, todayEarningsUnpaid: 0,
                    thisMonthEarningsPaid: 0, thisMonthEarningsUnpaid: 0,
                    last7DaysEarningsPaid: 0, last7DaysEarningsUnpaid: 0 
                };

                const tzOffset = now.getTimezoneOffset() * 60000;
                const todayStr = new Date(now.getTime() - tzOffset).toISOString().split('T')[0];
                const startOf7DaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - tzOffset).toISOString().split('T')[0];
                const startOfThisMonthStr = new Date(now.getFullYear(), now.getMonth(), 1 - tzOffset / (24 * 60 * 60 * 1000)).toISOString().split('T')[0];

                for (const resRow of results) {
                    const mPrice = Number(resRow.morningPrice) || 0;
                    const ePrice = Number(resRow.eveningPrice) || 0;
                    const slotStartHour = parseInt(resRow.hourText.split(' - ')[0]) || 0;
                    const isEvening = slotStartHour >= 17 || slotStartHour < 6;
                    const price = Number(resRow.reservation_price || (isEvening ? ePrice : mPrice));
                    const isPaid = resRow.payment_status === 'odendi';

                    const pStr = getPlayDateString(resRow.play_date, resRow.dateText, resRow.hourText, resRow.created_at);

                    stats.total++;
                    if (isPaid) stats.totalEarningsPaid += price;
                    else stats.totalEarningsUnpaid += price;

                    if (pStr === todayStr) {
                        stats.today++;
                        if (isPaid) stats.todayEarningsPaid += price;
                        else stats.todayEarningsUnpaid += price;
                    }

                    if (pStr && pStr >= startOf7DaysAgoStr && pStr <= todayStr) {
                        stats.last7Days++;
                        if (isPaid) stats.last7DaysEarningsPaid += price;
                        else stats.last7DaysEarningsUnpaid += price;
                    }

                    if (pStr && pStr >= startOfThisMonthStr && pStr <= todayStr) {
                        stats.thisMonth++;
                        if (isPaid) stats.thisMonthEarningsPaid += price;
                        else stats.thisMonthEarningsUnpaid += price;
                    }
                }

                stats.totalEarningsPaid = parseFloat(stats.totalEarningsPaid.toFixed(2));
                stats.totalEarningsUnpaid = parseFloat(stats.totalEarningsUnpaid.toFixed(2));
                stats.todayEarningsPaid = parseFloat(stats.todayEarningsPaid.toFixed(2));
                stats.todayEarningsUnpaid = parseFloat(stats.todayEarningsUnpaid.toFixed(2));
                stats.last7DaysEarningsPaid = parseFloat(stats.last7DaysEarningsPaid.toFixed(2));
                stats.last7DaysEarningsUnpaid = parseFloat(stats.last7DaysEarningsUnpaid.toFixed(2));
                stats.thisMonthEarningsPaid = parseFloat(stats.thisMonthEarningsPaid.toFixed(2));
                stats.thisMonthEarningsUnpaid = parseFloat(stats.thisMonthEarningsUnpaid.toFixed(2));
                
                res.json({ success: true, data: stats });
            }
        );
    });

    // General stats
    app.get('/api/business-stats', (req, res) => {
        const { fieldKey } = req.query;
        if (!fieldKey) return res.status(400).json({ success: false, message: 'fieldKey zorunludur!' });

        const today = new Date().toISOString().split('T')[0];

        db.query('SELECT COUNT(*) AS count FROM reservations WHERE fieldKey = ? AND play_date = ?', [fieldKey, today], (err, todayReservations) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            db.query('SELECT COUNT(*) AS count FROM reservations WHERE fieldKey = ?', [fieldKey], (err, totalReservations) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                db.query('SELECT COUNT(*) AS count FROM reservations WHERE fieldKey = ? AND payment_status = ?', [fieldKey, 'odenmedi'], (err, unpaidReservations) => {
                    if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                    db.query('SELECT COUNT(*) AS count FROM subscriptions WHERE fieldKey = ?', [fieldKey], (err, subscriptions) => {
                        if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                        db.query('SELECT COUNT(*) AS count FROM reservations WHERE fieldKey = ? AND status = ?', [fieldKey, 'blocked'], (err, blockedHours) => {
                            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                            res.json({
                                todayReservations: todayReservations[0].count,
                                totalReservations: totalReservations[0].count,
                                unpaidReservations: unpaidReservations[0].count,
                                subscriptions: subscriptions[0].count,
                                blockedHours: blockedHours[0].count
                            });
                        });
                    });
                });
            });
        });
    });

    app.get('/api/announcements', (req, res, next) => {
        const audience = req.query.audience === 'businesses'
            ? 'businesses'
            : req.query.audience === 'users'
                ? 'users'
                : null;

        if (!audience) {
            return next();
        }

        const allowedTargets = audience === 'businesses'
            ? ['all', 'businesses']
            : ['all', 'users'];

        db.query("SELECT * FROM announcements WHERE status = 'active' AND target_audience IN (?) ORDER BY created_at DESC", [allowedTargets], (err, results) => {
            if (err) {
                console.error("Announcements error:", err);
                return res.status(500).json({ success: false, message: 'VeritabanÄ± hatasÄ±!' });
            }
            res.json({ success: true, data: results });
        });
    });

    // Get announcements
    app.get('/api/announcements', (req, res) => {
        db.query("SELECT * FROM announcements WHERE status = 'active' ORDER BY created_at DESC", (err, results) => {
            if (err) {
                console.error("Announcements error:", err);
                return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            }
            res.json({ success: true, data: results });
        });
    });

}

function getActualPlayDate(dateText, hourText) {
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
            const today = new Date();
            year = today.getFullYear();
            if (monthIdx < today.getMonth()) {
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

function getPlayDateString(play_date, dateText, hourText, created_at) {
    if (play_date) {
        if (play_date instanceof Date) {
            const y = play_date.getFullYear();
            const m = String(play_date.getMonth() + 1).padStart(2, '0');
            const d = String(play_date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        if (typeof play_date === 'string') {
            return play_date.split('T')[0];
        }
    }
    const actualDate = getActualPlayDate(dateText, hourText) || (created_at ? new Date(created_at) : null);
    if (actualDate) {
        const y = actualDate.getFullYear();
        const m = String(actualDate.getMonth() + 1).padStart(2, '0');
        const d = String(actualDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return null;
}
module.exports = { initBusinessRoutes };
