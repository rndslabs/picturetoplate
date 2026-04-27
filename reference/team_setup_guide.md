# MealMap — Team Setup Guide
### Getting Your Mac Ready to Build
*April 2026 | For all team members | No prior experience assumed*

---

> **How to read this guide**
> Every step starts with a **check first** box. If the check passes (you already have it), skip to the next step. If it fails, follow the install instructions below it.
> Think of this like a pre-flight checklist — a pilot doesn't re-install the engines every flight, they just verify they're there.

---

## ⚠️ Important: API Keys Are Not Your Claude Pro Account

Your Claude Pro subscription (claude.ai) and the Anthropic API are **two separate things** — like how a Spotify subscription doesn't let you embed Spotify music in your own app. MealMap makes direct API calls, which requires a separate API key from **console.anthropic.com**. Debashish will coordinate one shared API key for the team during build week — **do not each create separate accounts and start billing individually.**

---

## PART 1 — Pre-Flight Checks (Do These First)

Open **Terminal** on your Mac:
- Press `Command (⌘) + Space` → type `Terminal` → press Enter
- A black or white window with a blinking cursor will appear. This is normal.

Run each check below by **copying the command exactly, pasting it in Terminal, and pressing Enter**.

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

npm is the package manager — it downloads the code libraries that MealMap depends on. It installs automatically with Node.js.

**Check:**
```
npm --version
```

✅ **Pass:** You see a version number like `10.x.x` → skip to Check 3.
❌ **Fail:** Re-run Install A above (npm comes bundled with Node.js).

---

### Check 3 — Git

Git is version control — it's what lets the whole team work on the same codebase without overwriting each other's work. Think of it like Google Docs' version history, but for code.

**Check:**
```
git --version
```

✅ **Pass:** You see `git version 2.x.x` → skip to Check 4.
❌ **Fail:** A popup may appear asking you to install **Xcode Command Line Tools** — click **Install** and wait (this takes 5–10 minutes). If no popup appears, follow **Install B** below.

#### Install B — Git (manual)

1. Go to **https://git-scm.com/download/mac**
2. Download the installer for macOS
3. Run the `.pkg` file and follow the prompts
4. Re-run `git --version` to confirm

---

### Check 4 — VS Code (Code Editor)

VS Code is your text editor for the project — like Microsoft Word but for code. You will use this to read, write, and edit files.

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

## PART 2 — GitHub Account Setup (Everyone)

GitHub is where the team's code lives. Think of it as a shared Google Drive, but specifically for code — with proper version tracking so nobody accidentally overwrites someone else's work.

### Step 1 — Create a GitHub account
1. Go to **https://github.com**
2. Click **Sign up** and create a free account
3. Verify your email address
4. **Send your GitHub username to Debashish** via your team chat

### Step 2 — Configure Git with your name
In Terminal, run these two commands (replace the placeholder text with your actual name and the email you used for GitHub):

```
git config --global user.name "Your Full Name"
```
```
git config --global user.email "your@email.com"
```

No output = success. That's normal.

---

## PART 3 — Getting the Project onto Your Mac

> **Wait for Debashish to do this step first.** Debashish will create the project repository on GitHub and send the team a link before anyone else runs these steps.

Once you have the link from Debashish:

### Step 1 — Clone the project
In Terminal, navigate to a folder where you want the project to live (your Desktop is fine):

```
cd ~/Desktop
```

Then clone (download) the project — replace `LINK-FROM-DEB` with the actual GitHub link he sends:

```
git clone LINK-FROM-DEB
```

This creates a folder called `mealmap` (or similar) on your Desktop.

### Step 2 — Open the project in VS Code
```
cd mealmap
code .
```

VS Code will open with the full project visible in the left panel.

