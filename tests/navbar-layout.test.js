const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const businessHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'isletme.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'yonetici.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');
const styleMinCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.min.css'), 'utf8');

test('signed-in navbar places welcome text below the profile and logout actions', () => {
    const logoutSection = indexHtml.match(/<div id="userLogoutSection"[\s\S]*?<\/div>\s*<span id="welcomeText" class="welcome-text"><\/span>\s*<\/div>/);

    assert.ok(logoutSection, 'signed-in actions should be grouped before the welcome text');
    assert.match(logoutSection[0], /class="user-session-actions"/);
    assert.match(styleCss, /#userLogoutSection\s*\{[\s\S]*?flex-direction:\s*column/);
    assert.match(styleCss, /\.welcome-text\s*\{[\s\S]*?text-overflow:\s*ellipsis/);
});

test('own locked reservation slot uses the red occupied state', () => {
    assert.match(styleCss, /\.hour-btn\.locked\.my-own-slot\s*\{[\s\S]*?rgba\(127,\s*29,\s*29,\s*0\.4\)/);
    assert.match(styleCss, /\.hour-btn\.locked\.my-own-slot\s*\{[\s\S]*?color:\s*#fca5a5/);
});

test('all main entry pages request the current minified stylesheet version', () => {
    for (const html of [indexHtml, businessHtml, adminHtml]) {
        assert.match(html, /style\.min\.css\?v=1\.1\.11/);
    }
});

test('mobile stylesheet disables heavy glow and blur effects on Android-class screens', () => {
    assert.match(styleCss, /Android\/mobile performance guard/);
    assert.match(styleCss, /@media \(max-width: 768px\), \(hover: none\) and \(pointer: coarse\)/);
    assert.match(styleCss, /backdrop-filter:\s*none !important/);
    assert.match(styleCss, /box-shadow:\s*none !important/);
    assert.match(styleCss, /\.field-card::before\s*\{[\s\S]*?content:\s*none !important/);
    assert.match(styleMinCss, /backdrop-filter:none!important/);
    assert.match(styleMinCss, /box-shadow:none!important/);
});
