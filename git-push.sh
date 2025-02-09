#!/bin/bash

# Initialize git repository if not already initialized
if [ ! -d .git ]; then
    git init
fi

# Add all files to staging
git add .

# Create a commit
git commit -m "Initial commit"

# If remote is not set, you'll need to set it manually using:
# git remote add origin <your-repository-url>

# Push to remote repository
git push -u origin main
