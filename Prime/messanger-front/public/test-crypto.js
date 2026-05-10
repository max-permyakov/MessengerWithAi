// Test file for E2EE functionality
// Run this in browser console to test crypto functions

console.log("🧪 Starting E2EE Crypto Tests...\n");

// Test 1: Generate RSA Key Pair
async function testGenerateKeyPair() {
    console.log("Test 1: Generate RSA Key Pair");
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );
        console.log("✅ Key pair generated successfully");
        console.log("   Public key:", keyPair.publicKey);
        console.log("   Private key:", keyPair.privateKey);
        return keyPair;
    } catch (error) {
        console.error("❌ Failed:", error);
        return null;
    }
}

// Test 2: Export/Import Public Key
async function testExportImportPublicKey(keyPair) {
    console.log("\nTest 2: Export/Import Public Key");
    try {
        // Export
        const exported = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
        console.log("✅ Public key exported to base64");
        console.log("   Length:", base64.length, "chars");
        
        // Import
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const imported = await window.crypto.subtle.importKey(
            "spki",
            bytes.buffer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"]
        );
        console.log("✅ Public key imported successfully");
        return { exported: base64, imported };
    } catch (error) {
        console.error("❌ Failed:", error);
        return null;
    }
}

// Test 3: Encrypt/Decrypt Private Key with Password
async function testEncryptDecryptPrivateKey(keyPair, password) {
    console.log("\nTest 3: Encrypt/Decrypt Private Key with Password");
    try {
        // Export private key
        const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
        console.log("✅ Private key exported to JWK");
        
        // Encrypt with password
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Derive key from password
        const passwordKey = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        
        const derivedKey = await window.crypto.subtle.deriveKey(
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
        
        const keyData = new TextEncoder().encode(JSON.stringify(privateKeyJwk));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            derivedKey,
            keyData
        );
        
        // Pack: salt + iv + encrypted
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        const encryptedBase64 = btoa(String.fromCharCode(...result));
        
        console.log("✅ Private key encrypted with password");
        console.log("   Encrypted length:", encryptedBase64.length, "chars");
        
        // Decrypt
        const data = atob(encryptedBase64);
        const dataArray = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            dataArray[i] = data.charCodeAt(i);
        }
        
        const saltDecrypt = dataArray.slice(0, 16);
        const ivDecrypt = dataArray.slice(16, 28);
        const encryptedDecrypt = dataArray.slice(28);
        
        const passwordKeyDecrypt = await window.crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        
        const derivedKeyDecrypt = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltDecrypt,
                iterations: 100000,
                hash: "SHA-256",
            },
            passwordKeyDecrypt,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
        
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivDecrypt },
            derivedKeyDecrypt,
            encryptedDecrypt
        );
        
        const decryptedJwk = JSON.parse(new TextDecoder().decode(decrypted));
        console.log("✅ Private key decrypted successfully");
        
        return { encrypted: encryptedBase64, decrypted: decryptedJwk };
    } catch (error) {
        console.error("❌ Failed:", error);
        return null;
    }
}

// Test 4: Generate AES Key
async function testGenerateAESKey() {
    console.log("\nTest 4: Generate AES-256 Key");
    try {
        const aesKey = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        console.log("✅ AES-256 key generated successfully");
        return aesKey;
    } catch (error) {
        console.error("❌ Failed:", error);
        return null;
    }
}

// Test 5: Encrypt/Decrypt Text with AES
async function testEncryptDecryptText(aesKey, text) {
    console.log("\nTest 5: Encrypt/Decrypt Text with AES-GCM");
    try {
        // Encrypt
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encoded
        );
        
        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        const ivBase64 = btoa(String.fromCharCode(...iv));
        
        console.log("✅ Text encrypted successfully");
        console.log("   Original:", text);
        console.log("   Encrypted length:", encryptedBase64.length, "chars");
        
        // Decrypt
        const encryptedBytes = atob(encryptedBase64);
        const encryptedArray = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            encryptedArray[i] = encryptedBytes.charCodeAt(i);
        }
        
        const ivBytes = atob(ivBase64);
        const ivArray = new Uint8Array(ivBytes.length);
        for (let i = 0; i < ivBytes.length; i++) {
            ivArray[i] = ivBytes.charCodeAt(i);
        }
        
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivArray },
            aesKey,
            encryptedArray
        );
        
        const decryptedText = new TextDecoder().decode(decrypted);
        console.log("✅ Text decrypted successfully");
        console.log("   Decrypted:", decryptedText);
        console.log("   Match:", text === decryptedText ? "✅" : "❌");
        
        return { encrypted: encryptedBase64, iv: ivBase64, decrypted: decryptedText };
    } catch (error) {
        console.error("❌ Failed:", error);
        return null;
    }
}

