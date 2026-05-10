# 🔐 План реализации End-to-End шифрования

**Дата:** 2026-05-10  
**Проект:** Prime Messenger  
**Цель:** Реализовать E2EE для личных и групповых чатов

---

## 📋 Обзор

### Что такое E2EE?

**End-to-End Encryption (E2EE)** — шифрование, при котором только отправитель и получатель могут прочитать сообщения. Сервер хранит только зашифрованные данные и не может их расшифровать.

### Преимущества

✅ **Приватность** — сервер не видит содержимое сообщений  
✅ **Безопасность** — даже при взломе БД данные защищены  
✅ **Доверие** — пользователи контролируют свои ключи

### Недостатки

⚠️ **Сложность** — требует управления ключами  
⚠️ **Потеря ключа = потеря данных** — нет восстановления  
⚠️ **Поиск** — невозможен полнотекстовый поиск на сервере

---

## 🏗️ Архитектура шифрования

### Типы ключей

| Тип | Алгоритм | Назначение | Где хранится |
|-----|----------|-----------|--------------|
| **Публичный ключ** | RSA-OAEP (2048 bit) | Шифрование для пользователя | БД (User.PublicKey) |
| **Приватный ключ** | RSA-OAEP (2048 bit) | Расшифровка сообщений | localStorage (зашифрован паролем) |
| **Симметричный ключ** | AES-GCM (256 bit) | Шифрование сообщений в группах | БД (ChatUser.EncryptedChatKey) |

---

## 🔄 Процесс шифрования

### 1. Регистрация пользователя

```
1. Пользователь вводит username + password
2. Frontend генерирует пару ключей (RSA-OAEP 2048)
   - publicKey (экспортируется в JWK)
   - privateKey (экспортируется в JWK)
3. privateKey шифруется паролем пользователя (PBKDF2 + AES-GCM)
4. Зашифрованный privateKey сохраняется в localStorage
5. publicKey отправляется на сервер (в base64)
6. Сервер сохраняет publicKey в User.PublicKey
```

**Важно:** Приватный ключ НИКОГДА не покидает устройство пользователя!

---

### 2. Личный чат (1:1)

#### Отправка сообщения

```
Alice → Bob

1. Alice вводит текст сообщения
2. Frontend получает Bob.publicKey с сервера
3. Генерируется случайный AES-256 ключ (messageKey)
4. Текст шифруется messageKey (AES-GCM)
   → encryptedText
5. messageKey шифруется Bob.publicKey (RSA-OAEP)
   → encryptedKey
6. Отправка на сервер:
   {
     chatId: "...",
     encryptedText: "base64...",
     encryptedKey: "base64..."
   }
7. Сервер сохраняет в БД (не может расшифровать)
```

#### Получение сообщения

```
Bob получает сообщение от Alice

1. Bob получает с сервера:
   {
     encryptedText: "base64...",
     encryptedKey: "base64..."
   }
2. Bob расшифровывает encryptedKey своим privateKey (RSA-OAEP)
   → messageKey
3. Bob расшифровывает encryptedText с помощью messageKey (AES-GCM)
   → plainText
4. Отображение plainText в UI
```

---

### 3. Групповой чат

#### Создание группы

```
Alice создаёт группу с Bob и Charlie

1. Alice генерирует симметричный ключ (AES-256)
   → groupKey
2. groupKey шифруется публичным ключом каждого участника:
   - groupKey + Alice.publicKey → encryptedGroupKey_Alice
   - groupKey + Bob.publicKey → encryptedGroupKey_Bob
   - groupKey + Charlie.publicKey → encryptedGroupKey_Charlie
3. Отправка на сервер:
   {
     chatId: "...",
     members: [
       { userId: "Alice", encryptedKey: "..." },
       { userId: "Bob", encryptedKey: "..." },
       { userId: "Charlie", encryptedKey: "..." }
     ]
   }
4. Сервер сохраняет в ChatUser.EncryptedChatKey
```

#### Отправка сообщения в группу

```
Alice отправляет сообщение в группу

1. Alice расшифровывает groupKey своим privateKey
2. Текст шифруется groupKey (AES-GCM)
   → encryptedText
3. Отправка на сервер:
   {
     chatId: "...",
     encryptedText: "base64..."
   }
4. Сервер рассылает всем участникам
```

#### Получение сообщения из группы

```
Bob получает сообщение в группе

1. Bob расшифровывает groupKey своим privateKey (один раз при входе в чат)
2. Bob расшифровывает encryptedText с помощью groupKey
   → plainText
3. Отображение plainText в UI
```

---

## 💻 Реализация

### Этап 1: Backend (ASP.NET)

#### 1.1. Обновление моделей

