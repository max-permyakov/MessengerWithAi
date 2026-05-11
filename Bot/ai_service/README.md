# Prime AI Service

Отдельный сервис для интеграции Ollama с Prime без Telegram.

## 📋 Оглавление

- [Назначение](#назначение)
- [Запуск](#запуск)
- [Основные эндпоинты](#основные-эндпоинты)
- [Переменные окружения](#переменные-окружения)

---

## 🎯 Назначение

AI Service — это промежуточный слой между мессенджером Prime и Ollama API. Он предоставляет:

- ✅ REST API для работы с AI-моделями
- ✅ Поддержку стриминга ответов (SSE)
- ✅ Управление системными промптами
- ✅ Работу с изображениями (для VL-моделей)
- ✅ Интеграцию с мессенджером Prime

---

## 🚀 Запуск

### Вариант 1: Из корневой директории Bot (рекомендуется)

```bash
# Перейдите в директорию Bot
cd Bot

# Установите зависимости (если ещё не установлены)
pip install -r requirements.txt

# Запустите AI сервис
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000 --reload
```

### Вариант 2: Прямой запуск

```bash
# Из любой директории
python путь/к/Bot/ai_service/main.py

# Или через uvicorn
uvicorn ai_service.main:app --host 0.0.0.0 --port 8000 --reload
```

### Вариант 3: Фоновый запуск (Windows)

```powershell
# В отдельном окне PowerShell
cd Bot
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000
```

### Вариант 4: Production (Linux)

```bash
# Через systemd или supervisor
# Пример для systemd:
sudo nano /etc/systemd/system/prime-ai-service.service
```

```ini
[Unit]
Description=Prime AI Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/prime-messenger/Bot
ExecStart=/usr/bin/python3 -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## ✅ Проверка работоспособности

После запуска проверьте:

```bash
# Проверка доступности
curl http://localhost:8000/health

# Список моделей
curl http://localhost:8000/ai/models

# Тестовый запрос
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Привет!", "user_id": "test", "chat_id": "test"}'
```

---

## 🔌 Основные эндпоинты

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/ai/chat` | Non-stream ответ от AI |
| POST | `/ai/chat/stream` | SSE-стрим ответа |
| GET | `/ai/models` | Список доступных моделей |
| POST | `/ai/models/pull?name=<model>` | Загрузить модель |
| DELETE | `/ai/models/{name}` | Удалить модель |
| GET | `/ai/prompts` | Получить промпты |
| POST | `/ai/prompts` | Создать промпт |
| DELETE | `/ai/prompts/{id}` | Удалить промпт |

**Подробнее**: См. документацию API после запуска: http://localhost:8000/docs

---

## ⚙️ Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `OLLAMA_BASE_URL` | Адрес Ollama API | `localhost` |
| `OLLAMA_PORT` | Порт Ollama | `11434` |
| `INITMODEL` | Модель по умолчанию | `llama2:7b` |
| `TIMEOUT` | Таймаут запроса (мс) | `3000` |
| `AI_SERVICE_DB_PATH` | Путь к базе данных | `ai_service/ai_service.db` |

---

## 🔗 Интеграция с мессенджером Prime

Для включения AI-функций в мессенджере:

1. **Запустите AI Service** (см. выше)
2. **Настройте Backend** в `Prime/Messenger/appsettings.json`:
   ```json
   "AiService": {
     "BaseUrl": "http://localhost:8000"
   },
   "Features": {
     "AiEnabled": true
   }
   ```
3. **Перезапустите Backend**
4. **Проверьте** — в списке чатов должен появиться **"Prime AI"**

---

## 🛠️ Устранение проблем

### AI Service не запускается

**Ошибка**: `ModuleNotFoundError: No module named 'fastapi'`

**Решение**:
```bash
cd Bot
pip install -r requirements.txt
```

### Ollama не отвечает

**Ошибка**: `Connection refused`

**Решение**:
```bash
# Проверьте, что Ollama запущен
ollama serve

# Или как сервис
sudo systemctl start ollama  # Linux
```

### Порт 8000 занят

**Ошибка**: `Address already in use`

**Решение**: Используйте другой порт:
```bash
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8001
```

---

## 📚 Дополнительная документация

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)

---

**AI Service готов к работе!** 🤖
