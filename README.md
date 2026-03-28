# Prime Messenger — Мессенджер с AI-ассистентом на базе Ollama

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![.NET](https://img.shields.io/badge/.NET-10.0-purple?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.11-green?logo=python)](https://www.python.org/)

**Prime Messenger** — это современный мессенджер с интеграцией AI-ассистента на базе локальной нейросети Ollama. Проект состоит из трёх основных компонентов:

1. **Messenger** — веб-мессенджер (ASP.NET Backend + React Frontend)
2. **Bot** — Telegram-бот для доступа к Ollama
3. **Ollama** — локальный AI-сервер

## 📋 Оглавление

- [Возможности](#-возможности)
- [Архитектура проекта](#-архитектура-проекта)
- [Требования к системе](#-требования-к-системе)
- [Быстрый старт](#-быстрый-старт)
- [Подробная установка](#-подробная-установка)
- [Настройка доступа из локальной сети](#-настройка-доступа-из-локальной-сети-🔐) 🔒
- [Настройка компонентов](#-настройка-компонентов)
- [Запуск проекта](#-запуск-проекта)
- [Использование](#-использование)
- [API Endpoints](#-api-endpoints)
- [Команды Telegram-бота](#-команды-telegram-бота)
- [Устранение проблем](#-устранение-проблем)
- [Структура проекта](#-структура-проекта)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

### Мессенджер
- 📝 **Личные и групповые чаты** — создавайте чаты с друзьями и коллегами
- 🤖 **AI-ассистент Prime AI** — встроенный чат с нейросетью Ollama
- 📊 **Счётчик непрочитанных** — отслеживание непрочитанных сообщений
- 🔔 **Системные уведомления** — push-уведомления с звуковым сигналом
- 📁 **Обмен файлами** — отправка файлов до 5 ГБ
- 🎨 **Темы оформления** — фиолетовая, светлая, синяя
- 🔐 **JWT аутентификация** — безопасная авторизация
- 📱 **Адаптивный дизайн** — работает на ПК и мобильных

### Telegram-бот
- 🔄 **Доступ к Ollama** — переписка с AI через Telegram
- 🎭 **Системные промпты** — настройка личности AI (глобальные и приватные)
- 📚 **История сообщений** — сохранение контекста диалога
- 🖼️ **Поддержка изображений** — для моделей семейства VL
- 👥 **Групповые чаты** — работа в группах по упоминанию
- 🔧 **Управление моделями** — загрузка/удаление моделей через бота

---

## 🏗️ Архитектура проекта

```
┌─────────────────────────────────────────────────────────────────┐
│                        Prime Messenger                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐     ┌──────────────┐      │
│  │   Frontend   │◄──►│   Backend    │◄──► │  Telegram    │      │
│  │ React + Vite │    │  ASP.NET     │     │     Bot      │      │
│  │   (порт      │    │   Core 10    │     │   (Python)   │      │
│  │   5173)      │    │ (порты 4000, │     │              │      │
│  └──────────────┘    │   4001)      │     └──────────────┘      │
│                      └──────┬───────┘           │               │
│                             │                   │               │
│                      ┌──────▼───────┐           │               │
│                      │  SQL Server  │           │               │
│                      │   (LocalDB)  │           │               │
│                      └──────────────┘           │               │
│                                                 ▼               │
│                                          ┌──────────────┐       │
│                                          │    Ollama    │       │
│                                          │   (порт      │       │
│                                          │   11434)     │       │
│                                          └──────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Требования к системе

### Минимальные требования
- **ОС**: Windows 10/11, Linux (Ubuntu 20.04+), macOS 12+
- **Процессор**: 4 ядра (рекомендуется 8+)
- **ОЗУ**: 8 ГБ (рекомендуется 16 ГБ+)
- **Место на диске**: 10 ГБ + место для моделей Ollama

### Необходимое ПО
| Компонент | Версия | Ссылка |
|-----------|--------|--------|
| .NET SDK | 10.0+ | [Скачать](https://dotnet.microsoft.com/download) |
| Node.js | 18+ | [Скачать](https://nodejs.org/) |
| Python | 3.11+ | [Скачать](https://www.python.org/) |
| SQL Server | Express/LocalDB | [Скачать](https://www.microsoft.com/sql-server) |
| Ollama | Последняя | [Скачать](https://ollama.ai/) |
| Git | Любая | [Скачать](https://git-scm.com/) |

---

## 🚀 Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/ваш-username/ChatBotWIthOllama.git
cd ChatBotWIthOllama
```

### 2. Установка Ollama (если не установлен)
```bash
# Windows
winget install Ollama.Ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# macOS
brew install ollama
```

### 3. Загрузка AI модели
```bash
ollama pull llama2:7b
# или другая модель
ollama pull nemotron-3-nano:latest
```

### 4. Настройка и запуск
```bash
# Настроить все компоненты (подробнее в разделе "Настройка")
# Запустить Backend, Frontend и Bot
```

---

## 📖 Подробная установка

### Шаг 1: Настройка Ollama

1. **Установите Ollama** по инструкции выше
2. **Запустите сервис**:
   ```bash
   ollama serve
   ```
3. **Загрузите модель**:
   ```bash
   ollama pull llama2:7b
   ollama pull nemotron-3-nano:latest
   ```
4. **Проверьте работу**:
   ```bash
   ollama list
   ollama run llama2:7b "Привет!"
   ```

### Шаг 2: Настройка Backend (ASP.NET Messenger)

1. **Перейдите в директорию**:
   ```bash
   cd Prime/Messenger
   ```

2. **Настройте подключение к БД** в `appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=MessangerDb;Trusted_Connection=True;TrustServerCertificate=True;"
   }
   ```

3. **Создайте SSL-сертификат** для HTTPS:
   ```bash
   # Windows (PowerShell от администратора)
   cd Prime/Messenger
   .\scripts\generate-certs.ps1
   ```

4. **Настройте appsettings.Development.json**:
   ```json
   {
     "Http": { "Url": "http://0.0.0.0:4000" },
     "Https": {
       "Url": "https://0.0.0.0:4001",
       "Certificate": {
         "Path": "certs/prime-dev.pfx",
         "Password": "changeit"
       }
     }
   }
   ```

5. **Примените миграции БД**:
   ```bash
   dotnet ef database update
   ```

6. **Проверьте сборку**:
   ```bash
   dotnet build
   ```

### Шаг 3: Настройка Frontend (React)

1. **Перейдите в директорию**:
   ```bash
   cd Prime/messanger-front
   ```

2. **Установите зависимости**:
   ```bash
   npm install
   ```

3. **Создайте файл .env.local**:
   ```bash
   # Скопируйте пример
   cp .env.example .env.local
   ```

4. **Настройте .env.local**:
   ```env
   # Для локальной разработки
   VITE_API_URL=http://localhost:4000

   # Для работы в сети (замените IP на свой)
   # VITE_API_URL=https://192.168.0.233:4001
   ```

5. **Проверьте сборку**:
   ```bash
   npm run build
   ```

---

## 🔐 Настройка доступа из локальной сети

### Вариант 1: HTTP (без шифрования)

**Для разработки и тестирования** — проще, но уведомления не работают.

1. **Узнайте ваш IP в локальной сети**:
   ```powershell
   # Windows
   ipconfig | findstr /i "IPv4"
   
   # Linux/macOS
   ifconfig | grep "inet "
   ```
   Вы увидите что-то вроде `192.168.0.233` или `10.0.0.5`

2. **Настройте Frontend** (`.env.local`):
   ```env
   VITE_API_URL=http://192.168.0.233:4000
   ```

3. **Откройте порты в брандмауэре** (Windows, PowerShell от администратора):
   ```powershell
   netsh advfirewall firewall add rule name="Messenger Backend HTTP" dir=in action=allow protocol=TCP localport=4000
   netsh advfirewall firewall add rule name="Messenger Frontend" dir=in action=allow protocol=TCP localport=5173
   ```

4. **Запустите Backend** — он уже настроен на `0.0.0.0:4000` (все интерфейсы)

5. **На устройствах в сети** откроите: `http://192.168.0.233:5173`

> ⚠️ **Важно**: При использовании HTTP системные уведомления **не работают** (требование браузеров).

---

### Вариант 2: HTTPS (с самоподписанным сертификатом)

**Рекомендуется** — работает шифрование и уведомления.

#### Шаг 1: Генерация сертификата

```powershell
# Установите mkcert (если не установлен)
choco install mkcert

# Перейдите в директорию Backend
cd Prime/Messenger

# Сгенерируйте сертификат для всех локальных IP
.\scripts\generate-certs.ps1
```

Скрипт автоматически создаст сертификат для всех ваших IP-адресов.

#### Шаг 2: Настройка Frontend

```env
VITE_API_URL=https://192.168.0.233:4001
```

#### Шаг 3: Откройте порты в брандмауэре

```powershell
# PowerShell от администратора
netsh advfirewall firewall add rule name="Messenger Backend HTTPS" dir=in action=allow protocol=TCP localport=4001
netsh advfirewall firewall add rule name="Messenger Frontend" dir=in action=allow protocol=TCP localport=5173
```

#### Шаг 4: Установите корневой сертификат на устройства

**Windows:**
1. Найдите корневой сертификат: `%LOCALAPPDATA%\mkcert\rootCA.pem`
2. Дважды кликните → "Установить сертификат"
3. Выберите "Локальный компьютер" → "Поместить все сертификаты в доверенные корневые центры"

**Android:**
1. Скопируйте файл `%LOCALAPPDATA%\mkcert\rootCA.pem` на устройство
2. Переименуйте в `rootCA.crt`
3. **Настройки** → **Безопасность** → **Шифрование и учётные данные** → **Установка сертификата**
4. Выберите файл и подтвердите (может потребоваться PIN)

**iOS:**
1. Отправьте файл `rootCA.pem` себе на устройство (AirDrop, email)
2. Установите профиль
3. **Настройки** → **Основные** → **Об этом устройстве** → **Доверие сертификатам** → Включите доверие

#### Шаг 5: Проверка

На устройстве откроите: `https://192.168.0.233:4001`

При первом заходе браузер может показать предупреждение — нажмите **"Принять риск"** или **"Продолжить"**.

✅ **Готово!** Теперь уведомления будут работать.

---

### Сводная таблица настроек

| Сценарий | URL Frontend | Порт Backend | HTTPS | Уведомления |
|----------|--------------|--------------|-------|-------------|
| Локальная разработка | `http://localhost:5173` | 4000 | ❌ | ✅ |
| Локальная сеть (HTTP) | `http://192.168.x.x:5173` | 4000 | ❌ | ❌ |
| Локальная сеть (HTTPS) | `https://192.168.x.x:5173` | 4001 | ✅ | ✅ |
| Production | `https://your-domain.com` | 4001 | ✅ | ✅ |

### Шаг 4: Настройка Telegram-бота

1. **Создайте бота в Telegram**:
   - Откройте [@BotFather](https://t.me/BotFather)
   - Отправьте `/newbot`
   - Следуйте инструкциям
   - Сохраните токен

2. **Перейдите в директорию**:
   ```bash
   cd Bot
   ```

3. **Создайте виртуальное окружение**:
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate
   
   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

4. **Установите зависимости**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Настройте .env**:
   ```bash
   # Скопируйте пример
   cp .env.example .env
   ```

6. **Отредактируйте .env**:
   ```env
   TOKEN=123456:ABC-DEF...             # Ваш токен из BotFather
   ADMIN_IDS=123456789                 # Ваш Telegram ID
   USER_IDS=123456789,987654321       # ID пользователей
   INITMODEL=llama2:7b                # Модель по умолчанию
   OLLAMA_BASE_URL=localhost
   LOG_LEVEL=INFO
   ALLOW_ALL_USERS_IN_GROUPS=0
   TIMEOUT=3000
   ```

7. **Инициализируйте БД**:
   ```bash
   python InitDB.py
   ```

---

## ⚙️ Настройка компонентов

### Backend: appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=MessangerDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "ваш-секретный-ключ-минимум-64-символа",
    "Issuer": "Messenger",
    "Audience": "Messanger"
  },
  "AiService": {
    "BaseUrl": "http://localhost:8000"
  },
  "Features": {
    "AiEnabled": true
  }
}
```

**Важно**: Сгенерируйте новый JWT Key:
```bash
# PowerShell
$key = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
echo $key
```

### Frontend: .env.local

```env
# Локальная разработка
VITE_API_URL=http://localhost:4000

# Для доступа из сети (HTTPS обязательно для уведомлений)
# VITE_API_URL=https://192.168.0.233:4001

# Для продакшена
# VITE_API_URL=https://your-domain.com
```

### Bot: .env

```env
# Обязательные
TOKEN=123456:ABC-DEF...             # Токен Telegram бота
INITMODEL=llama2:7b                # Модель Ollama

# Доступ
ADMIN_IDS=123456789                 # Ваш ID (узнать у @userinfobot)
USER_IDS=123456789                  # ID пользователей через запятую

# Ollama
OLLAMA_BASE_URL=localhost
OLLAMA_PORT=11434

# Опции
LOG_LEVEL=INFO
ALLOW_ALL_USERS_IN_GROUPS=0        # 1 = все в группах могут использовать
TIMEOUT=3000                       # Таймаут в мс
```

---

## ▶️ Запуск проекта

### Вариант 1: По отдельности (рекомендуется для разработки)

#### 1. Запуск Ollama
```bash
ollama serve
```

#### 2. Запуск AI Service (терминал 0) ⭐
**Важно**: AI Service необходим для работы AI-функций в мессенджере!

```bash
cd Bot
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000 --reload
```
AI Service доступен по адресу: http://localhost:8000

#### 3. Запуск Backend (терминал 1)
```bash
cd Prime/Messenger
dotnet run
```
Backend доступен по адресам:
- HTTP: http://localhost:4000
- HTTPS: https://localhost:4001

#### 4. Запуск Frontend (терминал 2)
```bash
cd Prime/messanger-front
npm run dev
```
Frontend доступен по адресу: http://localhost:5173

#### 5. Запуск Telegram-бота (терминал 3)
```bash
cd Bot
.venv\Scripts\activate  # Windows
# или source .venv/bin/activate  # Linux/macOS
python run.py
```

**Итого**: 4 терминала для полного функционала (Ollama + AI Service + Backend + Frontend + Bot)

### Вариант 2: Быстрый запуск (Windows)

Этот вариант запускает **Backend, Frontend и Bot**. AI Service нужно запустить отдельно!

#### Шаг 1: Запуск AI Service (отдельный терминал)
```powershell
cd Bot
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000
```

#### Шаг 2: Запуск остальных компонентов
Вернитесь в корень проекта и выполните:

```powershell
# Проверка окружения
. '.\scripts\check-environment.ps1'

# Запуск Backend, Frontend и Bot
. '.\scripts\start.ps1'
```

Выберите опцию **4 (Все компоненты)** — скрипт запустит Backend, Frontend и Bot в отдельных окнах.

**Итого**: 2 окна (AI Service + скрипт start.ps1 который запустит 3 компонента)

Адреса для доступа:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000 / https://localhost:4001
- **AI Service**: http://localhost:8000
- **Telegram-бот**: найдите вашего бота в Telegram

### Вариант 4: Фоновый запуск (Windows)

Создайте `.bat` файлы для удобства:

**start-backend.bat**:
```batch
@echo off
cd Prime\Messenger
start "Messenger Backend" dotnet run
```

**start-frontend.bat**:
```batch
@echo off
cd Prime\messanger-front
start "Messenger Frontend" npm run dev
```

**start-bot.bat**:
```batch
@echo off
cd Bot
call .venv\Scripts\activate
start "Telegram Bot" python run.py
```

### Вариант 5: Production сборка

#### Backend
```bash
cd Prime/Messenger
dotnet publish -c Release -o ./publish
# Запуск
cd publish
dotnet Messenger.dll
```

#### Frontend
```bash
cd Prime/messanger-front
npm run build
# Файлы в dist/ загрузить на веб-сервер
```

---

## 📱 Использование

### Регистрация в мессенджере

1. Откройте http://localhost:5173
2. Нажмите **"Регистрация"**
3. Введите username и пароль
4. Войдите под своими данными

### Создание чата

1. Нажмите **"Новый чат / группа"**
2. Выберите тип (Личный или Группа)
3. Для личного чата — выберите пользователя
4. Для группы — введите название и добавьте участников

### Использование AI-ассистента

1. В списке чатов выберите **"Prime AI"**
2. Выберите модель в выпадающем списке
3. При необходимости выберите промпт (личность AI)
4. Отправьте сообщение

### Уведомления

При новом сообщении:
- 🔔 Появляется **системное уведомление**
- 🔊 Воспроизводится **звуковой сигнал**
- 📊 Обновляется **счётчик непрочитанных**
- 💬 Показывается **toast-уведомление**

**Важно**: Для работы системных уведомлений сайт должен быть открыт по **HTTPS** или **localhost**.

### Telegram-бот

#### Основные команды

| Команда | Описание |
|---------|----------|
| `/start` | Запуск бота, главное меню |
| `/reset` | Сброс текущего чата |
| `/history` | Показать историю сообщений |
| `/pullmodel <name>` | Загрузить модель из Ollama |
| `/addglobalprompt <text>` | Добавить глобальный промпт |
| `/addprivateprompt <text>` | Добавить приватный промпт |
| `/admin` | Админ-панель (только для админов) |

#### Кнопки интерфейса

- **Register** — регистрация в системе
- **Switch LLM** — выбор модели
- **Select System Prompt** — выбор глобального промпта
- **Select Local System Prompt** — выбор приватного промпта
- **About** — информация о боте

#### Работа в группах

Бот отвечает только при:
- Упоминании `@username`
- Ответе на сообщение бота

---

## 🔌 API Endpoints

### Аутентификация
```
POST /api/auth/register     — Регистрация
POST /api/auth/login        — Вход
POST /api/auth/refresh      — Обновление токена
```

### Чаты
```
GET  /api/chats             — Список чатов
GET  /api/chats/:id         — Информация о чате
POST /api/chats             — Создать чат
GET  /api/chats/:id/messages— Сообщения чата
POST /api/chats/:id/messages— Отправить сообщение
POST /api/chats/:id/messages/file — Отправить файл
POST /api/chats/:id/messages/forward — Переслать сообщение
DELETE /api/chats/:id/messages/:msgId — Удалить сообщение
```

### AI
```
GET  /api/ai/models         — Доступные модели
POST /api/ai/models/pull    — Загрузить модель
DELETE /api/ai/models/:name — Удалить модель
GET  /api/ai/prompts        — Промпты
POST /api/ai/prompts        — Создать промпт
DELETE /api/ai/prompts/:id  — Удалить промпт
DELETE /api/ai/chat/:id/session — Сбросить сессию
DELETE /api/ai/chat/:id/history — Очистить историю
```

### Пользователи
```
GET  /api/users             — Поиск пользователей
GET  /api/users/me          — Мой профиль
PUT  /api/users/me          — Обновить профиль
POST /api/users/me/avatar   — Загрузить аватар
DELETE /api/users/me        — Удалить аккаунт
GET  /api/users/:id         — Профиль пользователя
```

### Файлы
```
GET  /api/files/:id         — Скачать файл
```

---

## 🛠️ Устранение проблем

### Backend не запускается

**Ошибка подключения к БД**:
```
A network-related or instance-specific error occurred...
```
**Решение**:
1. Проверьте, что SQL Server запущен
2. Проверьте строку подключения в `appsettings.json`
3. Примените миграции: `dotnet ef database update`

**Ошибка SSL-сертификата**:
```
HTTPS cert could not be loaded
```
**Решение**:
```bash
cd Prime/Messenger
.\scripts\generate-certs.ps1
```

### Frontend не подключается к Backend

**Ошибка CORS**:
```
Access to fetch at '...' has been blocked by CORS policy
```
**Решение**:
1. Проверьте `VITE_API_URL` в `.env.local`
2. Убедитесь, что Backend настроен на правильный порт
3. Проверьте CORS в `Program.cs`

**Уведомления не работают**:
```
System notifications only work on HTTPS or localhost
```
**Решение**: Откройте сайт по HTTPS или используйте localhost

### Telegram-бот не отвечает

**Ошибка 401 Unauthorized**:
```
Unauthorized
```
**Решение**: Проверьте токен в `.env`

**Ollama не отвечает**:
```
Connection refused
```
**Решение**:
1. Запустите Ollama: `ollama serve`
2. Проверьте `OLLAMA_BASE_URL` в `.env`

### Модель не загружается

**Ошибка при pull**:
```
model not found
```
**Решение**:
1. Проверьте название модели: `ollama list`
2. Используйте полное имя: `llama2:7b` вместо `llama2`

---

## 📁 Структура проекта

```
ChatBotWIthOllama/
├── Prime/
│   ├── Messenger/              # ASP.NET Backend
│   │   ├── Controllers/        # API контроллеры
│   │   ├── Data/              # DbContext
│   │   ├── DTO/               # Data Transfer Objects
│   │   ├── Hubs/              # SignalR Hub
│   │   ├── Migrations/        # EF Migrations
│   │   ├── Models/            # Модели данных
│   │   ├── Services/          # Сервисы (JWT, AI)
│   │   ├── appsettings.json   # Конфигурация
│   │   ├── Program.cs         # Точка входа
│   │   └── certs/             # SSL сертификаты
│   │
│   └── messanger-front/       # React Frontend
│       ├── src/
│       │   ├── components/    # UI компоненты
│       │   ├── lib/           # Утилиты и API
│       │   ├── pages/         # Страницы
│       │   └── App.tsx        # Главный компонент
│       ├── public/            # Статика
│       ├── .env.local         # Переменные окружения
│       └── package.json       # Зависимости
│
├── Bot/
│   ├── bot/                   # Код бота
│   ├── func/                  # Функции (Ollama, DB)
│   ├── .env                   # Конфигурация
│   ├── requirements.txt       # Python зависимости
│   └── run.py                 # Точка входа
│
├── .gitignore                 # Git исключения
└── README.md                  # Эта документация
```

---

## 📝 Лицензия

Этот проект распространяется под лицензией **MIT**. См. файл [LICENSE](LICENSE) для деталей.

---

## 🤝 Вклад в проект

1. Fork репозиторий
2. Создайте ветку (`git checkout -b feature/AmazingFeature`)
3. Закоммитьте изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в ветку (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📞 Контакты

Если у вас возникли вопросы или предложения:
- Создайте [Issue](https://github.com/ваш-username/ChatBotWIthOllama/issues)
- Напишите в Telegram

---

## 🙏 Благодарности

- [Ollama](https://ollama.ai/) — локальный AI сервер
- [React](https://react.dev/) — UI библиотека
- [ASP.NET Core](https://dotnet.microsoft.com/apps/aspnet) — backend фреймворк
- [Aiogram](https://docs.aiogram.dev/) — Telegram bot framework
- [shadcn/ui](https://ui.shadcn.com/) — UI компоненты

---

**Prime Messenger** — ваш персональный AI-мессенджер! 🚀
