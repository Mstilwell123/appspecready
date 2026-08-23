#!/bin/bash
# Deploy AppSpecReady to Netlify
# This script uploads the dist/ folder as a site

cd /c/Users/stilw/Projects/AppBuilderSuperApp

# Ensure dist is built
npm run build 2>&1 | tail -3

# Deploy to Netlify (this creates a new draft site)
echo "Deploying to Netlify..."
netlify deploy --dir=dist --prod
