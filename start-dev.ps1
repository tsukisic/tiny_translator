# Tiny Translator - Development Mode Launcher
# This script starts backend and frontend in separate windows

Write-Host "[*] Tiny Translator - Development Mode" -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "[*] Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python server.py"

# Wait for backend to start
Write-Host "[*] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start frontend
Write-Host "[*] Starting frontend..." -ForegroundColor Yellow
Set-Location frontend

# Check if TypeScript is compiled
if (-not (Test-Path "dist")) {
    Write-Host "[*] Compiling TypeScript..." -ForegroundColor Yellow
    npm run build
}

npm start
