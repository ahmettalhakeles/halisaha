const fs = require('fs');
const path = require('path');

async function runMinify() {
    console.log('Minifying script.js and style.css...');
    const publicPath = path.join(__dirname, '..', 'public');
    
    try {
        const CleanCSS = require('clean-css');
        const { minify } = require('terser');

        // Minify CSS
        const cssPath = path.join(publicPath, 'style.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        const cssMin = new CleanCSS().minify(cssContent).styles;
        fs.writeFileSync(path.join(publicPath, 'style.min.css'), cssMin);
        console.log('CSS Minification complete.');

        // Minify JS
        const jsPath = path.join(publicPath, 'script.js');
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        const jsMin = await minify(jsContent);
        fs.writeFileSync(path.join(publicPath, 'script.min.js'), jsMin.code);
        console.log('JS Minification complete.');

    } catch (err) {
        console.warn('Minification failed, using fallback regex-based minifier:', err.message);
        // Fallback simple regex-based minifier to avoid crash if packages are not installed
        try {
            const cssPath = path.join(publicPath, 'style.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            const cssMin = cssContent
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\s*([\{\}:;,])\s*/g, '$1')
                .replace(/\s+/g, ' ')
                .trim();
            fs.writeFileSync(path.join(publicPath, 'style.min.css'), cssMin);

            const jsPath = path.join(publicPath, 'script.js');
            const jsContent = fs.readFileSync(jsPath, 'utf8');
            // Safe fallback: copy original script.js as script.min.js to avoid breaking syntax/URLs
            fs.writeFileSync(path.join(publicPath, 'script.min.js'), jsContent);
            console.log('Fallback copy minification completed.');
        } catch (fallbackErr) {
            console.error('Fallback minification failed:', fallbackErr.message);
        }
    }
}

module.exports = { runMinify };
