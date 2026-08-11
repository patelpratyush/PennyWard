import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * AES-256-GCM at rest for Plaid access tokens (PRD §11 — "Plaid access
 * tokens encrypted at rest... never sent to the client"). PLAID_TOKEN_KEY
 * must be a 32-byte key, base64-encoded. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * Ciphertext format: base64(iv) + '.' + base64(authTag) + '.' + base64(ciphertext).
 */
function getKey(): Buffer {
  const b64 = process.env.PLAID_TOKEN_KEY
  if (!b64) throw new Error('PLAID_TOKEN_KEY is not set')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('PLAID_TOKEN_KEY must decode to exactly 32 bytes')
  return key
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`
}

export function decryptToken(encrypted: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split('.')
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error('Malformed encrypted token')
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
  return plaintext.toString('utf8')
}
