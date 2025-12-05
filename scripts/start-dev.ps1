#!/usr/bin/env pwsh
# Start both backend and frontend development servers

Write-Host "🚀 Starting VoxelPromo Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Start backend in WSL in a new PowerShell window
Write-Host "📦 Starting Backend (WSL)..." -ForegroundColor Blue
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd b:\voxelpromo; wsl -e bash -c `"cd /mnt/b/voxelpromo && npm run dev:backend`""

# Wait a bit to ensure backend starts first
Start-Sleep -Seconds 3

# Start frontend in Windows in a new PowerShell window
Write-Host "🎨 Starting Frontend (Windows)..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd b:\voxelpromo\frontend; npm run dev"

Write-Host ""
Write-Host "✅ Development servers starting..." -ForegroundColor Cyan
Write-Host "   Backend will be at: http://localhost:3000" -ForegroundColor Blue
Write-Host "   Frontend will be at: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Two new PowerShell windows will open." -ForegroundColor Yellow
Write-Host "    Close them to stop the servers." -ForegroundColor Yellow
