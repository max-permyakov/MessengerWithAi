# ============================================
# Prime Messenger — Универсальный скрипт установки
# ============================================
# Этот скрипт настраивает ВСЁ проект автоматически
# Запускайте в корне: .\install-all.ps1

Write-Host "🚀 Prime Messenger — Универсальная установка" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ==================== ПРОВЕРКА ОКРУЖЕНИЯ ====================

Write-Host "[1/7] Проверка окружения..." -ForegroundColor Yellow

# Проверка Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js не найден!" -ForegroundColor Red
    Write-Host "Установите: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Node.js: $(node -v)" -ForegroundColor Green

# Проверка npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm не найден!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ npm: $(npm -v)" -ForegroundColor Green

# Проверка .NET SDK
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "❌ .NET SDK не найден!" -ForegroundColor Red
    Write-Host "Установите: https://dotnet.microsoft.com/download" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ .NET SDK: $(dotnet --version)" -ForegroundColor Green

# Проверка Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Python не найден. Для AI-сервиса установите Python 3.11+" -ForegroundColor Yellow
    $askPython = Read-Host "Продолжить без AI? (y/n)"
    if ($askPython -ne "y") {
        exit 1
    }
    $hasPython = $false
} else {
    Write-Host "  ✓ Python: $(python --version 2>&1)" -ForegroundColor Green
    $hasPython = $true
}

# Проверка Ollama
$hasOllama = $false
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host "  ✓ Ollama найден: $(ollama version 2>&1 | Select-Object -First 1)" -ForegroundColor Green
    $hasOllama = $true
} else {
    Write-Host "  ⚠️  Ollama не найден" -ForegroundColor Yellow
}

Write-Host ""

# ==================== НАСТРОЙКА FRONTEND ====================

Write-Host "[2/7] Настройка Frontend..." -ForegroundColor Yellow

$frontendDir = Join-Path $PSScriptRoot "Prime\messanger-front"
Set-Location $frontendDir

# Установка зависимостей
Write-Host "  Установка зависимостей..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    $confirm = Read-Host "node_modules уже существует. Пересобрать? (y/n)"
    if ($confirm -eq "y") {
        Remove-Item -Recurse -Force node_modules
        npm install
    }
} else {
    npm install
}

# Выбор протокола (HTTP/HTTPS)
Write-Host ""
Write-Host "Выберите протокол для Backend:" -ForegroundColor Yellow
Write-Host "1) HTTP (для локальной разработки, без HTTPS)" -ForegroundColor Cyan
Write-Host "2) HTTPS (для работы в сети, уведомления работают)" -ForegroundColor Cyan
$protocolChoice = Read-Host "Введите 1 или 2"

if ($protocolChoice -eq "1") {
    $apiUrl = "http://localhost:4000"
    $protocol = "http"
} else {
    $apiUrl = "https://localhost:4001"
    $protocol = "https"
}

Write-Host "  ✓ Выбран протокол: $protocol" -ForegroundColor Green

# Создание .env.local
$envLocalPath = Join-Path $frontendDir ".env.local"
@"
VITE_API_URL=$apiUrl
"@ | Set-Content $envLocalPath

Write-Host "  ✓ Создан .env.local" -ForegroundColor Green

