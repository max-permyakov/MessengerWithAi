// lib/chatEncryption.ts - E2EE functions for chat messages

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
 * Encrypt message for a recipient (and sender)
 */
export async function encryptMessageForRecipient(
  text: string,
  recipientPublicKeyBase64: string,
  senderPublicKeyBase64: string,
  password: string
): Promise<{ encryptedText: string; encryptedKey: string; encryptedKeyForSender: string }> {
  // 1. Generate AES key
  const aesKey = await generateAESKey();
  
  // 2. Encrypt text with AES
  const { encrypted, iv } = await encryptText(text, aesKey);
  const encryptedText = `${iv}:${encrypted}`;  // Format: iv:encrypted
  
  // 3. Import recipient's public key
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);
  
  // 4. Encrypt AES key with recipient's public key
  const encryptedKey = await encryptAESKey(aesKey, recipientPublicKey);
  
  // 5. Import sender's public key
  const senderPublicKey = await importPublicKey(senderPublicKeyBase64);
  
  // 6. Encrypt AES key with sender's public key (so sender can read on other devices)
  const encryptedKeyForSender = await encryptAESKey(aesKey, senderPublicKey);
  
  return { encryptedText, encryptedKey, encryptedKeyForSender };
}

/**
 * Decrypt received message
 */
export async function decryptReceivedMessage(
  encryptedText: string,
  encryptedKey: string,
  password: string
): Promise<string> {
  console.log("[decryptReceivedMessage] Starting decryption");
  console.log("[decryptReceivedMessage] encryptedText length:", encryptedText.length);
  console.log("[decryptReceivedMessage] encryptedKey length:", encryptedKey.length);
  
  // 1. Load private key
  console.log("[decryptReceivedMessage] Loading private key...");
  const privateKey = await loadPrivateKey(password);
  console.log("[decryptReceivedMessage] Private key loaded successfully");
  
  // 2. Decrypt AES key with private key
  console.log("[decryptReceivedMessage] Decrypting AES key...");
  try {
    const aesKey = await decryptAESKey(encryptedKey, privateKey);
    console.log("[decryptReceivedMessage] AES key decrypted successfully");
    
    // 3. Split iv and encrypted text
    const [iv, encrypted] = encryptedText.split(":");
    if (!iv || !encrypted) {
      throw new Error("Invalid encrypted message format");
    }
    console.log("[decryptReceivedMessage] IV and encrypted text split successfully");
    
    // 4. Decrypt text with AES key
    console.log("[decryptReceivedMessage] Decrypting message text...");
    const decryptedText = await decryptText(encrypted, iv, aesKey);
    console.log("[decryptReceivedMessage] Message decrypted successfully:", decryptedText);
    return decryptedText;
  } catch (error) {
    console.error("[decryptReceivedMessage] Decryption failed:", error);
    throw error;
  }
}

/**
 * Encrypt message for group chat
 * (For now, we'll use the same approach as 1:1, but in future we can optimize with shared group keys)
 */
export async function encryptMessageForGroup(
  text: string,
  memberPublicKeys: string[],
  password: string
): Promise<{ encryptedText: string; encryptedKeys: Record<string, string> }> {
  // Generate AES key
  const aesKey = await generateAESKey();
  
  // Encrypt text
  const { encrypted, iv } = await encryptText(text, aesKey);
  const encryptedText = `${iv}:${encrypted}`;
  
  // Encrypt AES key for each member
  const encryptedKeys: Record<string, string> = {};
  for (const publicKeyBase64 of memberPublicKeys) {
    const publicKey = await importPublicKey(publicKeyBase64);
    const encryptedKey = await encryptAESKey(aesKey, publicKey);
    encryptedKeys[publicKeyBase64] = encryptedKey;
  }
  
  return { encryptedText, encryptedKeys };
}
