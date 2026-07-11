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

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: 'Çok fazla giriş denemesi! Lütfen 1 dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false
});

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    statusCode: 429,
    message: { success: false, message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimitPerSec = rateLimit({
    windowMs: 1000,
    max: 3,
    statusCode: 429,
    message: { success: false, message: 'Çok fazla deneme, lütfen sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimitPer15Min = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    statusCode: 429,
    message: { success: false, message: 'Çok fazla deneme, lütfen sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { resLimitPerMin, resLimitPerSec, authLimiter, globalLimiter, loginLimitPerSec, loginLimitPer15Min };

