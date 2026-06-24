const fs = require('fs');
let content = fs.readFileSync('script.js', 'utf8');

content = content.replace(/\\\`<button/g, "'<button");
content = content.replace(/<\/button>\\\`/g, "</button>'");

fs.writeFileSync('script.js', content, 'utf8');
