const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serverIndex = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');

function directiveValues(name) {
    const match = serverIndex.match(new RegExp(`${name}: \\[([^\\]]+)\\]`));
    assert.ok(match, `${name} directive should exist`);
    return [...match[1].matchAll(/"([^"]+)"/g)].map(([, value]) => value);
}

test('Turnstile CSP permits script, frame and challenge network requests', () => {
    assert.ok(directiveValues('scriptSrc').includes('https://challenges.cloudflare.com'));
    assert.ok(directiveValues('frameSrc').includes('https://challenges.cloudflare.com'));
    assert.ok(directiveValues('connectSrc').includes('https://challenges.cloudflare.com'));
});

test('CSP keeps weather requests server-side', () => {
    assert.equal(directiveValues('connectSrc').includes('https://api.open-meteo.com'), false);
    assert.match(serverIndex, /app\.get\('\/api\/weather'/);
});
