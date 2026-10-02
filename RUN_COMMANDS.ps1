# =============================================================================
#  Wealth Pooling — run commands (Windows PowerShell)
# =============================================================================
#  This is a COPY-PASTE cheat sheet, not a script to run top to bottom.
#  Copy the block you need into a PowerShell terminal. The `return` below stops
#  anything from happening if this file is ever run by accident.
#
#  What runs where:
#    Frontend (React/Vite) ...... http://localhost:3000      (repo root)
#    Backend  (NestJS API) ...... http://localhost:3001      (server/)
#    PostgreSQL (Docker) ........ localhost:55433            container: keycloak-postgres-new
#    AI model (Ollama, Docker) .. http://localhost:11434     container: gemma2
#                                 models: gemma2:2b (chat), nomic-embed-text (RAG embeddings)
#
#  Settings live in two files (never commit real secrets):
#    .env.local     frontend: VITE_AUTH_MODE=DEMO, VITE_API_BASE_URL=http://localhost:3001
#    server/.env    backend:  DATABASE_URL, AUTH_MODE=mock, OPENAI_* (points at Ollama), TOYYIBPAY_*
#  The full list of backend settings, with explanations, is in server/.env.example.
# =============================================================================
return


# -----------------------------------------------------------------------------
# 1. DAILY START  (the usual routine: 2 terminals)
# -----------------------------------------------------------------------------

# 1a. Start Docker Desktop first, then start the database and the AI model.
docker start keycloak-postgres-new gemma2

# 1b. TERMINAL 1 — backend. Wait for "Nest application successfully started".
cd C:\clone_how\mockup-house-of-wealth\server
npm run start:dev

# 1c. TERMINAL 2 — frontend. Then open http://localhost:3000 in the browser.
cd C:\clone_how\mockup-house-of-wealth
npm run dev

# 1d. (Optional) TERMINAL 3 — ngrok tunnel. NOT needed for normal work.
#     Only start it to test ToyyibPay's server callback, and stop it right after.
#     Full steps and the security warning: section 10.
ngrok http --url=yearbook-comfort-floral.ngrok-free.dev 3001


# -----------------------------------------------------------------------------
# 2. CHECK THAT EVERYTHING IS RUNNING
# -----------------------------------------------------------------------------

# Backend health: should print {"status":"ok","service":"house-of-wealth-api",...}
curl.exe http://localhost:3001/health

# Containers: keycloak-postgres-new and gemma2 should say "Up".
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# AI models available to the backend (gemma2:2b and nomic-embed-text).
docker exec gemma2 ollama list

# Which process holds the app ports (last column is the PID).
netstat -ano | findstr ":3000 :3001"


# -----------------------------------------------------------------------------
# 3. STOP / FREE A PORT
# -----------------------------------------------------------------------------

# Stop a dev server: press Ctrl+C in its terminal.

# If a port is stuck ("Port 3000 is already in use" / EADDRINUSE),
# find the PID with the netstat command above, then:
taskkill /PID 12345 /F    # replace 12345 with the PID from netstat

# Stop the containers when you are done for the day (optional).
docker stop gemma2 keycloak-postgres-new


# -----------------------------------------------------------------------------
# 4. LOGIN (DEMO MODE)
# -----------------------------------------------------------------------------
# Open http://localhost:3000 > "Sign In / Register" > pick a role > any password
# (e.g. demo123). Always LOG OUT before switching users: the session survives a
# page refresh.
#
#   Role to pick             User                     Country    Good for
#   ----------------------   ----------------------   --------   ---------------------------------
#   Super Admin              House of Wealth System   global     everything, all countries
#   Country Admin            Ahmad bin Razak          Malaysia   admin, reopen locked projects
#   Project Sponsor          Ahmad bin Razak          Malaysia   projects, feasibility, membership
#   Institutional Investor   Khaled bin Sulaiman      Malaysia   KYC applicant
#   KYC Officer              Aisyah binti Kamal       Malaysia   KYC reviewer
#   Compliance Officer       Nurul Hidayah            Malaysia   KYC/compliance reviewer
#   Retail Investor          Nurul Huda               Indonesia  cross-country KYC test
#
# Where things are:
#   KYC (applicant) .... Profile (top right) > Identity Verification
#   KYC (reviewer) ..... Admin Center > Identity & Compliance > KYC Verification
#   Membership/credits . Membership & Pricing (menu)
#   Payments history ... Billing & Transactions (menu)
#   AI tools ........... AI Wealth Engine (Project Feasibility, Contract Structuring, ...)
#
# New user (Register tab) through KYC approval, step by step:
#   PANDUAN_PENGGUNA_BARU_KYC.md
#
# Generate SAMPLE KYC documents with your own test details (the system reads the
# documents and compares them with what is typed into the KYC form, so use the same
# details). Output: C:\clone_how\kyc-test-files\<name>\
cd C:\clone_how\mockup-house-of-wealth\server
npm run kyc:samples -- --name "AMINAH BINTI YUSOF" --id 900512-10-1234 --dob 1990-05-12 --address "No. 8, Jalan Tun Razak, 50400 Kuala Lumpur"


