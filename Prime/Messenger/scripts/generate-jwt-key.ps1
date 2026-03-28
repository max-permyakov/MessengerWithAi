# Скрипт для генерации безопасного JWT ключа
# Запустите в PowerShell и скопируйте результат в appsettings.json

$key = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "Сгенерированный JWT Key (64 символа):" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host $key -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Скопируйте этот ключ в appsettings.json в поле Jwt:Key" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для генерации нового ключа запустите скрипт снова." -ForegroundColor Gray
