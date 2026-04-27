# MealMap — Team Setup Guide
### Getting Your Mac Ready to Build
*April 2026 | For all team members | No prior experience assumed*

---

> **How to read this guide**
> Every step starts with a **check first** box. If the check passes (you already have it), skip to the next step. If it fails, follow the install instructions below it.
> Think of this like a pre-flight checklist — a pilot doesn't re-install the engines every flight, they just verify they're there.

---

## ⚠️ Two Things to Know Before You Start

**1. Your Claude Pro subscription is not the same as an API key.**
Your Claude Pro subscription (claude.ai) and the Anthropic API are two separate things — like how a Spotify subscription doesn't let you embed Spotify music in your own app. MealMap makes direct API calls, which requires a separate API key. Debashish will share the team's single API key securely during build week — do not create separate accounts or start individual billing.

**2. This guide has two tracks.**
Debashish already has Git set up and connected to RNDS Labs locally. He skips directly to Part 3.
Rashi, Nikitha, and Subashish start at Part 1.

---

## DEBASHISH — Your Checklist (One-Time Repo Setup)

Do these steps before the rest of the team starts Part 3.

1. Log into the **RNDS Labs GitHub account**
2. Create a new repository — name it `picturetoplate` — set it to **Private**
3. Go to **Settings → Rules → Rulesets → New ruleset**
4. Name it `protect-main`, set Target branch to `main`
5. Enable: **Restrict updates**, **Restrict deletions**, **Require a pull request before merging**
6. Under **Bypass list** → click **"+ Add bypass"** → select **Role** → select **"Organization admin"**
7. Click **Save changes**
8. Go to **Settings → People** in the RNDS Labs org → invite Rashi, Nikitha, and Subashish by their GitHub usernames as **Members**
9. Share the repo link and the Anthropic API key with the team via your secure channel

The team cannot start Part 3 until they have accepted the org invite email from GitHub.

---

## PART 1 — Pre-Flight Checks (Rashi, Nikitha, Subashish)

Open **Terminal** on your Mac:
- Press `Command (⌘) + Space` → type `Terminal` → press Enter
- A black or white window with a blinking cursor will appear. This is normal.

Run each check below by copying the command exactly, pasting it in Terminal, and pressing Enter.

---

### Check 1 — Node.js

Node.js is the engine that runs the MealMap app on your computer. Think of it like the Java runtime for a Java app — without it, nothing runs.

**Check:**
```
node --version
```

✅ **Pass:** You see something like `v20.x.x` or higher → skip to Check 2.
❌ **Fail:** You see `command not found` → follow **Install A** below.

#### Install A — Node.js

1. Go to **https://nodejs.org**
2. Click the big green button labelled **"LTS"** (Long Term Support) — not the "Current" one
3. The `.pkg` file will download to your Downloads folder
4. Double-click it → click through the installer prompts → click Install
5. When it finishes, close and reopen Terminal, then run `node --version` again to confirm

---

### Check 2 — npm (comes with Node.js)

npm is the package manager — it downloads the code libraries MealMap depends on. It installs automatically with Node.js.

**Check:**
```
npm --version
```

✅ **Pass:** You see a version number like `10.x.x` → skip to Check 3.
❌ **Fail:** Re-run Install A above — npm comes bundled with Node.js.

---

### Check 3 — Git

Git is version control — it lets the whole team work on the same codebase without overwriting each other's work. Think of it like Google Docs' version history, but for code.

**Check:**
```
git --version
```

✅ **Pass:** You see `git version 2.x.x` → skip to Check 4.
❌ **Fail:** A popup may appear asking you to install **Xcode Command Line Tools** — click **Install** and wait (5–10 minutes). If no popup appears, follow **Install B** below.

#### Install B — Git (manual)

1. Go to **https://git-scm.com/download/mac**
2. Download the installer for macOS
3. Run the `.pkg` file and follow the prompts
4. Re-run `git --version` to confirm

---

### Check 4 — VS Code (Code Editor)

VS Code is your text editor for the project — like Microsoft Word but for code.

