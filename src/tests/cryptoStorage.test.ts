import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptString,
  decryptString,
  isEncrypted,
  resetMasterKey,
} from '../voice/config/cryptoStorage';

describe('cryptoStorage (AES-GCM-256)', () => {
  beforeEach(async () => {
    await resetMasterKey();
  });

  it('correctly identifies encrypted vs plain strings', () => {
    expect(isEncrypted('__BASSISTANT_ENC__:v1:abc:def')).toBe(true);
    expect(isEncrypted('__ENC__:v1:abc:def')).toBe(true);
    expect(isEncrypted('AIzaSyPlainApiKey123')).toBe(false);
    expect(isEncrypted('')).toBe(false);
  });

  it('encrypts and decrypts a key accurately', async () => {
    const rawKey = 'AIzaSySecretApiKey123456';
    const encrypted = await encryptString(rawKey);

    expect(encrypted.startsWith('__BASSISTANT_ENC__:v1:')).toBe(true);
    expect(encrypted).not.toBe(rawKey);

    const decrypted = await decryptString(encrypted);
    expect(decrypted).toBe(rawKey);
  });

  it('handles empty strings gracefully', async () => {
    expect(await encryptString('')).toBe('');
    expect(await decryptString('')).toBe('');
  });

  it('does not double encrypt an already encrypted string', async () => {
    const rawKey = 'AIzaSySecretApiKey123456';
    const encrypted = await encryptString(rawKey);
    const doubleEncrypted = await encryptString(encrypted);
    expect(doubleEncrypted).toBe(encrypted);
  });

  it('returns plaintext unchanged if decryptString is called on unencrypted text', async () => {
    const plain = 'unencrypted_string';
    const res = await decryptString(plain);
    expect(res).toBe(plain);
  });
});
