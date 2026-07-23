const { randomUUID } = require('crypto');

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const LOCAL_TEST_SECRET = '1x0000000000000000000000000000000AA';

function getTurnstileSecret() {
    if (process.env.TURNSTILE_SECRET) return process.env.TURNSTILE_SECRET;
    return process.env.NODE_ENV === 'production' ? '' : LOCAL_TEST_SECRET;
}

function hasRequiredTurnstileConfig(env = process.env) {
    return env.NODE_ENV !== 'production' || Boolean(env.TURNSTILE_SITEKEY && env.TURNSTILE_SECRET);
}

async function verifyTurnstileToken({
    token,
    remoteIp,
    expectedHostname,
    expectedAction = 'reservation_create',
    secret = getTurnstileSecret(),
    fetchImpl = global.fetch,
    timeoutMs = 5000
}) {
    if (!token || typeof token !== 'string' || token.length > 2048) {
        return { success: false, unavailable: false, errorCodes: ['invalid-input-response'] };
    }
    if (!secret || typeof fetchImpl !== 'function') {
        return { success: false, unavailable: true, errorCodes: ['internal-error'] };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret,
                response: token,
                remoteip: remoteIp || undefined,
                idempotency_key: randomUUID()
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            return { success: false, unavailable: true, errorCodes: ['internal-error'] };
        }

        const result = await response.json();
        const actionMatches = !expectedAction || result.action === expectedAction;
        const hostnameMatches = !expectedHostname || result.hostname === expectedHostname;
        if (!result.success || !actionMatches || !hostnameMatches) {
            const errorCodes = Array.isArray(result['error-codes']) ? [...result['error-codes']] : [];
            if (!actionMatches) errorCodes.push('action-mismatch');
            if (!hostnameMatches) errorCodes.push('hostname-mismatch');
            return { success: false, unavailable: errorCodes.includes('internal-error'), errorCodes };
        }

        return { success: true, unavailable: false, errorCodes: [] };
    } catch (error) {
        return { success: false, unavailable: true, errorCodes: ['internal-error'] };
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { verifyTurnstileToken, getTurnstileSecret, hasRequiredTurnstileConfig, SITEVERIFY_URL };
