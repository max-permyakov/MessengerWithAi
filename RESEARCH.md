# 🔍 Research: Prime Messenger — Анализ кода

**Дата:** 2026-05-10  
**Цель:** Изучение архитектуры проекта для реализации end-to-end шифрования

---

## 📊 Общая архитектура

### Компоненты проекта

```
Prime Messenger
├── Backend (ASP.NET Core 10)
│   ├── Controllers/        — API endpoints
│   ├── Models/            — Модели данных (User, Chat, Message)
│   ├── Services/          — Бизнес-логика (JWT, AI)
│   ├── Hubs/              — SignalR для real-time
│   └── Data/              — DbContext (SQL Server)
│
├── Frontend (React 19 + Vite)
│   ├── components/        — UI компоненты
│   ├── lib/               — API клиенты (api.ts, chatApi.ts)
│   └── pages/             — Страницы (MessengerPage, ProfilePage)
│
└── Bot (Python + aiogram)
    ├── bot/               — Telegram бот
    ├── ai_service/        — FastAPI сервис для Ollama
    └── func/              — Утилиты (DB, Ollama)
```

---

## 🗄️ Модели данных

### User (User.cs)

```csharp
public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; }
    public string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? AvatarPath { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public ICollection<ChatUser> ChatUsers { get; set; }
    public ICollection<Message> SentMessages { get; set; }
}
```

**Важно для шифрования:**
- Нужно добавить поле `PublicKey` (для E2EE)
- Приватный ключ хранится только на клиенте

---

### Chat (Chat.cs)

```csharp
public class Chat
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public bool IsGroup { get; set; }
    public bool IsAi { get; set; }
    public Guid? AiOwnerUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public ICollection<ChatUser> ChatUsers { get; set; }
    public ICollection<Message> Messages { get; set; }
}
```

**Важно для шифрования:**
- Для групповых чатов нужен общий симметричный ключ
- Ключ шифруется публичным ключом каждого участника

---

### Message (Message.cs)

```csharp
public class Message
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid SenderId { get; set; }
    
    public string Text { get; set; }           // ⚠️ Сейчас plain text
    public string Role { get; set; } = "user";
    public bool IsAi { get; set; }
    public string? ModelName { get; set; }
    public int? PromptId { get; set; }
    
    // Файлы
    public string? FileName { get; set; }
    public string? FilePath { get; set; }
    public string? FileContentType { get; set; }
    public long? FileSize { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public Chat Chat { get; set; }
    public User Sender { get; set; }
}
```

**Важно для шифрования:**
- `Text` должен храниться в зашифрованном виде
- Нужно добавить поле `EncryptedKey` (ключ для расшифровки)
- Файлы тоже должны шифроваться

---

## 🔐 Текущая безопасность

### Что уже есть

✅ **JWT аутентификация** (JwtService)
- Токены для авторизации
- Валидация Issuer, Audience, Lifetime

✅ **HTTPS** (SSL/TLS)
- Самоподписанные сертификаты для dev
- Шифрование транспорта

✅ **CORS** (Program.cs)
- Ограничение доступа по origin
- Поддержка локальной сети

✅ **Хеширование паролей** (PasswordHash)
- Пароли не хранятся в plain text

### Что НЕ защищено

❌ **Сообщения в БД** — хранятся в plain text
❌ **Файлы** — хранятся без шифрования
❌ **История чатов** — доступна администратору БД
❌ **AI-сообщения** — отправляются в Ollama без шифрования

---

## 🌐 API и коммуникация

### Frontend → Backend (api.ts)

```typescript
const API_URL = import.meta.env.VITE_API_URL || "https://192.168.0.233:4001";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  return response.json();
};
```

**Важно:**
- Токен хранится в `localStorage`
- Все запросы идут через HTTPS
- Нужно добавить шифрование перед отправкой

---

### Real-time (SignalR Hub)

```csharp
// Program.cs
app.MapHub<ChatHub>("/hubs/chat");

// JWT токен передаётся через query string
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        var path = context.HttpContext.Request.Path;
        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/chat"))
        {
            context.Token = accessToken;
        }
        return Task.CompletedTask;
    }
};
```

**Важно:**
- SignalR используется для real-time сообщений
- Нужно шифровать сообщения перед отправкой через Hub

---

## 📁 Структура файлов

### Backend

