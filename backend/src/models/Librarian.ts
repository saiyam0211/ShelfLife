import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Schema, model } from 'mongoose';

const KEY_LENGTH = 64;
const deriveKey = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

// passwordHash format: "scrypt$<salt in hex>$<derived key in hex>".
// Each password gets a new random salt.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [, saltHex = '', keyHex = ''] = passwordHash.split('$');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
  // timingSafeEqual needs equal lengths. It hides where two hashes differ.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Supporting authentication model. No API response contains a librarian document.
const librarianSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['librarian'], default: 'librarian' },
  },
  { versionKey: false },
);

export const Librarian = model('Librarian', librarianSchema);
