const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyTurnstileToken, hasRequiredTurnstileConfig, SITEVERIFY_URL } = require('../server/utils/turnstile');

test('Turnstile validator accepts a matching action and hostname', async () => {
    let request;
    const fetchImpl = async (url, options) => {
        request = { url, options };
        return {
            ok: true,
            async json() {
                return {
                    success: true,
                    action: 'reservation_create',
                    hostname: 'halisaha-production.up.railway.app',
                    'error-codes': []
                };
            }
        };
    };

    const result = await verifyTurnstileToken({
        token: 'valid-token',
        remoteIp: '203.0.113.10',
        expectedAction: 'reservation_create',
        expectedHostname: 'halisaha-production.up.railway.app',
        secret: 'test-secret',
        fetchImpl
    });

    assert.equal(result.success, true);
    assert.equal(request.url, SITEVERIFY_URL);
    const body = JSON.parse(request.options.body);
    assert.equal(body.response, 'valid-token');
    assert.equal(body.remoteip, '203.0.113.10');
    assert.equal(typeof body.idempotency_key, 'string');
});

test('Turnstile validator rejects action and hostname mismatches', async () => {
    const result = await verifyTurnstileToken({
        token: 'valid-token',
        expectedAction: 'reservation_create',
        expectedHostname: 'halisaha-production.up.railway.app',
        secret: 'test-secret',
        fetchImpl: async () => ({
            ok: true,
            async json() {
                return { success: true, action: 'other_action', hostname: 'example.com', 'error-codes': [] };
            }
        })
    });

    assert.equal(result.success, false);
    assert.equal(result.unavailable, false);
    assert.deepEqual(result.errorCodes, ['action-mismatch', 'hostname-mismatch']);
});

test('Turnstile validator fails closed on network errors', async () => {
    const result = await verifyTurnstileToken({
        token: 'valid-token',
        secret: 'test-secret',
        fetchImpl: async () => { throw new Error('network down'); }
    });

    assert.equal(result.success, false);
    assert.equal(result.unavailable, true);
    assert.deepEqual(result.errorCodes, ['internal-error']);
});

test('Turnstile validator classifies Cloudflare internal errors as unavailable', async () => {
    const result = await verifyTurnstileToken({
        token: 'valid-token',
        secret: 'test-secret',
        fetchImpl: async () => ({
            ok: true,
            async json() {
                return { success: false, 'error-codes': ['internal-error'] };
            }
        })
    });

    assert.equal(result.success, false);
    assert.equal(result.unavailable, true);
});

test('Turnstile validator rejects malformed tokens without a network request', async () => {
    let called = false;
    const result = await verifyTurnstileToken({
        token: '',
        secret: 'test-secret',
        fetchImpl: async () => { called = true; }
    });

    assert.equal(result.success, false);
    assert.equal(result.unavailable, false);
    assert.equal(called, false);
});

test('production requires both Turnstile keys while local development does not', () => {
    assert.equal(hasRequiredTurnstileConfig({ NODE_ENV: 'production' }), false);
    assert.equal(hasRequiredTurnstileConfig({ NODE_ENV: 'production', TURNSTILE_SITEKEY: 'site', TURNSTILE_SECRET: 'secret' }), true);
    assert.equal(hasRequiredTurnstileConfig({ NODE_ENV: 'production', TURNSTILE_SITEKEY: 'site', TURNSTILE_SECRET_KEY: 'secret' }), true);
    assert.equal(hasRequiredTurnstileConfig({ NODE_ENV: 'development' }), true);
});
