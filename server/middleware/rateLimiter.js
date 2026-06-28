const rateLimit = require('express-rate-limit');

const resLimitPerMin = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Dakikada en fazla 30 rezervasyon talebi gönderebilirsiniz!' },
    standardHeaders: true,
    legacyHeaders: false
});

const resLimitPerSec = rateLimit({
    windowMs: 1000,
    max: 5,
    message: { success: false, message: 'Saniyede en fazla 5 rezervasyon talebi gönderebilirsiniz!' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { resLimitPerMin, resLimitPerSec };
