function initReviewRoutes(app, db) {
    // Helper: Saha ve Pitch Ortalama Puan Güncellemesi
    function updateFieldRatingAggregates(fieldKey, pitchNumber, callback) {
        const pitchAvgSql = `
            SELECT AVG((rating_turf + rating_lighting + rating_facilities + rating_service) / 4) AS avgRating 
            FROM reviews 
            WHERE fieldKey = ? AND pitchNumber = ?
        `;
        db.query(pitchAvgSql, [fieldKey, pitchNumber], (err, pitchResults) => {
            if (err) { if (callback) callback(err); return; }
            const pitchAvg = pitchResults[0].avgRating ? parseFloat(pitchResults[0].avgRating.toFixed(1)) : 0;

            const fieldAvgSql = `
                SELECT AVG((rating_turf + rating_lighting + rating_facilities + rating_service) / 4) AS avgRating 
                FROM reviews 
                WHERE fieldKey = ?
            `;
            db.query(fieldAvgSql, [fieldKey], (err2, fieldResults) => {
                if (err2) { if (callback) callback(err2); return; }
                const fieldAvg = fieldResults[0].avgRating ? parseFloat(fieldResults[0].avgRating.toFixed(1)) : 0;

                db.query('SELECT COUNT(*) AS cnt FROM pitch_objects WHERE fieldKey = ?', [fieldKey], (err3, cntRes) => {
                    if (err3) { if (callback) callback(err3); return; }
                    if (cntRes[0].cnt > 0) {
                        // Try to update; if pitch_objects doesn't have rating column, just log
                        db.query("UPDATE pitch_objects SET pitchAvgRating = ?, fieldAvgRating = ? WHERE fieldKey = ?", [pitchAvg, fieldAvg, fieldKey], (err4) => {
                            if (err4) console.error('Puan güncelleme hatası (sütun yok olabilir):', err4.message);
                            if (callback) callback(null);
                        });
                    } else {
                        if (callback) callback(null);
                    }
                });
            });
        });
    }

    // Get reviews for a field
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
                    userName: row.userName
                };
            });
            res.json({ success: true, data: mapped });
        });
    });

    // Create review
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

            const diffMs = now.getTime() - playDate.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays < 0) {
                return res.status(400).json({ success: false, message: 'Rezervasyon tarihi henüz gelmedi!' });
            }
            if (diffDays > 7) {
                return res.status(400).json({ success: false, message: 'Rezervasyonun üzerinden 7 gün geçti, yorum süresi doldu!' });
            }

            db.query(
                `INSERT INTO reviews (user_id, fieldKey, pitchNumber, reservation_id, rating_turf, rating_lighting, rating_facilities, rating_service, comment, is_anonymous)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [user_id, r.fieldKey, r.pitchNumber, reservation_id, parseInt(rating_turf), parseInt(rating_lighting), parseInt(rating_facilities), parseInt(rating_service), comment || null, is_anonymous ? 1 : 0],
                (err) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(409).json({ success: false, message: 'Bu rezervasyon için zaten yorum yapılmış!' });
                        }
                        return res.status(500).json({ success: false, message: 'Yorum kaydedilemedi!' });
                    }
                    updateFieldRatingAggregates(r.fieldKey, r.pitchNumber, () => {
                        res.json({ success: true, message: 'Değerlendirmeniz başarıyla kaydedildi!' });
                    });
                }
            );
        });
    });

    // Business reply to review
    app.post('/api/reviews/:id/reply', (req, res) => {
        const { id } = req.params;
        const { owner_reply } = req.body;

        if (!owner_reply || !owner_reply.trim()) {
            return res.status(400).json({ success: false, message: 'Cevap metni boş olamaz!' });
        }

        db.query('UPDATE reviews SET owner_reply = ?, owner_reply_at = NOW() WHERE id = ?', [owner_reply.trim(), id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Cevap kaydedilemedi!' });
            res.json({ success: true, message: 'Cevabınız başarıyla kaydedildi!' });
        });
    });
}

function getActualPlayDate(dateText, hourText) {
    try {
        const months = {
            'OCAK': 0, 'ŞUBAT': 1, 'MART': 2, 'NİSAN': 3, 'MAYIS': 4, 'HAZİRAN': 5,
            'TEMMUZ': 6, 'AĞUSTOS': 7, 'EYLÜL': 8, 'EKİM': 9, 'KASIM': 10, 'ARALIK': 11
        };
        const parts = dateText.split(' ');
        if (parts.length < 3) return null;
        const day = parseInt(parts[0]);
        const monthName = parts[1].toLocaleUpperCase('tr-TR');
        const year = parseInt(parts[2]);
        const month = months[monthName];
        if (isNaN(day) || month === undefined || isNaN(year)) return null;
        return new Date(year, month, day);
    } catch (e) {
        return null;
    }
}

module.exports = { initReviewRoutes };
