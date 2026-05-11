# 🚀 Быстрая установка Prime Messenger Frontend

## Автоматическая установка (рекомендуется)

```powershell
cd Prime/messanger-front
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Скрипт автоматически:
- ✅ Проверит Node.js и npm
- ✅ Установит зависимости
- ✅ Создаст `.env.local` из `.env.example`
- ✅ Сгенерирует SSL-сертификаты (если установлен mkcert)
- ✅ Создаст `start-frontend.bat` для быстрого запуска

---

## Ручная установка

### 1. Установите зависимости

```bash
cd Prime/messanger-front
npm install
```

### 2. Настройте окружение

Скопируйте `.env.example` в `.env.local`:

```bash
cp .env.example .env.local
```

Отредактируйте `.env.local`:

```env
# Для локальной разработки:
VITE_API_URL=http://localhost:4000

# Для работы в сети (требуется HTTPS):
# VITE_API_URL=https://192.168.0.x:4001
```

### 3. (Опционально) Сгенерируйте SSL-сертификаты

Для HTTPS и уведомлений:

```powershell
# Установите mkcert (если не установлен)
choco install mkcert

# Сгенерируйте сертификаты
cd Prime/messanger-front
.\scripts\generate-certs.ps1
```

### 4. Запустите Frontend

```bash
npm run dev
```

Откройте http://localhost:5173 в браузере.

---

## Требования

- **Node.js**: 18+ ([скачать](https://nodejs.org/))
- **npm**: 9+ (устанавливается с Node.js)
- **mkcert** (опционально, для HTTPS): `choco install mkcert`

---

## Устранение проблем

### Ошибка: "Failed to resolve import"

Убедитесь, что все файлы из `src/lib/` присутствуют:
- `api.ts`
- `auth.ts`
- `chatApi.ts`
- `chatEncryption.ts`
- `crypto.ts`
- `keyManager.ts`
- `secureMessaging.ts`
- `utils.ts`

Если файлы отсутствуют — переклонируйте репозиторий.

### Ошибка: "CORS policy"

Убедитесь, что Backend запущен и настроен на правильный Origin (см. `Program.cs` → `AddCors`).

### Уведомления не работают

Используйте HTTPS (или localhost). Установите корневой сертификат mkcert в доверенные.

---

## Следующие шаги

1. Настройте и запустите Backend (см. `Prime/Messenger/README.md`)
2. Установите Ollama для AI-ассистента (опционально)
3. Настройте Telegram-бота (опционально)

Полная документация: [README.md](../../README.md)