**User.cs**
```csharp
public class User
{
    // ... существующие поля
    public string? PublicKey { get; set; }  // RSA public key (base64)
}
```

**Message.cs**
```csharp
public class Message
{
    // ... существующие поля
    
    // Старое поле (deprecated, но оставляем для совместимости)
    public string Text { get; set; } = null!;
    
    // Новые поля для E2EE
    public string? EncryptedText { get; set; }      // Зашифрованный текст (base64)
    public string? EncryptedKey { get; set; }       // Зашифрованный AES ключ (base64)
    public bool IsEncrypted { get; set; }           // Флаг шифрования
}
```

**ChatUser.cs**
```csharp
public class ChatUser
{
    // ... существующие поля
    public string? EncryptedChatKey { get; set; }  // Зашифрованный ключ группы (base64)
}
```

#### 1.2. Миграция БД

```bash
cd Prime/Messenger
dotnet ef migrations add AddEncryptionFields
dotnet ef database update
```

#### 1.3. Обновление Controllers

**AuthController.cs**
```csharp
[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterDto dto)
{
    // ... существующая логика
    
    var user = new User
    {
        Username = dto.Username,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
        PublicKey = dto.PublicKey,  // Новое поле
        CreatedAt = DateTime.UtcNow
    };
    
    // ... сохранение в БД
}
```

**MessagesController.cs**
```csharp
[HttpPost("{chatId}/messages")]
public async Task<IActionResult> SendMessage(Guid chatId, [FromBody] SendMessageDto dto)
{
    var message = new Message
    {
        ChatId = chatId,
        SenderId = GetCurrentUserId(),
        Text = dto.Text ?? "",  // Для обратной совместимости
        EncryptedText = dto.EncryptedText,
        EncryptedKey = dto.EncryptedKey,
        IsEncrypted = !string.IsNullOrEmpty(dto.EncryptedText),
        CreatedAt = DateTime.UtcNow
    };
    
    // ... сохранение и отправка через SignalR
}
```

**ChatsController.cs**
```csharp
[HttpPost]
public async Task<IActionResult> CreateChat([FromBody] CreateChatDto dto)
{
    var chat = new Chat
    {
        Name = dto.Name,
        IsGroup = dto.IsGroup,
        CreatedAt = DateTime.UtcNow
    };
    
    _context.Chats.Add(chat);
    
    // Добавление участников с зашифрованными ключами
    foreach (var member in dto.Members)
    {
        _context.ChatUsers.Add(new ChatUser
        {
            ChatId = chat.Id,
            UserId = member.UserId,
            EncryptedChatKey = member.EncryptedKey  // Для групповых чатов
        });
    }
    
    await _context.SaveChangesAsync();
    return Ok(chat);
}
```

---

### Этап 2: Frontend (React)

#### 2.1. Crypto модуль (lib/crypto.ts)

```typescript
// lib/crypto.ts

/**
 * Генерация пары ключей RSA-OAEP
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Экспорт публичного ключа в base64
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

/**
 * Импорт публичного ключа из base64
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

/**
 * Экспорт приватного ключа в JWK
 */
export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey("jwk", key);
}

/**
 * Импорт приватного ключа из JWK
 */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

/**
 * Шифрование приватного ключа паролем (PBKDF2 + AES-GCM)
 */
export async function encryptPrivateKey(
  privateKey: JsonWebKey,
  password: string
): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Деривация ключа из пароля
  const passwordKey = await deriveKeyFromPassword(password, salt);
  
  // Шифрование приватного ключа
  const keyData = new TextEncoder().encode(JSON.stringify(privateKey));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    passwordKey,
    keyData
  );
  
  // Упаковка: salt + iv + encrypted
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return arrayBufferToBase64(result.buffer);
}

/**
 * Расшифровка приватного ключа паролем
 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  password: string
): Promise<JsonWebKey> {
  const data = base64ToArrayBuffer(encryptedBase64);
  const dataArray = new Uint8Array(data);
  
  // Распаковка: salt + iv + encrypted
  const salt = dataArray.slice(0, 16);
  const iv = dataArray.slice(16, 28);
  const encrypted = dataArray.slice(28);
  
  // Деривация ключа из пароля
  const passwordKey = await deriveKeyFromPassword(password, salt);
  
  // Расшифровка
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    passwordKey,
    encrypted
  );
  
  const keyData = new TextDecoder().decode(decrypted);
  return JSON.parse(keyData);
}

/**
 * Генерация случайного AES-256 ключа
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Шифрование текста AES-GCM
 */
export async function encryptText(
  text: string,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Расшифровка текста AES-GCM
 */
export async function decryptText(
  encryptedBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

/**
 * Шифрование AES ключа публичным RSA ключом
 */
export async function encryptAESKey(
  aesKey: CryptoKey,
  publicKey: CryptoKey
): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", aesKey);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    exported
  );
  return arrayBufferToBase64(encrypted);
}

/**
 * Расшифровка AES ключа приватным RSA ключом
 */
export async function decryptAESKey(
  encryptedBase64: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encrypted
  );
  
  return await window.crypto.subtle.importKey(
    "raw",
    decrypted,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// === Утилиты ===

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
```

