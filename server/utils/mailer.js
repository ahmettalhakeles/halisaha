const DEFAULT_TIMEOUT_MS = 8000;

async function sendVerificationEmail({ to, token, baseUrl, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    const apiKey = String(process.env.BREVO_API_KEY || '').trim();
    const fromEmail = String(process.env.MAIL_FROM_EMAIL || '').trim();
    const fromName = String(process.env.MAIL_FROM_NAME || 'KSK').trim();
    if (!apiKey || !fromEmail) {
        const err = new Error('Mail configuration missing');
        err.code = 'MAIL_CONFIG_MISSING';
        throw err;
    }

    const verifyUrl = `${String(baseUrl || '').replace(/\/+$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'content-type': 'application/json',
                accept: 'application/json'
            },
            body: JSON.stringify({
                sender: { email: fromEmail, name: fromName },
                to: [{ email: to }],
                subject: 'KSK e-posta dogrulama',
                htmlContent: [
                    '<p>KSK hesabini tamamlamak icin e-posta adresini dogrula.</p>',
                    `<p><a href="${escapeHtml(verifyUrl)}">E-postami dogrula</a></p>`,
                    '<p>Bu baglanti 30 dakika gecerlidir.</p>'
                ].join('')
            }),
            signal: controller.signal
        });
        if (!response.ok) {
            const err = new Error(`Brevo HTTP ${response.status}`);
            err.code = 'MAIL_PROVIDER_ERROR';
            throw err;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            const err = new Error('Mail provider timeout');
            err.code = 'MAIL_TIMEOUT';
            throw err;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = { sendVerificationEmail };
