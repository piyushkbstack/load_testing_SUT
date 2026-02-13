#!/bin/bash

# Cloudflare Pages Manual Deployment Helper
# Since direct upload doesn't support Functions, use GitHub integration

echo "=================================================="
echo "  Cloudflare Pages Deployment Guide"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANT: Manual upload does NOT support Functions!"
echo ""
echo "Your API endpoints require Cloudflare Pages Functions."
echo "You MUST use one of these deployment methods:"
echo ""
echo "✅ Option 1: GitHub Integration (RECOMMENDED)"
echo "   1. Ensure code is pushed to GitHub"
echo "   2. Go to: https://dash.cloudflare.com/pages"
echo "   3. Click 'Create a project'"
echo "   4. Click 'Connect to Git'"
echo "   5. Select your repository: load_testing_SUT"
echo "   6. Configure:"
echo "      - Framework preset: None"
echo "      - Build command: (leave empty)"
echo "      - Build output directory: public"
echo "   7. Click 'Save and Deploy'"
echo ""
echo "✅ Option 2: Wrangler CLI (Requires Node 20+)"
echo "   $ npm install -g wrangler"
echo "   $ wrangler pages deploy public --project-name=rca-mock-site"
echo ""
echo "=================================================="
echo ""

# Check if code is pushed
if git status --porcelain | grep -q .; then
    echo "⚠️  You have uncommitted changes!"
    echo ""
    git status --short
    echo ""
    echo "Run these commands to commit and push:"
    echo "  git add -A"
    echo "  git commit -m 'Deploy to Cloudflare Pages'"
    echo "  git push"
else
    echo "✅ All changes are committed"
    
    # Check if pushed
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u} 2>/dev/null)
    
    if [ -z "$REMOTE" ]; then
        echo "⚠️  No remote tracking branch found"
        echo ""
        echo "Set up remote:"
        echo "  git remote add origin https://github.com/piyushkbstack/load_testing_SUT.git"
        echo "  git push -u origin main"
    elif [ "$LOCAL" != "$REMOTE" ]; then
        echo "⚠️  Local commits not pushed to GitHub"
        echo ""
        echo "Push your changes:"
        echo "  git push"
    else
        echo "✅ Code is up to date on GitHub"
        echo ""
        echo "✨ Ready to deploy!"
        echo ""
        echo "Next steps:"
        echo "1. Go to: https://dash.cloudflare.com/pages"
        echo "2. Connect to your GitHub repository"
        echo "3. Deploy!"
    fi
fi

echo ""
echo "=================================================="
echo ""
echo "📚 For detailed instructions, see:"
echo "   - README.md"
echo "   - DEPLOYMENT.md"
echo "   - DEPLOYMENT_FIX.md"
echo ""
