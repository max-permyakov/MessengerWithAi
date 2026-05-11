# ============================================
# Prime Messenger Frontend Setup Script
# ============================================
# Этот скрипт автоматически настраивает ваш проект
# Запускайте его в папке Prime/messanger-front

Write-Host "🚀 Prime Messenger Frontend Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Переменные
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $projectRoot "messanger-front"
$envLocalPath = Join-Path $frontendDir ".env.local"
$envExamplePath = Join-Path $frontendDir ".env.example"

# Проверка Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node -v
Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Проверка npm
Write-Host "Checking npm..." -ForegroundColor Yellow
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

$npmVersion = npm -v
Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
Write-Host ""

# Установка зависимостей
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Set-Location $frontendDir

if (Test-Path node_modules) {
    Write-Host "Warning: node_modules already exists. It's recommended to remove it first." -ForegroundColor Yellow
    $confirm = Read-Host "Remove node_modules and reinstall? (yes/no)"
    if ($confirm -eq "yes") {
        Remove-Item -Recurse -Force node_modules
        npm install
    }
} else {
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Создание .env.local
Write-Host "Setting up .env.local..." -ForegroundColor Yellow

if (-not (Test-Path $envLocalPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envLocalPath
        Write-Host "✓ Created .env.local from .env.example" -ForegroundColor Green
        Write-Host "" -ForegroundColor Yellow
        Write-Host "Please edit .env.local with your settings:" -ForegroundColor Yellow
        Write-Host "  - VITE_API_URL: http://localhost:4000 (for local dev)" -ForegroundColor Yellow
        Write-Host "                  https://your-server:4001 (for production)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Opening .env.local in Notepad..." -ForegroundColor Yellow
        notepad $envLocalPath
    } else {
        Write-Host "❌ .env.example not found!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ .env.local already exists" -ForegroundColor Green
    Write-Host ""
    $confirm = Read-Host "Overwrite .env.local? (yes/no)"
    if ($confirm -eq "yes") {
        Copy-Item $envExamplePath $envLocalPath -Force
        Write-Host "✓ .env.local overwritten" -ForegroundColor Green
        Write-Host ""
        Write-Host "Opening .env.local in Notepad..." -ForegroundColor Yellow
        notepad $envLocalPath
    }
}

Write-Host ""

# Генерация сертификатов
Write-Host "Generating SSL certificates..." -ForegroundColor Yellow
$certScript = Join-Path $frontendDir "scripts\generate-certs.ps1"

if (Test-Path $certScript) {
    # Check if mkcert is installed
    $mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
    if ($mkcert) {
        Write-Host "Running certificate generation script..." -ForegroundColor Yellow
        & $certScript.Source
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Certificates generated" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Certificate generation had issues, but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  mkcert not found. HTTPS will not work." -ForegroundColor Yellow
        Write-Host "Install with: choco install mkcert" -ForegroundColor Yellow
        Write-Host "Then run: $(Split-Path $certScript -Leaf)" -ForegroundColor Yellow
        Write-Host ""
    }
} else {
    Write-Host "⚠️  Certificate generation script not found" -ForegroundColor Yellow
}

Write-Host ""

# Создание short-cut bat files
Write-Host "Creating startup scripts..." -ForegroundColor Yellow

$frontendBat = Join-Path $frontendDir "start-frontend.bat"
$frontendContent = "@echo off`ncd /d `"%~dp0`"`nstart "" Messenger Frontend npm run dev`necho Messenger Frontend started. Open http://localhost:5173 in your browser."
Set-Content $frontendBat $frontendContent

Write-Host "✓ Created start-frontend.bat" -ForegroundColor Green

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ".Setup complete!`n" -ForegroundColor Green
Write-Host "Next steps:`n" -ForegroundColor White

if (Test-Path $envLocalPath) {
    Write-Host "1. Edit .env.local with your settings:" -ForegroundColor Cyan
    Write-Host "   cd `"%frontendDir`"" -ForegroundColor Gray
    Write-Host "   notepad .env.local`n" -ForegroundColor Gray
}

Write-Host "2. Start the frontend:" -ForegroundColor Cyan
Write-Host "   cd `"%frontendDir`"" -ForegroundColor Gray
Write-Host "   npm run dev`n" -ForegroundColor Gray
Write-Host "   or double-click start-frontend.bat`n" -ForegroundColor Gray

Write-Host "3. Open http://localhost:5173 in your browser`n" -ForegroundColor Cyan

Write-Host "4. For production, also need:" -ForegroundColor Cyan
Write-Host "   - Backend server running on your server" -ForegroundColor Gray
Write-Host "   - HTTPS certificate for production domain" -ForegroundColor Gray
Write-Host "   - Update VITE_API_URL in .env.local`n" -ForegroundColor Gray

Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

exit 0
