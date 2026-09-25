# Plesk Deployment Troubleshooting

## Symptom

The latest code is visible in GitHub and Plesk Git deployment, but the live website still shows an older frontend version.

Live domain:

```text
https://how.alhidayahgroup.com.my/
```

## Root Cause

Plesk successfully pulled the latest source code, but the Vite production build was not regenerated.

The deployment folder contained:

```text
/var/www/vhosts/alhidayahgroup.com.my/how.alhidayahgroup.com.my
```

Source files were updated on September 24, but the following files were still dated September 14:

```text
index.html
```

The live server was therefore serving the previous compiled JavaScript and CSS bundles.

## Confirm The Deployment Branch

In Plesk, open:

```text
Websites & Domains → Git Repositories
```

Confirm the repository branch is:

```text
feat/keycloak-oidc-auth
```

The expected latest commit is:

```text
036ecbe7cc1dd08070f253fcc71c309de0a96e90
```

Verify from SSH:

```bash
cd /var/www/vhosts/alhidayahgroup.com.my/how.alhidayahgroup.com.my
```

If the deployment folder does not contain `.git`, verify the branch and commit from the Plesk Git Repository page instead.

## Rebuild The Frontend

Open Plesk SSH Terminal and run:

```bash
cd /var/www/vhosts/alhidayahgroup.com.my/how.alhidayahgroup.com.my
npm ci
npm run build
```

Confirm that the build completed successfully and check the generated file date:

```bash
ls -l dist/index.html
```

## Configure The Document Root

### Recommended Configuration

Set the domain document root to:

```text
/var/www/vhosts/alhidayahgroup.com.my/how.alhidayahgroup.com.my/dist
```

This allows Nginx/Apache to serve the Vite production output directly.

### Alternative Configuration

If the document root must remain the repository root, copy the build output into the root after every build:

```bash
cd /var/www/vhosts/alhidayahgroup.com.my/how.alhidayahgroup.com.my
cp -a dist/. .
```

Then verify:

```bash
ls -l index.html
```

The root `index.html` must have the current deployment timestamp.

## Backend Deployment

If the NestJS backend is deployed on the same server:

```bash
cd /var/www/vhosts/alhidayahgroup.com.my/how.alhidayahgroup.com.my/server
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Restart the Plesk Node.js application after the backend build.

## Cache Refresh

After deployment:

1. Restart the Plesk Node.js application if applicable.
2. Reload or restart Nginx/Apache if managed separately.
3. Clear any Plesk or CDN cache.
4. Open the live site with `Ctrl + Shift + R`.

## Verify The Live Bundle

Inspect the live HTML:

```bash
curl -s https://how.alhidayahgroup.com.my/
```

The HTML should reference a newly generated Vite asset, for example:

```text
/assets/index-NEW_HASH.js
/assets/index-NEW_HASH.css
```

It should no longer reference the previous bundle hash:

```text
index-sO6Ygny7.js
index-CPPAhkkq.css
```

Verify the new wizard text exists in the live JavaScript bundle, including terms such as:

```text
AI suggestion
Türkiye
Agreement Generation
```

## Deployment Checklist

- Git branch is `feat/keycloak-oidc-auth`.
- Latest commit is `036ecbe7cc1dd08070f253fcc71c309de0a96e90` or newer.
- `npm ci` completed successfully.
- `npm run build` completed successfully.
- `dist/index.html` has a current timestamp.
- Domain document root points to `dist/`.
- Backend migrations are applied if the backend changed.
- Node.js application has been restarted.
- Live HTML references a new asset hash.
- Browser cache has been cleared.

## Important Note

A successful Git pull does not automatically mean that the live frontend is updated. Vite applications must be rebuilt, and the web server must serve the resulting `dist/` directory.
