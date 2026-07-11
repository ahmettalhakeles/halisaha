function initForumRoutes(app, db) {
    // Get all forum posts
    app.get('/api/forum', (req, res) => {
        db.query(
            `SELECT fp.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.phone AS user_phone, u.email AS user_email
             FROM forum_posts fp LEFT JOIN users u ON fp.user_id = u.id
             ORDER BY fp.created_at DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true, data: results });
            }
        );
    });

    // Create forum post
    app.post('/api/forum', (req, res) => {
        const { dateText, play_date, hourText, position, payment, phone, msg, user_id } = req.body;
        if ((!dateText && !play_date) || !hourText || !position || !payment) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }

        const playDateVal = play_date || parseTurkishDateString(dateText);
        const displayDateText = dateText || (play_date ? new Date(play_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR') : '');

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
                'INSERT INTO forum_posts (dateText, play_date, hourText, position, payment, phone, msg, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [displayDateText, playDateVal, hourText, position, payment, phone || null, msg || null, user_id || null, 'aktif'],
                (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: 'İlan kaydedilemedi!' });
                    res.json({ success: true, message: 'İlan başarıyla yayınlandı!' });
                }
            );
        }
    });

    // Mark forum post as found
    app.put('/api/forum/:id/found', (req, res) => {
        const { id } = req.params;
        const { user_id } = req.body;

        db.query('SELECT user_id FROM forum_posts WHERE id = ?', [id], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'İlan bulunamadı!' });
            if (results[0].user_id && parseInt(results[0].user_id) !== parseInt(user_id)) {
                return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
            }
            db.query("UPDATE forum_posts SET status = 'bulundu' WHERE id = ?", [id], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'Güncelleme hatası!' });
                res.json({ success: true, message: 'İlan bulundu olarak işaretlendi!' });
            });
        });
    });

    // Delete forum post (admin/business use)
    app.delete('/api/forum/:id', (req, res) => {
        const { id } = req.params;
        db.query('DELETE FROM forum_posts WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'İlan silinemedi!' });
            res.json({ success: true, message: 'İlan başarıyla silindi!' });
        });
    });

    // Get forum comments
    app.get('/api/forum-comments/:type/:postId', (req, res) => {
        const { type, postId } = req.params;
        db.query('SELECT * FROM forum_comments WHERE post_type = ? AND post_id = ? ORDER BY created_at ASC', [type, postId], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            res.json({ success: true, data: results });
        });
    });

    // Create forum comment
    app.post('/api/forum-comments', (req, res) => {
        const { post_type, post_id, commenter_name, comment } = req.body;
        if (!post_type || !post_id || !commenter_name || !comment) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });
        }
        db.query('INSERT INTO forum_comments (post_type, post_id, commenter_name, comment) VALUES (?, ?, ?, ?)',
            [post_type, post_id, commenter_name, comment],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Yorum kaydedilemedi!' });
                res.json({ success: true, message: 'Yorum eklendi!' });
            }
        );
    });
}

function parseTurkishDateString(dateStr) {
    if (!dateStr) return null;
    const turkishMonthsDotted = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
    const turkishMonthsUndotted = ['OCAK', 'SUBAT', 'MART', 'NISAN', 'MAYIS', 'HAZIRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];
    
    const parts = dateStr.trim().split(' ');
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
    
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

module.exports = { initForumRoutes };
