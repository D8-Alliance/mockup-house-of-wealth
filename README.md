<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7d4d8c4d-8656-4928-8bf1-10be113d0525

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Local PostgreSQL

The backend uses the existing PostgreSQL database `house_of_wealth`. Ensure the PostgreSQL service is running, then run this from the project root:

```powershell
npm install
npm --prefix server install
npm run db:setup:local
npm --prefix server run db:seed
```

The setup script prompts for the PostgreSQL username and password, reuses the database if it already exists, writes `server/.env`, generates Prisma Client, and applies the Prisma migrations. The seed command imports the relational mock data and can be run again safely; existing append-only audit events are skipped. Start the backend with:

Historical audit rows are immutable by design. The migration moves operational data to Malaysia but preserves the original technical identifiers in those audit records for evidentiary integrity.

```powershell
cd server
npm run start:dev
```
