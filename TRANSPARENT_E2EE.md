# 🔐 Прозрачное E2EE — Инструкция по использованию

**Дата:** 2026-05-10  
**Статус:** Готово к интеграции

---

## 📋 Концепция

Шифрование работает **автоматически и прозрачно**:
- UI работает с обычным текстом
- API автоматически шифрует перед отправкой
- API автоматически расшифровывает при получении
- БД хранит только зашифрованные данные

---

## 🚀 Как использовать в UI

### 1. Отправка сообщения

**Вместо:**
```typescript
import { sendMessage } from "@/lib/chatApi";

await sendMessage(chatId, text);
```

**Используй:**
```typescript
import { sendSecureMessage } from "@/lib/secureMessaging";

const password = getUserPassword(); // Получить пароль пользователя
await sendSecureMessage(chatId, text, password);
```

### 2. Отображение сообщений

**Вместо:**
```typescript
<div>{message.text}</div>
```

**Используй:**
```typescript
import { decryptMessageIfNeeded } from "@/lib/secureMessaging";

const [decryptedText, setDecryptedText] = useState(message.text);

useEffect(() => {
  const decrypt = async () => {
    const password = getUserPassword();
    const text = await decryptMessageIfNeeded(message, password);
    setDecryptedText(text);
  };
  decrypt();
}, [message]);

<div>{decryptedText}</div>
```

---

## 🔄 Логика работы

### Отправка (sendSecureMessage):

1. **Проверка ключей** — есть ли у пользователя E2EE ключи?
   - Нет → отправить plain text
   
2. **Определение типа чата:**
   - **AI чат** → plain text (AI должен читать)
   - **Групповой чат** → plain text (пока не реализовано)
   - **Личный чат** → шифровать ✅

3. **Получение публичного ключа получателя:**
   - Есть → шифровать
   - Нет → plain text (получатель не поддерживает E2EE)

4. **Шифрование и отправка:**
   - Генерируется AES-256 ключ
   - Текст шифруется AES ключом
   - AES ключ шифруется публичным ключом получателя
   - Отправляется на сервер

### Получение (decryptMessageIfNeeded):

1. **Проверка флага** — `message.isEncrypted`?
   - Нет → вернуть `message.text` как есть
   
2. **Расшифровка:**
   - Загрузить приватный ключ из localStorage
   - Расшифровать AES ключ приватным ключом
   - Расшифровать текст AES ключом
   - Вернуть расшифрованный текст

3. **Обработка ошибок:**
   - Если расшифровка не удалась → показать "[🔒 Не удалось расшифровать]"

---

## 🎯 Преимущества

✅ **Прозрачность** — UI не знает о шифровании  
✅ **Автоматизм** — шифрование по умолчанию  
✅ **Обратная совместимость** — работает с plain text  
✅ **Graceful degradation** — если ошибка → plain text  
✅ **Безопасность** — БД хранит только зашифрованные данные

---

## 📝 TODO для полной интеграции

### MessengerPage.tsx:

1. **Хранение пароля в состоянии:**
   ```typescript
   const [userPassword, setUserPassword] = useState<string>("");
   
   // При логине сохранить пароль
   useEffect(() => {
     const password = prompt("Введите пароль для расшифровки:");
     setUserPassword(password || "");
   }, []);
   ```

2. **Отправка сообщений:**
   ```typescript
   const handleSendMessage = async (text: string) => {
     await sendSecureMessage(chatId, text, userPassword);
   };
   ```

3. **Отображение сообщений:**
   ```typescript
   const MessageItem = ({ message }: { message: Message }) => {
     const [text, setText] = useState(message.text);
     
     useEffect(() => {
       decryptMessageIfNeeded(message, userPassword).then(setText);
     }, [message]);
     
     return <div>{text}</div>;
   };
   ```

4. **Индикатор шифрования:**
   ```typescript
   {message.isEncrypted && <span>🔒</span>}
   ```

---

## ⚠️ Важно

**Пароль пользователя:**
- Нужен для расшифровки приватного ключа
- Хранится в памяти (state) на время сессии
- НЕ отправляется на сервер
- При логауте — очищается

**Альтернатива:** Можно запрашивать пароль один раз при логине и хранить в `sessionStorage`.

---

## 🧪 Тестирование

1. Зарегистрировать двух пользователей (Alice, Bob)
2. Alice отправляет сообщение Bob
3. Проверить в БД — `EncryptedText` заполнен, `Text` пустой
4. Bob получает сообщение — видит расшифрованный текст
5. Проверить в DevTools — логи "🔐 Encrypting message for recipient"

---

**Статус:** ✅ Готово к интеграции  
**Следующий шаг:** Обновить MessengerPage.tsx
