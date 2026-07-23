let OAuth2Client;

async function verifyGoogleCredential({ credential, audience, verifier }) {
    if (verifier) return verifier({ credential, audience });
    if (!OAuth2Client) {
        ({ OAuth2Client } = require('google-auth-library'));
    }
    const client = new OAuth2Client(audience);
    const ticket = await client.verifyIdToken({ idToken: credential, audience });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Google payload missing');
    if (!payload.sub) throw new Error('Google subject missing');
    if (payload.email_verified !== true && payload.email_verified !== 'true') {
        const err = new Error('Google email not verified');
        err.code = 'GOOGLE_EMAIL_NOT_VERIFIED';
        throw err;
    }
    return {
        sub: payload.sub,
        email: String(payload.email || '').trim().toLowerCase(),
        emailVerified: true,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        name: payload.name || ''
    };
}

module.exports = { verifyGoogleCredential };