# Генерация сертификатов для HTTPS
if ($protocol -eq "https") {
    Write-Host "  Генерация SSL-сертификатов..." -ForegroundColor Yellow
    
    # Проверка OpenSSL
    $opensslCmd = Get-Command openssl -ErrorAction SilentlyContinue
    if (-not $opensslCmd) {
        Write-Host "  ⚠️  OpenSSL не найден (нужен для .pfx)" -ForegroundColor Yellow
        Write-Host "  Установка OpenSSL через winget..." -ForegroundColor Yellow
        
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            try {
                winget install --id FireDaemon.OpenSSL -e --silent --accept-source-agreements --accept-package-agreements | Out-Null
                
                # Обновляем PATH
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
                
                # Проверяем снова
                $opensslCmd = Get-Command openssl -ErrorAction SilentlyContinue
                if ($opensslCmd) {
                    Write-Host "  ✓ OpenSSL установлен" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠️  OpenSSL установлен, но требуется перезапуск терминала" -ForegroundColor Yellow
                    Write-Host "  Сертификаты .pem будут созданы, но .pfx потребует перезапуска" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  ⚠️  Не удалось установить OpenSSL автоматически" -ForegroundColor Yellow
                Write-Host "  Установите вручную: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠️  winget не найден. Установите OpenSSL вручную" -ForegroundColor Yellow
            Write-Host "  https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
        }
    }
    
    # Генерация сертификатов
    $certScript = Join-Path $frontendDir "scripts\generate-certs.ps1"
    if (Test-Path $certScript) {
        & $certScript
    } else {
        Write-Host "  ⚠️  Скрипт генерации сертификатов не найден" -ForegroundColor Yellow
    }
}

Write-Host ""

# ==================== НАСТРОЙКА BACKEND ====================

Write-Host "[3/7] Настройка Backend (ASP.NET)..." -ForegroundColor Yellow

$backendDir = Join-Path $PSScriptRoot "Prime\Messenger"
Set-Location $backendDir

# Генерация JWT ключа
Write-Host "  Генерация JWT ключа..." -ForegroundColor Yellow
$jwtKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "  ✓ Сгенерирован JWT ключ (64 символа)" -ForegroundColor Green
Write-Host ""

# Получение строки подключения от пользователя
Write-Host "Введите строку подключения к БД:" -ForegroundColor Yellow
Write-Host "Пример для SQL Server:" -ForegroundColor Gray
Write-Host "  Server=localhost\\SQLEXPRESS;Database=MessangerDb;Trusted_Connection=True;TrustServerCertificate=True;" -ForegroundColor Gray
Write-Host ""
$connectionString = Read-Host "Строка подключения"

# Создание appsettings.Development.json вручную (точно как в примере)
if ($protocol -eq "https") {
    $appSettingsJson = @"
{{
  "Logging": {{
    "LogLevel": {{
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }}
  }},
  "AllowedHosts": "*",
  "ConnectionStrings": {{
    "DefaultConnection": "{0}"
  }},
  "Jwt": {{
    "Key": "{1}",
    "Issuer": "Messenger",
    "Audience": "Messanger"
  }},
  "AiService": {{
    "BaseUrl": "http://localhost:8000"
  }},
  "Features": {{
    "AiEnabled": {2}
  }},
  "Https": {{
    "Url": "https://0.0.0.0:4001",
    "Certificate": {{
      "Path": "../messanger-front/certs/prime-dev.pfx",
      "Password": "changeit"
    }}
  }}
}}
"@ -f $connectionString, $jwtKey, $hasOllama.ToString().ToLower()
} else {
    $appSettingsJson = @"
{{
  "Logging": {{
    "LogLevel": {{
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }}
  }},
  "AllowedHosts": "*",
  "ConnectionStrings": {{
    "DefaultConnection": "{0}"
  }},
  "Jwt": {{
    "Key": "{1}",
    "Issuer": "Messenger",
    "Audience": "Messanger"
  }},
  "AiService": {{
    "BaseUrl": "http://localhost:8000"
  }},
  "Features": {{
    "AiEnabled": {2}
  }}
}}
"@ -f $connectionString, $jwtKey, $hasOllama.ToString().ToLower()
}

$appSettingsJson | Set-Content "appsettings.Development.json" -Encoding UTF8

Write-Host "  ✓ Создан appsettings.Development.json" -ForegroundColor Green
Write-Host ""

# ==================== НАСТРОЙКА OLLAMA ====================

Write-Host "[4/7] Настройка Ollama..." -ForegroundColor Yellow

if ($hasOllama) {
    Write-Host "Ollama уже установлен!" -ForegroundColor Green
    
    $ollamaModels = ollama list 2>$null | Select-Object -Skip 1 | ForEach-Object { ($_ -split '\s+')[0] }
    
    if ($ollamaModels.Count -gt 0) {
        Write-Host "Найденные модели:" -ForegroundColor Yellow
        $ollamaModels | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
        Write-Host ""
    }
    
    $askModel = Read-Host "Хотите загрузить новую модель? (y/n)"
    if ($askModel -eq "y") {
        $modelName = Read-Host "Введите имя модели (например, llama2:7b)"
        Write-Host "Загрузка модели $modelName..." -ForegroundColor Yellow
        ollama pull $modelName
    }
} else {
    Write-Host "Установка Ollama..." -ForegroundColor Yellow
    $askOllama = Read-Host "Установить Ollama через winget? (y/n)"
    if ($askOllama -eq "y") {
        winget install Ollama.Ollama
        $hasOllama = $true
    } else {
        Write-Host "Установите Ollama вручную: https://ollama.ai/" -ForegroundColor Yellow
    }
}

Write-Host ""

# ==================== ЗАПУСК КОМПОНЕНТОВ ====================

Write-Host "[5/7] Запуск компонентов..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Выберите, что запустить:" -ForegroundColor Yellow
Write-Host "1) Только Frontend (для тестирования)" -ForegroundColor Cyan
Write-Host "2) Frontend + Backend (для локальной разработки)" -ForegroundColor Cyan
Write-Host "3) Все компоненты (Frontend + Backend + AI Service)" -ForegroundColor Cyan
$runChoice = Read-Host "Введите 1, 2 или 3"

# Запуск AI Service (если есть Ollama)
if ($hasOllama -and $runChoice -in @("2", "3")) {
    Write-Host ""
    Write-Host "Запуск AI Service..." -ForegroundColor Yellow
    $aiServiceDir = Join-Path $PSScriptRoot "Bot"
    Set-Location $aiServiceDir
    
    # Создание виртуального окружения
    if (-not (Test-Path ".venv")) {
        Write-Host "  Создание виртуального окружения..." -ForegroundColor Yellow
        python -m venv .venv
    }
    
    # Активация и установка зависимостей
    Write-Host "  Установка зависимостей AI Service..." -ForegroundColor Yellow
    . .venv\Scripts\activate
    pip install -r requirements.txt
    
    # Запуск AI Service
    Write-Host "  Запуск AI Service на http://localhost:8000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$aiServiceDir'; . .venv\Scripts\activate; python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000 --reload"
    
    Start-Sleep -Seconds 3
}

# Запуск Backend
if ($runChoice -in @("2", "3")) {
    Write-Host ""
    Write-Host "Запуск Backend..." -ForegroundColor Yellow
    Set-Location $backendDir
    
    # Применение миграций
    Write-Host "  Применение миграций БД..." -ForegroundColor Yellow
    dotnet ef database update
    
    # Запуск Backend
    Write-Host "  Запуск Backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; dotnet run"
    
    Start-Sleep -Seconds 5
}

# Запуск Frontend
Write-Host ""
Write-Host "Запуск Frontend..." -ForegroundColor Yellow
Set-Location $frontendDir
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Установка завершена!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Открытые порты:" -ForegroundColor Yellow
Write-Host "  Frontend:   https://localhost:5173" -ForegroundColor Cyan
if ($protocol -eq "https") {
    Write-Host "  Backend:    https://localhost:4001" -ForegroundColor Cyan
} else {
    Write-Host "  Backend:    http://localhost:4000" -ForegroundColor Cyan
}
if ($hasOllama) {
    Write-Host "  AI Service: http://localhost:8000" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Откройте браузер и проверьте работу!" -ForegroundColor Green
Write-Host ""
