function initFieldCommentRoutes(app, db) {
    // Get field comments
    app.get('/api/field-comments/:fieldKey', (req, res) => {
        const { fieldKey } = req.params;
        db.query('SELECT * FROM field_comments WHERE fieldKey = ? ORDER BY created_at ASC', [fieldKey], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Create field comment
    app.post('/api/field-comments', (req, res) => {
        const { fieldKey, commenter_name, comment } = req.body;
        if (!fieldKey || !commenter_name || !comment) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }
        db.query('INSERT INTO field_comments (fieldKey, commenter_name, comment) VALUES (?, ?, ?)',
            [fieldKey, commenter_name, comment],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Yorum kaydedilemedi!' });
                res.json({ success: true, message: 'Yorum başarıyla eklendi!' });
            }
        );
    });
}

module.exports = { initFieldCommentRoutes };
