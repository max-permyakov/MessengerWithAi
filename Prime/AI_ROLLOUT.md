# AI Rollout And Test Plan

## Feature Flag

- `Features:AiEnabled` в `Messenger/appsettings.json`.
- `true` - AI включен для пользователей.
- `false` - AI эндпоинты и AI-ветка чатов отключены.

## Integration Checks

1. Запустить Ollama и проверить `GET http://localhost:11434/api/tags`.
2. Запустить Python AI сервис (`Bot/ai_service/main.py`) на `:8000`.
3. Запустить Prime backend и frontend.
4. Войти пользователем в Prime и проверить, что появился чат `Prime AI`.
5. Отправить сообщение в `Prime AI` и получить ответ.
6. Проверить создание, удаление, список промптов в AI-менеджере.
7. Проверить список моделей, pull/delete моделей в AI-менеджере.
8. Отключить `Features:AiEnabled=false` и убедиться, что AI API возвращает ошибку о выключенном feature.

## E2E Scenario (manual)

- User login -> chats list includes `Prime AI`.
- User sends `"Привет"` in AI chat.
- Backend saves user message and assistant message.
- Frontend receives assistant message in real-time через SignalR событие `ReceiveMessage`.
