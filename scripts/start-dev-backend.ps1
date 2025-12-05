#!/usr/bin/env pwsh
# Start the backend development server in WSL
Write-Host "🚀 Starting VoxelPromo Backend in WSL..." -ForegroundColor Blue
wsl -e bash -c "cd /mnt/b/voxelpromo && npm run dev:backend"
