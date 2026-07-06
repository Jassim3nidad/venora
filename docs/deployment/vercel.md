# Venora Vercel Deployment

Venora is a pnpm monorepo. The customer-facing Next.js app lives in `apps/web`
and its package name is `@venora/web`.

Use Vercel's Git integration for automatic deployments:

- Production deployments come from `main`.
- Preview deployments are created automatically for pull requests and branch
  pushes.
- The Vercel project should point at the `apps/web` app directory.

## Repository Shape

- Monorepo package manager: `pnpm`
- Workspace file: `pnpm-workspace.yaml`
- Web app directory: `apps/web`
- Web app package: `@venora/web`
- Next.js output directory: `.next`

The existing web scripts are:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
}
```

## Vercel Project Settings

Import the GitHub repository in Vercel, then use these settings:

| Setting           | Value                             |
| ----------------- | --------------------------------- |
| Framework Preset  | Next.js                           |
| Root Directory    | `apps/web`                        |
| Install Command   | `pnpm install`                    |
| Build Command     | `pnpm --filter @venora/web build` |
| Output Directory  | `.next`                           |
| Production Branch | `main`                            |

No `vercel.json` is required for the current setup. The dashboard settings are
clearer for this monorepo because Vercel will run the project from `apps/web`
while pnpm can still resolve workspace packages from the repository.

## Environment Variables

Add these variables in Vercel for Production and Preview environments:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

Optional compatibility variable used by auth code as a fallback:

```bash
NEXT_PUBLIC_SITE_URL=
```

Set `NEXT_PUBLIC_APP_URL` to the deployed URL for each environment.

For production:

```bash
NEXT_PUBLIC_APP_URL=https://<vercel-production-domain>
```

For previews, use a stable preview/branch URL if you need email auth flows to
work in preview builds.

Server-only variables should be added only when the related server features are
enabled. Do not expose these as `NEXT_PUBLIC_*` variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=
PAYMONGO_WEBHOOK_SECRET=
MAYA_WEBHOOK_SECRET=
```

## Supabase Auth Redirects

After Vercel is connected, update Supabase Auth URL Configuration.

Local site URL:

```text
http://localhost:3000
```

Production site URL:

```text
https://<vercel-production-domain>
```

Production auth callback URL:

```text
https://<vercel-production-domain>/auth/callback
```

Preview callback note: if you use email auth, magic links, OAuth, forgot
password, or reset password in preview builds, add the preview URLs or branch
preview domains to Supabase redirect allow-list settings as well.

## Deployment Flow

1. Import the GitHub repository into Vercel.
2. Apply the project settings above.
3. Add environment variables for Production and Preview.
4. Confirm the production branch is `main`.
5. Push to `main` to trigger a production deployment.
6. Open a branch or pull request to trigger a preview deployment.

## Checking Failed Builds

In Vercel:

1. Open the Venora project.
2. Go to Deployments.
3. Select the failed deployment.
4. Open Build Logs.
5. Check install, type-check, and Next.js build output.
6. Re-run the deployment after fixing the issue or pushing a new commit.

Common things to verify:

- The Root Directory is `apps/web`.
- The Build Command is `pnpm --filter @venora/web build`.
- Supabase public environment variables exist in the correct Vercel environment.
- `NEXT_PUBLIC_APP_URL` matches the deployed domain.
- Supabase redirect URLs include the production callback URL.

## Confirming Success

After deployment:

1. Open the production URL.
2. Confirm the marketing page loads.
3. Open `/venues`.
4. Test register, login, forgot password, and reset password.
5. Confirm Supabase auth redirects return to the Vercel domain.
6. Open a branch or pull request and confirm Vercel creates a preview URL.

## Vercel Setup Checklist

[ ] Import GitHub repository into Vercel
[ ] Set root directory to apps/web
[ ] Set framework preset to Next.js
[ ] Set install command to pnpm install
[ ] Set build command to pnpm --filter @venora/web build
[ ] Add Supabase environment variables
[ ] Add NEXT_PUBLIC_APP_URL
[ ] Confirm production branch is main
[ ] Push to main and confirm production deploy
[ ] Open a test branch/PR and confirm preview deploy
[ ] Update Supabase Auth redirect URLs
[ ] Test register, login, forgot password, and reset password on production
