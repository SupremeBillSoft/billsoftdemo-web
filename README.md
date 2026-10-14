# BillSoft Web

Multi-tenant GST billing platform — React frontend. This README covers everything needed to go from a clean machine to a running dev server, plus the day-to-day commands the team uses.

For architecture decisions, folder structure, and the playbook for building a new master (Item Master, Unit Master, etc.), see [`BillSoft_Frontend_Architecture_Handoff.md`](./BillSoft_Frontend_Architecture_Handoff.md).

---

## 1. Prerequisites

You need **Node.js** and **pnpm**. We use pnpm, not npm — it's the current standard for React projects (faster installs, stricter dependency resolution) and every command below assumes it.

### Install nvm (Node Version Manager)

nvm lets you install and switch Node versions cleanly, which matters if you work on other projects with different Node requirements.

**macOS / Linux:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
Restart your terminal, or run:
```bash
source ~/.nvm/nvm.sh
```
Verify it installed:
```bash
nvm --version
```

**Windows:**
Use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) — download and run the installer (`nvm-setup.exe`), then **restart your terminal** (no `source` command needed — nvm-windows works immediately after restart).

Verify it installed:
```powershell
nvm --version
```
### Install Node via nvm

This project uses **Node 22** (LTS).

```bash
nvm install 22
nvm use 20
```

Verify:
```bash
node --version   # should print v22.x.x
```

### Install pnpm

```bash
npm install -g pnpm
```

Verify:
```bash
pnpm --version   # should print 10.x or later
```

---

## 2. Getting the project

```bash
git clone <repository-url>
cd billsoft-web
```

---

## 3. Install dependencies

```bash
pnpm install
```

This reads `package.json` and installs everything — React, Ant Design, TanStack Query, Zustand, React Hook Form, Zod, React Router, and the dev tooling (TypeScript, Vite, oxlint).

If you ever see dependency-related errors after pulling new changes from Git, run this again — someone likely added a new package.

---

## 4. Environment variables

Currently there's no backend, so no `.env` file is required to run the app. Once a real API exists, it will be configured via:

```
VITE_API_BASE_URL=http://localhost:8000/api
```

(Referenced in `src/lib/api-client.ts`. Not needed yet — the app currently runs entirely on mock in-memory data via Zustand stores.)

---

## 5. Running the app locally

```bash
pnpm dev
```

This starts the Vite dev server — the terminal will print a local URL (typically `http://localhost:5173`). Open that in your browser.

**Login:** authentication is currently mocked — any User ID (5–10 characters, no spaces) and any password (8+ characters) will log you in successfully. There's no real backend validating credentials yet.

---

## 6. Type-checking, linting, and building

Run these before committing or pushing — CI (once set up) will run the same checks.

```bash
pnpm exec tsc -b       # type-check the whole project
pnpm exec oxlint        # lint
pnpm build               # full production build (runs type-check + Vite build)
```

All three should complete with **zero errors** before pushing. If `tsc -b` or `oxlint` fails, fix it locally first — don't push code with type or lint errors.

To preview a production build locally:
```bash
pnpm build
pnpm preview
```

---

## 7. Project structure (quick reference)

```
src/
  app/            — route table (App.tsx) and the authenticated app shell (AppLayout.tsx)
  components/     — shared reusable components, including the DynamicTabForm system
  config/          — navigation menu config, theme token config
  features/        — one folder per business module (auth, parties, items, settings, ...)
  store/            — app-wide Zustand stores (theme, auth, sidebar UI state)
  lib/               — shared utilities (the API client)
```

Full details on the architecture, the theming system, and — most importantly — **the step-by-step playbook for building a new master module** are in the handoff document linked at the top of this file. Read that before starting work on a new screen.

---

## 8. Common gotchas

- **A file with JSX in it must be `.tsx`, not `.ts`.** If you see a `'>' expected` parsing error or "refers to a value, but is being used as a type," this is almost always the cause — rename the file.
- **Colors must always come from `theme.useToken()`.** Never hardcode a hex color or `rgba()` value anywhere in a component — it will look fine in Light mode and break in Dark/Medium mode. This has caused every visual bug we've hit so far.
- **Wrap forms in antd's real `<Form layout="vertical">`**, not a bare HTML `<form>` — otherwise `Form.Item` labels render in the wrong position.
- **`useForm` needs both the input and output Zod types** (`useForm<XFormInput, unknown, XFormValues>`) whenever the schema uses `.default()` — using just one type causes confusing TypeScript errors across multiple files at once.

---

## 9. Deploying / pushing to GitHub

Standard flow — no special build steps beyond what's above:

```bash
git add .
git commit -m "your message"
git push origin <branch-name>
```

Make sure `pnpm build` succeeds locally before pushing. There's no CI pipeline configured yet — that's worth setting up soon (run `tsc -b`, `oxlint`, and `build` automatically on every PR).
