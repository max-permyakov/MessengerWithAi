# 🔐 Безопасность Prime Messenger

Этот документ описывает меры безопасности и рекомендации по защите вашего мессенджера.

## 📋 Содержание

- [Чувствительные данные](#чувствительные-данные)
- [JWT токены](#jwt-токены)
- [SSL/TLS](#ssltls)
- [Безопасность БД](#безопасность-бд)
- [Защита API](#защита-api)
- [Telegram-бот](#telegram-бот)
- [Рекомендации по развёртыванию](#рекомендации-по-развёртыванию)

---

## 🗝️ Чувствительные данные

### Никогда не коммитьте в Git

Следующие файлы содержат чувствительные данные и **НЕ ДОЛЖНЫ** попадать в репозиторий:

| Файл | Что содержит | Почему важно |
|------|-------------|--------------|
| `Bot/.env` | Токен Telegram-бота | Доступ к боту от вашего имени |
| `Prime/messanger-front/.env.local` | API URL | Может раскрыть внутреннюю инфраструктуру |
| `Prime/Messenger/appsettings.json` | JWT ключ, строка подключения к БД | Полный доступ к системе |
| `Prime/Messenger/certs/*.pfx` | SSL-сертификаты | Позволяют выдать себя за сервер |
| `*.db` | База данных | Содержит хеши паролей, переписки |

### Проверка перед коммитом

Перед каждым коммитом проверяйте:

```bash
# Проверка изменений
git status

# Проверка, что .env файлы игнорируются
git check-ignore -v Bot/.env
git check-ignore -v Prime/messanger-front/.env.local

# Просмотр того, что будет закоммичено
git diff --cached
```

---

## 🔑 JWT токены

### Генерация безопасного ключа

**НЕ ИСПОЛЬЗУЙТЕ** ключ по умолчанию из примера!

Сгенерируйте новый ключ:

```powershell
# Windows PowerShell
cd Prime/Messenger
.\scripts\generate-jwt-key.ps1
```

```bash
# Linux/Mac (альтернатива)
openssl rand -base64 64
```

### Требования к ключу

- ✅ Минимум 64 символа
- ✅ Случайная генерация
- ✅ Уникальный для каждого развёртывания
- ✅ Хранится в секрете

### Rotation ключей

Меняйте JWT ключ:
- При каждом развёртывании в production
- При подозрении на утечку
- Каждые 90 дней (рекомендуется)

После смены ключа все пользователи должны будут войти заново.

---

## 🔒 SSL/TLS

### Для разработки

Используйте самоподписанные сертификаты:

```powershell
cd Prime/Messenger
.\scripts\generate-certs.ps1
```

**Пароль по умолчанию**: `changeit`

### Для production

Используйте доверенные сертификаты (Let's Encrypt):

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com
```

### Требования

- ✅ TLS 1.2 или выше
- ✅ TLS 1.3 (рекомендуется)
- ✅ Сильные шифры (AES-256-GCM)
- ✅ HSTS заголовки

---

## 🗄️ Безопасность БД

### SQL Server

#### Для разработки
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=MessangerDb;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

#### Для production
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=your-server;Database=MessangerDb;User Id=messenger_user;Password=StrongPassword123!;Encrypt=True;TrustServerCertificate=False;"
}
```

**Требования**:
- ✅ Отдельный пользователь БД (не sa/root)
- ✅ Сложный пароль (минимум 16 символов)
- ✅ Шифрование соединения (Encrypt=True)
- ✅ Минимальные привилегии

### SQLite (если используется)

```bash
# Защита файла БД
chmod 600 Messenger.db
chown www-data:www-data Messenger.db
```

---

## 🌐 Защита API

### CORS

Настройте CORS для ограничения доступа:

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowProduction", policy =>
    {
        policy.WithOrigins("https://your-domain.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
```

**НЕ используйте** `AllowAnyOrigin()` в production!

### Rate Limiting

Ограничьте количество запросов:

```csharp
// Добавьте пакет: Microsoft.AspNetCore.RateLimiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        httpContext => RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.Identity?.Name ?? "anonymous",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));
});
```

### Валидация токенов

Проверьте настройки аутентификации:

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.Zero, // Уменьшите время жизни токена
            // ...
        };
    });
```

---

## 🤖 Telegram-бот

### Защита токена

Токен бота — это ключ доступа:

- ✅ Храните в `.env` файле
- ✅ Никогда не коммитьте в Git
- ✅ Меняйте при утечке через @BotFather
- ✅ Используйте переменные окружения в production

### Ограничение доступа

Настройте `ADMIN_IDS` и `USER_IDS` в `.env`:

```env
# Только эти пользователи могут использовать бота
ADMIN_IDS=123456789,987654321
USER_IDS=123456789,987654321,111222333

# Запретить использование в группах (если не нужно)
ALLOW_ALL_USERS_IN_GROUPS=0
```

### Получение User ID

Используйте бота [@userinfobot](https://t.me/userinfobot) для получения вашего ID.

---

## 🚀 Рекомендации по развёртыванию

### 1. Изоляция

- ✅ Используйте отдельные серверы для БД и приложения
- ✅ Запускайте от имени непривилегированного пользователя
- ✅ Используйте контейнеры (Docker) для изоляции

### 2. Фаервол

Настройте правила:

```bash
# Разрешить только необходимые порты
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (для редиректа)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 4000/tcp     # Backend (только internal)
sudo ufw deny 11434/tcp    # Ollama (только internal)
sudo ufw enable
```

### 3. Мониторинг

Настройте логирование:

```bash
# Просмотр логов в реальном времени
sudo journalctl -u prime-messenger-backend -f

# Анализ попыток входа
grep "Unauthorized" /var/log/nginx/access.log
```

### 4. Резервное копирование

```bash
# Скрипт резервного копирования
sudo nano /usr/local/bin/backup-messenger.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/messenger"

# Бэкап БД
cp /var/www/prime-messenger/Messenger.db $BACKUP_DIR/db_$DATE.db

# Бэкап конфигов (без секретов!)
cp /var/www/prime-messenger/Prime/Messenger/appsettings.Production.json $BACKUP_DIR/config_$DATE.json

# Удаление старых бэкапов
find $BACKUP_DIR -mtime +30 -delete
```

### 5. Обновления

Регулярно обновляйте:

```bash
# Система
sudo apt update && sudo apt upgrade -y

# Зависимости
cd Prime/Messenger && dotnet restore
cd Prime/messanger-front && npm update
cd Bot && pip install --upgrade -r requirements.txt

# Ollama модели
ollama pull llama2:7b
```

---

## 🛡️ Чеклист безопасности

Перед развёртыванием в production:

- [ ] Сгенерирован новый JWT ключ
- [ ] Настроен HTTPS с доверенным сертификатом
- [ ] Изменены все пароли по умолчанию
- [ ] Настроен фаервол
- [ ] Ограничен доступ к БД
- [ ] Включено логирование
- [ ] Настроено резервное копирование
- [ ] Проведён аудит зависимостей
- [ ] Протестированы сценарии атак

---

## 📞 Сообщение об уязвимостях

Если вы обнаружили уязвимость безопасности:

1. **НЕ создавайте публичный Issue**
2. Отправьте email на security@your-domain.com
3. Дождитесь ответа (в течение 48 часов)
4. Работайте с нами над исправлением

---

## 📚 Дополнительные ресурсы

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ASP.NET Core Security](https://docs.microsoft.com/en-us/aspnet/core/security/)
- [Telegram Bot Security](https://core.telegram.org/bots/security)

---

**Безопасность — это процесс, а не результат!** 🔐
