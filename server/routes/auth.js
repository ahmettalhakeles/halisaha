const fs = require('fs');
const path = require('path');

// In-memory map for IP block
const failedLogins = new Map();

function initAuthRoutes(app, db) {
    const fieldsData = require('../fieldsData');
    const { loginLimitPerSec, loginLimitPer15Min } = require('../middleware/rateLimiter');

    // Helper functions for brute force protection
    function checkIpBlock(req, res, next) {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const now = Date.now();
        const blockData = failedLogins.get(ip);
        if (blockData && blockData.blockedUntil > now) {
            const minutesLeft = Math.ceil((blockData.blockedUntil - now) / (60 * 1000));
            return res.status(403).json({
                success: false,
                message: `Çok fazla başarısız giriş denemesi. IP adresiniz bloke edildi. Lütfen ${minutesLeft} dakika sonra tekrar deneyin.`
            });
        }
        next();
    }

    function recordFailedAttempt(ip) {
        const now = Date.now();
        let current = failedLogins.get(ip) || { count: 0, blockedUntil: 0 };
        if (current.blockedUntil && current.blockedUntil <= now) {
            current = { count: 0, blockedUntil: 0 };
        }
        current.count += 1;
        if (current.count >= 5) {
            current.blockedUntil = now + 30 * 60 * 1000; // 30 minutes
        }
        failedLogins.set(ip, current);
    }

    function resetFailedAttempts(ip) {
        failedLogins.delete(ip);
    }

    // Helper to log failed login attempts with rotation
    function logFailedLogin(ip, email) {
        try {
            const logDir = path.join(__dirname, '..', 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logFilePath = path.join(logDir, 'failed-logins.log');
            
            // Simple 5MB log rotation
            if (fs.existsSync(logFilePath)) {
                const stats = fs.statSync(logFilePath);
                if (stats.size > 5 * 1024 * 1024) { // 5MB
                    const backupPath = path.join(logDir, 'failed-logins.1.log');
                    if (fs.existsSync(backupPath)) {
                        fs.unlinkSync(backupPath);
                    }
                    fs.renameSync(logFilePath, backupPath);
                }
            }
            
            const isoDate = new Date().toISOString();
            const logLine = `[${isoDate}] - ${ip} - ${email || 'unknown'} - "FAILED_LOGIN"\n`;
            fs.appendFileSync(logFilePath, logLine, 'utf8');
        } catch (err) {
            console.error('Failed to write login log:', err);
        }
    }

    // Helper to trim and clean req.body string fields
    function cleanAndTrimBody(req, res, next) {
        if (req.body) {
            for (const key in req.body) {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = req.body[key].trim();
                }
            }
        }
        next();
    }

    // handleSocialAuthSuccess helper
    async function handleSocialAuthSuccess(email, name, provider, idCol, res) {
        email = String(email || '').trim().toLowerCase();
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
                const token = require('jsonwebtoken').sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '24h' });
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
    app.post('/api/register', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, (req, res) => {
        const { firstName, lastName, phone, password } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!firstName || !lastName || !phone || !email || !password) {
            return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Geçersiz e-posta formatı.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Şifre en az 6 karakter olmalıdır.' });
        }
        if (/\s/.test(password)) {
            return res.status(400).json({ success: false, message: 'Şifre boşluk içermemelidir.' });
        }

        const phoneRegex = /^(05|5)[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ success: false, message: 'Geçersiz telefon numarası formatı. Örn: 5xxxxxxxxx' });
        }

        db.execute('SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?', [phone], (errBan, banRes) => {
            if (errBan) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
            if (banRes[0] && banRes[0].count >= 3) {
                return res.status(403).json({ success: false, message: 'Bu telefon numarası suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
            }

            db.execute('SELECT id, phone, email FROM users WHERE phone = ? OR email = ? LIMIT 1', [phone, email], (dupErr, dupRows) => {
                if (dupErr) return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
                if (dupRows.length > 0) {
                    const field = dupRows[0].email === email ? 'e-posta adresi' : 'telefon numarası';
                    return res.status(409).json({ success: false, message: `Bu ${field} zaten kullanımda!` });
                }

                const bcrypt = require('bcryptjs');
                const hashedPassword = bcrypt.hashSync(password, 10);

            const sqlQuery = 'INSERT INTO users (first_name, last_name, phone, email, password) VALUES (?, ?, ?, ?, ?)';
            db.execute(sqlQuery, [firstName, lastName, phone, email, hashedPassword], (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        let field = 'telefon numarası veya e-posta';
                        if (err.message.includes('unique_phone') || err.message.includes('phone')) field = 'telefon numarası';
                        else if (err.message.includes('email')) field = 'e-posta adresi';
                        return res.status(409).json({ success: false, message: `Bu ${field} zaten kullanımda!` });
                    }
                    return res.status(500).json({ success: false, message: 'Kayıt olurken veritabanı hatası oluştu!' });
                }
                const token = require('jsonwebtoken').sign({ id: result.insertId, email }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '24h' });
                res.json({
                    success: true,
                    message: 'Kayıt başarılı! Giriş yapıldı.',
                    token,
                    user: { id: result.insertId, first_name: firstName, last_name: lastName, email, phone, age: null, position: null, experience: null }
                });
            });
            });
        });
    });

    // Login
    app.post('/api/login', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, checkIpBlock, (req, res) => {
        const { password } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'E-posta ve şifre alanları zorunludur.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Geçersiz e-posta formatı.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Şifre en az 6 karakter olmalıdır.' });
        }
        if (/\s/.test(password)) {
            return res.status(400).json({ success: false, message: 'Şifre boşluk içermemelidir.' });
        }

        db.execute(
            'SELECT id, first_name, last_name, phone, email, password as dbPassword, age, position, experience, status FROM users WHERE email = ?',
            [email],
            (err, results) => {
                if (err) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, email);
                    return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
                }
                if (results.length === 0) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, email);
                    return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
                }
                
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
                        db.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id], (updErr) => {
                            if (updErr) console.error('Password hash migration failed:', updErr);
                        });
                    }
                }
                
                if (!isMatch) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, email);
                    return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
                }
                
                if (user.status === 'globally_banned') {
                    return res.status(403).json({ success: false, message: 'Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!' });
                }
                
                resetFailedAttempts(ip);
                
                const token = require('jsonwebtoken').sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '24h' });
                
                // Remove dbPassword before sending to client
                delete user.dbPassword;
                
                res.json({ success: true, token, user });
            }
        );
    });

    // User profile update
    app.put('/api/users/profile', (req, res) => {
        const { id, firstName, lastName, phone, age, height, weight, position, experience } = req.body;
        if (!id || !firstName || !lastName || !phone) return res.status(400).json({ success: false, message: 'İsim, soyisim ve telefon zorunludur!' });
        db.query('UPDATE users SET first_name = ?, last_name = ?, phone = ?, age = ?, height = ?, weight = ?, position = ?, experience = ? WHERE id = ?', [firstName, lastName, phone, age || null, height || null, weight || null, position || null, experience || null, id], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Profil güncellenemedi!' });
            db.query('SELECT id, first_name, last_name, phone, email, age, height, weight, position, experience FROM users WHERE id = ?', [id], (err2, results) => {
                if (err2 || results.length === 0) return res.status(500).json({ success: false, message: 'Kullanıcı bilgileri alınamadı!' });
                res.json({ success: true, message: 'Profil başarıyla güncellendi!', user: results[0] });
            });
        });
    });

    // Business login
    app.post('/api/business-login', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, checkIpBlock, (req, res) => {
        const { fieldKey, password } = req.body;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!fieldKey || !password) {
            return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Şifre en az 6 karakter olmalıdır.' });
        }
        if (/\s/.test(password)) {
            return res.status(400).json({ success: false, message: 'Şifre boşluk içermemelidir.' });
        }

        db.execute(
            `SELECT ps.*, po.name, po.address, po.coordinates, po.phone, po.refreshments, po.cleats, po.shower, po.market 
             FROM pitch_settings ps 
             LEFT JOIN pitch_objects po ON ps.fieldKey = po.fieldKey AND po.pitchNumber = 1
             WHERE ps.fieldKey = ?`, 
            [fieldKey], 
            (err, results) => {
                if (err) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, fieldKey);
                    return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
                }
                if (results.length === 0) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, fieldKey);
                    return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
                }
                
                const field = results[0];
                const staticField = fieldsData[fieldKey];
                const dbPassword = field.password;
                const staticPassword = staticField ? staticField.password : null;

                if (dbPassword !== password && staticPassword !== password) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, fieldKey);
                    return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
                }

                resetFailedAttempts(ip);

                db.execute('UPDATE pitch_settings SET last_login = NOW() WHERE fieldKey = ?', [fieldKey], (updErr) => {
                    if (updErr) console.error('Login zamanı güncellenemedi:', updErr);
                });

                const token = require('jsonwebtoken').sign({ fieldKey: fieldKey, role: 'business' }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '24h' });

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
