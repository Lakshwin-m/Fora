const fs = require('fs');
const file = 'src/components/capsule-multistep-form.tsx';
let text = fs.readFileSync(file, 'utf8');
const regex = /<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>>[^\n]*\n/g;
text = text.replace(regex, '$1');
fs.writeFileSync(file, text);
console.log('Fixed capsule-multistep-form.tsx');
