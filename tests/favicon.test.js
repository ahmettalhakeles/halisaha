const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const pages = ['index.html', 'isletme.html', 'yonetici.html', 'payment-share.html'];

test('all public entry pages use the football favicon', () => {
    for (const page of pages) {
        const html = fs.readFileSync(path.join(publicDir, page), 'utf8');
        assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
    }
});

test('football favicon is a valid standalone SVG asset', () => {
    const svg = fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64">/);
    assert.match(svg, /#10b981/);
    assert.match(svg, /<\/svg>\s*$/);
});
