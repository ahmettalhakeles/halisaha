const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');

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
