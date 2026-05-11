// lib/secureMessaging.ts - Transparent E2EE wrapper for messaging

import { sendMessage, sendEncryptedMessage, getUserPublicKey, getChatDetails } from "./chatApi";
import type { Message } from "./chatApi";
import { encryptMessageForRecipient } from "./chatEncryption";
import { hasKeys } from "./keyManager";

/**
 * Send message with automatic encryption
 * - Checks if E2EE is available (user has keys)
 * - For direct chats: encrypts with recipient's public key
 * - For AI chats: sends plain text (AI needs to read)
 * - For group chats: sends plain text for now (TODO: group encryption)
 */
export async function sendSecureMessage(
  chatId: string,
  text: string,
  password: string,
  options?: { model?: string | null; promptId?: number | null }
): Promise<Message> {
  console.log("[sendSecureMessage] Called with:", { chatId, textLength: text.length, hasPassword: !!password });
  
  // If no password, send plain text
  if (!password) {
    console.log("No password provided, sending plain text");
    return sendMessage(chatId, text, options);
  }

  // Check if user has E2EE keys
  if (!hasKeys()) {
    console.log("No E2EE keys, sending plain text");
    return sendMessage(chatId, text, options);
  }

  try {
    // Get chat details to determine type
    console.log("[sendSecureMessage] Fetching chat details...");
    const chatDetails = await getChatDetails(chatId);

    // AI chats: always plain text (AI needs to read)
    if (chatDetails.type === "ai") {
      console.log("AI chat, sending plain text");
      return sendMessage(chatId, text, options);
    }

    // Group chats: plain text for now (TODO: implement group encryption)
    if (chatDetails.type === "group") {
      console.log("Group chat, sending plain text (group encryption not implemented yet)");
      return sendMessage(chatId, text, options);
    }

    // Direct chat: encrypt with recipient's public key
    if (chatDetails.type === "direct") {
      // Find recipient (not current user)
      const { getUserId } = await import("./auth");
      const currentUserId = getUserId();
      const recipient = chatDetails.participants.find(p => p.id !== currentUserId);
      
      console.log("[sendSecureMessage] Current user ID:", currentUserId);
      console.log("[sendSecureMessage] Chat participants:", chatDetails.participants);
      console.log("[sendSecureMessage] Recipient found:", recipient);
      
      if (!recipient) {
        console.warn("No recipient found, sending plain text");
        return sendMessage(chatId, text, options);
      }

      // Get recipient's public key
      console.log("[sendSecureMessage] Fetching recipient's public key for user:", recipient.id);
      const { publicKey: recipientPublicKey } = await getUserPublicKey(recipient.id);
      console.log("[sendSecureMessage] Recipient public key (first 50 chars):", recipientPublicKey?.substring(0, 50));
      
      if (!recipientPublicKey) {
        console.warn("Recipient has no public key, sending plain text");
        return sendMessage(chatId, text, options);
      }
      
      // Get sender's public key (for cross-device sync)
      const { getPublicKey } = await import("./keyManager");
      const senderPublicKey = getPublicKey();
      console.log("[sendSecureMessage] Sender public key (first 50 chars):", senderPublicKey?.substring(0, 50));
      
      if (!senderPublicKey) {
        console.warn("Sender has no public key, sending plain text");
        return sendMessage(chatId, text, options);
      }

      // Encrypt and send
      console.log("🔐 Encrypting message for recipient:", recipient.username);
      const { encryptedText, encryptedKey, encryptedKeyForSender } = await encryptMessageForRecipient(
        text,
        recipientPublicKey,
        senderPublicKey,
        password
      );
      
      console.log("[sendSecureMessage] Encrypted successfully");
      console.log("[sendSecureMessage] encryptedKey (first 50 chars):", encryptedKey.substring(0, 50));
      console.log("[sendSecureMessage] encryptedKeyForSender (first 50 chars):", encryptedKeyForSender.substring(0, 50));
      
      return sendEncryptedMessage(chatId, encryptedText, encryptedKey, encryptedKeyForSender, options);
    }

    // Fallback: plain text
    return sendMessage(chatId, text, options);
  } catch (error) {
    console.error("Encryption failed, sending plain text:", error);
    return sendMessage(chatId, text, options);
  }
}

/**
 * Decrypt message if encrypted
 */
export async function decryptMessageIfNeeded(
  message: Message,
  password: string
): Promise<string> {
  // If not encrypted, return text as-is
  if (!message.isEncrypted || !message.encryptedText) {
    return message.text;
  }

  try {
    const { decryptReceivedMessage } = await import("./chatEncryption");
    
    // Determine which key to use
    // If message is mine, use encryptedKeyForSender (if available)
    // Otherwise, use encryptedKey
    let keyToUse: string | null | undefined;
    
    if (message.isMine) {
      // For sender: prefer encryptedKeyForSender, fallback to encryptedKey (old messages)
      keyToUse = message.encryptedKeyForSender || message.encryptedKey;
    } else {
      // For recipient: use encryptedKey
      keyToUse = message.encryptedKey;
    }
    
    if (!keyToUse) {
      console.warn("No encryption key available for message", message.id);
      return "[🔒 Нет ключа для расшифровки]";
    }
    
    const decryptedText = await decryptReceivedMessage(
      message.encryptedText,
      keyToUse,
      password
    );
    return decryptedText;
  } catch (error) {
    console.error("Decryption failed for message", message.id, error);
    // If sender's message and encryptedKeyForSender failed, try encryptedKey as fallback
    if (message.isMine && message.encryptedKeyForSender && message.encryptedKey) {
      try {
        console.log("Retrying decryption with encryptedKey fallback");
        const { decryptReceivedMessage } = await import("./chatEncryption");
        const decryptedText = await decryptReceivedMessage(
          message.encryptedText,
          message.encryptedKey,
          password
        );
        return decryptedText;
      } catch (fallbackError) {
        console.error("Fallback decryption also failed", fallbackError);
      }
    }
    return "[🔒 Не удалось расшифровать]";
  }
}
