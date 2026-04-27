#!/usr/bin/env bash
# ============================================================
#  PictureToPlate — GitHub repo bootstrap script
#  Run once from the project root after cloning/creating.
#  Usage: bash scripts/git_setup.sh YOUR_GITHUB_USERNAME
# ============================================================

set -e

GITHUB_USER=${1:-"YOUR_USERNAME"}
REPO_NAME="picturetoplate"
REMOTE="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "🔧 Initializing Git repo..."
git init
git branch -M main

echo "📝 Setting up .gitconfig commit conventions..."
git config commit.template .gitmessage 2>/dev/null || true

echo "📦 First commit..."
git add .
git commit -m "chore: initial project scaffold

- FastAPI backend with Anthropic vision + recipe endpoints
- pydantic-settings for env/secrets management
- CORS, rate limiting, health check
- GitHub Actions CI workflow
- Branch strategy: main ← develop ← feat/*"

echo "🌿 Creating develop branch..."
git checkout -b develop

echo "🔗 Adding remote origin..."
git remote add origin "$REMOTE" 2>/dev/null || git remote set-url origin "$REMOTE"

echo ""
echo "✅ Done. Next steps:"
echo "   1. Create the repo on GitHub (github.com/new) — name it '${REPO_NAME}', keep it empty"
echo "   2. Push both branches:"
echo "      git push -u origin main"
echo "      git push -u origin develop"
echo "   3. On GitHub → Settings → Branches:"
echo "      - Protect 'main': require PR + passing CI before merge"
echo "      - Set 'develop' as default branch"
echo "   4. Add your Anthropic API key to GitHub Secrets:"
echo "      Settings → Secrets and variables → Actions → New repository secret"
echo "      Name: ANTHROPIC_API_KEY"
