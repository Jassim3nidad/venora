import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '../apps/web/src/data/venues.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const hillcreek = data.find(v => v.slug === 'hillcreek-gardens-tagaytay');
const amorita = data.find(v => v.slug === 'amorita-resort');

console.log("Hillcreek found:", !!hillcreek);
console.log("Amorita found:", !!amorita);

fs.writeFileSync(path.join(__dirname, 'hillcreek.json'), JSON.stringify(hillcreek, null, 2));
fs.writeFileSync(path.join(__dirname, 'amorita.json'), JSON.stringify(amorita, null, 2));
