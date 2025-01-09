const path = require('path');
const { PAGES_PATH } = require('./constant');

const ts = ['Background', 'Content', 'Devtools'].reduce((prev, item) => {
  prev[item.toLowerCase()] = path.join(PAGES_PATH, item, 'index.ts');
  return prev;
}, {});

const tsx = ['Newtab', 'Options', 'Panel', 'Popup'].reduce((prev, item) => {
  prev[item.toLowerCase()] = path.join(PAGES_PATH, item, 'index.tsx');
  return prev;
}, {});

module.exports = { ...ts, ...tsx };
