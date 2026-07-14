# Storage and Uploads

Venora uses four Supabase Storage buckets. HTTP and Server Action details remain
authoritative in [API Storage workflows](api/storage.md).

| Bucket              | Visibility | Limit / accepted metadata                   | Intended content                                   |
| ------------------- | ---------- | ------------------------------------------- | -------------------------------------------------- |
| `venue-images`      | Public     | 50 MB; JPEG, PNG, WebP, GIF, MP4, QuickTime | Venue gallery media                                |
| `avatars`           | Public     | 5 MB; JPEG, PNG, WebP                       | User avatars and current supplier portfolio assets |
| `verification-docs` | Private    | 20 MB; PDF, PNG, JPEG                       | Partner verification documents via signed access   |
| `review-photos`     | Public     | 10 MB; supported image types                | Review evidence/photos                             |

Paths should begin with the authenticated user's or owning resource's stable ID
where the policy expects it. Filenames must be normalized/generated, not trusted
for authorization or content type. Public URLs are permanent/readable by anyone
with the URL; private objects require a short-lived signed URL. Never turn a
private document into a public URL to solve an access error.

Uploads authenticate the user, validate role/ownership/admin permission, check
bucket/path, file size and allowed MIME/extension, then upload directly or via a
signed authorization. Cleanup should remove replaced/orphaned objects only after
the database update succeeds and ownership is reconfirmed.

Current validation does not inspect file magic bytes. MIME and extension can be
spoofed, so malware/content scanning and magic-byte validation remain security
work. The `venue-images` policies are also broader by role than ideal path-level
ownership; do not assume complete tenant isolation without runtime tests.

## Troubleshooting

| Symptom                  | Confirm                                                     | Safe response                                                                    |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Permission denied        | Session, bucket, object path, owner ID, role/status, policy | Correct identity/path/policy through migration; never use public write           |
| Wrong folder             | Compare path prefix with policy and owner                   | Move/re-upload only after ownership review; update database reference atomically |
| Missing bucket           | Check migration application and bucket metadata             | Apply approved migration to intended environment                                 |
| Expired signed URL       | Check creation/expiry timestamp                             | Issue a new short-lived URL after reauthorization                                |
| Invalid MIME or size     | Inspect client metadata and actual file                     | Reject/convert client-side; do not loosen policy globally                        |
| Admin denied             | Resolve actual admin permission, not generic role           | Assign approved permission or correct server guard                               |
| Public/private confusion | Inspect bucket `public` flag and URL type                   | Use public URL only for public assets; signed URL for private docs               |

Verification-document access is especially sensitive: log access decisions,
minimize URL lifetime, avoid exposing paths in public pages, and use
[the access runbook](runbooks/19-verification-document-access.md).
