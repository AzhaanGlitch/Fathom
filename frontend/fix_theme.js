const fs = require('fs');
const path = require('path');

const directories = [
  'd:/Full Stack Projects/Fathom/frontend/src/pages/Dashboard',
  'd:/Full Stack Projects/Fathom/frontend/src/layouts'
];

const replacements = [
  { p: /bg-\[\#0a0a0a\]/g, r: 'bg-gray-50 dark:bg-[#0a0a0a]' },
  { p: /bg-\[\#111111\]/g, r: 'bg-white dark:bg-[#111111]' },
  { p: /\btext-white\b/g, r: 'text-gray-900 dark:text-white' },
  { p: /\btext-gray-300\b/g, r: 'text-gray-700 dark:text-gray-300' },
  { p: /\btext-gray-400\b/g, r: 'text-gray-600 dark:text-gray-400' },
  { p: /border-white\/10/g, r: 'border-gray-200 dark:border-white/10' },
  { p: /border-white\/20/g, r: 'border-gray-300 dark:border-white/20' },
  { p: /bg-white\/5/g, r: 'bg-gray-100 dark:bg-white/5' },
  { p: /bg-white\/10/g, r: 'bg-gray-200 dark:bg-white/10' },
  { p: /hover:bg-white\/10/g, r: 'hover:bg-gray-200 dark:hover:bg-white/10' },
  { p: /hover:bg-white\/20/g, r: 'hover:bg-gray-300 dark:hover:bg-white/20' },
  { p: /hover:text-white/g, r: 'hover:text-gray-900 dark:hover:text-white' },
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      const original = content;
      replacements.forEach(({p, r}) => {
        content = content.replace(p, r);
      });
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Updated ' + file);
      }
    }
  });
});
