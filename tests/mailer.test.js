const test = require('node:test');
const assert = require('node:assert/strict');
const { sendVerificationEmail } = require('../server/utils/mailer');

test('verification mailer preserves Brevo status without exposing payload data', async () => {
    const previous = {
        BREVO_API_KEY: process.env.BREVO_API_KEY,
        MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL,
        MAIL_FROM_NAME: process.env.MAIL_FROM_NAME
    };
    process.env.BREVO_API_KEY = 'test-key';
    process.env.MAIL_FROM_EMAIL = 'sender@example.com';
    process.env.MAIL_FROM_NAME = 'KSK';

    try {
        await assert.rejects(
            sendVerificationEmail({
                to: 'user@example.com',
                token: 'secret-token',
                baseUrl: 'https://example.com',
                fetchImpl: async () => ({
                    ok: false,
                    status: 400,
                    json: async () => ({ code: 'invalid_sender' })
                })
            }),
            (err) => {
                assert.equal(err.code, 'MAIL_PROVIDER_ERROR');
                assert.equal(err.providerStatus, 400);
                assert.equal(err.providerCode, 'invalid_sender');
                assert.doesNotMatch(err.message, /secret-token|user@example\.com/);
                return true;
            }
        );
    } finally {
        restoreEnv('BREVO_API_KEY', previous.BREVO_API_KEY);
        restoreEnv('MAIL_FROM_EMAIL', previous.MAIL_FROM_EMAIL);
        restoreEnv('MAIL_FROM_NAME', previous.MAIL_FROM_NAME);
    }
});

function restoreEnv(name, value) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
}