# -----------------------------------------------------------------------------
# 5. DATABASE
# -----------------------------------------------------------------------------
cd C:\clone_how\mockup-house-of-wealth\server

# Is the database schema up to date? (run after pulling new code)
npx prisma migrate status

# Apply new migrations that came with pulled code (safe, does not delete data).
npx prisma migrate deploy

# After changing prisma/schema.prisma yourself: create + apply a migration.
npx prisma migrate dev --name describe_your_change

# Regenerate the Prisma client (needed if TypeScript says a Prisma field is missing).
npm run prisma:generate

# Browse/edit the data in a web UI (opens http://localhost:5555).
npm run prisma:studio

# Load the demo data (users, projects, pools, demo documents).
# WARNING: this RESETS demo projects, pools and documents to their original
# values, so changes made while testing are lost. Use on a fresh database, or
# when you deliberately want a clean demo.
npm run db:seed


# -----------------------------------------------------------------------------
# 6. TESTS AND CHECKS (run before committing)
# -----------------------------------------------------------------------------

# Frontend type-check (repo root).
cd C:\clone_how\mockup-house-of-wealth
npm run lint

# Backend type-check and unit tests.
cd C:\clone_how\mockup-house-of-wealth\server
npm run typecheck
npm test -- --runInBand

# Run one backend test file only, e.g. membership.
npx jest src/membership


# -----------------------------------------------------------------------------
# 7. PRODUCTION BUILD
# -----------------------------------------------------------------------------

# Frontend: output goes to dist/. Upload the WHOLE dist/ folder (including
# dist/assets/*.css), otherwise pages load with old or missing styles.
cd C:\clone_how\mockup-house-of-wealth
npm run build

# Backend: compile, then start the compiled server.
cd C:\clone_how\mockup-house-of-wealth\server
npm run build
npm run start:prod

# Production settings to check in server/.env on the server:
#   NODE_ENV=production            -> simulated card/USDT payments are refused
#   TOYYIBPAY_BASE_URL             -> https://toyyibpay.com (not dev.toyyibpay.com)
#   TOYYIBPAY_RETURN_URL           -> https://<your-domain>/membership (same origin as the app,
#                                     or users are logged out after paying)
#   TOYYIBPAY_CALLBACK_URL         -> https://<your-api-domain>/membership/payments/toyyibpay/callback
# More detail: DEPLOYMENT_TROUBLESHOOTING_PLESK.md and PANDUAN_LENGKAP_VPS.md


# -----------------------------------------------------------------------------
# 8. FIRST-TIME SETUP ON A NEW PC  (only once)
# -----------------------------------------------------------------------------
# Needs: Node.js, Docker Desktop, Git.

# 8a. Install packages for frontend and backend.
cd C:\clone_how\mockup-house-of-wealth
npm install
npm --prefix server install

# 8b. Create the settings files from the examples, then fill in the values.
Copy-Item .env.example .env.local
Copy-Item server\.env.example server\.env

# 8c. Database container (PostgreSQL with pgvector) on port 55433.
#     Replace CHANGE_ME with your own password and put the same one in DATABASE_URL in server/.env.
docker run -d --name keycloak-postgres-new -p 55433:5432 -e POSTGRES_PASSWORD=CHANGE_ME pgvector/pgvector:pg16
#     ...or let the helper script create the database and write DATABASE_URL for you:
npm run db:setup:local

# 8d. AI model container (Ollama) on port 11434, then download the two models.
docker run -d --name gemma2 -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
docker exec gemma2 ollama pull gemma2:2b
docker exec gemma2 ollama pull nomic-embed-text

# 8e. Create the tables and load demo data.
cd C:\clone_how\mockup-house-of-wealth\server
npx prisma migrate deploy
npm run db:seed

# 8f. Download the face models used by KYC face verification (about 37 MB, into server\models\).
#     Without them the "Start face verification" step reports that it is not set up.
npm run models:download

