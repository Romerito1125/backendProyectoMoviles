const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // bytes
const IV_LENGTH = 16;  // bytes para AES CBC

/**
 * Deriva una clave de exactamente 32 bytes a partir de la variable de entorno.
 * Así no importa si la clave del .env tiene más o menos caracteres.
 */
const getKey = () => {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error('Falta la variable de entorno ENCRYPTION_KEY');
  return crypto.scryptSync(secret, 'salt', KEY_LENGTH);
};

/**
 * Encripta un texto plano.
 * Devuelve un string con formato "iv:encrypted" en base64.
 */
const encrypt = (text) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(text), 'utf8'),
    cipher.final(),
  ]);

  // Guardamos iv + datos encriptados juntos, separados por ":"
  return `${iv.toString('base64')}:${encrypted.toString('base64')}`;
};

/**
 * Desencripta un string con formato "iv:encrypted".
 * Devuelve el texto original.
 */
const decrypt = (encryptedText) => {
  const key = getKey();
  const [ivBase64, encryptedBase64] = encryptedText.split(':');

  if (!ivBase64 || !encryptedBase64) {
    throw new Error('Formato de texto encriptado inválido');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = { encrypt, decrypt };
