# 🧪 Тестирование E2EE

**Дата:** 2026-05-10  
**Статус:** Готово к тестированию

---

## 📋 Что было сделано

### Backend ✅
- [x] Добавлено поле `User.PublicKey` (string, nullable)
- [x] Добавлено поле `Message.EncryptedText` (string, nullable)
- [x] Добавлено поле `Message.EncryptedKey` (string, nullable)
- [x] Добавлено поле `Message.IsEncrypted` (bool, default false)
- [x] Добавлено поле `ChatUser.EncryptedChatKey` (string, nullable)
- [x] Создана миграция `AddEncryptionFields`
- [x] Миграция применена к БД

### Frontend ✅
- [x] Создан файл тестов `test-crypto.js`
- [x] Создана HTML страница для запуска тестов `test-crypto.html`

---

## 🚀 Запуск тестов

### Шаг 1: Запустить Frontend

```bash
cd C:\Users\maksi\Documents\Github_Repositories\ChatBotWIthOllama\Prime\messanger-front
npm run dev
```

Frontend запустится на `http://localhost:5173`

### Шаг 2: Открыть страницу тестов

Откройте в браузере:
```
http://localhost:5173/test-crypto.html
```

### Шаг 3: Запустить тесты

1. Нажмите кнопку **"🚀 Run All Tests"**
2. Дождитесь завершения (займёт ~5-10 секунд)
3. Проверьте результаты в консоли на странице

---

## 🧪 Что тестируется

### Test 1: Generate RSA Key Pair
- Генерация пары ключей RSA-OAEP 2048
- Проверка наличия публичного и приватного ключей

### Test 2: Export/Import Public Key
- Экспорт публичного ключа в base64
- Импорт публичного ключа из base64
- Проверка корректности импорта

### Test 3: Encrypt/Decrypt Private Key with Password
- Экспорт приватного ключа в JWK
- Шифрование приватного ключа паролем (PBKDF2 + AES-GCM)
- Расшифровка приватного ключа паролем
- Проверка корректности расшифровки

### Test 4: Generate AES-256 Key
- Генерация симметричного ключа AES-GCM 256
- Проверка возможности использования для шифрования

### Test 5: Encrypt/Decrypt Text with AES
- Шифрование текста с помощью AES-GCM
- Расшифровка текста
- Проверка совпадения оригинала и расшифрованного текста

### Test 6: Encrypt/Decrypt AES Key with RSA
- Шифрование AES ключа публичным RSA ключом
- Расшифровка AES ключа приватным RSA ключом
- Проверка корректности расшифровки

### Test 7: Full E2EE Flow (Alice → Bob)
- Alice генерирует пару ключей
- Bob генерирует пару ключей
- Alice отправляет зашифрованное сообщение Bob:
  1. Генерирует AES ключ
  2. Шифрует сообщение AES ключом
  3. Шифрует AES ключ публичным ключом Bob
- Bob получает и расшифровывает:
  1. Расшифровывает AES ключ своим приватным ключом
  2. Расшифровывает сообщение AES ключом
- Проверка совпадения оригинального и расшифрованного сообщения

---

## ✅ Ожидаемый результат

Все тесты должны пройти успешно:

```
═══════════════════════════════════════════════════
🧪 E2EE Crypto Tests
═══════════════════════════════════════════════════

Test 1: Generate RSA Key Pair
✅ Key pair generated successfully

Test 2: Export/Import Public Key
✅ Public key exported to base64
✅ Public key imported successfully

Test 3: Encrypt/Decrypt Private Key with Password
✅ Private key exported to JWK
✅ Private key encrypted with password
✅ Private key decrypted successfully

Test 4: Generate AES-256 Key
✅ AES-256 key generated successfully

Test 5: Encrypt/Decrypt Text with AES-GCM
✅ Text encrypted successfully
✅ Text decrypted successfully
✅ Match: ✅

Test 6: Encrypt/Decrypt AES Key with RSA
✅ AES key encrypted with RSA public key
✅ AES key decrypted with RSA private key

🔐 Test 7: Full E2EE Flow (Alice → Bob)
✅ Alice: Message encrypted and ready to send
✅ Bob: Message decrypted successfully
✅ Match: ✅

═══════════════════════════════════════════════════
🎉 All tests completed!
═══════════════════════════════════════════════════

✅ E2EE is working correctly!
   Ready to implement in the application.
```

---

## 🐛 Если тесты не проходят

### Проблема: "crypto is not defined"
**Решение:** Убедитесь что страница открыта через HTTPS или localhost

### Проблема: "SubtleCrypto is not available"
**Решение:** Используйте современный браузер (Chrome 60+, Firefox 57+, Safari 11+)

### Проблема: "Failed to decrypt"
**Решение:** Проверьте что используется правильный алгоритм и параметры

---

## 📝 Следующие шаги

После успешного прохождения тестов:

1. ✅ **Backend готов** — поля добавлены, миграция применена
2. ✅ **Crypto функции работают** — Web Crypto API протестирован
3. ⏭️ **Создать crypto.ts** — перенести функции из тестов в модуль
4. ⏭️ **Создать keyManager.ts** — управление ключами
5. ⏭️ **Обновить API** — интеграция шифрования в chatApi.ts
6. ⏭️ **Обновить UI** — RegisterForm, LoginForm, MessengerPage

---

## 🎯 Цель

Убедиться что Web Crypto API работает корректно в браузере перед интеграцией в приложение.

---

**Статус:** ✅ Готово к тестированию  
**Время выполнения:** ~5-10 секунд  
**Следующий шаг:** Запустить тесты и проверить результаты
