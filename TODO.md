# ✅ TODO: Prime Messenger — E2EE Implementation

**Дата:** 2026-05-10  
**Приоритет:** 🔥 Высокий (конференция)

---

## 📋 Чеклист реализации

### Этап 1: Backend (ASP.NET) ⏳

#### 1.1. Модели данных
- [ ] Добавить `User.PublicKey` (string, nullable)
- [ ] Добавить `Message.EncryptedText` (string, nullable)
- [ ] Добавить `Message.EncryptedKey` (string, nullable)
- [ ] Добавить `Message.IsEncrypted` (bool, default false)
- [ ] Добавить `ChatUser.EncryptedChatKey` (string, nullable)

#### 1.2. Миграция БД
- [ ] Создать миграцию: `dotnet ef migrations add AddEncryptionFields`
- [ ] Применить миграцию: `dotnet ef database update`
- [ ] Проверить структуру БД

#### 1.3. Controllers
- [ ] `AuthController.Register` — принимать `publicKey` в DTO
- [ ] `MessagesController.SendMessage` — принимать `encryptedText` и `encryptedKey`
- [ ] `ChatsController.CreateChat` — принимать `encryptedChatKey` для участников
- [ ] `UsersController` — добавить endpoint для получения публичного ключа пользователя

#### 1.4. SignalR Hub
- [ ] Обновить `ChatHub` для передачи зашифрованных сообщений
- [ ] Тестировать real-time доставку

---

### Этап 2: Frontend (React) ⏳

#### 2.1. Crypto модуль
- [ ] Создать `lib/crypto.ts` с функциями:
  - [ ] `generateKeyPair()` — генерация RSA-OAEP 2048
  - [ ] `exportPublicKey()` / `importPublicKey()`
  - [ ] `exportPrivateKey()` / `importPrivateKey()`
  - [ ] `encryptPrivateKey()` / `decryptPrivateKey()` (PBKDF2 + AES-GCM)
  - [ ] `generateAESKey()` — генерация AES-256
  - [ ] `encryptText()` / `decryptText()` (AES-GCM)
  - [ ] `encryptAESKey()` / `decryptAESKey()` (RSA-OAEP)

#### 2.2. Key Manager
- [ ] Создать `lib/keyManager.ts` с функциями:
  - [ ] `generateAndStoreKeys(password)` — генерация и сохранение ключей
  - [ ] `loadPrivateKey(password)` — загрузка приватного ключа
  - [ ] `getPublicKey()` — получение публичного ключа из localStorage
  - [ ] `clearKeys()` — очистка при логауте

#### 2.3. Chat API
- [ ] Обновить `lib/chatApi.ts`:
  - [ ] `sendEncryptedMessage()` — отправка зашифрованного сообщения
  - [ ] `decryptMessage()` — расшифровка полученного сообщения
  - [ ] `createEncryptedGroupChat()` — создание группы с зашифрованным ключом
  - [ ] `fetchRecipientPublicKey()` — получение публичного ключа получателя

#### 2.4. UI компоненты
- [ ] Обновить `RegisterForm.tsx`:
  - [ ] Генерация ключей при регистрации
  - [ ] Отправка публичного ключа на сервер
  - [ ] Сохранение приватного ключа в localStorage
- [ ] Обновить `LoginForm.tsx`:
  - [ ] Загрузка приватного ключа при логине
  - [ ] Проверка наличия ключа
- [ ] Обновить `MessengerPage.tsx`:
  - [ ] Отправка зашифрованных сообщений
  - [ ] Расшифровка полученных сообщений
  - [ ] Индикатор зашифрованных чатов (🔒)
  - [ ] Обработка ошибок расшифровки

---

### Этап 3: UI/UX ⏳

- [ ] Добавить иконку 🔒 для зашифрованных чатов
- [ ] Добавить переключатель E2EE в настройках чата
- [ ] Добавить предупреждение о потере ключа при регистрации
- [ ] Добавить индикатор "Расшифровка..." при загрузке сообщений
- [ ] Добавить сообщение "[Не удалось расшифровать]" при ошибке

