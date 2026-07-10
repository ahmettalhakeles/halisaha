function initAuthRoutes(app, db) {
    const fieldsData = require('../fieldsData');
    const { authLimiter } = require('../middleware/rateLimiter');

    // handleSocialAuthSuccess helper
    async function handleSocialAuthSuccess(email, name, provider, idCol, res) {
        try {
            const [rows] = await db.promise().query('SELECT id, name, phone, email, status FROM users WHERE email = ?', [email]);
            if (rows.length > 0) {
                const user = rows[0];
                if (user.status === 'globally_banned') {
                    return res.redirect('/?error=banned');
                }
                if (!user.phone) {
                    return res.redirect(`/?needs_phone=true&email=${encodeURIComponent(email)}&userId=${user.id}`);
                }
                const token = require('jsonwebtoken').sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '7d' });
                return res.redirect(`/?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
            }

            const insertSql = `INSERT INTO users (name, phone, email, password, is_email_verified, ${idCol}) VALUES (?, '', ?, 'social_login_pwd', 1, ?)`;
            const [result] = await db.promise().query(insertSql, [name, email, idCol === 'google_id' ? email : idCol === 'apple_id' ? email : '']);
            const newUserId = result.insertId;
            return res.redirect(`/?needs_phone=true&email=${encodeURIComponent(email)}&userId=${newUserId}`);
        } catch (err) {
            console.error('handleSocialAuthSuccess Error:', err);
            return res.redirect('/?error=oauth_error');
        }
    }

    // Register
    app.post('/api/register', authLimiter, (req, res) => {
        const { name, phone, email, password } = req.body;
        if (!name || !phone || !email || !password) {
            return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });
        }

        db.query('SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?', [phone], (errBan, banRes) => {
            if (errBan) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (banRes[0] && banRes[0].count >= 3) {
                return res.status(403).json({ success: false, message: 'Bu telefon numarası suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

            const bcrypt = require('bcryptjs');
            const hashedPassword = bcrypt.hashSync(password, 10);

            const sqlQuery = 'INSERT INTO users (name, phone, email, password, is_email_verified, otp_code, otp_expiry) VALUES (?, ?, ?, ?, 1, ?, ?)';
            db.query(sqlQuery, [name, phone, email, hashedPassword, otpCode, otpExpiry], (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        let field = 'telefon numarası veya e-posta';
                        if (err.message.includes('unique_phone') || err.message.includes('phone')) field = 'telefon numarası';
                        else if (err.message.includes('email')) field = 'e-posta adresi';
                        return res.status(409).json({ success: false, message: `Bu ${field} zaten kullanımda!` });
                    }
                    return res.status(500).json({ success: false, message: 'Kayıt olurken veritabanı hatası oluştu!' });
                }
                const token = require('jsonwebtoken').sign({ id: result.insertId, email }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '7d' });
                res.json({
                    success: true,
                    message: 'Kayıt başarılı! Giriş yapıldı.',
                    unverified: false,
                    token,
                    user: { id: result.insertId, name, email, phone, age: null, position: null, experience: null }
                });
            });
        });
    });

    // Login
    app.post('/api/login', authLimiter, (req, res) => {
        const { email, password } = req.body;
        db.query('SELECT id, name, phone, email, password as dbPassword, age, position, experience, is_email_verified, status FROM users WHERE email = ?', [email], (err, results) => {
            if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
            
            const user = results[0];
            const bcrypt = require('bcryptjs');
            
            let isMatch = false;
            if (user.dbPassword.startsWith('$2a$') || user.dbPassword.startsWith('$2b$')) {
                isMatch = bcrypt.compareSync(password, user.dbPassword);
            } else {
                isMatch = (password === user.dbPassword);
                // Migrate plaintext to bcrypt hash on successful login
                if (isMatch) {
                    const newHash = bcrypt.hashSync(password, 10);
                    db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id], (updErr) => {
                        if (updErr) console.error('Password hash migration failed:', updErr);
                    });
                }
            }
            
            if (!isMatch) return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
            
            if (user.status === 'globally_banned') {
                return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
            }
            
            const token = require('jsonwebtoken').sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '7d' });
            
            // Remove dbPassword before sending to client
            delete user.dbPassword;
            
            res.json({ success: true, token, user });
        });
    });

    // OTP Verify
    app.post('/api/auth/verify-otp', (req, res) => {
        const { userId, email, otpCode } = req.body;
        if (!otpCode) return res.status(400).json({ success: false, message: 'OTP kodu gereklidir!' });

        const query = userId
            ? 'SELECT id, name, phone, email, age, position, experience, otp_code, otp_expiry FROM users WHERE id = ?'
            : 'SELECT id, name, phone, email, age, position, experience, otp_code, otp_expiry FROM users WHERE email = ?';
        db.query(query, [userId || email], (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı!' });
            const user = results[0];
            if (user.otp_code !== otpCode) return res.status(400).json({ success: false, message: 'Geçersiz doğrulama kodu!' });
            if (new Date() > new Date(user.otp_expiry)) return res.status(400).json({ success: false, message: 'Doğrulama kodunun süresi dolmuştur!' });

            db.query('UPDATE users SET is_email_verified = 1, otp_code = NULL, otp_expiry = NULL WHERE id = ?', [user.id], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, message: 'E-posta doğrulanamadı!' });
                res.json({ success: true, message: 'E-posta adresiniz doğrulandı!', user: { id: user.id, name: user.name, phone: user.phone, email: user.email, age: user.age, position: user.position, experience: user.experience } });
            });
        });
    });

    // Complete Profile (OAuth)
    app.put('/api/auth/complete-profile', (req, res) => {
        const { userId, phone } = req.body;
        if (!userId || !phone) return res.status(400).json({ success: false, message: 'Kullanıcı ID ve telefon numarası zorunludur!' });

        db.query('SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?', [phone], (errBan, banRes) => {
            if (errBan) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (banRes[0] && banRes[0].count >= 3) return res.status(403).json({ success: false, message: 'Bu telefon numarası suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });

            db.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId], (errPhone, phoneRes) => {
                if (errPhone) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (phoneRes.length > 0) return res.status(409).json({ success: false, message: 'Bu telefon numarası zaten başka bir hesap tarafından kullanılıyor!' });

                db.query("UPDATE users SET phone = ?, is_email_verified = 1, status = 'active' WHERE id = ?", [phone, userId], (updErr) => {
                    if (updErr) return res.status(500).json({ success: false, message: 'Profil güncellenemedi!' });
                    db.query('SELECT id, name, phone, email, age, position, experience FROM users WHERE id = ?', [userId], (errUser, userResults) => {
                        if (errUser || userResults.length === 0) return res.status(500).json({ success: false, message: 'Kullanıcı detayları alınamadı!' });
                        res.json({ success: true, message: 'Profiliniz başarıyla tamamlandı!', user: userResults[0] });
                    });
                });
            });
        });
    });

    // Google OAuth
    app.get(['/api/auth/google', '/api/auth/Google'], (req, res) => {
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)}&response_type=code&scope=openid%20profile%20email`;
        res.redirect(googleAuthUrl);
    });

    app.get(['/api/auth/google/callback', '/api/auth/Google/callback'], async (req, res) => {
        const code = req.query.code;
        if (!code) return res.redirect('/?error=no_code');
        try {
            const tokenResponse = await require('https').get(`https://oauth2.googleapis.com/token?code=${code}&client_id=${process.env.GOOGLE_CLIENT_ID}&client_secret=${process.env.GOOGLE_CLIENT_SECRET}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)}&grant_type=authorization_code`, (resp) => {
                let data = '';
                resp.on('data', chunk => data += chunk);
                resp.on('end', async () => {
                    try {
                        const tokenData = JSON.parse(data);
                        if (!tokenData.access_token) return res.redirect('/?error=token_error');
                        const userInfoResponse = await require('https').get(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`, (resp2) => {
                            let data2 = '';
                            resp2.on('data', chunk => data2 += chunk);
                            resp2.on('end', () => {
                                try {
                                    const googleUser = JSON.parse(data2);
                                    handleSocialAuthSuccess(googleUser.email, googleUser.name, 'google', 'google_id', res);
                                } catch (e) { res.redirect('/?error=parse_error'); }
                            });
                        });
                        userInfoResponse.on('error', () => res.redirect('/?error=userinfo_error'));
                    } catch (e) { res.redirect('/?error=token_parse_error'); }
                });
            });
            tokenResponse.on('error', () => res.redirect('/?error=token_request_error'));
        } catch (e) { res.redirect('/?error=oauth_exception'); }
    });

    // OAuth Login (from popup)
    app.post('/api/oauth-login', (req, res) => {
        const { name, phone, email, provider } = req.body;
        if (!name || !phone || !email) return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur!' });

        db.query('SELECT id, name, phone, email FROM users WHERE email = ?', [email], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (results.length > 0) {
                const user = results[0];
                db.query('UPDATE users SET name = ?, phone = ? WHERE email = ?', [name, phone, email], (updErr) => {
                    if (updErr) return res.status(500).json({ success: false, message: 'Profil güncellenemedi!' });
                    res.json({ success: true, user: { ...user, name, phone } });
                });
            } else {
                const idCol = provider === 'google' ? 'google_id' : 'apple_id';
                db.query(`INSERT INTO users (name, phone, email, password, is_email_verified, ${idCol}) VALUES (?, ?, ?, 'social_login_pwd', 1, ?)`, [name, phone, email, email], (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: 'Kayıt hatası!' });
                    res.json({ success: true, user: { id: result.insertId, name, phone, email } });
                });
            }
        });
    });

    // Apple OAuth callback
    app.all('/api/auth/apple/callback', (req, res) => {
        const code = req.query.code || 'mock_apple_code';
        handleSocialAuthSuccess('apple_user@example.com', 'Apple User', 'apple', 'apple_id', res);
    });

    // User profile update
    app.put('/api/users/profile', (req, res) => {
        const { id, name, phone, age, height, weight, position, experience } = req.body;
        if (!id || !name || !phone) return res.status(400).json({ success: false, message: 'İsim ve telefon zorunludur!' });
        db.query('UPDATE users SET name = ?, phone = ?, age = ?, height = ?, weight = ?, position = ?, experience = ? WHERE id = ?', [name, phone, age || null, height || null, weight || null, position || null, experience || null, id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Profil güncellenemedi!' });
            db.query('SELECT id, name, phone, email, age, height, weight, position, experience FROM users WHERE id = ?', [id], (err2, results) => {
                if (err2 || results.length === 0) return res.status(500).json({ success: false, message: 'Kullanıcı bilgileri alınamadı!' });
                res.json({ success: true, message: 'Profil başarıyla güncellendi!', user: results[0] });
            });
        });
    });

    // Business login
    app.post('/api/business-login', (req, res) => {
        const { fieldKey, password } = req.body;
        if (!fieldKey || !password) return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });

        db.query(
            `SELECT ps.*, po.name, po.address, po.coordinates, po.phone, po.refreshments, po.cleats, po.shower, po.market 
             FROM pitch_settings ps 
             LEFT JOIN pitch_objects po ON ps.fieldKey = po.fieldKey AND po.pitchNumber = 1
             WHERE ps.fieldKey = ?`, 
            [fieldKey], 
            (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (results.length === 0) return res.status(404).json({ success: false, message: 'Geçersiz işletme anahtarı!' });
                
                const field = results[0];
                const staticField = fieldsData[fieldKey];
                const dbPassword = field.password;
                const staticPassword = staticField ? staticField.password : null;

                if (dbPassword !== password && staticPassword !== password) {
                    return res.status(401).json({ success: false, message: 'Hatalı şifre!' });
                }

                db.query('UPDATE pitch_settings SET last_login = NOW() WHERE fieldKey = ?', [fieldKey], (updErr) => {
                    if (updErr) console.error('Login zamanı güncellenemedi:', updErr);
                });

                const token = require('jsonwebtoken').sign({ fieldKey: fieldKey, role: 'business' }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '7d' });

                res.json({
                    success: true, message: 'Giriş başarılı!', token, field: {
                        fieldKey, name: field.name || (staticField ? staticField.name : fieldKey.toUpperCase()), address: field.address || (staticField ? staticField.address : ''), coordinates: field.coordinates || (staticField ? staticField.coordinates : ''),
                        phone: field.phone || (staticField ? staticField.phone : ''), pitchCount: field.field_count || (staticField ? staticField.pitchCount : 1), isClosed: field.isClosed,
                        openingHour: field.openingHour, closingHour: field.closingHour,
                        hasService: field.hasService || (staticField ? staticField.hasService : 'Servis: Yok'), disabledHours: JSON.parse(field.disabledHours || '[]'),
                        aboneHours: JSON.parse(field.aboneHours || '[]'), refreshments: field.refreshments || (staticField ? staticField.refreshments : ''),
                        cleats: field.cleats || (staticField ? staticField.cleats : 'Krampon Kiralanmaz'), shower: field.shower || (staticField ? staticField.shower : 'Duş Yok'), market: field.market || (staticField ? staticField.market : 'Market Yok')
                    }
                });
            }
        );
    });
}

module.exports = { initAuthRoutes };
