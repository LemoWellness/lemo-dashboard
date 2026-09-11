# LEMO Dashboard — rebuild on GitHub + Vercel + Firebase

This replaces the old Google Apps Script app (`Code.gs` / `Auth.gs` /
`Dashboard.html`). The ROI Calculator (`RoiCalculator.gs`) is intentionally
**not** ported yet — that's a later phase.

## What's here vs. what's next

**Built:**
- Firebase Auth login (replaces the custom username/password system in `Auth.gs`)
- Role (Admin/Viewer) + per-tab permissions, stored in Firestore `users/{uid}` docs
- Locations (Project Details), Expenses, Income, Communication Log — full read/write
- Tasks — full read/write, **Google Calendar invites not yet wired up** (see TODOs in `pages/api/tasks/`)
- **Data Import screen** (`/admin/import`) — upload CSV exports of the old sheets so nothing gets lost; see the column mapping comments at the top of `pages/api/import.js`
- User management screen (`/admin/users`)

**Not yet built (future phases):**
- ROI Calculator
- Monthly Overview / Usage Dashboard (the old formula-driven tabs) — these need their calculation logic re-implemented in code, since the sheet formulas that did this math don't exist here
- Daily Raw Data / Usage Raw Data import + display
- Google Calendar integration for task deadlines
- PDF expense export (was `generateExpensePdf` in the old Code.gs)

## One-time setup

### 1. Firebase
1. Create (or use an existing) Firebase project.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create a database (production mode is fine — `firestore.rules` locks it down anyway).
4. **Project settings → General → Your apps** → add a Web app → copy the config values into `.env.local` (see `.env.local.example`) as the `NEXT_PUBLIC_FIREBASE_*` vars.
5. **Project settings → Service accounts** → Generate new private key → paste the JSON contents into `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env.local` (either as raw JSON on one line, or base64-encoded — the code handles both).
6. Deploy the security rules: `firebase deploy --only firestore:rules` (requires the Firebase CLI, `npm install -g firebase-tools`, then `firebase login` and `firebase use <your-project-id>`).

### 2. Create your first admin user
There's no signup screen on purpose. Create the first Admin directly:
```bash
npm install
npm run dev
```
Then, with the dev server running, use the Firebase console (Authentication → Add user) to create yourself an account, copy the resulting UID, and add a matching document by hand in Firestore console:
```
Collection: users
Document ID: <the UID from Authentication>
Fields: { email: "you@example.com", name: "Your Name", role: "Admin", tabs: "all", active: true }
```
After that, log in at `/login` and use **Manage Users** to create everyone else through the UI.

### 3. GitHub + Vercel
1. Push this folder to a new GitHub repo.
2. In Vercel: **New Project** → import that repo.
3. Add every variable from `.env.local` into Vercel's **Environment Variables** settings (Project Settings → Environment Variables) — do this for all environments (Production/Preview/Development).
4. Deploy.

### 4. Bring your existing data in
Once deployed and logged in as Admin, go to **Import Data** and upload CSV exports (File → Download → CSV in Google Sheets) of:
- Project Details
- Expenses
- Income
- Communication Log

Column mapping details are documented at the top of `pages/api/import.js`. If your sheet's column headers don't match exactly, just rename the header row in the exported CSV before uploading — it's the easiest fix.

## Local development
```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```
