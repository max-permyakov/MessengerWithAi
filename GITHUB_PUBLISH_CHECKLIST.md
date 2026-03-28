# 📋 Чеклист для публикации на GitHub

Этот файл поможет вам подготовить проект к публикации на GitHub.

## ✅ Выполнено

- [x] Создан подробный README.md с инструкциями по установке и использованию
- [x] Создан .gitignore для исключения чувствительных файлов
- [x] Создан LICENSE (MIT)
- [x] Создан CHANGELOG.md с историей изменений
- [x] Создан CONTRIBUTING.md с правилами внесения вклада
- [x] Создан DEPLOYMENT.md с инструкциями по развёртыванию
- [x] Создан QUICKSTART.md для быстрого старта
- [x] Созданы .env.example файлы для всех компонентов
- [x] Создан appsettings.example.json для Backend
- [x] Созданы PowerShell скрипты для проверки и запуска
- [x] Реализована система уведомлений (счетчик + системные уведомления + звук)
- [x] Проверена сборка всех компонентов
- [x] Все чувствительные данные удалены из файлов

## ⚠️ Требуется внимания

### 1. Проверить .gitignore

Убедитесь, что следующие файлы НЕ попадут в репозиторий:

- [ ] Bot/.env
- [ ] Bot/users.db
- [ ] Prime/messanger-front/.env.local
- [ ] Prime/messanger-front/.env
- [ ] Prime/Messenger/appsettings.json (с реальными ключами)
- [ ] Prime/Messenger/certs/*.pfx
- [ ] Prime/Messenger/Messenger.db
- [ ] **/*.log

### 2. Обновить информацию в README

Замените следующие строки в README.md:

```markdown
# Замените
https://github.com/ваш-username/ChatBotWIthOllama
# На ваш реальный username

# Замените контакты и ссылки
```

### 3. Создать репозиторий на GitHub

```bash
# В корневой директории проекта
git init
git add .
git commit -m "feat: initial commit with notifications system"

# Создайте репозиторий на GitHub (без README, .gitignore, license)
# Затем выполните:
git remote add origin https://github.com/your-username/ChatBotWIthOllama.git
git branch -M main
git push -u origin main
```

### 4. Настроить GitHub Repository

После создания репозитория:

1. **Settings → General**:
   - [ ] Add description: "Мессенджер с AI-ассистентом на базе Ollama"
   - [ ] Add website: (если есть)
   - [ ] Choose a license: MIT License (уже есть в репозитории)

2. **Settings → Branches**:
   - [ ] Set default branch: `main`

3. **Settings → Actions**:
   - [ ] Enable GitHub Actions (опционально для CI/CD)

4. **About section**:
   - [ ] Add topics: `messenger`, `ai`, `ollama`, `react`, `dotnet`, `telegram-bot`, `signalr`, `real-time`

### 5. Опционально: GitHub Actions

Создайте `.github/workflows/ci.yml` для автоматической сборки:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-backend:
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '10.0.x'
    - name: Build Backend
      run: |
        cd Prime/Messenger
        dotnet build

  build-frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20.x'
    - name: Build Frontend
      run: |
        cd Prime/messanger-front
        npm install
        npm run build
```

---

## 🚀 Финальные шаги

### 1. Проверка перед публикацией

```bash
# Убедитесь, что нет чувствительных данных
git status
git diff --cached

# Проверьте .gitignore
git check-ignore -v Bot/.env
git check-ignore -v Prime/messanger-front/.env.local
```

### 2. Первый коммит

```bash
git add .
git commit -m "feat: Prime Messenger v1.0.0 with AI notifications

- Real-time messaging with SignalR
- Unread message counter
- System notifications with sound
- AI assistant integration (Ollama)
- Telegram bot
- File sharing up to 5GB
- Responsive design

Closes #1"
```

### 3. Публикация

```bash
git remote add origin https://github.com/your-username/ChatBotWIthOllama.git
git branch -M main
git push -u origin main
```

### 4. После публикации

- [ ] Проверьте, что README отображается корректно
- [ ] Проверьте, что файлы .env не попали в репозиторий
- [ ] Добавьте скриншоты в README (опционально)
- [ ] Создайте первый релиз на GitHub Releases

---

## 📸 Скриншоты для README (опционально)

Сделайте скриншоты следующих экранов:

1. Главная страница мессенджера
2. Список чатов с счётчиком непрочитанных
3. Системное уведомление
4. AI-чат с выбранным промптом
5. Telegram-бот с главным меню

Добавьте скриншоты в папку `docs/screenshots/` и обновите README.

---

## 🎉 Готово!

После выполнения всех шагов ваш проект готов к публикации!

### Ссылки для проверки

- [ ] GitHub репозиторий: https://github.com/your-username/ChatBotWIthOllama
- [ ] README отображается корректно
- [ ] Все ссылки работают
- [ ] Файлы .env не в репозитории
- [ ] License указан

---

**Успешной публикации!** 🚀
