// lib/crypto.ts - Web Crypto API functions for E2EE

/**
 * Generate RSA-OAEP 2048 key pair
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
 * Export public key to base64
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

/**
 * Import public key from base64
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
 * Export private key to JWK
 */
export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey("jwk", key);
}

/**
 * Import private key from JWK
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
 * Encrypt private key with password (PBKDF2 + AES-GCM)
 */
export async function encryptPrivateKey(
  privateKey: JsonWebKey,
  password: string
): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Derive key from password
  const passwordKey = await deriveKeyFromPassword(password, salt);
  
  // Encrypt private key
  const keyData = new TextEncoder().encode(JSON.stringify(privateKey));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    passwordKey,
    keyData
  );
  
  // Pack: salt + iv + encrypted
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return arrayBufferToBase64(result.buffer);
}

/**
 * Decrypt private key with password
 */
export async function decryptPrivateKey(
  encryptedBase64: string,
  password: string
): Promise<JsonWebKey> {
  const data = base64ToArrayBuffer(encryptedBase64);
  const dataArray = new Uint8Array(data);
  
  // Unpack: salt + iv + encrypted
  const salt = dataArray.slice(0, 16);
  const iv = dataArray.slice(16, 28);
  const encrypted = dataArray.slice(28);
  
  // Derive key from password
  const passwordKey = await deriveKeyFromPassword(password, salt);
  
  // Decrypt
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    passwordKey,
    encrypted
  );
  
  const keyData = new TextDecoder().decode(decrypted);
  return JSON.parse(keyData);
}

/**
 * Generate random AES-256 key
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt text with AES-GCM
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
 * Decrypt text with AES-GCM
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
 * Encrypt AES key with RSA public key
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
 * Decrypt AES key with RSA private key
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

// === Utility functions ===

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
