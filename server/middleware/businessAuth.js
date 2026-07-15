const jwt = require('jsonwebtoken');

function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

function requireBusinessOrAdmin(req, res, next) {
    const adminToken = req.headers['x-admin-token'];
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = adminToken || bearerToken;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim!' });
    }

    try {
        const decoded = verifyToken(token);
        if (decoded.role === 'admin') {
            req.telegramActor = { role: 'admin' };
            return next();
        }
        if (decoded.role === 'business' && decoded.fieldKey) {
            req.telegramActor = { role: 'business', fieldKey: decoded.fieldKey };
            return next();
        }
        return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Geçersiz veya süresi dolmuş token!' });
    }
}

function requireAuthenticatedActor(req, res, next) {
    const adminToken = req.headers['x-admin-token'];
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = adminToken || bearerToken;
    if (!token) return res.status(401).json({ success: false, message: 'Yetkisiz erişim!' });
    try {
        const decoded = verifyToken(token);
        if (decoded.role === 'admin') req.reservationActor = { role: 'admin' };
        else if (decoded.role === 'business' && decoded.fieldKey) req.reservationActor = { role: 'business', fieldKey: decoded.fieldKey };
        else if (decoded.id) req.reservationActor = { role: 'user', userId: Number(decoded.id) };
        else return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok!' });
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Geçersiz veya süresi dolmuş token!' });
    }
}

function requireMatchingField(req, res, next) {
    if (req.telegramActor.role === 'business' && req.telegramActor.fieldKey !== req.params.fieldKey) {
        return res.status(403).json({ success: false, message: 'Başka bir işletmenin ayarlarına erişemezsiniz!' });
    }
    next();
}

module.exports = { requireBusinessOrAdmin, requireMatchingField, requireAuthenticatedActor };
