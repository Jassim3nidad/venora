import crypto from "crypto";

/**
 * Envelope encryption for payout destination identifiers.
 *
 * Bank account and e-wallet numbers are encrypted here, in the Node
 * layer, and only the resulting envelope reaches Postgres. The key lives
 * in PAYOUT_ENCRYPTION_KEY and is never stored in, derivable from, or
 * readable by the database — so a database compromise alone (a leaked
 * dump, an over-broad RLS policy, a stolen anon key) does not yield
 * account numbers.
 *
 * Envelope format: `v1.<iv>.<authTag>.<ciphertext>`, all base64url.
 * The version prefix exists so the key can be rotated later without
 * ambiguity about how an existing row was encrypted.
 *
 * The fingerprint is a keyed HMAC over the normalized identifier. It lets
 * the database enforce "this destination is already registered" without
 * ever holding plaintext, and being keyed means an attacker with only the
 * fingerprints cannot brute-force the (very small) space of Philippine
 * account numbers offline.
 */

const ENVELOPE_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32;

const FINGERPRINT_INFO = "venora:payout-account-fingerprint:v1";

function loadKey(): Buffer {
  const raw = process.env.PAYOUT_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      "PAYOUT_ENCRYPTION_KEY is required to handle payout accounts. " +
        "Generate one with: openssl rand -base64 32",
    );
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `PAYOUT_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        "Generate one with: openssl rand -base64 32",
    );
  }

  return key;
}

/**
 * Separate the fingerprint key from the encryption key by domain
 * separation, so one env var covers both without the HMAC key and the
 * AES key ever being the same bytes.
 */
function fingerprintKey(key: Buffer): Buffer {
  return crypto.createHmac("sha256", key).update(FINGERPRINT_INFO).digest();
}

/**
 * Strips spaces, dashes, and the +63/0 mobile prefixes so the same
 * destination entered two different ways produces one fingerprint.
 */
export function normalizeAccountIdentifier(identifier: string): string {
  const digits = identifier.replace(/[^0-9]/g, "");
  if (digits.startsWith("63") && digits.length === 12)
    return `0${digits.slice(2)}`;
  return digits;
}

export function encryptAccountIdentifier(identifier: string): string {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(identifier, "utf8"),
    cipher.final(),
  ]);

  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptAccountIdentifier(envelope: string): string {
  const [version, iv, authTag, ciphertext] = envelope.split(".");

  if (version !== ENVELOPE_VERSION || !iv || !authTag || !ciphertext) {
    throw new Error("Malformed payout account envelope");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    loadKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  // GCM authentication failure throws here — a tampered or wrong-key
  // envelope can never decrypt to attacker-chosen digits.
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function fingerprintAccountIdentifier(identifier: string): string {
  return crypto
    .createHmac("sha256", fingerprintKey(loadKey()))
    .update(normalizeAccountIdentifier(identifier))
    .digest("base64url");
}

export function lastFourDigits(identifier: string): string {
  const digits = normalizeAccountIdentifier(identifier);

  if (digits.length < 4) {
    throw new Error("Account identifier must contain at least 4 digits");
  }

  return digits.slice(-4);
}
