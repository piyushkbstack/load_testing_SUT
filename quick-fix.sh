#!/bin/bash
# Quick fix: Remove invalid function filename

cd /Users/piyushkumar/Work_Repo/load_sut_project

echo "Removing invalid [...path].js file..."
rm -f "functions/api/[...path].js"

echo "Files remaining:"
ls -la functions/api/

echo ""
echo "Committing changes..."
git add -A
git commit -m "Remove invalid [...path].js - Cloudflare Pages doesn't support spread syntax in filenames"
git push

echo ""
echo "✅ Done! Cloudflare will auto-redeploy."
echo "The [[route]].js file will handle all /api/* routes."
