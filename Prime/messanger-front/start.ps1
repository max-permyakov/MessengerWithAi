# Запуск Frontend Prime Messenger
Write-Host "🚀 Starting Frontend Prime Messenger..." -ForegroundColor Green

# Перейти в директорию Frontend
cd "C:\Users\maksi\Documents\Github_Repositories\ChatBotWIthOllama\Prime\messanger-front"

# Проверить, что .env.local существует
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found!" -ForegroundColor Yellow
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "Please edit .env.local with correct settings!" -ForegroundColor Yellow
}

# Запустить Frontend
npm run dev
