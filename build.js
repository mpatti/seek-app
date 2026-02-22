const fs = require('fs');
const path = require('path');

const esvKey = process.env.ESV_API_KEY || '';

let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/ESV_API_KEY_PLACEHOLDER/g, esvKey);

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);

console.log('Built successfully');
