import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dumpPath = path.join(__dirname, '../dump.sql');
const content = fs.readFileSync(dumpPath, 'utf8');

const spacesMatch = content.match(/venue_spaces/i);
console.log("Has venue_spaces?", !!spacesMatch);
if (spacesMatch) {
  const index = spacesMatch.index;
  console.log(content.substring(index - 50, index + 200));
}
