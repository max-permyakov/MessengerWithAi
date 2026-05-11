// lib/keyManager.ts - Key management for E2EE

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
 * Generate and store keys during registration
 * Returns both public key and encrypted private key for server storage
 */
export async function generateAndStoreKeys(password: string): Promise<{ publicKey: string; encryptedPrivateKey: string }> {
  const keyPair = await generateKeyPair();
  
  // Export public key
  const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
  
  // Export and encrypt private key
  const privateKeyJwk = await exportPrivateKey(keyPair.privateKey);
  const encryptedPrivateKey = await encryptPrivateKey(privateKeyJwk, password);
  
  // Save to localStorage
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, encryptedPrivateKey);
  localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKeyBase64);
  
  return { publicKey: publicKeyBase64, encryptedPrivateKey };
}

/**
 * Load private key during login
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
 * Store encrypted private key from server
 */
export function storeEncryptedPrivateKey(encryptedPrivateKey: string): void {
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, encryptedPrivateKey);
}

/**
 * Get public key from localStorage
 */
export function getPublicKey(): string | null {
  return localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
}

/**
 * Check if keys exist
 */
export function hasKeys(): boolean {
  return (
    localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) !== null &&
    localStorage.getItem(PUBLIC_KEY_STORAGE_KEY) !== null
  );
}

/**
 * Clear keys on logout
 */
export function clearKeys(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
  localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
}