---

### Этап 4: Тестирование ⏳

#### 4.1. Регистрация
- [ ] Пользователь регистрируется
- [ ] Генерируется пара ключей
- [ ] Публичный ключ отправляется на сервер
- [ ] Приватный ключ сохраняется в localStorage (зашифрованный)

#### 4.2. Личный чат (1:1)
- [ ] Alice отправляет сообщение Bob
- [ ] Сообщение шифруется публичным ключом Bob
- [ ] Bob получает и расшифровывает сообщение
- [ ] Сервер не может прочитать сообщение (проверить в БД)

#### 4.3. Групповой чат
- [ ] Alice создаёт группу с Bob и Charlie
- [ ] Генерируется групповой ключ
- [ ] Ключ шифруется для каждого участника
- [ ] Все участники могут читать сообщения
- [ ] Сервер не может прочитать сообщения (проверить в БД)

#### 4.4. Потеря ключа
- [ ] Пользователь очищает localStorage
- [ ] Старые сообщения не расшифровываются
- [ ] Новые сообщения работают после повторного логина

#### 4.5. Обратная совместимость
- [ ] Старые незашифрованные чаты работают
- [ ] Можно создавать как зашифрованные, так и обычные чаты

---

## 📂 Файлы для создания/изменения

### Backend
```
Prime/Messenger/
├── Models/
│   ├── User.cs                 [ИЗМЕНИТЬ]
│   ├── Message.cs              [ИЗМЕНИТЬ]
│   └── ChatUser.cs             [ИЗМЕНИТЬ]
├── Controllers/
│   ├── AuthController.cs       [ИЗМЕНИТЬ]
│   ├── MessagesController.cs   [ИЗМЕНИТЬ]
│   ├── ChatsController.cs      [ИЗМЕНИТЬ]
│   └── UsersController.cs      [ИЗМЕНИТЬ]
├── DTO/
│   ├── RegisterDto.cs          [ИЗМЕНИТЬ]
│   ├── SendMessageDto.cs       [ИЗМЕНИТЬ]
│   └── CreateChatDto.cs        [ИЗМЕНИТЬ]
└── Hubs/
    └── ChatHub.cs              [ИЗМЕНИТЬ]
```

### Frontend
```
Prime/messanger-front/src/
├── lib/
│   ├── crypto.ts               [СОЗДАТЬ]
│   ├── keyManager.ts           [СОЗДАТЬ]
│   └── chatApi.ts              [ИЗМЕНИТЬ]
├── components/ui/auth/
│   ├── RegisterForm.tsx        [ИЗМЕНИТЬ]
│   └── LoginForm.tsx           [ИЗМЕНИТЬ]
└── pages/
    └── MessengerPage.tsx       [ИЗМЕНИТЬ]
```

---

## 🚀 Порядок выполнения

1. **Backend сначала** — добавить поля в модели, создать миграцию
2. **Frontend crypto** — реализовать шифрование (crypto.ts, keyManager.ts)
3. **Интеграция** — связать Frontend и Backend (API, UI)
4. **Тестирование** — проверить все сценарии
5. **Полировка** — улучшить UI/UX, добавить индикаторы

---

## 📝 Заметки

- Приватный ключ НИКОГДА не покидает устройство пользователя
- Сервер хранит только зашифрованные данные
- При потере ключа данные невозможно восстановить (предупредить пользователя!)
- Обратная совместимость: старые чаты остаются незашифрованными

---

## 🎯 Цель

**Реализовать полноценное E2EE для Prime Messenger к конференции!** 🔐

---

**Статус:** Готов к реализации  
**Документация:** RESEARCH.md, ENCRYPTION_PLAN.md, PROJECT_STATUS.md  
**Следующий шаг:** Начать с Backend (модели + миграция)
