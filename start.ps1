# Tiny Translator - Launch Script
# Windows PowerShell

Write-Host "[*] Tiny Translator - Starting..." -ForegroundColor Cyan
Write-Host ""

# Check if required files exist
$backendReqs = Test-Path ".\backend\requirements.txt"
$frontendPackage = Test-Path ".\frontend\package.json"

if (-not $backendReqs -or -not $frontendPackage) {
    Write-Host "[ERROR] Project files missing. Check directory structure." -ForegroundColor Red
    exit 1
}

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[*] Installing dependencies..." -ForegroundColor Cyan

# Install backend dependencies
Write-Host "  [*] Backend dependencies..." -ForegroundColor Yellow
Set-Location backend
python -m pip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Backend dependencies installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "  [OK] Backend dependencies installed" -ForegroundColor Green
Set-Location ..

# Install frontend dependencies
Write-Host "  [*] Frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Frontend dependencies installation failed" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
Write-Host "  [OK] Frontend dependencies installed" -ForegroundColor Green

# Compile TypeScript
Write-Host "  [*] Compiling TypeScript..." -ForegroundColor Yellow
npm run build --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] TypeScript compilation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "  [OK] Compilation done" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "[OK] Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Hotkeys:" -ForegroundColor Cyan
Write-Host "  * Ctrl+F10      - Capture selected text" -ForegroundColor White
Write-Host "  * Ctrl+Shift+T  - Toggle window" -ForegroundColor White
Write-Host ""

# Start the application
Write-Host "[*] Starting application..." -ForegroundColor Cyan
Set-Location frontend
npm start
