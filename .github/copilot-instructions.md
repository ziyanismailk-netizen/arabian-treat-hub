Project-specific Copilot Instructions
===================================

Purpose
-------
- Help an AI coding agent be immediately productive in this Next.js + Capacitor + Firebase codebase.

Big picture (what this repo is)
--------------------------------
- Next.js App Router app under `app/` — UI is built as React server+client components.
- Site is configured for a static export (`next.config.mjs` sets `output: 'export'`) so pages are intended to be static at build time.
- Capacitor Android native wrapper lives under `android/` and the project includes `@capacitor/*` packages in `package.json`.
- Firebase is used client-side for Auth + Firestore; initialization lives in `lib/firebase.js` and is imported via `@/lib/firebase`.

Key files & patterns (where to look first)
-----------------------------------------
- Routing and UI: `app/` — nested layouts and route groups (see `app/admin/(panel)/scanner/page.js`).
- Path alias: `@/*` is configured in `jsconfig.json` so use `@/` imports.
- Firebase: `lib/firebase.js` — single shared client init; pages import `db` and `auth`.
- Next config: `next.config.mjs` — `output: 'export'` and `images.unoptimized: true` (affects SSR/SSG choices).
- Package scripts: `package.json` (`dev`, `build`, `start`, `lint`).

Conventions & coding patterns
-----------------------------
- App Router: use server components by default; add `"use client"` at top for client-only components (scanner page is a client component).
- Authentication: pages listen for auth state via `onAuthStateChanged(auth, ...)` and import `auth` from `@/lib/firebase`.
- Firestore access: use `getDoc`, `doc`, `updateDoc` from `firebase/firestore` (see scanner `markDelivered` and `fetchOrder`).
- UI: TailwindCSS utility classes are used heavily; follow existing class patterns for spacing/typography.
- QR scanning: uses `react-qr-reader` in `app/admin/(panel)/scanner/page.js` — follow its `onResult` usage pattern.

Dev workflows & commands
------------------------
- Local dev: `npm run dev` (Next dev server on port 3000).
- Build for static output: `npm run build` and `npm run start` for the exported site.
- Lint: `npm run lint` (ESLint + `eslint-config-next`).
- Mobile: Capacitor integration present — build web assets with `npm run build` then run Capacitor workflow (not scripted here). Inspect `android/` for native changes.

Important constraints & gotchas
-----------------------------
- `next.config.mjs` uses `output: 'export'` — avoid relying on Next server-only features (API routes, server runtime-only code) unless you change config.
- `lib/firebase.js` performs client-side initialization and is imported across pages. Changes here affect many files.
- Path alias `@/` is used project-wide; preserve that when adding imports.

Examples (safe edits)
---------------------
- To update the scanner flow: edit `app/admin/(panel)/scanner/page.js`
- To change firebase init: edit `lib/firebase.js`
- To adjust Next export behavior: edit `next.config.mjs`

What to avoid
--------------
- Don't add server-only Node APIs expecting runtime server support (this repo is configured for static export).
- Don't change `@/` alias without updating `jsconfig.json`.

If uncertain, ask the maintainer for clarification rather than guessing runtime changes.

Next step after edits
---------------------
- Run `npm run dev` locally to sanity-check UI changes and `npm run build` to verify the static export.

Questions for the repo owner
---------------------------
- Do mobile build steps (Capacitor) have a preferred workflow or scripts we should add to `package.json`?
- Is the trailing `clearIndexedDbPersistence` call in `lib/firebase.js` intentional (it uses top-level await)?
