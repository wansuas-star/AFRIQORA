/**
 * AFRIQORA Integration Credential Vault
 * AES-256-GCM Secure Encryption for External Adapter Credentials & API Tokens
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export class CredentialVault {
  private static getMasterKey(): Buffer {
    const rawKey = process.env.INTEGRATION_MASTER_KEY || 'afriqora_secure_government_key_2026_dev_seed';
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  public static encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedPayload (Hex encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  public static decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credential payload format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = this.getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
