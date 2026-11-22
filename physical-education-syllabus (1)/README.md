# Sayon's UGC NET Practice site

Practice app for UGC NET **Paper I (General Paper, Code 00)** and **Paper II (Physical Education, Code 47)**: hints while practising, explanations after the session, stacked flashcards, ten years of PYQ-pattern papers and free keyless AI question generation.

Built with Next.js (App Router), Tailwind CSS and PostgreSQL via Drizzle ORM.

## Run locally

```bash
npm install
# optional – only needed for accounts:
echo 'DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db' > .env
npm run dev
```

Open http://localhost:3000.

The database tables are created automatically on the first sign-in (`ensureTables`), so no migration step is required.

## Deploy to a permanent public URL

The app has no server-only secrets: pages, the question bank, PYQ papers and the AI proxy all work out of the box. The database is optional — without it the site runs in **guest mode** (progress stored in the browser) and the header shows “Guest mode” instead of sign-in.

### Option A — Vercel + Neon (free, ~3 minutes)

1. Push this project to a GitHub repository.
2. Create a free Postgres database at [neon.tech](https://neon.tech) and copy its connection string (it ends with `?sslmode=require`).
3. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
4. Add an environment variable `DATABASE_URL` with that connection string.
5. Deploy. Vercel gives you a public URL such as `https://sayon-ugc-net.vercel.app` that anyone can open.

### Option B — Render / Railway

1. Create a Web Service from the repository.
2. Build command: `npm install && npm run build` — start command: `npm run start`.
3. Add `DATABASE_URL` (from any Postgres add-on) as an environment variable.

### Option C — no database at all

Deploy without `DATABASE_URL`. Everything works except creating an account; practice progress, mistakes and flashcards are saved in each visitor's browser.

## Troubleshooting a failed Vercel deploy

Most failures on this project come from one of these, all of which are already fixed in the repo:

| Symptom in the Vercel log | Cause | Fix |
| --- | --- | --- |
| `Invalid maxDuration value` / `maxDuration must be between 1 and 60` | A function asked for more time than the plan allows | Removed — the AI route now uses the plan default and the app falls back to the built-in bank if a free AI host is slow |
| Deployment uploads tens of thousands of files / times out | `node_modules`, `.next` or `.env` were committed (there was no `.gitignore`) | `.gitignore` is included — commit it, and never commit `.env` |
| `No app directory found` / blank 404 | The Vercel **Root Directory** points at a parent folder | Set Root Directory to the folder containing `package.json` |
| Build passes, sign-in says “server error” | `DATABASE_URL` missing, wrong, or without TLS | Paste the Neon/Supabase connection string (it ends with `?sslmode=require`) and redeploy. Without a database the site still runs in guest mode |
| `relation "users" does not exist` | Tables were never created | They are created automatically on the first sign-in; if it persists, run `npx drizzle-kit push` locally against the hosted database |
| Node version error | Old Node default | The included `.nvmrc` pins Node 22; in Vercel set Settings → Node.js Version to 22.x |

To see the real reason, open the deployment → **Build Logs** (not the runtime logs) and read the first red error line.

## Notes

- Free AI sources (Pollinations, Glyph Cluster via server proxy, LLM7, and Puter in the browser) need no API key. If a source is busy the next one is tried, and any shortfall is filled from the built-in bank so a session always starts.
- `src/lib/bank/*` holds the curated fact base and the question generators (2,500+ distinct questions per unit).
- `src/db/schema.ts` holds the tables (`users`, `sessions`, `attempts`, `user_state`).
