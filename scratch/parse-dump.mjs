import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dumpPath = path.join(__dirname, '../dump.sql');
const content = fs.readFileSync(dumpPath, 'utf8');

const tables = [
  'venues',
  'venue_profile_revisions',
  'venue_spaces',
  'venue_space_capacity_layouts',
  'venue_space_amenities',
  'venue_space_event_types',
  'venue_media_collections',
  'venue_media_items',
  'venue_logistics',
  'venue_faqs',
  'package_venue_spaces',
  'packages',
];

const db = {};

// Very naive parser for COPY statements from pg_dump
// FORMAT:
// COPY public.venues (id, organization_id, name, slug, ...) FROM stdin;
// uuid1	uuid2	Hillcreek Gardens	hillcreek-gardens-tagaytay	...
// \.
let currentTable = null;
let currentCols = [];

content.split('\n').forEach(line => {
  if (line.startsWith('COPY public.')) {
    const match = line.match(/^COPY public\.([a-z0-9_]+) \(([^)]+)\) FROM stdin;/);
    if (match) {
      currentTable = match[1];
      currentCols = match[2].split(',').map(s => s.trim());
      if (!db[currentTable]) db[currentTable] = [];
      return;
    }
  }
  
  if (currentTable && line === '\\.') {
    currentTable = null;
    return;
  }
  
  if (currentTable) {
    const values = line.split('\t');
    const row = {};
    for (let i = 0; i < currentCols.length; i++) {
      row[currentCols[i]] = values[i] === '\\N' ? null : values[i];
    }
    db[currentTable].push(row);
  }
});

// find the venue IDs
const hillcreek = db.venues?.find(v => v.slug === 'hillcreek-gardens-tagaytay');
const amorita = db.venues?.find(v => v.slug === 'amorita-resort');

console.log("Hillcreek Venue ID:", hillcreek?.id);
console.log("Amorita Venue ID:", amorita?.id);

// extract rows for these venues
const extracted = {
  hillcreek: { venue: hillcreek },
  amorita: { venue: amorita }
};

for (const key of ['hillcreek', 'amorita']) {
  const v = extracted[key].venue;
  if (!v) continue;
  
  const id = v.id;
  
  extracted[key].revisions = db.venue_profile_revisions?.filter(r => r.venue_id === id);
  extracted[key].spaces = db.venue_spaces?.filter(s => s.venue_id === id);
  const spaceIds = extracted[key].spaces?.map(s => s.id) || [];
  
  extracted[key].capacities = db.venue_space_capacity_layouts?.filter(c => spaceIds.includes(c.space_id));
  extracted[key].amenities = db.venue_space_amenities?.filter(a => spaceIds.includes(a.space_id));
  extracted[key].eventTypes = db.venue_space_event_types?.filter(e => spaceIds.includes(e.space_id));
  
  extracted[key].mediaCollections = db.venue_media_collections?.filter(m => m.venue_id === id);
  extracted[key].mediaItems = db.venue_media_items?.filter(m => m.venue_id === id);
  
  extracted[key].logistics = db.venue_logistics?.filter(l => l.venue_id === id);
  extracted[key].faqs = db.venue_faqs?.filter(f => f.venue_id === id);
  extracted[key].packageSpaces = db.package_venue_spaces?.filter(p => p.venue_id === id);
}

fs.writeFileSync(path.join(__dirname, 'extracted_dump.json'), JSON.stringify(extracted, null, 2));
console.log("Wrote extracted_dump.json");
