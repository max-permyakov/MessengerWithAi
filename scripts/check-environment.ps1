# Prime Messenger - Проверка окружения
# Запустите этот скрипт чтобы убедиться, что все компоненты установлены

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Prime Messenger - Проверка окружения" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Проверка .NET SDK
Write-Host "Проверка .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version
    Write-Host "  ✓ .NET SDK установлен: v$dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ .NET SDK НЕ найден" -ForegroundColor Red
    Write-Host "    Скачайте с: https://dotnet.microsoft.com/download" -ForegroundColor Gray
    $allGood = $false
}

# Проверка Node.js
Write-Host "Проверка Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js установлен: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js НЕ найден" -ForegroundColor Red
    Write-Host "    Скачайте с: https://nodejs.org/" -ForegroundColor Gray
    $allGood = $false
}

# Проверка npm
Write-Host "Проверка npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm установлен: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm НЕ найден" -ForegroundColor Red
    $allGood = $false
}

# Проверка Python
Write-Host "Проверка Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "  ✓ Python установлен: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python НЕ найден" -ForegroundColor Red
    Write-Host "    Скачайте с: https://www.python.org/" -ForegroundColor Gray
    $allGood = $false
}

# Проверка Ollama
Write-Host "Проверка Ollama..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version
    Write-Host "  ✓ Ollama установлен: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Ollama НЕ найден" -ForegroundColor Red
    Write-Host "    Скачайте с: https://ollama.ai/" -ForegroundColor Gray
    $allGood = $false
}

# Проверка SQL Server
Write-Host "Проверка SQL Server..." -ForegroundColor Yellow
$sqlInstalled = Get-Service -Name "MSSQL*" -ErrorAction SilentlyContinue
if ($sqlInstalled) {
    Write-Host "  ✓ SQL Server найден" -ForegroundColor Green
} else {
    Write-Host "  ⚠ SQL Server НЕ найден (может быть LocalDB)" -ForegroundColor Yellow
    Write-Host "    Скачайте с: https://www.microsoft.com/sql-server" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "  ✓ Все необходимые компоненты установлены!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Следующие шаги:" -ForegroundColor Cyan
    Write-Host "1. Настройте файлы .env и appsettings.json" -ForegroundColor White
    Write-Host "2. Запустите Ollama: ollama serve" -ForegroundColor White
    Write-Host "3. Загрузите модель: ollama pull llama2:7b" -ForegroundColor White
    Write-Host "4. Следуйте инструкциям в README.md" -ForegroundColor White
} else {
    Write-Host "  ✗ Некоторые компоненты отсутствуют" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Установите отсутствующие компоненты и запустите скрипт снова." -ForegroundColor Yellow
}

Write-Host ""
