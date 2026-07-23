const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuthenticatedActor } = require('../middleware/businessAuth');
const {
    isGoogleAuthEnabled,
    isEmailVerificationRequired,
    getGoogleClientId,
    getAppBaseUrl
} = require('../utils/authConfig');
const { sendVerificationEmail } = require('../utils/mailer');
const { verifyGoogleCredential } = require('../utils/googleAuth');

const failedLogins = new Map();
const EMAIL_TOKEN_TTL_MINUTES = 30;
const EMAIL_RESEND_COOLDOWN_SECONDS = 60;
const GOOGLE_FLOW_TTL = '10m';

function initAuthRoutes(app, db, options = {}) {
    const fieldsData = require('../fieldsData');
    const { loginLimitPerSec, loginLimitPer15Min } = require('../middleware/rateLimiter');
    const googleVerifier = options.googleVerifier;
    const mailer = options.mailer || sendVerificationEmail;

    function checkIpBlock(req, res, next) {
        const ip = getClientIp(req);
        const now = Date.now();
        const blockData = failedLogins.get(ip);
        if (blockData && blockData.blockedUntil > now) {
            const minutesLeft = Math.ceil((blockData.blockedUntil - now) / (60 * 1000));
            return res.status(403).json({
                success: false,
                message: `Cok fazla basarisiz giris denemesi. Lutfen ${minutesLeft} dakika sonra tekrar deneyin.`
            });
        }
        next();
    }

    function recordFailedAttempt(ip) {
        const now = Date.now();
        let current = failedLogins.get(ip) || { count: 0, blockedUntil: 0 };
        if (current.blockedUntil && current.blockedUntil <= now) current = { count: 0, blockedUntil: 0 };
        current.count += 1;
        if (current.count >= 5) current.blockedUntil = now + 30 * 60 * 1000;
        failedLogins.set(ip, current);
    }

    function resetFailedAttempts(ip) {
        failedLogins.delete(ip);
    }

    function logFailedLogin(ip, email) {
        try {
            const logDir = path.join(__dirname, '..', 'logs');
            if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
            const logFilePath = path.join(logDir, 'failed-logins.log');
            if (fs.existsSync(logFilePath) && fs.statSync(logFilePath).size > 5 * 1024 * 1024) {
                const backupPath = path.join(logDir, 'failed-logins.1.log');
                if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
                fs.renameSync(logFilePath, backupPath);
            }
            fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] - ${ip} - ${email || 'unknown'} - "FAILED_LOGIN"\n`, 'utf8');
        } catch (err) {
            console.error('Failed to write login log:', err);
        }
    }

    function cleanAndTrimBody(req, res, next) {
        if (req.body) {
            for (const key of Object.keys(req.body)) {
                if (typeof req.body[key] === 'string') req.body[key] = req.body[key].trim();
            }
        }
        next();
    }

    app.post('/api/register', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, async (req, res) => {
        const { firstName, lastName, phone, password } = req.body;
        const email = normalizeEmail(req.body.email);
        if (!firstName || !lastName || !phone || !email || !password) {
            return res.status(400).json({ success: false, message: 'Tum alanlari doldurunuz!' });
        }
        const validationError = validateLocalCredentials(email, password, phone);
        if (validationError) return res.status(400).json({ success: false, message: validationError });

        const connection = await db.promise().getConnection();
        try {
            const [banRes] = await connection.query(
                'SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?',
                [phone]
            );
            if (banRes[0] && banRes[0].count >= 3) {
                return res.status(403).json({ success: false, message: 'Bu telefon numarasi suistimal nedeniyle kalici olarak askiya alinmistir!' });
            }

            const [dupRows] = await connection.query('SELECT id, is_email_verified FROM users WHERE email = ? LIMIT 1', [email]);
            if (dupRows.length > 0) {
                if (isEmailVerificationRequired() && Number(dupRows[0].is_email_verified) !== 1) {
                    const mailState = await createAndSendVerification(connection, dupRows[0].id, email, req, mailer);
                    return res.status(202).json({
                        success: true,
                        requiresEmailVerification: true,
                        emailSent: mailState.sent,
                        message: mailState.sent
                            ? 'Dogrulama e-postasi yeniden gonderildi. Giris yapmadan once e-postanizi dogrulayin.'
                            : 'Hesabiniz kayitli ancak dogrulama e-postasi gonderilemedi. Yeniden gondermeyi deneyin.'
                    });
                }
                return res.status(409).json({ success: false, message: 'Bu e-posta adresi zaten kullanimda!' });
            }
            if (await phoneBelongsToAnotherUser(connection, phone)) {
                return res.status(409).json({
                    success: false,
                    code: 'PHONE_IN_USE',
                    message: duplicatePhoneMessage()
                });
            }

            const hashedPassword = bcrypt.hashSync(password, 10);
            const verified = isEmailVerificationRequired() ? 0 : 1;
            const [result] = await connection.query(
                'INSERT INTO users (first_name, last_name, phone, email, password, is_email_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [firstName, lastName, phone, email, hashedPassword, verified]
            );

            if (isEmailVerificationRequired()) {
                const mailState = await createAndSendVerification(connection, result.insertId, email, req, mailer);
                return res.status(202).json({
                    success: true,
                    requiresEmailVerification: true,
                    emailSent: mailState.sent,
                    message: mailState.sent
                        ? 'Kayit alindi. Giris yapmadan once e-postanizi dogrulayin.'
                        : 'Kayit alindi ancak dogrulama e-postasi gonderilemedi. Yeniden gondermeyi deneyin.'
                });
            }

            const token = signSessionToken({ id: result.insertId, email });
            res.json({
                success: true,
                message: 'Kayit basarili! Giris yapildi.',
                token,
                user: { id: result.insertId, first_name: firstName, last_name: lastName, email, phone, age: null, position: null, experience: null, is_email_verified: 1 }
            });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                const isPhoneDuplicate = String(err.message || '').includes('unique_phone');
                return res.status(409).json({
                    success: false,
                    code: isPhoneDuplicate ? 'PHONE_IN_USE' : 'EMAIL_IN_USE',
                    message: isPhoneDuplicate ? duplicatePhoneMessage() : 'Bu e-posta adresi zaten kullanimda!'
                });
            }
            console.error('Register error:', err.message);
            res.status(500).json({ success: false, message: 'Kayit olurken veritabani hatasi olustu!' });
        } finally {
            connection.release();
        }
    });

    app.post('/api/login', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, checkIpBlock, async (req, res) => {
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);
        const ip = getClientIp(req);
        if (!email || !password) return res.status(400).json({ success: false, message: 'E-posta ve sifre alanlari zorunludur.' });
        const validationError = validateLocalCredentials(email, password);
        if (validationError) return res.status(400).json({ success: false, message: validationError });

        try {
            const [results] = await db.promise().query(
                'SELECT id, first_name, last_name, phone, email, password AS dbPassword, age, height, weight, position, experience, status, is_email_verified FROM users WHERE email = ?',
                [email]
            );
            if (results.length === 0 || !results[0].dbPassword) {
                recordFailedAttempt(ip);
                logFailedLogin(ip, email);
                return res.status(401).json({ success: false, message: 'Hatali giris!' });
            }
            const user = results[0];
            const isHash = user.dbPassword.startsWith('$2a$') || user.dbPassword.startsWith('$2b$') || user.dbPassword.startsWith('$2y$');
            const isMatch = isHash ? bcrypt.compareSync(password, user.dbPassword) : password === user.dbPassword;
            if (!isMatch) {
                recordFailedAttempt(ip);
                logFailedLogin(ip, email);
                return res.status(401).json({ success: false, message: 'Hatali giris!' });
            }
            if (!isHash) {
                db.execute('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(password, 10), user.id], () => {});
            }
            if (user.status === 'globally_banned') {
                return res.status(403).json({ success: false, message: 'Hesabiniz suistimal nedeniyle kalici olarak askiya alinmistir!' });
            }
            if (isEmailVerificationRequired() && Number(user.is_email_verified) !== 1) {
                return res.status(403).json({
                    success: false,
                    code: 'EMAIL_NOT_VERIFIED',
                    message: 'Giris yapmadan once e-posta adresinizi dogrulayin.'
                });
            }

            resetFailedAttempts(ip);
            delete user.dbPassword;
            res.json({ success: true, token: signSessionToken(user), user });
        } catch (err) {
            recordFailedAttempt(ip);
            logFailedLogin(ip, email);
            res.status(401).json({ success: false, message: 'Hatali giris!' });
        }
    });

    app.post('/api/auth/google', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, async (req, res) => {
        if (!isGoogleAuthEnabled()) return res.status(404).json({ success: false, message: 'Google girisi aktif degil.' });
        const credential = String(req.body.credential || '').trim();
        if (!credential) return res.status(400).json({ success: false, message: 'Google kimlik bilgisi eksik.' });

        let googleProfile;
        try {
            googleProfile = await verifyGoogleCredential({ credential, audience: getGoogleClientId(), verifier: googleVerifier });
        } catch (err) {
            const status = err.code === 'GOOGLE_EMAIL_NOT_VERIFIED' ? 403 : 401;
            return res.status(status).json({ success: false, message: 'Google kimligi dogrulanamadi.' });
        }

        const email = normalizeEmail(googleProfile.email);
        if (!email) return res.status(400).json({ success: false, message: 'Google hesabinda e-posta bulunamadi.' });

        try {
            const [identityRows] = await db.promise().query(
                `SELECT u.id, u.first_name, u.last_name, u.phone, u.email, u.age, u.height, u.weight, u.position, u.experience, u.status, u.is_email_verified
                 FROM user_auth_identities i JOIN users u ON u.id = i.user_id
                 WHERE i.provider = 'google' AND i.provider_subject = ?`,
                [googleProfile.sub]
            );
            if (identityRows.length > 0) {
                const user = identityRows[0];
                if (user.status === 'globally_banned') {
                    return res.status(403).json({ success: false, message: 'Hesabiniz suistimal nedeniyle kalici olarak askiya alinmistir!' });
                }
                await db.promise().query(
                    'UPDATE user_auth_identities SET last_login_at = NOW(), provider_email = ? WHERE provider = "google" AND provider_subject = ?',
                    [email, googleProfile.sub]
                );
                return res.json({ success: true, token: signSessionToken(user), user });
            }

            const [emailRows] = await db.promise().query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
            const flowToken = signGoogleFlowToken(googleProfile, emailRows.length > 0 ? 'link_account' : 'complete_profile');
            if (emailRows.length > 0) {
                return res.json({
                    success: true,
                    nextAction: 'link_account',
                    flowToken,
                    email,
                    message: 'Bu e-posta ile yerel hesap var. Google baglamak icin mevcut sifrenizi girin.'
                });
            }
            return res.json({
                success: true,
                nextAction: 'complete_profile',
                flowToken,
                profile: { email, firstName: googleProfile.firstName, lastName: googleProfile.lastName }
            });
        } catch (err) {
            console.error('Google auth error:', err.message);
            res.status(500).json({ success: false, message: 'Google girisi tamamlanamadi.' });
        }
    });

    app.post('/api/auth/google/complete-profile', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, async (req, res) => {
        if (!isGoogleAuthEnabled()) return res.status(404).json({ success: false, message: 'Google girisi aktif degil.' });
        const flow = verifyGoogleFlow(req.body.flowToken, 'complete_profile');
        if (!flow.ok) return res.status(400).json({ success: false, message: 'Google oturumu gecersiz veya suresi dolmus.' });
        const { firstName, lastName, phone } = req.body;
        const kvkkAccepted = req.body.kvkkAccepted === true || req.body.kvkkAccepted === 'true';
        if (!firstName || !lastName || !phone || !kvkkAccepted) {
            return res.status(400).json({ success: false, message: 'Profil bilgileri ve KVKK onayi zorunludur.' });
        }
        const phoneError = validatePhone(phone);
        if (phoneError) return res.status(400).json({ success: false, message: phoneError });

        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [banRes] = await connection.query('SELECT COUNT(DISTINCT fieldKey) AS count FROM field_blacklists WHERE phone_number = ?', [phone]);
            if (banRes[0] && banRes[0].count >= 3) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Bu telefon numarasi suistimal nedeniyle kalici olarak askiya alinmistir!' });
            }
            const [identityRows] = await connection.query(
                'SELECT user_id FROM user_auth_identities WHERE provider = "google" AND provider_subject = ? FOR UPDATE',
                [flow.profile.sub]
            );
            if (identityRows.length > 0) {
                await connection.rollback();
                return res.status(409).json({ success: false, message: 'Bu Google hesabi zaten bagli.' });
            }
            const [emailRows] = await connection.query('SELECT id FROM users WHERE email = ? FOR UPDATE', [flow.profile.email]);
            if (emailRows.length > 0) {
                await connection.rollback();
                return res.status(409).json({ success: false, code: 'ACCOUNT_LINK_REQUIRED', message: 'Bu e-posta ile hesap var. Google baglama adimini kullanin.' });
            }
            if (await phoneBelongsToAnotherUser(connection, phone)) {
                await connection.rollback();
                return res.status(409).json({
                    success: false,
                    code: 'PHONE_IN_USE',
                    message: duplicatePhoneMessage()
                });
            }
            const [insert] = await connection.query(
                'INSERT INTO users (first_name, last_name, phone, email, password, is_email_verified) VALUES (?, ?, ?, ?, NULL, 1)',
                [firstName, lastName, phone, flow.profile.email]
            );
            await connection.query(
                'INSERT INTO user_auth_identities (user_id, provider, provider_subject, provider_email, last_login_at) VALUES (?, "google", ?, ?, NOW())',
                [insert.insertId, flow.profile.sub, flow.profile.email]
            );
            await connection.commit();
            const user = { id: insert.insertId, first_name: firstName, last_name: lastName, email: flow.profile.email, phone, is_email_verified: 1 };
            res.json({ success: true, token: signSessionToken(user), user });
        } catch (err) {
            await connection.rollback().catch(() => {});
            if (err.code === 'ER_DUP_ENTRY') {
                const isPhoneDuplicate = String(err.message || '').includes('unique_phone');
                return res.status(409).json({
                    success: false,
                    code: isPhoneDuplicate ? 'PHONE_IN_USE' : 'ACCOUNT_EXISTS',
                    message: isPhoneDuplicate ? duplicatePhoneMessage() : 'Bu hesap zaten mevcut.'
                });
            }
            console.error('Google complete-profile error:', err.message);
            res.status(500).json({ success: false, message: 'Google profili tamamlanamadi.' });
        } finally {
            connection.release();
        }
    });

    app.post('/api/auth/google/link', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, async (req, res) => {
        if (!isGoogleAuthEnabled()) return res.status(404).json({ success: false, message: 'Google girisi aktif degil.' });
        const flow = verifyGoogleFlow(req.body.flowToken, 'link_account');
        if (!flow.ok) return res.status(400).json({ success: false, message: 'Google oturumu gecersiz veya suresi dolmus.' });
        const password = String(req.body.password || '');
        if (!password) return res.status(400).json({ success: false, message: 'Mevcut sifre zorunludur.' });

        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [users] = await connection.query(
                'SELECT id, first_name, last_name, phone, email, password AS dbPassword, age, height, weight, position, experience, status, is_email_verified FROM users WHERE email = ? FOR UPDATE',
                [flow.profile.email]
            );
            if (users.length === 0 || !users[0].dbPassword) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Baglanacak yerel hesap bulunamadi.' });
            }
            const user = users[0];
            const isMatch = user.dbPassword.startsWith('$2') ? bcrypt.compareSync(password, user.dbPassword) : password === user.dbPassword;
            if (!isMatch) {
                await connection.rollback();
                return res.status(401).json({ success: false, message: 'Sifre hatali.' });
            }
            if (user.status === 'globally_banned') {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Hesabiniz suistimal nedeniyle kalici olarak askiya alinmistir!' });
            }
            await connection.query(
                'INSERT INTO user_auth_identities (user_id, provider, provider_subject, provider_email, last_login_at) VALUES (?, "google", ?, ?, NOW())',
                [user.id, flow.profile.sub, flow.profile.email]
            );
            await connection.query('UPDATE users SET is_email_verified = 1 WHERE id = ?', [user.id]);
            await connection.commit();
            delete user.dbPassword;
            user.is_email_verified = 1;
            res.json({ success: true, token: signSessionToken(user), user });
        } catch (err) {
            await connection.rollback().catch(() => {});
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Google hesabi zaten bagli.' });
            console.error('Google link error:', err.message);
            res.status(500).json({ success: false, message: 'Google hesabi baglanamadi.' });
        } finally {
            connection.release();
        }
    });

    app.get('/api/auth/verify-email', async (req, res) => {
        const token = String(req.query.token || '').trim();
        if (!token) return res.redirect('/?email_verified=invalid');
        const hash = hashToken(token);
        const connection = await db.promise().getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.query(
                'SELECT user_id FROM email_verification_tokens WHERE token_hash = ? AND expires_at > NOW() FOR UPDATE',
                [hash]
            );
            if (rows.length === 0) {
                await connection.rollback();
                return res.redirect('/?email_verified=invalid');
            }
            await connection.query('UPDATE users SET is_email_verified = 1 WHERE id = ?', [rows[0].user_id]);
            await connection.query('DELETE FROM email_verification_tokens WHERE user_id = ?', [rows[0].user_id]);
            await connection.commit();
            res.redirect('/?email_verified=1');
        } catch (err) {
            await connection.rollback().catch(() => {});
            res.redirect('/?email_verified=error');
        } finally {
            connection.release();
        }
    });

    app.post('/api/auth/resend-verification', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, async (req, res) => {
        const email = normalizeEmail(req.body.email);
        const generic = { success: true, message: 'Hesap uygunsa dogrulama e-postasi gonderildi.' };
        if (!isEmailVerificationRequired() || !email) return res.json(generic);
        try {
            const [users] = await db.promise().query('SELECT id, is_email_verified FROM users WHERE email = ? LIMIT 1', [email]);
            if (users.length === 0 || Number(users[0].is_email_verified) === 1) return res.json(generic);
            const [tokens] = await db.promise().query('SELECT last_sent_at FROM email_verification_tokens WHERE user_id = ?', [users[0].id]);
            if (tokens.length > 0 && secondsSince(tokens[0].last_sent_at) < EMAIL_RESEND_COOLDOWN_SECONDS) return res.json(generic);
            const mailState = await createAndSendVerification(db.promise(), users[0].id, email, req, mailer);
            if (!mailState.sent) {
                return res.status(503).json({
                    success: false,
                    code: 'EMAIL_DELIVERY_FAILED',
                    message: 'Dogrulama e-postasi su anda gonderilemedi. Mail ayarlarini kontrol edip tekrar deneyin.'
                });
            }
            res.json({ success: true, message: 'Dogrulama e-postasi gonderildi.' });
        } catch (err) {
            res.status(503).json({
                success: false,
                code: 'EMAIL_DELIVERY_FAILED',
                message: 'Dogrulama e-postasi su anda gonderilemedi. Mail ayarlarini kontrol edip tekrar deneyin.'
            });
        }
    });

    app.put('/api/users/profile', requireAuthenticatedActor, async (req, res) => {
        const { id, firstName, lastName, phone, age, height, weight, position, experience } = req.body;
        const userId = Number(id);
        if (!Number.isInteger(userId) || !firstName || !lastName || !phone) {
            return res.status(400).json({ success: false, message: 'Isim, soyisim ve telefon zorunludur!' });
        }
        if (req.reservationActor.role !== 'user' || req.reservationActor.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Yalniz kendi profilinizi guncelleyebilirsiniz!' });
        }
        const phoneError = validatePhone(phone);
        if (phoneError) return res.status(400).json({ success: false, message: phoneError });
        try {
            if (await phoneBelongsToAnotherUser(db.promise(), phone, userId)) {
                return res.status(409).json({
                    success: false,
                    code: 'PHONE_IN_USE',
                    message: duplicatePhoneMessage()
                });
            }
            await db.promise().query(
                'UPDATE users SET first_name = ?, last_name = ?, phone = ?, age = ?, height = ?, weight = ?, position = ?, experience = ? WHERE id = ?',
                [firstName, lastName, phone, age || null, height || null, weight || null, position || null, experience || null, userId]
            );
            const [results] = await db.promise().query(
                'SELECT id, first_name, last_name, phone, email, age, height, weight, position, experience, is_email_verified FROM users WHERE id = ?',
                [userId]
            );
            if (results.length === 0) return res.status(404).json({ success: false, message: 'Kullanici bulunamadi!' });
            res.json({ success: true, message: 'Profil basariyla guncellendi!', user: results[0] });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY' && String(err.message || '').includes('unique_phone')) {
                return res.status(409).json({
                    success: false,
                    code: 'PHONE_IN_USE',
                    message: duplicatePhoneMessage()
                });
            }
            res.status(500).json({ success: false, message: 'Profil guncellenemedi!' });
        }
    });

    app.post('/api/business-login', loginLimitPerSec, loginLimitPer15Min, cleanAndTrimBody, checkIpBlock, (req, res) => {
        const { fieldKey, password } = req.body;
        const ip = getClientIp(req);
        if (!fieldKey || !password) return res.status(400).json({ success: false, message: 'Tum alanlari doldurunuz!' });
        if (password.length < 6 || /\s/.test(password)) return res.status(400).json({ success: false, message: 'Sifre en az 6 karakter olmali ve bosluk icermemelidir.' });

        db.execute(
            `SELECT ps.*, po.name, po.address, po.coordinates, po.phone, po.refreshments, po.cleats, po.shower, po.market
             FROM pitch_settings ps
             LEFT JOIN pitch_objects po ON ps.fieldKey = po.fieldKey AND po.pitchNumber = 1
             WHERE ps.fieldKey = ?`,
            [fieldKey],
            (err, results) => {
                if (err || results.length === 0) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, fieldKey);
                    return res.status(401).json({ success: false, message: 'Hatali giris!' });
                }
                const field = results[0];
                const staticField = fieldsData[fieldKey];
                if (field.password !== password && (!staticField || staticField.password !== password)) {
                    recordFailedAttempt(ip);
                    logFailedLogin(ip, fieldKey);
                    return res.status(401).json({ success: false, message: 'Hatali giris!' });
                }
                resetFailedAttempts(ip);
                db.execute('UPDATE pitch_settings SET last_login = NOW() WHERE fieldKey = ?', [fieldKey], () => {});
                const token = jwt.sign({ fieldKey, role: 'business' }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '24h' });
                res.json({
                    success: true,
                    message: 'Giris basarili!',
                    token,
                    field: {
                        fieldKey,
                        name: field.name || (staticField ? staticField.name : fieldKey.toUpperCase()),
                        address: field.address || (staticField ? staticField.address : ''),
                        coordinates: field.coordinates || (staticField ? staticField.coordinates : ''),
                        phone: field.phone || (staticField ? staticField.phone : ''),
                        pitchCount: field.field_count || (staticField ? staticField.pitchCount : 1),
                        isClosed: field.isClosed,
                        openingHour: field.openingHour,
                        closingHour: field.closingHour,
                        hasService: field.hasService || (staticField ? staticField.hasService : 'Servis: Yok'),
                        disabledHours: JSON.parse(field.disabledHours || '[]'),
                        aboneHours: JSON.parse(field.aboneHours || '[]'),
                        refreshments: field.refreshments || (staticField ? staticField.refreshments : ''),
                        cleats: field.cleats || (staticField ? staticField.cleats : 'Krampon Kiralanmaz'),
                        shower: field.shower || (staticField ? staticField.shower : 'Dus Yok'),
                        market: field.market || (staticField ? staticField.market : 'Market Yok')
                    }
                });
            }
        );
    });
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function validateLocalCredentials(email, password, phone) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Gecersiz e-posta formati.';
    if (password.length < 6) return 'Sifre en az 6 karakter olmalidir.';
    if (/\s/.test(password)) return 'Sifre bosluk icermemelidir.';
    if (phone) return validatePhone(phone);
    return null;
}

function validatePhone(phone) {
    if (!/^(05|5)[0-9]{9}$/.test(String(phone || ''))) {
        return 'Gecersiz telefon numarasi formati. Orn: 5xxxxxxxxx';
    }
    return null;
}

function duplicatePhoneMessage() {
    return 'Bu telefon numarasi zaten baska bir hesapta kullaniliyor.';
}

async function phoneBelongsToAnotherUser(queryable, phone, userId = null) {
    const normalizedPhone = String(phone || '').trim();
    if (!normalizedPhone) return false;
    const params = [normalizedPhone];
    let sql = 'SELECT id FROM users WHERE phone = ?';
    if (userId) {
        sql += ' AND id != ?';
        params.push(userId);
    }
    sql += ' LIMIT 1';
    const [rows] = await queryable.query(sql, params);
    return rows.length > 0;
}

function getClientIp(req) {
    return req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

function signSessionToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'jwt_key', { expiresIn: '24h' });
}

function signGoogleFlowToken(profile, nextAction) {
    return jwt.sign(
        {
            purpose: 'google_onboarding',
            nextAction,
            profile: {
                sub: profile.sub,
                email: normalizeEmail(profile.email),
                firstName: profile.firstName || '',
                lastName: profile.lastName || ''
            }
        },
        process.env.JWT_SECRET || 'jwt_key',
        { expiresIn: GOOGLE_FLOW_TTL }
    );
}

function verifyGoogleFlow(token, expectedAction) {
    try {
        const decoded = jwt.verify(String(token || ''), process.env.JWT_SECRET || 'jwt_key');
        if (decoded.purpose !== 'google_onboarding' || decoded.nextAction !== expectedAction || !decoded.profile?.sub || !decoded.profile?.email) {
            return { ok: false };
        }
        return { ok: true, profile: decoded.profile };
    } catch (err) {
        return { ok: false };
    }
}

async function createAndSendVerification(queryable, userId, email, req, mailer) {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    await queryable.query(
        `REPLACE INTO email_verification_tokens (user_id, token_hash, expires_at, last_sent_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())`,
        [userId, tokenHash, EMAIL_TOKEN_TTL_MINUTES]
    );
    try {
        await mailer({ to: email, token: rawToken, baseUrl: getAppBaseUrl(req) });
        return { sent: true };
    } catch (err) {
        console.warn('Verification email delivery failed:', {
            code: err.code || 'MAIL_ERROR',
            providerStatus: err.providerStatus || null,
            providerCode: err.providerCode || null
        });
        return { sent: false };
    }
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function secondsSince(dateValue) {
    if (!dateValue) return Infinity;
    return Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000);
}

module.exports = { initAuthRoutes, normalizeEmail, hashToken };