# 8g. Now follow section 1 (DAILY START).


# -----------------------------------------------------------------------------
# 9. TROUBLESHOOTING
# -----------------------------------------------------------------------------

# "Backend API tidak dapat dicapai" in the browser -> the backend is not running.
#   Start it (section 1b) and check curl.exe http://localhost:3001/health.

# Backend log says it cannot reach the database (P1001 / ECONNREFUSED 55433)
#   -> start Docker Desktop, then:
docker start keycloak-postgres-new

# AI features fail with "AI provider is unavailable"
#   -> the Ollama container is stopped:
docker start gemma2

# KYC "Face verification is not set up on this server" -> the face models are missing:
cd C:\clone_how\mockup-house-of-wealth\server
npm run models:download

# KYC face verification: "Camera permission was denied" / "No camera was found"
#   -> allow camera access for localhost in the browser (padlock icon in the address bar).
#   The camera only works on http://localhost or https:// sites.

# Page looks unstyled / Sign In button missing -> stale CSS in the browser.
#   Hard refresh with Ctrl+Shift+R. On a server, re-upload the whole dist/ folder.

# Frontend started on the wrong port, or 3001 shows the frontend
#   -> free the port (section 3) and start each app from its own folder.

# Backend crashes on start right after a code change
#   -> read the first error in Terminal 1, fix it, and it restarts by itself (watch mode).


# -----------------------------------------------------------------------------
# 10. PAYMENT TESTING (ToyyibPay sandbox + ngrok)
# -----------------------------------------------------------------------------
# How a ToyyibPay payment completes:
#   A) Return page (works WITHOUT ngrok)
#      You pay on dev.toyyibpay.com and come back to http://localhost:3000/membership.
#      The app asks the backend to re-check the bill with ToyyibPay, and adds the
#      credits / activates the plan if it was paid.
#   B) Server callback (needs ngrok)
#      ToyyibPay's server calls TOYYIBPAY_CALLBACK_URL by itself, even if the payer
#      closes the tab. Your PC is not reachable from the internet, so this only
#      works while the ngrok tunnel is running.
#   If neither happened (tab closed, no ngrok), the payment stays PENDING:
#   open Billing & Transactions and press "Check status" on that row.
#
# SECURITY: the local backend runs with AUTH_MODE=mock, which accepts demo tokens
# without a password. While ngrok runs, ANYONE who knows the URL can call the API
# as any user, including Super Admin. Start it only for the test, then stop it.

# 10a. Normal payment test (no ngrok needed)
#   1. Log in as Project Sponsor (or any user).
#   2. Membership & Pricing > Top Up Credits (or Upgrade) > choose "FPX / Card (ToyyibPay)".
#   3. On dev.toyyibpay.com pick a bank and complete the sandbox payment.
#   4. You return to the Membership page: it should say "Payment received".
#   5. Billing & Transactions should show the row as PAID with the ToyyibPay bill code.

# 10b. Callback test — TERMINAL 3: start the tunnel (backend must already be running).
#      The domain must match TOYYIBPAY_CALLBACK_URL in server/.env.
ngrok http --url=yearbook-comfort-floral.ngrok-free.dev 3001

# 10c. Check the tunnel reaches your backend (from another terminal).
#      Expected: {"status":"ok","service":"house-of-wealth-api",...}
#      A 404 or an ngrok error page means the tunnel is not running.
curl.exe https://yearbook-comfort-floral.ngrok-free.dev/health

# 10d. Watch the callbacks arrive: open http://localhost:4040 in the browser
#      (ngrok's inspector). Each ToyyibPay callback shows as
#      POST /membership/payments/toyyibpay/callback.

# 10e. Make a payment as in 10a, but CLOSE the ToyyibPay tab after paying instead
#      of returning. Then open Billing & Transactions and press Refresh: the row
#      should already be PAID (set by the callback, not by the return page).

# 10f. STOP the tunnel as soon as you are done: press Ctrl+C in Terminal 3.
#      Confirm it is closed (should no longer return {"status":"ok"}):
curl.exe https://yearbook-comfort-floral.ngrok-free.dev/health

# Is ngrok running? (no output = not running)
tasklist | findstr /i ngrok

# Sandbox vs real money:
#   TOYYIBPAY_BASE_URL=https://dev.toyyibpay.com/  -> sandbox, no real money (current setting)
#   TOYYIBPAY_BASE_URL=https://toyyibpay.com/      -> LIVE payments with real money
#   The FPX fee (RM 1) is charged to the payer and shown before checkout.
