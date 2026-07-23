const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const businessHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'isletme.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'yonetici.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');
const styleMinCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.min.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'script.js'), 'utf8');
const scriptMinJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'script.min.js'), 'utf8');
const modularJs = ['bootstrap.js', 'match.js', 'reservations.js']
    .map(file => fs.readFileSync(path.join(__dirname, '..', 'public', 'js', file), 'utf8'))
    .join('\n');

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
        assert.match(html, /style\.min\.css\?v=1\.1\.14/);
        assert.match(html, /script\.min\.js\?v=1\.3\.0/);
    }
});

test('mobile stylesheet disables heavy glow and blur effects on Android-class screens', () => {
    assert.match(styleCss, /Android\/mobile performance guard/);
    assert.match(styleCss, /@media \(max-width: 900px\), \(hover: none\) and \(pointer: coarse\)/);
    assert.match(styleCss, /\*::after\s*\{[\s\S]*?animation:\s*none !important/);
    assert.match(styleCss, /\*::after\s*\{[\s\S]*?transition-property:\s*none !important/);
    assert.match(styleCss, /\*::after\s*\{[\s\S]*?backdrop-filter:\s*none !important/);
    assert.match(styleCss, /\*::after\s*\{[\s\S]*?box-shadow:\s*none !important/);
    assert.match(styleCss, /\.field-card::before\s*\{[\s\S]*?content:\s*none !important/);
    assert.match(styleCss, /height:\s*100dvh/);
    assert.match(styleCss, /\.btn-loading-spinner\s*\{[\s\S]*?animation:\s*spin 1s linear infinite !important/);
    assert.match(styleCss, /\.kontrol-spinner\s*\{[\s\S]*?animation:\s*kontrol-spin 0\.8s linear infinite !important/);
    assert.match(styleCss, /\.header-actions\s*\{[\s\S]*?transition:\s*transform 0\.22s ease-out !important/);
    assert.match(styleCss, /\.header-actions\s*\{[\s\S]*?overflow-x:\s*hidden !important/);
    assert.match(styleCss, /\.mobile-menu-overlay\s*\{[\s\S]*?transition:\s*opacity 0\.18s ease !important/);
    assert.match(styleCss, /\.modal-overlay\.open \.modal-card,[\s\S]*?animation:\s*mobile-surface-enter 0\.2s ease-out both !important/);
    assert.match(styleCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition:\s*none !important/);
    assert.match(styleMinCss, /backdrop-filter:none!important/);
    assert.match(styleMinCss, /box-shadow:none!important/);
});

test('tablet layout uses one shared 900px JavaScript breakpoint', () => {
    assert.match(scriptJs, /const MOBILE_BREAKPOINT = 900/);
    assert.match(scriptJs, /function isMobileViewport\(\)/);
    assert.doesNotMatch(scriptJs, /window\.innerWidth[^\n]*768/);
    assert.doesNotMatch(modularJs, /window\.innerWidth[^\n]*768/);
    assert.match(scriptMinJs, /MOBILE_BREAKPOINT=900/);
});

test('business and admin drawers use compositor motion without restoring blur', () => {
    for (const html of [businessHtml, adminHtml]) {
        assert.match(html, /\.header-actions\s*\{[\s\S]*?height:\s*100dvh !important/);
        assert.match(html, /\.header-actions\s*\{[\s\S]*?backdrop-filter:\s*none !important/);
        assert.match(html, /\.header-actions\s*\{[\s\S]*?transform:\s*translateX\(-100%\) !important/);
        assert.match(html, /\.header-actions\s*\{[\s\S]*?transition:\s*transform 0\.22s ease-out !important/);
        assert.match(html, /\.header-actions\s*\{[\s\S]*?overflow-x:\s*hidden !important/);
        assert.match(html, /\.header-actions\.open\s*\{[\s\S]*?transform:\s*translateX\(0\) !important/);
        assert.match(html, /\.header-actions\s*\{[\s\S]*?box-shadow:\s*none !important/);
        assert.match(html, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.header-actions,\s*\.mobile-menu-overlay\s*\{[\s\S]*?transition:\s*none !important/);
    }
});

test('all entry pages declare the native dark color scheme', () => {
    for (const html of [indexHtml, businessHtml, adminHtml]) {
        assert.match(html, /<meta name="color-scheme" content="dark">/);
        assert.match(html, /<meta name="theme-color" content="#0b0f19">/);
    }
    assert.match(styleCss, /:root\s*\{[\s\S]*?color-scheme:\s*dark/);
});
