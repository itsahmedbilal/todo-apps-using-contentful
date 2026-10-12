// Deletes the runtime data file so the next `npm start` copies db.seed.json again.
const fs = require('node:fs');
const path = require('node:path');

const runtimePath = path.join(__dirname, '..', 'db.runtime.json');
const existed = fs.existsSync(runtimePath);
fs.rmSync(runtimePath, { force: true });
console.log(existed ? 'Deleted db.runtime.json. The next start reseeds from db.seed.json.' : 'Nothing to reset.');