#### 2.2. Key Manager (lib/keyManager.ts)

```typescript
// lib/keyManager.ts
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  encryptPrivateKey,
  decryptPrivateKey,
  importPrivateKey,
} from "./crypto";

const PRIVATE_KEY_STORAGE_KEY = "encrypted_private_key";
const PUBLIC_KEY_STORAGE_KEY = "public_key";

/**
 * Генерация и сохранение ключей при регистрации
 */
export async function generateAndStoreKeys(password: string): Promise<string> {
  const keyPair = await generateKeyPair();
  
  // Экспорт публичного ключа
  const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
  
  // Экспорт и шифрование приватного ключа
  const privateKeyJwk = await exportPrivateKey(keyPair.privateKey);
  const encryptedPrivateKey = await encryptPrivateKey(privateKeyJwk, password);
  
  // Сохранение в localStorage
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, encryptedPrivateKey);
  localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKeyBase64);
  
  return publicKeyBase64;
}

/**
 * Загрузка приватного ключа при логине
 */
export async function loadPrivateKey(password: string): Promise<CryptoKey> {
  const encryptedPrivateKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (!encryptedPrivateKey) {
    throw new Error("Private key not found");
  }
  
  const privateKeyJwk = await decryptPrivateKey(encryptedPrivateKey, password);
  return await importPrivateKey(privateKeyJwk);
}

/**
 * Получение публичного ключа из localStorage
 */
export function getPublicKey(): string | null {
  return localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
}

/**
 * Очистка ключей при логауте
 */
export function clearKeys(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
  localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
}
```

#### 2.3. Обновление API (lib/chatApi.ts)

```typescript
// lib/chatApi.ts
import { apiFetch } from "./api";
import {
  generateAESKey,
  encryptText,
  decryptText,
  encryptAESKey,
  decryptAESKey,
  importPublicKey,
} from "./crypto";
import { loadPrivateKey } from "./keyManager";

/**
 * Отправка зашифрованного сообщения (личный чат)
 */
export async function sendEncryptedMessage(
  chatId: string,
  text: string,
  recipientPublicKey: string,
  password: string
): Promise<void> {
  // 1. Генерация AES ключа
  const aesKey = await generateAESKey();
  
  // 2. Шифрование текста
  const { encrypted, iv } = await encryptText(text, aesKey);
  const encryptedText = `${iv}:${encrypted}`;  // iv + encrypted
  
  // 3. Шифрование AES ключа публичным ключом получателя
  const recipientKey = await importPublicKey(recipientPublicKey);
  const encryptedKey = await encryptAESKey(aesKey, recipientKey);
  
  // 4. Отправка на сервер
  await apiFetch(`/api/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      encryptedText,
      encryptedKey,
    }),
  });
}

/**
 * Расшифровка полученного сообщения
 */
export async function decryptMessage(
  encryptedText: string,
  encryptedKey: string,
  password: string
): Promise<string> {
  // 1. Загрузка приватного ключа
  const privateKey = await loadPrivateKey(password);
  
  // 2. Расшифровка AES ключа
  const aesKey = await decryptAESKey(encryptedKey, privateKey);
  
  // 3. Разделение iv и encrypted
  const [iv, encrypted] = encryptedText.split(":");
  
  // 4. Расшифровка текста
  return await decryptText(encrypted, iv, aesKey);
}

/**
 * Создание группового чата с зашифрованным ключом
 */
export async function createEncryptedGroupChat(
  name: string,
  memberIds: string[],
  memberPublicKeys: string[],
  password: string
): Promise<void> {
  // 1. Генерация группового ключа
  const groupKey = await generateAESKey();
  
  // 2. Шифрование группового ключа для каждого участника
  const members = await Promise.all(
    memberIds.map(async (userId, index) => {
      const publicKey = await importPublicKey(memberPublicKeys[index]);
      const encryptedKey = await encryptAESKey(groupKey, publicKey);
      return { userId, encryptedKey };
    })
  );
  
  // 3. Создание чата
  await apiFetch("/api/chats", {
    method: "POST",
    body: JSON.stringify({
      name,
      isGroup: true,
      members,
    }),
  });
}
```

#### 2.4. Обновление UI (pages/MessengerPage.tsx)

```typescript
// pages/MessengerPage.tsx (фрагмент)

