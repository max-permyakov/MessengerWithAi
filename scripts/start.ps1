# Prime Messenger - Быстрый старт
# Этот скрипт проверяет окружение и предлагает запустить компоненты

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     Prime Messenger - Быстрый старт" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Проверка, что скрипт запущен из корневой директории
if (-not (Test-Path "Prime\Messenger") -or -not (Test-Path "Bot")) {
    Write-Host "Ошибка: Запустите скрипт из корневой директории проекта!" -ForegroundColor Red
    Write-Host "Текущая директория: $PWD" -ForegroundColor Gray
    exit 1
}

Write-Host "Проверка компонентов..." -ForegroundColor Yellow
Write-Host ""

# Проверка .env файлов
$envFilesOk = $true

if (-not (Test-Path "Bot\.env")) {
    Write-Host "  ⚠ Bot\.env не найден. Скопируйте .env.example и заполните." -ForegroundColor Yellow
    $envFilesOk = $false
} else {
    Write-Host "  ✓ Bot\.env найден" -ForegroundColor Green
}

if (-not (Test-Path "Prime\messanger-front\.env.local")) {
    Write-Host "  ⚠ Frontend\.env.local не найден. Скопируйте .env.example." -ForegroundColor Yellow
    $envFilesOk = $false
} else {
    Write-Host "  ✓ Frontend\.env.local найден" -ForegroundColor Green
}

if (-not (Test-Path "Prime\Messenger\appsettings.json")) {
    Write-Host "  ✗ Backend\appsettings.json не найден!" -ForegroundColor Red
    $envFilesOk = $false
} else {
    Write-Host "  ✓ Backend\appsettings.json найден" -ForegroundColor Green
}

Write-Host ""

if (-not $envFilesOk) {
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host "  ВНИМАНИЕ: Не все файлы конфигурации найдены" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Создайте отсутствующие файлы перед запуском:" -ForegroundColor Cyan
    Write-Host "  1. Bot\.env (скопируйте из .env.example)" -ForegroundColor White
    Write-Host "  2. Prime\messanger-front\.env.local (скопируйте из .env.example)" -ForegroundColor White
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Запуск компонентов" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Выберите, что запустить:" -ForegroundColor Yellow
Write-Host "  1. Backend (ASP.NET)" -ForegroundColor White
Write-Host "  2. Frontend (React)" -ForegroundColor White
Write-Host "  3. Telegram Bot (Python)" -ForegroundColor White
Write-Host "  4. Все компоненты" -ForegroundColor White
Write-Host "  5. Выход" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Ваш выбор (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Запуск Backend..." -ForegroundColor Green
        Set-Location "Prime\Messenger"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "dotnet run"
        Write-Host "Backend запущен в новом окне!" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "Запуск Frontend..." -ForegroundColor Green
        Set-Location "Prime\messanger-front"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
        Write-Host "Frontend запущен в новом окне!" -ForegroundColor Green
    }
    "3" {
        Write-Host ""
        Write-Host "Запуск Telegram Bot..." -ForegroundColor Green
        Set-Location "Bot"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\.venv\Scripts\Activate.ps1; python run.py"
        Write-Host "Bot запущен в новом окне!" -ForegroundColor Green
    }
    "4" {
        Write-Host ""
        Write-Host "Запуск всех компонентов..." -ForegroundColor Green
        
        # Backend
        $backendPath = Join-Path $PWD "Prime\Messenger"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; dotnet run" -WindowStyle Normal
        Write-Host "  ✓ Backend запущен" -ForegroundColor Green
        
        # Frontend
        $frontendPath = Join-Path $PWD "Prime\messanger-front"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
        Write-Host "  ✓ Frontend запущен" -ForegroundColor Green
        
        # Bot
        $botPath = Join-Path $PWD "Bot"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$botPath'; .\.venv\Scripts\Activate.ps1; python run.py" -WindowStyle Normal
        Write-Host "  ✓ Bot запущен" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Все компоненты запущены в отдельных окнах!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Адреса:" -ForegroundColor Cyan
        Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
        Write-Host "  Backend:  http://localhost:4000 / https://localhost:4001" -ForegroundColor White
    }
    "5" {
        Write-Host "Выход..." -ForegroundColor Gray
        exit 0
    }
    default {
        Write-Host "Неверный выбор!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Для остановки нажмите Ctrl+C в каждом окне" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