**Check:**
```
code --version
```

✅ **Pass:** You see a version number → skip to Part 2.
❌ **Fail:** Follow **Install C** below.

#### Install C — VS Code

1. Go to **https://code.visualstudio.com**
2. Click **Download for Mac**
3. Open the downloaded `.zip` file → drag **Visual Studio Code** into your **Applications** folder
4. Open VS Code from Applications
5. Inside VS Code, press `Command (⌘) + Shift + P` → type `shell command` → click **"Shell Command: Install 'code' command in PATH"**
6. Re-open Terminal and run `code --version` to confirm

---

## PART 2 — GitHub Account Setup (Rashi, Nikitha, Subashish)

### Step 1 — Create a GitHub account
1. Go to **https://github.com**
2. Click **Sign up** — use your personal Gmail address
3. Verify your email address
4. **Send your GitHub username to Debashish** via your team chat — he needs this to add you to the RNDS Labs org

### Step 2 — Accept the org invite
Once Debashish adds you, GitHub will send an invite email to your Gmail. Open it and click **Accept invitation**. You will not be able to access the repo until this is done.

### Step 3 — Configure Git with your name
In Terminal, run these two commands (replace the placeholder text with your actual details):

```
git config --global user.name "Your Full Name"
```
```
git config --global user.email "your@gmail.com"
```

No output = success. That's normal.

---

## PART 3 — Getting the Project onto Your Mac (Everyone)

> **Wait for Debashish to complete his one-time setup and send you the repo link before running these steps.**

### Step 1 — Clone the project
In Terminal, navigate to your Desktop:

```
cd ~/Desktop
```

Clone (download) the project using the link Debashish sends:

```
git clone https://github.com/rndslabs/picturetoplate
```

This creates a `picturetoplate` folder on your Desktop.

### Step 2 — Open the project in VS Code
```
cd picturetoplate
code .
```

VS Code will open with the full project visible in the left panel.

### Step 3 — Install project dependencies
Still in Terminal, inside the project folder:

```
npm install
```

This downloads all the code libraries the project needs. A lot of text will scroll by — this is normal. Wait for it to finish (usually 1–2 minutes).

---

## PART 4 — API Key Setup (Everyone)

> Debashish will share the Anthropic API key securely — not via public chat or email. Do not post API keys anywhere, including in GitHub comments or commit messages.

### Step 1 — Create your environment file
In VS Code, look at the left file panel. Find the file called `.env.example`. Right-click it → **Copy**, then right-click in the same folder → **Paste**. Rename the copy to exactly `.env` (no `.example`).

### Step 2 — Add the API key
Open `.env` in VS Code. You'll see a line that looks like:

```
ANTHROPIC_API_KEY=
```

Paste the key Debashish gave you after the `=` sign. Save the file (`Command + S`).

> ⚠️ The `.env` file is in `.gitignore` — it will never be uploaded to GitHub. Your key stays local on your machine only.

---

## PART 5 — Running the App Locally (Everyone)

### Start the app
In Terminal, inside the project folder:

```
npm run dev
```

### Open it in your browser
Go to:

```
http://localhost:3000
```

You should see the MealMap app running.

To stop the app: click in Terminal and press `Control + C`.

---

## PART 6 — Day-to-Day Workflow (Everyone)

This is the most important section for keeping the team's work clean and conflict-free.

### The golden rule: nobody pushes directly to `main`
Think of `main` as the published version of a book. Everyone works on their own draft chapter (branch), submits it for review, and only Debashish (as RNDS Labs org admin) publishes it into the final book. GitHub will actually block anyone from pushing directly to `main` — this is enforced, not just a convention.

---

### Morning: Pull the latest before you start

```
git pull
```

This fetches any changes your teammates merged yesterday. Skipping this is like starting to edit a shared Google Doc from an old version — you will create conflicts.

---

### Starting a new piece of work: Create your branch

```
git checkout -b yourname/what-youre-doing
```

