# Supabase Storage

Four buckets are confirmed in migrations.

| Bucket              | Visibility | Limits/types                                | Path convention                                    | Read/write policy                                                                                                                 |
| ------------------- | ---------- | ------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `venue-images`      | Public     | 50 MB; JPEG, PNG, WebP, GIF, MP4, QuickTime | Intended `{organization_id}/{venue_id}/{filename}` | Public read. Authenticated venue owner/coordinator/admin may insert/update/delete; current policy checks role, not path ownership |
| `avatars`           | Public     | 5 MB; JPEG, PNG, WebP                       | `{user_id}/{filename}`                             | Public read. Authenticated user may insert/update/delete only when first path segment equals `auth.uid()`                         |
| `verification-docs` | Private    | 20 MB; PDF, PNG, JPEG                       | `{user_id}/{role}/{uuid.ext}`                      | Applicant reads own; admin reads any. Insert/update/delete only in own folder while no pending/approved/denied application exists |
| `review-photos`     | Public     | 10 MB; JPEG, PNG, WebP                      | `{customer_id}/{review_or_upload_id}/{filename}`   | Public read. Authenticated user inserts/deletes under own first segment; admin may delete                                         |

Public bucket URLs are permanent public resource locations. Private verification documents use short-lived signed URLs only.

## Avatar workflow

1. Client validates/selects image and uploads directly to `avatars/{user_id}/...` with authenticated Supabase client.
2. Bucket MIME/size and storage RLS apply.
3. Client derives public URL and calls `updateAvatarAction({avatarUrl,storagePath})`.
4. Action verifies session/path ownership, updates `profiles.avatar_url`, and removes previous avatar object.
5. On action failure, client removes newly uploaded object.

`removeAvatarAction` clears profile value and removes the previous owned object. Repeating removal is harmless.

Supplier profile/hero image UI also uses the public `avatars` bucket. This shares avatar MIME/size/path rules; supplier profile action stores the public URL.

## Verification-document signed upload

### Generate URLs

`generateVerificationUploadUrlsAction(role, files)` requires a session and rejects users whose application status is `pending`, `approved`, or `denied`.

Per request:

- 1-10 files;
- each file >0 and <=20 MB;
- allowed exact MIME/extension pairs: PDF/`.pdf`, PNG/`.png`, JPEG/`.jpg|.jpeg`;
- generated path `{user_id}/{role}/{random_uuid}.{ext}`;
- output contains `path`, opaque upload `token`, signed upload URL, and original descriptor.

Example result:

```json
{
  "success": true,
  "payloads": [
    {
      "path": "00000000-0000-4000-8000-000000000001/supplier/00000000-0000-4000-8000-000000000002.pdf",
      "token": "<opaque-upload-token>",
      "signedUrl": "<short-lived-signed-upload-url>",
      "fileInfo": {
        "name": "registration.pdf",
        "type": "application/pdf",
        "size": 12345
      }
    }
  ]
}
```

Do not persist or log token/signed URL. Client uploads bytes through Supabase signed upload API.

### Finalize

`finalizeVerificationUploadAction(paths)`:

1. requires session;
2. requires every path prefix to match current user;
3. lists exact object in its folder;
4. rechecks object exists, size <=20 MB, and stored MIME is allowed;
5. removes invalid object and returns failure.

Then `submitPartnerApplicationAction` stores verified path strings in `partner_applications.documents_json`. Database RLS blocks later modification while submitted.

### Admin read

`getVerificationDocumentUrlAction(path)` allows the path owner or admin (`is_admin`) and creates a signed read URL valid for 10 minutes. The bucket itself remains private.

## Review-photo workflow

1. Authenticated client validates up to five image files in UI and uploads to `review-photos/{user_id}/{folder_id}/{uuid}-{filename}`.
2. Client gets public URLs.
3. `attachReviewPhotosAction` verifies current user owns the review and total attached photos will not exceed five, then inserts `review_photos` rows.
4. `deleteReviewPhotoAction` verifies review ownership, removes storage object, deletes DB row.

Bucket limit is 10 MB per object; UI validation should remain at or below the bucket limit. A failed DB attachment after successful upload can leave an orphan object; callers should clean up uploaded objects when action attachment fails.

## Venue media workflow

Venue UI uploads/removes objects in `venue-images` and maintains `venue_images` metadata rows. Images/videos are publicly readable. Route-local venue create/edit actions manage venue/package/amenity metadata and media associations.

Security risk: current final insert policy verifies only role (`venue_owner`, coordinator, admin), not that `{organization_id}/{venue_id}` belongs to caller. Update/delete policies are similarly role-wide. Application UI narrows normal paths, but storage RLS should enforce organization/venue ownership directly to prevent cross-tenant object modification.

## Direct Supabase examples

Public URL retrieval:

```ts
const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
```

Private signed read URL must stay server-side:

```ts
const { data } = await supabase.storage
  .from("verification-docs")
  .createSignedUrl(path, 10 * 60);
```

## Error and retry behavior

Storage SDK errors are not HTTP application envelopes. Server Actions map them to `{success:false,error}` or `VenoraError` results.

- Signed URL generation is safe to retry; each retry may issue a different token.
- Direct uploads should use unique paths; retrying the same path without explicit upsert can conflict.
- Metadata action failure after upload requires object cleanup.
- Delete is effectively idempotent when missing-object results are treated as already removed.

## RLS and deployment checks

- Confirm live bucket visibility, size, MIME settings, and policies after migrations.
- Confirm `verification-docs` never becomes public.
- Confirm first path segment is canonical authenticated UUID.
- Validate content by stored MIME and, for high-risk documents, consider magic-byte inspection/malware scanning; current code validates declared/stored MIME and extension, not file contents.
- Never use service-role storage operations in browsers.