// Test 6: Encrypt/Decrypt AES Key with RSA
async function testEncryptDecryptAESKey(aesKey, publicKey, privateKey) {
    console.log("\nTest 6: Encrypt/Decrypt AES Key with RSA");
    try {
        // Encrypt AES key with RSA public key
        const exported = await window.crypto.subtle.exportKey("raw", aesKey);
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            publicKey,
            exported
        );
        
        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        console.log("✅ AES key encrypted with RSA public key");
        console.log("   Encrypted length:", encryptedBase64.length, "chars");
        
        // Decrypt AES key with RSA private key
        const encryptedBytes = atob(encryptedBase64);
        const encryptedArray = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            encryptedArray[i] = encryptedBytes.charCodeAt(i);
        }
        
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedArray
        );
        
        const decryptedKey = await window.crypto.subtle.importKey(
            "raw",
            decrypted,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        
        console.log("✅ AES key decrypted with RSA private key");
        
        return { encrypted: encryptedBase64, decrypted: decryptedKey };
    } catch (error) {
        console.error("❌ Failed:", error);
        return null;
    }
}

// Test 7: Full E2EE Flow (Alice → Bob)
async function testFullE2EEFlow() {
    console.log("\n🔐 Test 7: Full E2EE Flow (Alice → Bob)");
    try {
        // Alice generates keys
        console.log("\n👤 Alice: Generating keys...");
        const aliceKeyPair = await testGenerateKeyPair();
        
        // Bob generates keys
        console.log("\n👤 Bob: Generating keys...");
        const bobKeyPair = await testGenerateKeyPair();
        
        // Alice sends message to Bob
        console.log("\n📤 Alice: Sending encrypted message to Bob...");
        const message = "Hello Bob! This is a secret message 🔒";
        
        // 1. Generate AES key
        const aesKey = await testGenerateAESKey();
        
        // 2. Encrypt message with AES
        const { encrypted: encryptedText, iv } = await testEncryptDecryptText(aesKey, message);
        
        // 3. Encrypt AES key with Bob's public key
        const { encrypted: encryptedKey } = await testEncryptDecryptAESKey(
            aesKey,
            bobKeyPair.publicKey,
            bobKeyPair.privateKey
        );
        
        console.log("\n✅ Alice: Message encrypted and ready to send");
        console.log("   Encrypted text:", encryptedText.substring(0, 50) + "...");
        console.log("   Encrypted key:", encryptedKey.substring(0, 50) + "...");
        
        // Bob receives and decrypts
        console.log("\n📥 Bob: Receiving encrypted message...");
        
        // 1. Decrypt AES key with Bob's private key
        const encryptedKeyBytes = atob(encryptedKey);
        const encryptedKeyArray = new Uint8Array(encryptedKeyBytes.length);
        for (let i = 0; i < encryptedKeyBytes.length; i++) {
            encryptedKeyArray[i] = encryptedKeyBytes.charCodeAt(i);
        }
        
        const decryptedAESKeyRaw = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            bobKeyPair.privateKey,
            encryptedKeyArray
        );
        
        const decryptedAESKey = await window.crypto.subtle.importKey(
            "raw",
            decryptedAESKeyRaw,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        
        // 2. Decrypt message with AES key
        const encryptedTextBytes = atob(encryptedText);
        const encryptedTextArray = new Uint8Array(encryptedTextBytes.length);
        for (let i = 0; i < encryptedTextBytes.length; i++) {
            encryptedTextArray[i] = encryptedTextBytes.charCodeAt(i);
        }
        
        const ivBytes = atob(iv);
        const ivArray = new Uint8Array(ivBytes.length);
        for (let i = 0; i < ivBytes.length; i++) {
            ivArray[i] = ivBytes.charCodeAt(i);
        }
        
        const decryptedMessage = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivArray },
            decryptedAESKey,
            encryptedTextArray
        );
        
        const finalMessage = new TextDecoder().decode(decryptedMessage);
        
        console.log("\n✅ Bob: Message decrypted successfully");
        console.log("   Original:", message);
        console.log("   Decrypted:", finalMessage);
        console.log("   Match:", message === finalMessage ? "✅" : "❌");
        
        return message === finalMessage;
    } catch (error) {
        console.error("❌ Full flow failed:", error);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🧪 E2EE Crypto Tests");
    console.log("═══════════════════════════════════════════════════\n");
    
    const password = "test-password-123";
    const testText = "Hello, World! This is a test message 🔒";
    
    // Test 1
    const keyPair = await testGenerateKeyPair();
    if (!keyPair) return;
    
    // Test 2
    const publicKeyResult = await testExportImportPublicKey(keyPair);
    if (!publicKeyResult) return;
    
    // Test 3
    const privateKeyResult = await testEncryptDecryptPrivateKey(keyPair, password);
    if (!privateKeyResult) return;
    
    // Test 4
    const aesKey = await testGenerateAESKey();
    if (!aesKey) return;
    
    // Test 5
    const textResult = await testEncryptDecryptText(aesKey, testText);
    if (!textResult) return;
    
    // Test 6
    const aesKeyResult = await testEncryptDecryptAESKey(aesKey, keyPair.publicKey, keyPair.privateKey);
    if (!aesKeyResult) return;
    
    // Test 7
    const fullFlowResult = await testFullE2EEFlow();
    
    console.log("\n═══════════════════════════════════════════════════");
    console.log("🎉 All tests completed!");
    console.log("═══════════════════════════════════════════════════");
    
    if (fullFlowResult) {
        console.log("\n✅ E2EE is working correctly!");
        console.log("   Ready to implement in the application.");
    } else {
        console.log("\n❌ Some tests failed. Check the logs above.");
    }
}

// Auto-run tests
runAllTests();
