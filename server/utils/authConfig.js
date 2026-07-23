function isGoogleAuthEnabled() {
    return process.env.GOOGLE_AUTH_ENABLED === 'true';
}

function isEmailVerificationRequired() {
    return process.env.EMAIL_VERIFICATION_REQUIRED === 'true';
}

function getGoogleClientId() {
    return String(process.env.GOOGLE_CLIENT_ID || '').trim();
}

function getAppBaseUrl(req) {
    const configured = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
    if (configured) return configured;
    if (req) return `${req.protocol}://${req.get('host')}`;
    return 'http://localhost:5000';
}

function validateOptionalIntegrations() {
    if (isGoogleAuthEnabled() && !getGoogleClientId()) {
        throw new Error('GOOGLE_AUTH_ENABLED=true ancak GOOGLE_CLIENT_ID tanimli degil.');
    }
    if (isEmailVerificationRequired()) {
        const missing = ['BREVO_API_KEY', 'MAIL_FROM_EMAIL', 'MAIL_FROM_NAME']
            .filter((key) => !String(process.env[key] || '').trim());
        if (missing.length > 0) {
            throw new Error(`EMAIL_VERIFICATION_REQUIRED=true ancak eksik mail ayari var: ${missing.join(', ')}`);
        }
    }
}

module.exports = {
    isGoogleAuthEnabled,
    isEmailVerificationRequired,
    getGoogleClientId,
    getAppBaseUrl,
    validateOptionalIntegrations
};