const [password, setPassword] = useState<string>("");  // Пароль пользователя (для расшифровки)

// Отправка сообщения
const handleSendMessage = async (text: string) => {
  if (!selectedChat || !password) return;
  
  try {
    if (selectedChat.isEncrypted) {
      // Получить публичный ключ получателя
      const recipientPublicKey = await fetchRecipientPublicKey(selectedChat.id);
      
      // Отправить зашифрованное сообщение
      await sendEncryptedMessage(
        selectedChat.id,
        text,
        recipientPublicKey,
        password
      );
    } else {
      // Обычное сообщение (для обратной совместимости)
      await sendMessage(selectedChat.id, text);
    }
    
    toast.success("Сообщение отправлено");
  } catch (error) {
    toast.error("Ошибка отправки");
  }
};

// Расшифровка сообщений при загрузке
useEffect(() => {
  if (!messages || !password) return;
  
  const decryptMessages = async () => {
    const decrypted = await Promise.all(
      messages.map(async (msg) => {
        if (msg.isEncrypted && msg.encryptedText && msg.encryptedKey) {
          try {
            const plainText = await decryptMessage(
              msg.encryptedText,
              msg.encryptedKey,
              password
            );
            return { ...msg, text: plainText };
          } catch (error) {
            return { ...msg, text: "[Не удалось расшифровать]" };
          }
        }
        return msg;
      })
    );
    
    setDecryptedMessages(decrypted);
  };
  
  decryptMessages();
}, [messages, password]);
```

---

## 🧪 Тестирование

### Сценарии тестирования

#### 1. Регистрация с генерацией ключей
- [ ] Пользователь регистрируется
- [ ] Генерируется пара ключей
- [ ] Публичный ключ отправляется на сервер
- [ ] Приватный ключ сохраняется в localStorage (зашифрованный)

#### 2. Личный чат (1:1)
- [ ] Alice отправляет сообщение Bob
- [ ] Сообщение шифруется публичным ключом Bob
- [ ] Bob получает и расшифровывает сообщение
- [ ] Сервер не может прочитать сообщение

#### 3. Групповой чат
- [ ] Alice создаёт группу с Bob и Charlie
- [ ] Генерируется групповой ключ
- [ ] Ключ шифруется для каждого участника
- [ ] Все участники могут читать сообщения
- [ ] Сервер не может прочитать сообщения

#### 4. Потеря ключа
- [ ] Пользователь очищает localStorage
- [ ] Старые сообщения не расшифровываются
- [ ] Новые сообщения работают после повторного логина

---

## 📝 Чеклист реализации

### Backend
- [ ] Добавить поле `User.PublicKey`
- [ ] Добавить поля `Message.EncryptedText`, `Message.EncryptedKey`, `Message.IsEncrypted`
- [ ] Добавить поле `ChatUser.EncryptedChatKey`
- [ ] Создать миграцию БД
- [ ] Обновить `AuthController.Register` (принимать publicKey)
- [ ] Обновить `MessagesController.SendMessage` (принимать зашифрованные данные)
- [ ] Обновить `ChatsController.CreateChat` (принимать зашифрованные ключи)
- [ ] Обновить SignalR Hub (передавать зашифрованные сообщения)

### Frontend
- [ ] Создать `lib/crypto.ts` (Web Crypto API)
- [ ] Создать `lib/keyManager.ts` (управление ключами)
- [ ] Обновить `lib/chatApi.ts` (шифрование/расшифровка)
- [ ] Обновить `RegisterForm.tsx` (генерация ключей)
- [ ] Обновить `LoginForm.tsx` (загрузка приватного ключа)
- [ ] Обновить `MessengerPage.tsx` (отправка/получение зашифрованных сообщений)
- [ ] Добавить UI для включения/выключения E2EE
- [ ] Добавить индикатор зашифрованных чатов (🔒)

### Тестирование
- [ ] Тест регистрации с ключами
- [ ] Тест личного чата (1:1)
- [ ] Тест группового чата
- [ ] Тест потери ключа
- [ ] Тест обратной совместимости (незашифрованные чаты)

---

## 🚀 Следующие шаги

1. ✅ **Research завершён** (RESEARCH.md)
2. ✅ **План создан** (ENCRYPTION_PLAN.md)
3. ⏭️ **Реализация Backend** (миграции + Controllers)
4. ⏭️ **Реализация Frontend** (crypto.ts + keyManager.ts)
5. ⏭️ **Интеграция в UI** (MessengerPage)
6. ⏭️ **Тестирование** (все сценарии)
7. ⏭️ **Документация** (обновить README.md)

---

**Статус:** ✅ План готов  
**Готов к реализации:** Да  
**Следующий шаг:** Начать с Backend (миграции)