Examples:
```
git checkout -b rashi/vision-prompt-v2
git checkout -b suba/recipe-coverage-scoring
git checkout -b nikitha/allergen-safety-layer
git checkout -b debashish/ingredient-confirmation-ui
```

Your branch name is your personal workspace. Nothing you do here affects anyone else until it is merged.


---

### Saving your work during the day

```
git add .
git commit -m "Brief description of what you did"
```

Examples:
```
git commit -m "Rashi: vision prompt v2 with confidence scores"
git commit -m "Suba: coverage scoring working on 3 test meals"
```

Commit messages should say what changed, not just "update" or "fix." Future you will thank present you.

---

### End of day: Push your branch to GitHub

```
git push origin yourname/what-youre-doing
```

The first time you push a new branch, Git will print a longer message — that's normal. Copy the command it suggests if it asks you to set an upstream.

---

### When your work is ready: Open a Pull Request (PR)

A Pull Request is how you say *"I'm done — please review and merge this into main."*

1. Go to **https://github.com/rndslabs/picturetoplate** in your browser
2. GitHub will show a yellow banner saying **"Your branch had recent pushes"** → click **"Compare & pull request"**
3. Write a short description of what you built
4. Click **"Create pull request"**
5. Debashish will get a notification, review it, and merge it as RNDS Labs org admin

> A blocked recipe in MealMap shows greyed-out with a reason badge — a PR that isn't merged yet works the same way: your work is visible and reviewable, but not in `main` until approved.

---

## PART 7 — Role-Specific Notes

### Rashi — Vision Module
Your prompt files live in `/prompts/vision/`. Never edit prompts directly in the JavaScript code — always save a new version in that folder and reference it by filename. This makes it easy to roll back if a new prompt behaves worse than the previous one.

### Subashish — Recipe Intelligence
Your prompt files live in `/prompts/recipe/`. The recipe prompt has a fixed JSON output contract — if you change the shape of what Claude returns, tell Debashish and Nikitha immediately, as their modules consume your output directly.

### Nikitha — Personalisation & Safety
You own the UserProfile shape and the safety intercept function. The safety layer runs before any recipe card is rendered — if it breaks, nothing shows on screen. Always test with a known allergen like `peanuts` after every change to confirm blocking still works.

### Debashish — Integration & Deployment
For the Vercel deployment at the end of build week, add the `ANTHROPIC_API_KEY` as an **Environment Variable** inside the Vercel dashboard — the `.env` file is for local development only and never goes to Vercel. Log into RNDS Labs in a **separate browser profile** and use it only for merging PRs — all regular development work should be done from your personal GitHub account.

---

## Quick Reference — Terminal Commands

| What you want to do | Command |
|---|---|
| Open project folder | `cd ~/Desktop/picturetoplate` |
| Start the app | `npm run dev` |
| Stop the app | `Control + C` |
| Pull latest from team | `git pull` |
| Create your branch | `git checkout -b yourname/feature-name` |
| See what you changed | `git status` |
| Save your work locally | `git add . && git commit -m "message"` |
| Push your branch | `git push origin yourname/feature-name` |
| Install new packages | `npm install` |

---

## Troubleshooting

**"Port 3000 is already in use"**
Something is already running on that port. Run `npm run dev -- --port 3001` instead, then go to `http://localhost:3001`.

**"Cannot find module" error when starting the app**
Run `npm install` first — dependencies haven't been installed yet.

**"Permission denied" when pushing to GitHub**
You may not have accepted the RNDS Labs org invite yet. Check your Gmail for the invite email from GitHub.

**"Updates were rejected" when pushing**
Someone else pushed to the same branch. Run `git pull` first, then push again.

**VS Code doesn't show the project files**
Make sure you used `code .` (with the dot) from inside the project folder. The dot means "open the current folder."

**The app loads but Claude API calls fail**
Check your `.env` file exists, has no typos, and the API key is correct. Restart the app after any `.env` change — `Control + C`, then `npm run dev` again.

---

*MealMap MVP | April 2026 | Setup Guide v2.0 | RNDS Labs*
