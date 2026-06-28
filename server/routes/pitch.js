function initPitchRoutes(app, db) {
    const fieldsData = require('../fieldsData');

    // Get field info
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

    // Get all fields
    app.get('/api/all-fields', (req, res) => {
        db.query('SELECT * FROM pitch_objects', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json(results);
        });
    });

    // Update field / pitch settings
    app.put('/api/fields/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        const { aboneHours, disabledHours, hasService, openingHour, closingHour, refreshments, cleats, shower, market } = req.body;

        if (aboneHours !== undefined || disabledHours !== undefined) {
            db.query('SELECT COUNT(*) AS cnt FROM pitch_objects WHERE fieldKey = ?', [fieldKey], (errCheck, checkRes) => {
                if (errCheck) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (checkRes[0].cnt === 0) {
                    db.query('INSERT INTO pitch_objects (fieldKey, name, field_phone, pitchCount, hasService, openingHour, closingHour) VALUES (?, ?, ?, 5, ?, ?, ?)', [fieldKey, fieldsData[fieldKey]?.name || fieldKey, fieldsData[fieldKey]?.phone || '', fieldsData[fieldKey]?.hasService || 0, fieldsData[fieldKey]?.openingHour || '08:00', fieldsData[fieldKey]?.closingHour || '23:00'], (insErr) => {
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

    // Update field (settings table)
    app.put('/api/fields/:fieldKey/settings', (req, res) => {
        const { fieldKey } = req.params;
        const { aboneHours, disabledHours } = req.body;

        db.query('SELECT COUNT(*) AS cnt FROM pitch_settings WHERE fieldKey = ?', [fieldKey], (errCheck, checkRes) => {
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
}

module.exports = { initPitchRoutes };
