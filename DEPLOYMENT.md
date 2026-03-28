# Prime Messenger — Руководство по развёртыванию

Это руководство описывает процесс развёртывания Prime Messenger в production-среде.

## 📋 Оглавление

1. [Подготовка сервера](#подготовка-сервера)
2. [Настройка домена и SSL](#настройка-домена-и-ssl)
3. [Развёртывание Backend](#развёртывание-backend)
4. [Развёртывание Frontend](#развёртывание-frontend)
5. [Настройка Ollama](#настройка-ollama)
6. [Настройка Telegram-бота](#настройка-telegram-бота)
7. [Настройка反向 прокси (Nginx)](#настройка-nginx)
8. [Мониторинг и логи](#мониторинг-и-логи)
9. [Безопасность](#безопасность)

---

## 🖥️ Подготовка сервера

### Требования к серверу

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| CPU | 4 ядра | 8+ ядер |
| RAM | 8 ГБ | 16+ ГБ |
| Disk | 50 ГБ SSD | 100+ ГБ NVMe |
| OS | Ubuntu 20.04 | Ubuntu 22.04 LTS |

### Установка зависимостей

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка базовых пакетов
sudo apt install -y curl git wget unzip apt-transport-https ca-certificates gnupg

# Установка .NET SDK 10.0
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-10.0

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Установка PM2 для управления процессами
sudo npm install -g pm2
```

---

## 🔒 Настройка домена и SSL

### 1. Настройка DNS

В панели управления доменом создайте A-запись:
```
@    A    <IP-адрес-сервера>
www  A    <IP-адрес-сервера>
```

### 2. Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Получение SSL-сертификата

```bash
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

Сертификаты сохранятся в:
- `/etc/letsencrypt/live/your-domain.com/fullchain.pem`
- `/etc/letsencrypt/live/your-domain.com/privkey.pem`

---

## 🚀 Развёртывание Backend

### 1. Клонирование репозитория

```bash
cd /var/www
sudo git clone https://github.com/your-username/ChatBotWIthOllama.git prime-messenger
sudo chown -R $USER:$USER prime-messenger
cd prime-messenger
```

### 2. Настройка Backend

```bash
cd Prime/Messenger

# Копирование конфигурации
cp appsettings.example.json appsettings.Production.json

# Редактирование appsettings.Production.json
nano appsettings.Production.json
```

**appsettings.Production.json**:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MessangerDb;User Id=sa;Password=YourStrongPassword123!;TrustServerCertificate=true;"
  },
  "Jwt": {
    "Key": "YOUR_GENERATED_64_CHAR_SECRET_KEY_HERE",
    "Issuer": "Messenger",
    "Audience": "Messanger"
  },
  "AiService": {
    "BaseUrl": "http://localhost:8000"
  },
  "Features": {
    "AiEnabled": true
  },
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:4000"
      }
    }
  }
}
```

### 3. Публикация Backend

```bash
cd Prime/Messenger
dotnet publish -c Release -o ./publish
```

### 4. Создание systemd сервиса

```bash
sudo nano /etc/systemd/system/prime-messenger-backend.service
```

**Содержимое файла**:
```ini
[Unit]
Description=Prime Messenger Backend
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/prime-messenger/Prime/Messenger/publish
ExecStart=/usr/bin/dotnet /var/www/prime-messenger/Prime/Messenger/publish/Messenger.dll
Environment=ASPNETCORE_ENVIRONMENT=Production
Restart=always
RestartSec=10
SyslogIdentifier=prime-messenger-backend

[Install]
WantedBy=multi-user.target
```

### 5. Запуск сервиса

```bash
sudo systemctl daemon-reload
sudo systemctl enable prime-messenger-backend
sudo systemctl start prime-messenger-backend
sudo systemctl status prime-messenger-backend
```

---

## 🌐 Развёртывание Frontend

### 1. Установка зависимостей

```bash
cd /var/www/prime-messenger/Prime/messanger-front
npm install
```

### 2. Настройка .env.production

```bash
cp .env.example .env.production
nano .env.production
```

**.env.production**:
```env
VITE_API_URL=https://api.your-domain.com
```

### 3. Сборка проекта

```bash
npm run build
```

Файлы сборки будут в директории `dist/`.

### 4. Настройка Nginx для Frontend

```bash
sudo nano /etc/nginx/sites-available/prime-messenger
```

**Конфигурация Nginx**:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/prime-messenger/Prime/messanger-front/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SignalR WebSocket
    location /hubs/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
}
```

### 5. Включение сайта

```bash
sudo ln -s /etc/nginx/sites-available/prime-messenger /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Включение HTTPS

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 🤖 Настройка Ollama

### 1. Установка Ollama

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Настройка сервиса

```bash
sudo nano /etc/systemd/system/ollama.service
```

**Содержимое файла**:
```ini
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0:11434"

[Install]
WantedBy=multi-user.target
```

### 3. Загрузка моделей

```bash
# Активация виртуального окружения
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Загрузка моделей
ollama pull llama2:7b
ollama pull nemotron-3-nano:latest
```

---

## 📱 Настройка Telegram-бота

### 1. Создание виртуального окружения

```bash
cd /var/www/prime-messenger/Bot
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Настройка .env

```bash
cp .env.example .env
nano .env
```

**.env**:
```env
TOKEN=your_telegram_bot_token
ADMIN_IDS=your_admin_id
USER_IDS=allowed_user_ids
INITMODEL=llama2:7b
OLLAMA_BASE_URL=localhost
OLLAMA_PORT=11434
LOG_LEVEL=INFO
ALLOW_ALL_USERS_IN_GROUPS=0
TIMEOUT=3000
```

### 3. Создание PM2 конфигурации

```bash
nano ecosystem.config.js
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'prime-telegram-bot',
    script: './run.py',
    cwd: '/var/www/prime-messenger/Bot',
    interpreter: '/var/www/prime-messenger/Bot/.venv/bin/python',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      PYTHONUNBUFFERED: '1'
    }
  }]
};
```

### 4. Запуск бота

```bash
cd /var/www/prime-messenger/Bot
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔍 Мониторинг и логи

### Просмотр логов

```bash
# Backend
sudo journalctl -u prime-messenger-backend -f

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ollama
sudo journalctl -u ollama -f

# Telegram Bot
pm2 logs prime-telegram-bot
```

### Мониторинг процессов

```bash
# PM2 статус
pm2 status

# Systemd сервисы
systemctl status prime-messenger-backend
systemctl status ollama
```

---

## 🔐 Безопасность

### 1. Настройка фаервола

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

### 2. Обновление JWT ключа

Сгенерируйте новый безопасный ключ:
```bash
cd Prime/Messenger
pwsh -File scripts/generate-jwt-key.ps1
```

Обновите ключ в `appsettings.Production.json` и перезапустите сервис.

### 3. Регулярное обновление

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление SSL сертификата
sudo certbot renew --dry-run

# Обновление приложения
cd /var/www/prime-messenger
sudo git pull
# Пересоберите и перезапустите компоненты
```

### 4. Резервное копирование БД

```bash
# Скрипт резервного копирования
sudo nano /usr/local/bin/backup-messenger-db.sh
```

**Содержимое скрипта**:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/messenger"
mkdir -p $BACKUP_DIR

# SQL Server backup (если используется SQL Server)
# Или SQLite:
cp /var/www/prime-messenger/Prime/Messenger/Messenger.db $BACKUP_DIR/Messenger_$DATE.db

# Удаление старых бэкапов (хранить 7 дней)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-messenger-db.sh

# Добавление в cron
sudo crontab -e
# 0 2 * * * /usr/local/bin/backup-messenger-db.sh
```

---

## 📊 Проверка работоспособности

### 1. Проверка Backend

```bash
curl -k https://localhost:4001/api/chats
```

### 2. Проверка Frontend

Откройте в браузере: `https://your-domain.com`

### 3. Проверка Telegram-бота

Отправьте `/start` вашему боту в Telegram.

---

## 🆘 Устранение проблем

### Backend не запускается

```bash
# Проверка логов
sudo journalctl -u prime-messenger-backend -n 50

# Проверка портов
sudo netstat -tlnp | grep 4000
sudo netstat -tlnp | grep 4001
```

### Nginx возвращает 502 Bad Gateway

```bash
# Проверка, что Backend запущен
sudo systemctl status prime-messenger-backend

# Проверка логов Nginx
sudo tail -f /var/log/nginx/error.log
```

### Ollama не отвечает

```bash
# Перезапуск сервиса
sudo systemctl restart ollama

# Проверка статуса
ollama list
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи
2. Убедитесь, что все сервисы запущены
3. Проверьте фаервол
4. Создайте Issue на GitHub

---

**Prime Messenger** — готов к production использованию! 🎉
