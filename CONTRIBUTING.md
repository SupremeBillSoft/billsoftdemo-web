# Contributing to BillSoft Web

This is the team reference for setting up the project locally, our branching strategy, commit message rules, and the exact steps to take before opening a PR. Read this before your first commit.

---

## 1. Local Setup

```bash
git clone https://github.com/SupremeBillSoft/billsoft-web.git
```
**What it does:** downloads the repository to your machine. **When:** once, the first time you're working on this project on a given machine.

```bash
cd billsoft-web
```
**What it does:** moves your terminal into the project folder. **When:** every time you open a new terminal to work on this project.

```bash
nvm install 22 && nvm use 22
```
**What it does:** installs and activates Node.js version 22 via nvm. **When:** once per machine (or any time you switch back to this project from another one using a different Node version).

```bash
pnpm install
```
**What it does:** installs every dependency listed in `package.json`. **When:** right after cloning, and again any time you pull changes that touch `package.json`/`pnpm-lock.yaml`.

```bash
pnpm dev
```
**What it does:** starts the local dev server. **When:** whenever you're actively working on the app.

Full environment setup (nvm/pnpm install steps) is in [`README.md`](./README.md). Architecture, folder structure, and the playbook for building a new master module is in [`BillSoft_Frontend_Architecture_Handoff.md`](./BillSoft_Frontend_Architecture_Handoff.md).

---

## 2. Branching Strategy

```
main         — always deployable. Protected. Nobody pushes directly here.
feature/*    — one branch per feature or master module. e.g. feature/item-master
hotfix/*     — urgent fixes to something already live.  e.g. hotfix/party-code-duplicate
release/*    — reserved for later, once we have a real deployment/QA cadence. Not in use yet.
```

**Starting a new feature:**
```bash
git checkout main
```
**What it does:** switches your local working copy to the `main` branch. **When:** before starting any new branch — you always want to branch off the latest `main`, not off whatever you were working on before.

```bash
git pull
```
**What it does:** downloads and merges the latest commits from `main` on GitHub into your local `main`. **When:** immediately after checking out `main`, before creating a new branch — ensures you're branching from the true latest state, not a stale local copy.

```bash
git checkout -b feature/item-master
```
**What it does:** creates a new branch named `feature/item-master` and switches to it in one step. **When:** at the start of any new piece of work. Name it clearly — `feature/<what-it-is>` or `hotfix/<what-it-fixes>`.

**Branch naming rules:**
- `feature/item-master`, `feature/party-code-prefix` — lowercase, hyphen-separated, describes the work
- `hotfix/party-code-duplicate-bug` — same convention, `hotfix/` prefix
- No personal names, ticket numbers only, or vague names like `feature/fixes` or `feature/john-branch`

---

## 3. Commit Message Rules

Format: `<type>: <short description>`

| Type | Use for |
|---|---|
| `feat` | A new feature or screen |
| `fix` | A bug fix |
| `refactor` | Restructuring code with no behavior change |
| `docs` | README, comments, this file, etc. |
| `style` | Formatting only, no logic change |
| `chore` | Dependency bumps, config, tooling |

Examples:
```
feat: add Item Master custom fields section
fix: correct Party Code prefix fallback behavior
refactor: extract RepeatableTabPanel draft validation
docs: update README with Windows nvm instructions
```

Keep the first line under ~70 characters. If you need more detail, add a blank line and a longer description below — but the short line should stand on its own.

```bash
git add .
```
**What it does:** stages all changed/new files for the next commit. **When:** before committing — check `git status` first to make sure you're not accidentally staging `node_modules` or other files that shouldn't be tracked.

```bash
git commit -m "feat: add Item Master custom fields section"
```
**What it does:** creates a commit with your staged changes and the given message. **When:** after staging, whenever you've reached a logical stopping point — don't wait until an entire feature is done to commit once; commit in small, reviewable chunks.

---

## 4. Before Opening a PR — Update From `main` (Rebase)

**This step is mandatory before every PR.** Your branch may be behind `main` by the time you're ready to open a PR — rebasing replays your commits on top of the latest `main`, so the PR reviewer sees a clean history and merge conflicts get caught by you, not by GitHub during merge.

```bash
git fetch origin
```
**What it does:** downloads the latest commits from GitHub without touching your working files or current branch. **When:** right before rebasing — you need `origin/main` to actually be up to date locally first.

```bash
git rebase origin/main
```
**What it does:** replays your branch's commits on top of the latest `main`, one at a time, as if you'd started your branch from today's `main` instead of whenever you actually branched. **When:** right before opening a PR, and again if `main` moves further while your PR is still open and unreviewed.

**If there's a conflict during rebase:** Git will pause and tell you which file(s) conflict. Open them, resolve the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), then:
```bash
git add <resolved-file>
git rebase --continue
```
**What it does:** marks the conflict as resolved and continues replaying the remaining commits. **When:** immediately after fixing every conflicted file during a rebase — repeat for each conflict Git stops on.

If a rebase goes badly wrong and you want to back out entirely:
```bash
git rebase --abort
```
**What it does:** cancels the in-progress rebase and returns your branch to exactly how it was before you started. **When:** if you get stuck mid-rebase and want a clean slate to try again, rather than fixing forward.

**After a successful rebase, your branch's history has changed — a normal push will be rejected.** You need:
```bash
git push --force-with-lease
```
**What it does:** force-pushes your rebased branch, but safely — it refuses if someone else has pushed to that same branch since you last fetched, preventing you from silently overwriting a teammate's work. **When:** only after a rebase, and only on your own feature/hotfix branch. **Never use this on `main`.**

*(Note: plain `--force` also works but has no safety check — always prefer `--force-with-lease` on a team repo.)*

---

## 5. Opening the Pull Request

```bash
git push -u origin feature/item-master
```
**What it does:** pushes your branch to GitHub for the first time and links your local branch to it, so future `git push` calls on this branch don't need the full command again. **When:** once, the first time you push a new branch (subsequent pushes after this are just `git push`).

Then on GitHub:
1. Open a PR: your branch → `main`
2. Fill in what the PR does and why, not just what files changed
3. Request review from at least one other team member
4. **Never self-approve.** If the team is genuinely down to one person on a given day, flag it rather than merging unreviewed.
5. Once approved and `main` hasn't moved further ahead, merge (prefer **Squash and merge** to keep `main`'s history clean — one commit per feature, not every small in-progress commit).

---

## 6. Hotfixes

Same flow as a feature, `hotfix/` prefix instead:
```bash
git checkout main
git pull
git checkout -b hotfix/party-code-duplicate-bug
```
Fix, commit, rebase against `main` if it's moved, push, open a PR straight into `main`. Same review requirement applies — urgency doesn't skip review.

---

## 7. Quick Reference — Full Flow Start to Finish

```bash
git checkout main
git pull
git checkout -b feature/your-feature-name

# ... work, commit as you go ...
git add .
git commit -m "feat: describe what you did"

# before opening the PR:
git fetch origin
git rebase origin/main
# resolve any conflicts, then:
git push --force-with-lease   # only needed if you rebased after an earlier push
# or, if this is the first push of the branch:
git push -u origin feature/your-feature-name
```

Open the PR on GitHub, get it reviewed, squash-merge into `main` once approved.
