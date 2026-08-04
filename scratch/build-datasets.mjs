import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildHillcreek() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'hillcreek.json'), 'utf8'));
  
  const spaces = [
    {
      spaceKey: "grand-ballroom",
      name: "Grand Ballroom",
      slug: "grand-ballroom",
      spaceType: "banquet_hall",
      setting: "indoor",
      capacityMax: 700,
      displayOrder: 0
    },
    {
      spaceKey: "the-pavilion",
      name: "The Pavilion",
      slug: "the-pavilion",
      spaceType: "event_pavilion",
      setting: "indoor",
      capacityMax: 700,
      displayOrder: 1
    },
    {
      spaceKey: "garden-ceremony-area",
      name: "Garden Ceremony Area",
      slug: "garden-ceremony-area",
      spaceType: "garden",
      setting: "outdoor",
      capacityMax: 700,
      displayOrder: 2
    }
  ];

  const dataset = {
    schemaVersion: "1.0",
    venueSlug: data.slug,
    displayName: data.name,
    contentSourceNotes: "Extracted from previously approved venues.json.",
    spaces,
    capacities: spaces.map(s => ({
      spaceKey: s.spaceKey,
      layout: "banquet",
      capacity: 700,
      displayOrder: 0
    })),
    amenities: spaces.flatMap(s => 
      data.amenities.map(a => ({
        spaceKey: s.spaceKey,
        amenityName: a
      }))
    ),
    eventTypes: spaces.flatMap(s => 
      data.event_types_supported.map(e => ({
        spaceKey: s.spaceKey,
        eventTypeName: e
      }))
    ),
    mediaCollections: [
      {
        collectionKey: "main-gallery",
        title: "Main Gallery",
        collectionType: "venue_gallery",
        isCover: true,
        displayOrder: 0
      }
    ],
    mediaItems: data.photos.image_urls.map((url, i) => ({
      collectionKey: "main-gallery",
      storagePath: url,
      mediaType: "image",
      altText: `${data.name} photo ${i + 1}`,
      isFeatured: i === 0,
      displayOrder: i
    })),
    logistics: {
      parkingCapacity: null,
      parkingNotes: "Available on-site — exact vehicle count not publicly listed",
      noiseRestrictions: "Standard local noise ordinance hours apply",
      curfewTime: "00:00"
    },
    faqs: [],
    packageSpaces: data.packages.flatMap(pkg => 
      spaces.map(s => ({
        packageName: pkg.name,
        spaceKey: s.spaceKey,
        inclusionType: "primary"
      }))
    )
  };
  return dataset;
}

function buildAmorita() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'amorita.json'), 'utf8'));
  
  const spaces = [
    {
      spaceKey: "cliff-deck",
      name: "Cliff Deck",
      slug: "cliff-deck",
      spaceType: "viewing_deck",
      setting: "outdoor",
      capacityMax: 150,
      displayOrder: 0
    },
    {
      spaceKey: "poolside",
      name: "Poolside Area",
      slug: "poolside-area",
      spaceType: "poolside",
      setting: "outdoor",
      capacityMax: 150,
      displayOrder: 1
    }
  ];

  const dataset = {
    schemaVersion: "1.0",
    venueSlug: data.slug,
    displayName: data.name,
    contentSourceNotes: "Extracted from previously approved venues.json.",
    spaces,
    capacities: spaces.map(s => ({
      spaceKey: s.spaceKey,
      layout: "banquet",
      capacity: 150,
      displayOrder: 0
    })),
    amenities: spaces.flatMap(s => 
      data.amenities.map(a => ({
        spaceKey: s.spaceKey,
        amenityName: a
      }))
    ),
    eventTypes: spaces.flatMap(s => 
      data.event_types_supported.map(e => ({
        spaceKey: s.spaceKey,
        eventTypeName: e
      }))
    ),
    mediaCollections: [
      {
        collectionKey: "main-gallery",
        title: "Main Gallery",
        collectionType: "venue_gallery",
        isCover: true,
        displayOrder: 0
      }
    ],
    mediaItems: data.photos.image_urls.map((url, i) => ({
      collectionKey: "main-gallery",
      storagePath: url,
      mediaType: "image",
      altText: `${data.name} photo ${i + 1}`,
      isFeatured: i === 0,
      displayOrder: i
    })),
    logistics: {
      parkingCapacity: null,
      parkingNotes: "Available on-site — exact vehicle count not publicly listed",
      noiseRestrictions: "Standard local noise ordinance hours apply",
      curfewTime: "00:00"
    },
    faqs: [],
    packageSpaces: data.packages.flatMap(pkg => 
      spaces.map(s => ({
        packageName: pkg.name,
        spaceKey: s.spaceKey,
        inclusionType: "primary"
      }))
    )
  };
  return dataset;
}

const outDir = path.join(__dirname, '../data/venues');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'hillcreek-gardens-tagaytay.structured.json'), JSON.stringify(buildHillcreek(), null, 2));
fs.writeFileSync(path.join(outDir, 'amorita-resort.structured.json'), JSON.stringify(buildAmorita(), null, 2));
console.log("Generated datasets.");
