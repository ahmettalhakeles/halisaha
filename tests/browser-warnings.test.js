const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const businessHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'isletme.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'yonetici.html'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'script.js'), 'utf8');
const scriptMinJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'script.min.js'), 'utf8');

test('password and simulated card fields have form and autocomplete semantics', () => {
    assert.match(indexHtml, /<form id="userLoginForm"[\s\S]*?id="loginPassword"[^>]*autocomplete="current-password"[\s\S]*?<\/form>/);
    assert.match(indexHtml, /id="regPassword"[^>]*autocomplete="new-password"/);
    assert.match(indexHtml, /<form id="paymentSimulationForm"[\s\S]*?id="simCardCvv"[^>]*autocomplete="cc-csc"[\s\S]*?<\/form>/);
    assert.match(indexHtml, /id="simCardNumber"[^>]*autocomplete="cc-number"/);
    assert.match(indexHtml, /id="simCardExpiry"[^>]*autocomplete="cc-exp"/);
});

test('Turnstile uses explicit Turkish configuration and clears stale tokens', () => {
    assert.match(scriptJs, /language:\s*'tr'/);
    assert.match(scriptJs, /'error-callback':\s*onTurnstileError/);
    assert.match(scriptJs, /'expired-callback':\s*onTurnstileExpired/);
    assert.match(scriptJs, /'timeout-callback':\s*onTurnstileExpired/);
    assert.match(scriptJs, /function renderTurnstileWidget[\s\S]*?latestTurnstileToken = ""[\s\S]*?turnstile\.reset/);
    assert.match(scriptJs, /function onTurnstileError[\s\S]*?latestTurnstileToken = ""/);
    assert.match(scriptJs, /function onTurnstileExpired[\s\S]*?latestTurnstileToken = ""/);
});

test('minified Turnstile output stays synchronized with the source configuration', () => {
    assert.match(scriptMinJs, /language:"tr"/);
    assert.match(scriptMinJs, /"error-callback":/);
    assert.match(scriptMinJs, /"expired-callback":/);
    assert.match(scriptMinJs, /"timeout-callback":/);
});

test('all main entry pages request the current minified script version', () => {
    for (const html of [indexHtml, businessHtml, adminHtml]) {
        assert.match(html, /script\.min\.js\?v=1\.2\.2/);
    }
});

test('reservation past check uses slot rollover instead of early-hour day bump', () => {
    assert.match(scriptJs, /if \(endDate <= startDate\) \{\s*endDate\.setDate\(endDate\.getDate\(\) \+ 1\);/);
    assert.doesNotMatch(scriptJs, /If end hour is past midnight[\s\S]*?if \(h < 6\)/);
    assert.match(scriptJs, /if \(isReservationPast\(r\)\) \{/);
    assert.match(scriptJs, /!isReservationPast\(r\)/);
});