```
Prime/Messenger/
├── Controllers/
│   ├── AuthController.cs       — Регистрация, логин
│   ├── ChatsController.cs      — CRUD чатов
│   ├── MessagesController.cs   — Отправка сообщений
│   ├── UsersController.cs      — Профили пользователей
│   └── AiController.cs         — AI-функции
│
├── Models/
│   ├── User.cs
│   ├── Chat.cs
│   ├── Message.cs
│   ├── ChatUsers.cs
│   └── SystemPrompt.cs
│
├── Services/
│   ├── JwtService.cs           — Генерация JWT
│   └── AiServiceClient.cs      — Клиент для Ollama
│
├── Hubs/
│   └── ChatHub.cs              — SignalR Hub
│
├── Data/
│   └── AppDbContext.cs         — EF Core DbContext
│
└── Program.cs                  — Конфигурация приложения
```

### Frontend

```
Prime/messanger-front/src/
├── components/
│   └── ui/
│       ├── auth/
│       │   ├── LoginForm.tsx
│       │   └── RegisterForm.tsx
│       ├── button.tsx
│       ├── dialog.tsx
│       └── input.tsx
│
├── lib/
│   ├── api.ts                  — Базовый API клиент
│   ├── auth.ts                 — Аутентификация
│   ├── chatApi.ts              — API для чатов
│   └── utils.ts                — Утилиты
│
├── pages/
│   ├── MessengerPage.tsx       — Главная страница
│   └── ProfilePage.tsx         — Профиль пользователя
│
├── App.tsx                     — Главный компонент
└── main.tsx                    — Точка входа
```

---

## 🎯 Выводы для реализации E2EE

### Что нужно изменить

#### 1. **Backend (ASP.NET)**

**Модели:**
- Добавить `User.PublicKey` (string, base64)
- Добавить `Message.EncryptedText` (string, base64)
- Добавить `Message.EncryptedKey` (string, base64)
- Добавить `ChatUser.EncryptedChatKey` (для групповых чатов)

**Миграции:**
```bash
dotnet ef migrations add AddEncryptionFields
dotnet ef database update
```

**Controllers:**
- `AuthController` — возвращать публичный ключ при регистрации
- `MessagesController` — принимать зашифрованные сообщения
- `ChatsController` — управление ключами групповых чатов

#### 2. **Frontend (React)**

**Новые модули:**
- `lib/crypto.ts` — функции шифрования (Web Crypto API)
- `lib/keyManager.ts` — управление ключами (генерация, хранение)

**Изменения:**
- `chatApi.ts` — шифровать перед отправкой, расшифровывать при получении
- `MessengerPage.tsx` — показывать расшифрованные сообщения
- `localStorage` — хранить приватный ключ (зашифрованный паролем)

#### 3. **База данных**

**Новые поля:**
```sql
ALTER TABLE Users ADD PublicKey NVARCHAR(MAX);
ALTER TABLE Messages ADD EncryptedText NVARCHAR(MAX);
ALTER TABLE Messages ADD EncryptedKey NVARCHAR(MAX);
ALTER TABLE ChatUsers ADD EncryptedChatKey NVARCHAR(MAX);
```

---

## 🔒 Архитектура шифрования (план)

### Личные чаты (1:1)

```
Alice                           Bob
  │                              │
  ├─ Генерирует пару ключей     ├─ Генерирует пару ключей
  │  (publicKey, privateKey)     │  (publicKey, privateKey)
  │                              │
  ├─ Отправляет publicKey        ├─ Отправляет publicKey
  │  на сервер                   │  на сервер
  │                              │
  ├─ Получает Bob.publicKey      ├─ Получает Alice.publicKey
  │                              │
  ├─ Шифрует сообщение           │
  │  Bob.publicKey               │
  │                              │
  ├─ Отправляет зашифрованное ──►├─ Расшифровывает
  │  сообщение на сервер         │  своим privateKey
  │                              │
```

### Групповые чаты

```
Group Chat
  │
  ├─ Создатель генерирует симметричный ключ (AES-256)
  │
  ├─ Ключ шифруется публичным ключом каждого участника
  │
  ├─ Зашифрованные копии ключа сохраняются в ChatUsers
  │
  ├─ Участник расшифровывает ключ своим приватным ключом
  │
  ├─ Сообщения шифруются/расшифровываются симметричным ключом
  │
```

---

## 📝 Следующие шаги

1. ✅ **Research завершён** — архитектура изучена
2. ⏭️ **Создать план реализации** (ENCRYPTION_PLAN.md)
3. ⏭️ **Реализовать crypto.ts** (Web Crypto API)
4. ⏭️ **Добавить поля в модели** (миграции)
5. ⏭️ **Обновить API** (Controllers)
6. ⏭️ **Интегрировать в UI** (MessengerPage)
7. ⏭️ **Тестирование** (личные и групповые чаты)

---

**Статус:** ✅ Research завершён  
**Следующий файл:** `ENCRYPTION_PLAN.md`
