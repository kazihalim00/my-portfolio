# Kazi Sunny · Interactive Portfolio

A portfolio you can **test**. Built with Next.js 15, TypeScript, Tailwind CSS and Framer Motion.

## Features
- **QA Lab**
  - **Bug Hunt**: ShopLite, a mini shop with 8 planted bugs. Find them, get bug reports, score points, join the Hall of Fame.
  - **Test Runner**: a Playwright-style run (11 tests × 3 browsers). Bugs you report get "fixed" and turn green.
  - **Terminal**: `help`, `projects`, `skills`, `cv`, `sudo hire kazi` and hidden commands.
- Command palette (**Ctrl/Cmd + K**), dark/light theme, achievements, scroll animations
- Live GitHub stats, filterable projects, guestbook, contact form, Developer + QA CV downloads
- Real **Playwright e2e suite** (`tests/`) covering desktop and mobile

## Run locally
```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm test   # e2e tests (uses a production build)
```

## Deploy free on Vercel
1. Push this repo to GitHub.
2. Go to https://vercel.com → sign in with GitHub → **Add New → Project** → import this repo → **Deploy**.
3. Optional extras (all free):
   - **Shared guestbook + global leaderboard**: in the Vercel project → **Storage** → add **Upstash for Redis** (free plan) and connect it to the project. It adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Redeploy. Without it, both fall back to the visitor's own device.
   - **Contact form to your inbox**: get a free access key at https://web3forms.com, then add env var `NEXT_PUBLIC_WEB3FORMS_KEY`. Without it, the form opens the visitor's email app.
   - `NEXT_PUBLIC_SITE_URL`: your final URL (for social previews).

## Editing content
All text (projects, experience, skills, links) lives in `src/lib/data.ts`. CVs are in `public/cv/`.
