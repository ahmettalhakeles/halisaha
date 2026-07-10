const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function initAdminRoutes(app, db) {
    
    // Middleware to verify admin token
    function verifyAdminToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ success: false, message: 'Yetkisiz erişim!' });
        
        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'Yetkisiz erişim!' });

        jwt.verify(token, process.env.JWT_SECRET || 'jwt_key', (err, decoded) => {
            if (err || decoded.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Geçersiz token!' });
            }
            req.admin = decoded;
            next();
        });
    }

    // Admin login
    app.post('/api/admin/login', (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir!' });
        }

        db.query('SELECT * FROM super_admins WHERE username = ?', [username], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (results.length === 0) return res.status(401).json({ success: false, message: 'Hatalı kullanıcı adı veya şifre!' });

            const admin = results[0];
            let isMatch = false;
            if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
                isMatch = bcrypt.compareSync(password, admin.password);
            } else {
                isMatch = (password === admin.password);
            }

            if (!isMatch) return res.status(401).json({ success: false, message: 'Hatalı kullanıcı adı veya şifre!' });

            const token = jwt.sign(
                { username: admin.username, display_name: admin.display_name, role: 'admin' },
                process.env.JWT_SECRET || 'jwt_key',
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Giriş başarılı!',
                token,
                admin: { username: admin.username, display_name: admin.display_name }
            });
        });
    });

    // Admin dashboard stats
    app.get('/api/admin/dashboard', verifyAdminToken, async (req, res) => {
        try {
            const promiseDb = db.promise();
            
            // Total Pitches (active)
            const [pitches] = await promiseDb.query("SELECT COUNT(*) AS count FROM pitch_settings WHERE isDeleted = 0");
            const totalPitches = pitches[0].count;

            // Active Pitches (visible/not closed)
            const [activeP] = await promiseDb.query("SELECT COUNT(*) AS count FROM pitch_settings WHERE isDeleted = 0 AND isClosed = 0");
            const activePitches = activeP[0].count;

            // Total Users
            const [users] = await promiseDb.query("SELECT COUNT(*) AS count FROM users");
            const totalUsers = users[0].count;

            // Reservations Breakdown
            const [resToday] = await promiseDb.query("SELECT COUNT(*) AS count FROM reservations WHERE status != 'cancelled' AND play_date = CURDATE()");
            const [resWeekly] = await promiseDb.query("SELECT COUNT(*) AS count FROM reservations WHERE status != 'cancelled' AND play_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
            const [resMonthly] = await promiseDb.query("SELECT COUNT(*) AS count FROM reservations WHERE status != 'cancelled' AND play_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
            const [resTotal] = await promiseDb.query("SELECT COUNT(*) AS count FROM reservations WHERE status != 'cancelled'");

            const reservationsBreakdown = {
                today: resToday[0].count,
                weekly: resWeekly[0].count,
                monthly: resMonthly[0].count,
                total: resTotal[0].count
            };

            // Active Fields
            const [activeFields] = await promiseDb.query(`
                SELECT r.fieldKey, MAX(po.name) AS field_name, COUNT(r.id) AS count
                FROM reservations r
                LEFT JOIN pitch_objects po ON r.fieldKey = po.fieldKey AND r.pitchNumber = po.pitchNumber
                WHERE r.status != 'cancelled'
                GROUP BY r.fieldKey
                ORDER BY count DESC
                LIMIT 5
            `);

            // Top Users
            const [topUsers] = await promiseDb.query(`
                SELECT r.user_name, MAX(u.phone) AS user_phone, COUNT(r.id) AS count, SUM(r.reservation_price) AS spend
                FROM reservations r
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.status != 'cancelled' AND r.user_name IS NOT NULL AND r.user_name != ''
                GROUP BY r.user_id, r.user_name
                ORDER BY count DESC
                LIMIT 5
            `);

            // 30 days trend stats
            const [trend] = await promiseDb.query(`
                SELECT play_date AS date, COUNT(id) AS count
                FROM reservations
                WHERE status != 'cancelled' AND play_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY play_date
                ORDER BY play_date ASC
            `);

            // Format trend for timezone consistency (YYYY-MM-DD)
            const trendStats = trend.map(t => {
                let dateStr = '';
                if (t.date instanceof Date) {
                    const y = t.date.getFullYear();
                    const m = String(t.date.getMonth() + 1).padStart(2, '0');
                    const d = String(t.date.getDate()).padStart(2, '0');
                    dateStr = `${y}-${m}-${d}`;
                } else {
                    dateStr = String(t.date).split('T')[0];
                }
                return { date: dateStr, count: t.count };
            });

            res.json({
                success: true,
                data: {
                    totalPitches,
                    activePitches,
                    totalUsers,
                    reservationsBreakdown,
                    activeFields,
                    topUsers,
                    trendStats
                }
            });

        } catch (err) {
            console.error('Admin Dashboard Error:', err);
            res.status(500).json({ success: false, message: 'Dashboard verileri yüklenemedi!' });
        }
    });

    // Get active fields
    app.get('/api/admin/fields', verifyAdminToken, (req, res) => {
        db.query(
            `SELECT ps.*, po.name, po.address, po.phone, ps.field_count AS pitch_count 
             FROM pitch_settings ps
             LEFT JOIN pitch_objects po ON ps.fieldKey = po.fieldKey AND po.pitchNumber = 1
             WHERE ps.isDeleted = 0`,
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Saha listesi alınamadı!' });
                res.json({ success: true, data: results });
            }
        );
    });

    // Get deleted fields
    app.get('/api/admin/deleted-fields', verifyAdminToken, (req, res) => {
        db.query(
            `SELECT ps.*, po.name, po.address, po.phone, ps.field_count AS pitch_count 
             FROM pitch_settings ps
             LEFT JOIN pitch_objects po ON ps.fieldKey = po.fieldKey AND po.pitchNumber = 1
             WHERE ps.isDeleted = 1`,
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Silinen saha listesi alınamadı!' });
                res.json({ success: true, data: results });
            }
        );
    });

    // Toggle field visibility/isClosed
    app.put('/api/admin/fields/:key/visibility', verifyAdminToken, (req, res) => {
        const { key } = req.params;
        db.query('UPDATE pitch_settings SET isClosed = NOT isClosed WHERE fieldKey = ?', [key], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Görünürlük durumu güncellenemedi!' });
            res.json({ success: true, message: 'Görünürlük durumu başarıyla güncellendi!' });
        });
    });

    // Mark field as deleted
    app.delete('/api/admin/fields/:key', verifyAdminToken, (req, res) => {
        const { key } = req.params;
        db.query('UPDATE pitch_settings SET isDeleted = 1 WHERE fieldKey = ?', [key], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Saha silinemedi!' });
            res.json({ success: true, message: 'Saha başarıyla silindi!' });
        });
    });

    // Restore deleted field
    app.post('/api/admin/fields/:key/restore', verifyAdminToken, (req, res) => {
        const { key } = req.params;
        db.query('UPDATE pitch_settings SET isDeleted = 0 WHERE fieldKey = ?', [key], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Saha geri getirilemedi!' });
            res.json({ success: true, message: 'Saha başarıyla geri getirildi!' });
        });
    });

    // Add field
    app.post('/api/admin/fields', verifyAdminToken, async (req, res) => {
        const { fieldKey, name, address, phone, openingHour, closingHour, pitchCount, morningPrice, eveningPrice, businessPassword } = req.body;
        
        if (!fieldKey || !name || !businessPassword) {
            return res.status(400).json({ success: false, message: 'Saha anahtarı, ad ve şifre zorunludur!' });
        }

        try {
            const promiseDb = db.promise();
            
            // Check if fieldKey exists
            const [existing] = await promiseDb.query("SELECT fieldKey FROM pitch_settings WHERE fieldKey = ?", [fieldKey]);
            if (existing.length > 0) {
                // If it was deleted, restore and update it, else error
                await promiseDb.query(
                    `UPDATE pitch_settings 
                     SET password = ?, isDeleted = 0, isClosed = 0, openingHour = ?, closingHour = ?, field_count = ?, pricing = ? 
                     WHERE fieldKey = ?`,
                    [businessPassword, openingHour, closingHour, pitchCount, `${morningPrice}/${eveningPrice}`, fieldKey]
                );
            } else {
                // Insert new pitch_settings
                await promiseDb.query(
                    `INSERT INTO pitch_settings (fieldKey, password, isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count, average_rating) 
                     VALUES (?, ?, 0, ?, ?, '[]', '[]', ?, ?, 0.00)`,
                    [fieldKey, businessPassword, openingHour, closingHour, `${morningPrice}/${eveningPrice}`, pitchCount]
                );
            }

            // Clean & insert pitch_objects for the pitchCount
            await promiseDb.query("DELETE FROM pitch_objects WHERE fieldKey = ?", [fieldKey]);
            for (let i = 1; i <= pitchCount; i++) {
                const pitchName = `${name} - SAHA ${i}`;
                await promiseDb.query(
                    `INSERT INTO pitch_objects (fieldKey, pitchNumber, name, address, coordinates, phone, isClosed, hasService, openingHour, closingHour, disabledHours, aboneHours, closedDays, refreshments, cleats, shower, market, morningPrice, eveningPrice, average_rating) 
                     VALUES (?, ?, ?, ?, '', ?, 0, 'Servis: Yok', ?, ?, '[]', '[]', '[]', '', 'Krampon Kiralanmaz', 'Duş Yok', 'Market Yok', ?, ?, 0.00)`,
                    [fieldKey, i, pitchName, address || '', phone || '', openingHour, closingHour, morningPrice, eveningPrice]
                );
            }

            res.json({ success: true, message: 'Saha başarıyla oluşturuldu/güncellendi!' });

        } catch (err) {
            console.error('Add field error:', err);
            res.status(500).json({ success: false, message: 'Saha kaydedilirken hata oluştu!' });
        }
    });

    // Get users with filters
    app.get('/api/admin/users', verifyAdminToken, (req, res) => {
        const { search, status, sortBy, startDate, endDate, suspicious } = req.query;
        
        let sql = `
            SELECT u.id, u.name, u.phone, u.email, u.age, u.position, u.experience, u.height, u.weight, u.status, u.created_at,
                   (SELECT COUNT(*) FROM field_blacklists fb WHERE fb.phone_number = u.phone) AS blacklist_count,
                   (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id) AS total_reservations,
                   (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id AND r.status = 'cancelled' AND r.play_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS cancelled_reservations_30_days
            FROM users u
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += " AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term);
        }
        if (status) {
            sql += " AND u.status = ?";
            params.push(status);
        }
        if (startDate) {
            sql += " AND u.created_at >= ?";
            params.push(startDate);
        }
        if (endDate) {
            sql += " AND u.created_at <= ?";
            params.push(endDate);
        }

        if (suspicious === 'true') {
            sql += " HAVING blacklist_count >= 3 OR cancelled_reservations_30_days >= 3";
        }

        if (sortBy === 'reservations_desc') {
            sql += " ORDER BY total_reservations DESC";
        } else if (sortBy === 'registered_desc') {
            sql += " ORDER BY u.created_at DESC";
        } else if (sortBy === 'name_asc') {
            sql += " ORDER BY u.name ASC";
        } else {
            sql += " ORDER BY u.created_at DESC";
        }

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Kullanıcılar alınamadı!' });
            }
            res.json({ success: true, data: results });
        });
    });

    // Get user details
    app.get('/api/admin/users/:id', verifyAdminToken, async (req, res) => {
        const { id } = req.params;
        try {
            const promiseDb = db.promise();
            
            const [uRows] = await promiseDb.query("SELECT * FROM users WHERE id = ?", [id]);
            if (uRows.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            
            const user = uRows[0];
            delete user.password;

            const [resRows] = await promiseDb.query(
                `SELECT r.*, po.name AS field_name 
                 FROM reservations r 
                 LEFT JOIN pitch_objects po ON r.fieldKey = po.fieldKey AND r.pitchNumber = po.pitchNumber 
                 WHERE r.user_id = ? 
                 ORDER BY r.play_date DESC, r.hourText DESC`,
                [id]
            );

            const [reviewRows] = await promiseDb.query(
                `SELECT r.*, po.name AS field_name 
                 FROM reviews r 
                 LEFT JOIN pitch_objects po ON r.fieldKey = po.fieldKey AND r.pitchNumber = po.pitchNumber 
                 WHERE r.user_id = ? 
                 ORDER BY r.created_at DESC`,
                [id]
            );

            res.json({
                success: true,
                data: {
                    user,
                    reservations: resRows,
                    reviews: reviewRows
                }
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Kullanıcı detayları alınamadı!' });
        }
    });

    // Ban/unban user
    app.put('/api/admin/users/:id/ban', verifyAdminToken, (req, res) => {
        const { id } = req.params;
        db.query("SELECT status FROM users WHERE id = ?", [id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            
            const currentStatus = results[0].status;
            const newStatus = (currentStatus === 'banned' || currentStatus === 'globally_banned') ? 'active' : 'banned';
            
            db.query("UPDATE users SET status = ? WHERE id = ?", [newStatus, id], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'Kullanıcı ban durumu güncellenemedi!' });
                res.json({ success: true, message: `Kullanıcı durumu '${newStatus.toUpperCase()}' olarak güncellendi!` });
            });
        });
    });

    // Delete user
    app.delete('/api/admin/users/:id', verifyAdminToken, (req, res) => {
        const { id } = req.params;
        db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Kullanıcı silinemedi!' });
            res.json({ success: true, message: 'Kullanıcı başarıyla silindi!' });
        });
    });

    // Get admin activity log
    app.get('/api/admin/activity-log', verifyAdminToken, (req, res) => {
        const { type } = req.query;
        let sql = "SELECT * FROM admin_activity_log";
        const params = [];
        if (type) {
            sql += " WHERE action_type = ?";
            params.push(type);
        }
        sql += " ORDER BY created_at DESC LIMIT 100";

        db.query(sql, params, (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Günlükler alınamadı!' });
            res.json({ success: true, data: results });
        });
    });

    // Log admin action
    app.post('/api/admin/activity-log', verifyAdminToken, (req, res) => {
        const { action_type, target_type, target_name, description } = req.body;
        const admin_username = req.admin.username;

        db.query(
            "INSERT INTO admin_activity_log (admin_username, action_type, target_type, target_name, description) VALUES (?, ?, ?, ?, ?)",
            [admin_username, action_type, target_type, target_name, description],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Günlük kaydedilemedi!' });
                res.json({ success: true });
            }
        );
    });

    // Get global blacklist (suspicious numbers and statistics)
    app.get('/api/admin/global-blacklist', verifyAdminToken, (req, res) => {
        db.query(
            `SELECT fb.phone_number, COUNT(DISTINCT fb.fieldKey) AS block_count, GROUP_CONCAT(DISTINCT fb.fieldKey SEPARATOR ', ') AS fields, MAX(u.name) AS name
             FROM field_blacklists fb
             LEFT JOIN users u ON fb.phone_number = u.phone
             GROUP BY fb.phone_number`,
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Şüpheli listesi alınamadı!' });
                res.json({ success: true, data: results });
            }
        );
    });

    // Add manual global ban
    app.post('/api/admin/global-blacklist', verifyAdminToken, (req, res) => {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Telefon numarası gereklidir!' });

        db.query("UPDATE users SET status = 'globally_banned' WHERE phone = ?", [phone], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Kullanıcı global ban durumuna getirilemedi!' });
            
            // Also insert a dummy record in field_blacklists so it shows up in global blacklist counts
            db.query(
                "INSERT INTO field_blacklists (fieldKey, phone_number, reason) VALUES ('SYSTEM', ?, 'Admin global engeli')",
                [phone],
                (insErr) => {
                    if (insErr) console.error("Blacklist insert failed:", insErr);
                }
            );

            res.json({ success: true, message: `${phone} numarası tamamen engellendi!` });
        });
    });

    // Remove global ban / unban user status
    app.delete('/api/admin/global-blacklist/:phone', verifyAdminToken, (req, res) => {
        const { phone } = req.params;
        
        db.query("DELETE FROM field_blacklists WHERE phone_number = ?", [phone], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Engel kaldırılamadı!' });
            
            db.query("UPDATE users SET status = 'active' WHERE phone = ?", [phone], (updErr) => {
                if (updErr) console.error("User activation failed:", updErr);
            });

            res.json({ success: true, message: `${phone} numarasının engeli başarıyla kaldırıldı!` });
        });
    });

    // Create Announcement
    app.post('/api/admin/announcements', verifyAdminToken, (req, res) => {
        const { title, message, target_audience } = req.body;
        const created_by = req.admin.username;

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Başlık ve mesaj zorunludur!' });
        }

        db.query(
            "INSERT INTO announcements (title, message, target_audience, created_by, status) VALUES (?, ?, ?, ?, 'active')",
            [title, message, target_audience || 'all', created_by],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Duyuru oluşturulamadı!' });
                res.json({ success: true, message: 'Duyuru başarıyla oluşturuldu!' });
            }
        );
    });

    // Delete Announcement
    app.delete('/api/admin/announcements/:id', verifyAdminToken, (req, res) => {
        const { id } = req.params;
        db.query("UPDATE announcements SET status = 'deleted' WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Duyuru silinemedi!' });
            res.json({ success: true, message: 'Duyuru başarıyla silindi!' });
        });
    });

    // Get revenue stats
    app.get('/api/admin/revenue', verifyAdminToken, (req, res) => {
        const { period } = req.query;
        
        let dateFilter = "";
        const params = [];
        
        if (period === 'today') {
            dateFilter = " AND play_date = CURDATE()";
        } else if (period === 'weekly') {
            dateFilter = " AND play_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        } else if (period === 'monthly') {
            dateFilter = " AND play_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        }

        const sql = `
            SELECT r.fieldKey,
                   SUM(r.reservation_price) AS total_revenue,
                   SUM(CASE WHEN r.payment_status = 'odenmedi' THEN r.reservation_price ELSE 0 END) AS total_debt,
                   COUNT(r.id) AS total_res
            FROM reservations r
            WHERE r.status != 'cancelled' ${dateFilter}
            GROUP BY r.fieldKey
        `;

        db.query(sql, params, (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Gelir verileri alınamadı!' });
            res.json({ success: true, data: results });
        });
    });

    // Get Admin Announcements
    app.get('/api/admin/announcements', verifyAdminToken, (req, res) => {
        db.query("SELECT * FROM announcements WHERE status != 'deleted' ORDER BY created_at DESC", (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Duyurular alınamadı!' });
            res.json({ success: true, data: results });
        });
    });

    // Get Ads by Sub-type
    app.get('/api/admin/ads/:sub', verifyAdminToken, (req, res) => {
        const { sub } = req.params;
        
        if (sub === 'forum') {
            db.query(
                `SELECT fp.id, 
                        CONCAT(fp.position, ' Arıyor - ', fp.dateText, ' ', fp.hourText) AS title, 
                        fp.msg AS message, 
                        COALESCE(u.name, fp.phone) AS user_name, 
                        u.phone AS user_phone, 
                        fp.created_at, 
                        fp.status 
                 FROM forum_posts fp 
                 LEFT JOIN users u ON fp.user_id = u.id 
                 ORDER BY fp.created_at DESC`,
                (err, results) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({ success: true, data: results });
                }
            );
        } else if (sub === 'matches') {
            db.query(
                `SELECT ms.id, 
                        ms.playerName AS name, 
                        u.phone AS phone, 
                        ms.availableDates AS dateText, 
                        ms.availableHours AS hourText, 
                        ms.msg AS details, 
                        ms.created_at, 
                        ms.status 
                 FROM match_seekers ms
                 LEFT JOIN users u ON ms.user_id = u.id
                 ORDER BY ms.created_at DESC`,
                (err, results) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({ success: true, data: results });
                }
            );
        } else if (sub === 'teams') {
            db.query(
                `SELECT ts.id, ts.teamName, ts.captainName, ts.ageGroup, ts.matchSize, ts.skillLevel, ts.availableDays, ts.timeRange, ts.message, ts.status, ts.created_at 
                 FROM team_seekers ts
                 ORDER BY ts.created_at DESC`,
                (err, results) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({ success: true, data: results });
                }
            );
        } else {
            res.status(400).json({ success: false, message: 'Geçersiz ilan tipi!' });
        }
    });

    // Delete ad
    app.delete('/api/admin/ads/:sub/:id', verifyAdminToken, (req, res) => {
        const { sub, id } = req.params;
        let table = '';
        
        if (sub === 'forum') table = 'forum_posts';
        else if (sub === 'matches') table = 'match_seekers';
        else if (sub === 'teams') table = 'team_seekers';
        else return res.status(400).json({ success: false, message: 'Geçersiz ilan tipi!' });

        db.query(`DELETE FROM ${table} WHERE id = ?`, [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'İlan silinemedi!' });
            res.json({ success: true, message: 'İlan başarıyla silindi!' });
        });
    });

}

module.exports = { initAdminRoutes };
