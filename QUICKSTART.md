# Prime Messenger — Быстрый старт

Этот файл поможет вам запустить проект за 5 минут.

## 🔐 Важное замечание о доступе из сети

Если вы хотите открывать мессенджер **с других устройств** (телефон, планшет, другой ПК):

1. **Используйте ваш IP вместо localhost**:
   ```powershell
   # Узнайте ваш IP в локальной сети
   ipconfig | findstr /i "IPv4"
   # Вы увидите что-то вроде 192.168.0.233
   ```

2. **Для работы уведомлений нужен HTTPS**:
   - Системные уведомления работают **только через HTTPS или localhost**
   - Для HTTPS нужен самоподписанный сертификат
   - Сертификат нужно установить на все устройства

3. **Откройте порты в брандмауэре** (PowerShell от администратора):
   ```powershell
   netsh advfirewall firewall add rule name="Messenger Backend HTTP" dir=in action=allow protocol=TCP localport=4000
   netsh advfirewall firewall add rule name="Messenger Backend HTTPS" dir=in action=allow protocol=TCP localport=4001
   ```

📖 **Подробная инструкция** по настройке HTTPS и доступа из сети — в [README.md](README.md#-настройка-доступа-из-локальной-сети).

---

## 🚀 Экспресс-запуск (Windows)

### Шаг 1: Проверка окружения

Откройте PowerShell и перейдите в директорию проекта:

```powershell
# Перейдите в папку с проектом
cd ChatBotWIthOllama

# Проверка окружения
. '.\scripts\check-environment.ps1'
```

Если все компоненты установлены — переходите к шагу 2.


### Шаг 2: Настройка файлов

#### Backend
```powershell
cd Prime\Messenger
Copy-Item appsettings.example.json appsettings.json
. '.\scripts\generate-jwt-key.ps1'  # Скопируйте ключ в appsettings.json
```

#### Frontend
```powershell
cd ..\messanger-front
Copy-Item .env.example .env.local
```

#### Bot
```powershell
cd ..\..\Bot
Copy-Item .env.example .env
# Откройте .env и вставьте ваш токен из @BotFather
notepad .env
```

### Шаг 3: Запуск AI Service

Откройте **ещё одно окно PowerShell** для AI Service:

```powershell
cd Bot
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000
```

AI Service будет доступен по адресу: http://localhost:8000

**Не закрывайте это окно!**

### Шаг 4: Запуск остальных компонентов

Вернитесь в корень проекта в **первом окне PowerShell**:

```powershell
cd ..\..
. '.\scripts\start.ps1'
```

Выберите опцию **4 (Все компоненты)**.

### Шаг 5: Проверка

- **Frontend**: Откройте http://localhost:5173
- **Backend**: Проверьте консоль в окне Backend
- **AI Service**: Откройте http://localhost:8000/docs
- **Bot**: Отправьте `/start` вашему боту в Telegram

---

## 🐧 Быстрый запуск (Linux)

### Шаг 1: Установка зависимостей

```bash
# .NET
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update && sudo apt install -y dotnet-sdk-10.0

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python
sudo apt install -y python3.11 python3.11-venv python3-pip

# Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

### Шаг 2: Клонирование и настройка

```bash
git clone https://github.com/your-username/ChatBotWIthOllama.git
cd ChatBotWIthOllama

# Backend
cd Prime/Messenger
cp appsettings.example.json appsettings.json
# Отредактируйте appsettings.json

# Frontend
cd ../messanger-front
npm install
cp .env.example .env.local

# Bot
cd ../Bot
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Отредактируйте .env
```

### Шаг 3: Запуск в отдельных терминалах

**Терминал 0 - AI Service** ⭐:
```bash
cd Bot
source .venv/bin/activate
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000
```
AI Service доступен по адресу: http://localhost:8000

**Терминал 1 - Backend**:
```bash
cd Prime/Messenger
dotnet run
```

**Терминал 2 - Frontend**:
```bash
cd Prime/messanger-front
npm run dev
```

**Терминал 3 - Bot**:
```bash
cd Bot
source .venv/bin/activate
python run.py
```

**Терминал 4 - Ollama** (если не запущен как сервис):
```bash
ollama serve
```

**Итого**: 5 терминалов для полного функционала (AI Service + Backend + Frontend + Bot + Ollama)

---

## ✅ Проверка работоспособности

### 1. Frontend

Откройте браузер: http://localhost:5173

Вы должны увидеть страницу входа/регистрации.

### 2. Backend

Проверьте API:

```bash
curl http://localhost:4000/api/chats
```

Должен вернуться список чатов (пустой для нового пользователя).

### 3. Telegram-бот

1. Откройте вашего бота в Telegram
2. Отправьте `/start`
3. Должно появиться главное меню с кнопками

### 4. Ollama

Проверьте список моделей:

```bash
ollama list
```

Должна быть хотя бы одна модель (например, `llama2:7b`).

---

## ⚡ Первые шаги в мессенджере

### Регистрация

1. Откройте http://localhost:5173
2. Нажмите **"Регистрация"**
3. Введите username и пароль
4. Нажмите **"Зарегистрироваться"**

### Создание чата

1. Нажмите **"Новый чат / группа"**
2. Выберите **"Личный"** или **"Группа"**
3. Добавьте участников
4. Нажмите **"Создать"**

### AI-ассистент

1. В списке чатов выберите **"Prime AI"**
2. Выберите модель (например, `llama2:7b`)
3. Отправьте сообщение: "Привет! Расскажи о себе"

### Уведомления

1. Откройте сайт в браузере
2. Разрешите уведомления при запросе
3. Откройте чат в другом окне/устройстве
4. Отправьте сообщение
5. Вы должны увидеть уведомление и услышать звук

---

## 🆘 Если что-то пошло не так

### Backend не запускается

**Ошибка**: `A network-related or instance-specific error occurred`

**Решение**:
```bash
# Проверьте, что SQL Server запущен
# Windows: services.msc -> SQL Server
# Linux: sudo systemctl status mssql-server

# Примените миграции
cd Prime/Messenger
dotnet ef database update
```

### Frontend не подключается

**Ошибка**: `ERR_CONNECTION_REFUSED`

**Решение**:
1. Проверьте, что Backend запущен
2. Проверьте `VITE_API_URL` в `.env.local`
3. Попробуйте `http://localhost:4000` вместо `https`

### Бот не отвечает

**Ошибка**: `Unauthorized`

**Решение**:
1. Проверьте токен в `.env`
2. Убедитесь, что токен скопирован без лишних пробелов
3. Перезапустите бота

### Ollama не отвечает

**Ошибка**: `Connection refused`

**Решение**:
```bash
# Запустите Ollama
ollama serve

# Или как сервис
sudo systemctl start ollama  # Linux
```

---

## 📚 Дополнительная документация

- [README.md](README.md) — полная документация
- [DEPLOYMENT.md](DEPLOYMENT.md) — развёртывание в production
- [CONTRIBUTING.md](CONTRIBUTING.md) — как внести вклад
- [CHANGELOG.md](CHANGELOG.md) — история изменений

---

## 📞 Помощь

Если возникли проблемы:

1. Проверьте логи в консоли каждого компонента
2. Посмотрите [README.md](README.md#устранение-проблем)
3. Создайте [Issue](https://github.com/your-username/ChatBotWIthOllama/issues)

---

**Готово!** Наслаждайтесь Prime Messenger! 🎉
