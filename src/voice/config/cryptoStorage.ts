const DB_NAME = 'bassistant_secure_vault';
const STORE_NAME = 'bassistant_keys';
const KEY_ID = 'bassistant_device_master_key_v1';
const PREFIX = '__BASSISTANT_ENC__:v1:';
const LEGACY_PREFIX = '__ENC__:v1:';

let cachedKey: CryptoKey | null = null;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Cryptography API (crypto.subtle) is not available');
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = typeof indexedDB !== 'undefined' ? indexedDB : (typeof window !== 'undefined' ? window.indexedDB : null);
    if (!idb) {
      return reject(new Error('IndexedDB not supported in current environment'));
    }
    const req = idb.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const subtle = getSubtleCrypto();

  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
  } catch {
    // If IndexedDB unavailable (e.g. strict sandbox), fall back to in-memory non-extractable key
  }

  if (db) {
    const existingKey = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      try {
        const tx = db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(KEY_ID);
        req.onsuccess = () => resolve(req.result as CryptoKey);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    }).catch(() => undefined);

    if (existingKey) {
      cachedKey = existingKey;
      return existingKey;
    }
  }

  const newKey = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  if (db) {
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(newKey, KEY_ID);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    }).catch(() => undefined);
  }

  cachedKey = newKey;
  return newKey;
}

export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && (value.startsWith(PREFIX) || value.startsWith(LEGACY_PREFIX));
}

export async function encryptString(plaintext: string): Promise<string> {
  if (!plaintext || !plaintext.trim()) return '';
  if (isEncrypted(plaintext)) return plaintext;

  try {
    const subtle = getSubtleCrypto();
    const key = await getMasterKey();
    const iv = new Uint8Array(12);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(iv);
    } else {
      globalThis.crypto.getRandomValues(iv);
    }

    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const ivB64 = btoa(String.fromCharCode(...iv));
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
    return `${PREFIX}${ivB64}:${cipherB64}`;
  } catch (err) {
    console.warn('Encryption failed:', err);
    return '';
  }
}

export async function decryptString(encryptedText: string): Promise<string> {
  if (!encryptedText || !isEncrypted(encryptedText)) return encryptedText;

  try {
    const subtle = getSubtleCrypto();
    const key = await getMasterKey();
    const prefix = encryptedText.startsWith(PREFIX) ? PREFIX : LEGACY_PREFIX;
    const raw = encryptedText.slice(prefix.length);
    const sepIdx = raw.indexOf(':');
    if (sepIdx === -1) return '';

    const ivB64 = raw.slice(0, sepIdx);
    const cipherB64 = raw.slice(sepIdx + 1);
    if (!ivB64 || !cipherB64) return '';

    const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));

    const plainBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    return new TextDecoder().decode(plainBuffer);
  } catch (err) {
    console.warn('Failed to decrypt stored credential (stale master key or corrupted data):', err);
    return '';
  }
}

export async function resetMasterKey(): Promise<void> {
  cachedKey = null;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore deletion failures
  }
}
