# Local Firebase emulator workflow

Local development is deliberately prevented from reaching the production
Firebase project. Start Auth and Firestore emulators and configure the Next.js
process to use the `demo-flagos-local` project before opening the app.

## Start the emulators

In PowerShell window 1:

```powershell
cd "C:\Users\dexte\OneDrive\Documents\FlagLeagueApp\yuwffl-app"
npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-flagos-local
```

Keep this window open. The Emulator Suite UI is at `http://127.0.0.1:4000`,
Firestore is at `127.0.0.1:8080`, and Auth is at `127.0.0.1:9099`.

## Start the app against the emulators

In PowerShell window 2, set the environment variables before starting Next.js:

```powershell
cd "C:\Users\dexte\OneDrive\Documents\FlagLeagueApp\yuwffl-app"
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "true"
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-flagos-local"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
npm run dev
```

Use a fresh development-server process after changing these variables; Next.js
embeds `NEXT_PUBLIC_` values into the browser bundle at startup. The server-side
Admin SDK uses the emulator host variables for Firestore and Auth. Local
development fails closed if emulator mode is not enabled, if the project ID
does not use the expected demo project, or if the emulator host settings do not
match.

The demo project is isolated from production and starts empty unless emulator
data is explicitly imported. To seed test data, write it to the emulator only
or use the Emulator Suite UI. Do not use `--import` with a production export.

## Stop

Press `Ctrl+C` in the emulator terminal and in the Next.js terminal when done.