### Step 3 — Install project dependencies
Still in Terminal (make sure you're inside the project folder from Step 2):

```
npm install
```

This downloads all the code libraries the project needs. You'll see a lot of text scroll by — this is normal. Wait for it to finish (usually 1–2 minutes).

---

## PART 4 — API Key Setup

> **Debashish coordinates this.** He will share the team's Anthropic API key securely (not via public chat or email). Do not post API keys anywhere.

Once you have the key from Debashish:

### Step 1 — Create your environment file
In VS Code, look at the left panel (the file explorer). Find the file called `.env.example`. Right-click it → **Copy**, then right-click in the same folder → **Paste**. Rename the copy to `.env` (just `.env` — no `.example`).

### Step 2 — Add the API key
Open `.env` in VS Code. You'll see a line that looks like:

```
ANTHROPIC_API_KEY=
```

Paste the key Debashish gave you after the `=` sign. Save the file (`Command + S`).

> ⚠️ The `.env` file will **not** be uploaded to GitHub — it's in the `.gitignore` list for exactly this reason. Your key stays local on your machine.

---

## PART 5 — Running the App Locally

### Start the app
In Terminal (inside the project folder):

```
npm run dev
```

### Open it in your browser
Open any browser and go to:

```
http://localhost:3000
```

You should see the MealMap app. 

To stop the app: click in Terminal and press `Control + C`.

---

## PART 6 — Day-to-Day Workflow

Every day when you sit down to work:

### Pull the latest changes first (before you start)
```
git pull
```
This fetches any changes your teammates made. Skipping this is like starting to edit a shared Google Doc from yesterday's version — you'll create conflicts.

### Save your work at the end of the day
```
git add .
git commit -m "Brief description of what you did"
git push
```

For example:
```
git commit -m "Rashi: vision prompt v2 with confidence scores"
```

**One rule:** commit messages should say what changed, not just "update" or "fix." Future you will thank present you.

---

## PART 7 — Role-Specific Notes

### Rashi — Vision Module
Your prompt files live in `/prompts/vision/`. Never edit prompts directly in the JavaScript code — always save a new version in that folder and reference it. This makes it easy to roll back if a new prompt behaves worse.

### Suba — Recipe Intelligence
Your prompt files live in `/prompts/recipe/`. The recipe prompt has a fixed JSON output contract — if you change the shape of what Claude returns, tell Debashish and Nikitha immediately, as their modules consume your output.

### Nikitha — Personalisation & Safety
You own the `.env` UserProfile shape and the safety intercept function. The safety layer runs **before** any recipe card is rendered — if it breaks, nothing shows on screen. Test with a known allergen like "peanuts" after every change.

### Debashish — Integration & Deployment
You own the Vercel deployment. When it's time to deploy (end of build week), you'll need to add the `ANTHROPIC_API_KEY` as an **Environment Variable** inside the Vercel dashboard — the `.env` file is only for local development and never goes to Vercel directly.

---

## Quick Reference — Terminal Commands

| What you want to do | Command |
|---|---|
| Open project folder | `cd ~/Desktop/mealmap` |
| Start the app | `npm run dev` |
| Stop the app | `Control + C` |
| Pull latest from team | `git pull` |
| See what you changed | `git status` |
| Save and push your work | `git add . && git commit -m "message" && git push` |
| Install new packages | `npm install` |

---

## Troubleshooting

**"Port 3000 is already in use"**
Something is already running on that port. Run `npm run dev -- --port 3001` to use port 3001 instead, then go to `http://localhost:3001`.

**"Cannot find module" error when starting the app**
You probably haven't installed dependencies. Run `npm install` first.

**"Permission denied" when running git commands**
You may not have been added to the GitHub repository yet. Send your GitHub username to Debashish.

**VS Code doesn't show the project files**
Make sure you used `code .` (with the dot) from inside the project folder. The dot means "open the current folder."

**The app loads but Claude API calls fail**
Check that your `.env` file exists, has no typos, and that the API key is correct. Restart the app after any `.env` changes (`Control + C`, then `npm run dev` again).

---

*MealMap MVP | April 2026 | Setup Guide v1.0*
