function initPitchRoutes(app, db) {
    const fieldsData = require('../fieldsData');

    // Get field info (from static data)
    app.get('/api/fields', (req, res) => {
        const fieldsJson = {};
        for (const key of Object.keys(fieldsData)) {
            const f = fieldsData[key];
            fieldsJson[key] = {
                fieldKey: key,
                name: f.name,
                address: f.address,
                phone: f.phone,
                pitchCount: f.pitchCount,
                hasService: f.hasService,
                isClosed: f.isClosed,
                coordinates: f.coordinates,
                openingHour: f.openingHour,
                closingHour: f.closingHour,
                disabledHours: f.disabledHours,
                aboneHours: f.aboneHours,
                refreshments: f.refreshments || '',
                cleats: f.cleats,
                shower: f.shower,
                market: f.market,
                image: f.image || ''
            };
        }
        res.json(fieldsJson);
    });

    // Get all pitch objects
    app.get('/api/pitch-list', (req, res) => {
        db.query('SELECT * FROM pitch_objects WHERE isDeleted = 0', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    app.get('/api/all-fields', (req, res) => {
        db.query('SELECT * FROM pitch_objects WHERE isDeleted = 0', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json(results);
        });
    });

    // Get all pitch settings
    app.get('/api/pitch-settings', (req, res) => {
        db.query('SELECT * FROM pitch_settings WHERE isDeleted = 0', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Get single pitch settings
    app.get('/api/pitch-settings/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        db.query('SELECT * FROM pitch_settings WHERE fieldKey = ? AND isDeleted = 0', [fieldKey], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (results.length === 0) return res.status(404).json({ success: false, message: 'Saha bulunamadı!' });
            res.json({ success: true, data: results[0] });
        });
    });

    // Update pitch settings
    app.put('/api/pitch-settings/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        const { isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count } = req.body;

        db.query(
            'UPDATE pitch_settings SET isClosed = ?, openingHour = ?, closingHour = ?, disabledHours = ?, aboneHours = ?, pricing = ?, field_count = ? WHERE fieldKey = ?',
            [isClosed, openingHour, closingHour, disabledHours, aboneHours, pricing, field_count, fieldKey],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Saha bulunamadı!' });

                if (parseInt(field_count) === 2) {
                    db.query('SELECT COUNT(*) AS cnt FROM pitch_objects WHERE fieldKey = ? AND pitchNumber = 2', [fieldKey], (err2, cntRes) => {
                        if (!err2 && cntRes[0].cnt === 0) {
                            db.query('INSERT INTO pitch_objects (fieldKey, pitchNumber, name) VALUES (?, 2, ?)', [fieldKey, fieldsData[fieldKey]?.name + ' 2' || fieldKey + ' 2'], (insErr) => {
                                if (insErr) console.error('2. saha oluşturulamadı:', insErr);
                            });
                        }
                    });
                }
                res.json({ success: true, message: 'Saha ayarları güncellendi!' });
            }
        );
    });

    // Update pitch object (sub-pitch)
    app.put('/api/pitch-objects/:fieldKey/:pitchNumber', (req, res) => {
        const { fieldKey, pitchNumber } = req.params;
        const { isClosed, openingHour, closingHour, disabledHours, aboneHours, morningPrice, eveningPrice, closedDays } = req.body;
        const closedDaysStr = typeof closedDays === 'string' ? closedDays : JSON.stringify(closedDays || []);

        db.query(
            `UPDATE pitch_objects SET isClosed = ?, openingHour = ?, closingHour = ?, disabledHours = ?, aboneHours = ?, morningPrice = ?, eveningPrice = ?, closedDays = ? WHERE fieldKey = ? AND pitchNumber = ?`,
            [isClosed, openingHour, closingHour, disabledHours, aboneHours, morningPrice, eveningPrice, closedDaysStr, fieldKey, pitchNumber],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
                res.json({ success: true, message: 'Saha nesnesi güncellendi!' });
            }
        );
    });

    // Update field settings (legacy)
    app.put('/api/fields/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        const { aboneHours, disabledHours, hasService, openingHour, closingHour, refreshments, cleats, shower, market } = req.body;

        if (aboneHours !== undefined || disabledHours !== undefined) {
            db.query('SELECT COUNT(*) AS cnt FROM pitch_objects WHERE fieldKey = ?', [fieldKey], (errCheck, checkRes) => {
                if (errCheck) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (checkRes[0].cnt === 0) {
                    db.query('INSERT INTO pitch_objects (fieldKey, name, phone, pitchCount, hasService, openingHour, closingHour) VALUES (?, ?, ?, 5, ?, ?, ?)', [fieldKey, fieldsData[fieldKey]?.name || fieldKey, fieldsData[fieldKey]?.phone || '', fieldsData[fieldKey]?.hasService || 0, fieldsData[fieldKey]?.openingHour || '08:00', fieldsData[fieldKey]?.closingHour || '23:00'], (insErr) => {
                        if (insErr) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                        doUpdate();
                    });
                } else {
                    doUpdate();
                }
            });
        } else {
            doUpdate();
        }

        function doUpdate() {
            const updates = [];
            const values = [];
            const dbColumns = { aboneHours: 'aboneHours', disabledHours: 'disabledHours', hasService: 'hasService', openingHour: 'openingHour', closingHour: 'closingHour', refreshments: 'refreshments', cleats: 'cleats', shower: 'shower', market: 'market' };
            for (const [bodyKey, dbCol] of Object.entries(dbColumns)) {
                if (req.body[bodyKey] !== undefined) {
                    updates.push(`${dbCol} = ?`);
                    values.push(req.body[bodyKey]);
                }
            }
            if (updates.length === 0) return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı!' });
            values.push(fieldKey);
            db.query(`UPDATE pitch_objects SET ${updates.join(', ')} WHERE fieldKey = ?`, values, (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
                res.json({ success: true, message: 'Ayarlar güncellendi!' });
            });
        }
    });

    // Business profile update
    app.put('/api/business-profile/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        const { phone, hasService, coordinates, refreshments, cleats, shower, market } = req.body;

        if (!phone || !hasService || !coordinates) {
            return res.status(400).json({ success: false, message: 'Telefon, servis ve koordinat bilgisi gereklidir!' });
        }

        db.query('UPDATE pitch_objects SET phone = ?, hasService = ?, coordinates = ?, refreshments = ?, cleats = ?, shower = ?, market = ? WHERE fieldKey = ?',
            [phone, hasService, coordinates, refreshments || '', cleats || 'Krampon Kiralanmaz', shower || 'Duş Yok', market || 'Market Yok', fieldKey],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                res.json({ success: true, message: 'İşletme ayarları başarıyla güncellendi!' });
            }
        );
    });

    // Get field daily hours
    app.get('/api/field-daily-hours/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        db.query('SELECT * FROM field_daily_hours WHERE fieldKey = ? ORDER BY dayOfWeek ASC', [fieldKey], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Update field daily hours
    app.put('/api/field-daily-hours/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        const { days } = req.body;

        if (!days || !Array.isArray(days)) {
            return res.status(400).json({ success: false, message: 'Geçersiz veri formatı!' });
        }

        const queries = days.map(d => {
            return new Promise((resolve, reject) => {
                db.query(
                    `INSERT INTO field_daily_hours (fieldKey, dayOfWeek, openingHour, closingHour) 
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
            .then(() => res.json({ success: true, message: 'Günlük saatler kaydedildi!' }))
            .catch(() => res.status(500).json({ success: false, message: 'Veritabanı hatası!' }));
    });

    // Get all daily hours
    app.get('/api/all-daily-hours', (req, res) => {
        db.query('SELECT * FROM field_daily_hours', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Legacy single field settings update
    app.put('/api/fields/:fieldKey/settings', (req, res) => {
        const { fieldKey } = req.params;
        const { aboneHours, disabledHours } = req.body;

        db.query('SELECT COUNT(*) AS cnt FROM pitch_settings WHERE fieldKey = ? AND isDeleted = 0', [fieldKey], (errCheck, checkRes) => {
            if (errCheck) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (checkRes[0].cnt === 0) {
                db.query('INSERT INTO pitch_settings (fieldKey, aboneHours, disabledHours) VALUES (?, ?, ?)', [fieldKey, aboneHours || '', disabledHours || ''], (insErr) => {
                    if (insErr) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                    res.json({ success: true, message: 'Ayarlar kaydedildi!' });
                });
            } else {
                db.query('UPDATE pitch_settings SET aboneHours = ?, disabledHours = ? WHERE fieldKey = ?', [aboneHours, disabledHours, fieldKey], (updErr) => {
                    if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
                    res.json({ success: true, message: 'Ayarlar güncellendi!' });
                });
            }
        });
    });

    // Field photos endpoints
    app.get('/api/field-photos/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        db.query('SELECT id, url, caption FROM field_photos WHERE fieldKey = ? ORDER BY created_at DESC', [fieldKey], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    app.post('/api/field-photos/upload', (req, res) => {
        const { fieldKey, imageData, caption } = req.body;
        if (!fieldKey || !imageData) {
            return res.status(400).json({ success: false, message: 'Saha anahtarı ve görsel verisi zorunludur!' });
        }
        db.query('INSERT INTO field_photos (fieldKey, url, caption) VALUES (?, ?, ?)', [fieldKey, imageData, caption || null], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, message: 'Fotoğraf başarıyla yüklendi!' });
        });
    });

    app.delete('/api/field-photos/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM field_photos WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, message: 'Fotoğraf başarıyla silindi!' });
        });
    });
}

module.exports = { initPitchRoutes };
