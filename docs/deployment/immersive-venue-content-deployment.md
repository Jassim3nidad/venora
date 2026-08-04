# Immersive Venue Content Deployment

This document outlines the procedure for deploying structured content for the Immersive Venue Experience, focusing on Hillcreek Gardens Tagaytay and Amorita Resort.

## Datasets
The datasets for Hillcreek Gardens Tagaytay and Amorita Resort have been generated and exist in `data/venues/`. These JSON datasets represent the currently approved content, incorporating venue spaces, capacities, amenities, event types, media, packages, and logistics based on the unstructured `venues.json` snapshots.

## Importer Tool
Use `scripts/import-immersive-venue-content.mjs` to import the JSON datasets. It automatically resolves foreign keys using stable slug matching.

### Dry-Run Verification
Always run in `--dry-run` mode first to preview changes.
```bash
node scripts/import-immersive-venue-content.mjs data/venues/hillcreek-gardens-tagaytay.structured.json --dry-run
```

### Apply Changes
After verifying the dry-run, apply the changes to the database:
```bash
node scripts/import-immersive-venue-content.mjs data/venues/hillcreek-gardens-tagaytay.structured.json --apply
```

## Backup & Rollback (Export) Tool
Use `scripts/export-immersive-venue-content.mjs` to backup the existing structured data before applying new datasets.
```bash
node scripts/export-immersive-venue-content.mjs hillcreek-gardens-tagaytay
```
The export is saved to `data/venues/<slug>.backup.json`. In case of a rollback, you can import this backup file using the importer script.

## Notes & Rules
- Do NOT directly copy the entire local database.
- Do NOT apply against staging or production environments manually.
- The datasets only include venue content and do not include user/auth tables.
- Media items only point to URLs that abide by the storage rules (e.g. no local urls, public website sources only).
