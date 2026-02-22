const fs = require('fs');
const path = require('path');

const esvKey = process.env.ESV_API_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';

console.log('ESV_API_KEY:', esvKey ? 'SET (' + esvKey.length + ' chars)' : 'EMPTY');
console.log('OPENAI_API_KEY:', openaiKey ? 'SET (' + openaiKey.length + ' chars)' : 'EMPTY');

let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/ESV_API_KEY_PLACEHOLDER/g, esvKey);
html = html.replace(/OPENAI_API_KEY_PLACEHOLDER/g, openaiKey);

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);

console.log('Built successfully');
