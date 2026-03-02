#!/bin/bash
# Emergency fix and commit

cd /Users/piyushkumar/Work_Repo/load_sut_project

echo "Fixing _routes.json..."
cat public/_routes.json

echo ""
echo "Committing fix..."
git add -A
git commit -m "Fix _routes.json - allow all routes including Functions"
git push

echo ""
echo "✅ Done! Wait 1-2 minutes for Cloudflare to redeploy"
echo "Then test with: ./validate.sh https://load-testing-sut.pages.dev"
