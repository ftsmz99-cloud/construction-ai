import fs from "fs";
import path from "path";
import crypto from "crypto";

import { sanitizeClientId } from "./auth.js";

// ================================
// ADMIN CREDENTIALS
// ================================
// Sensible v1 storage: one file mapping clientId -> salted password hash.
// Keeps plaintext passwords out of version control.
// Future SaaS scaling: replace with a real users table / identity provider.

const ADMINS_FILE = path.join(process.cwd(), "data", "admins.json");

function loadAdmins() {
  if (!fs.existsSync(ADMINS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(ADMINS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeAdmins(admins) {
  const directory = path.dirname(ADMINS_FILE);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(
    ADMINS_FILE,
    JSON.stringify(admins, null, 2),
    "utf8"
  );
}

export function hashPassword(password, salt) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${String(password)}`)
    .digest("hex");
}

export function hasAdmin(clientId) {
  const record = loadAdmins()[sanitizeClientId(clientId)];
  return !!(record && record.salt && record.passwordHash);
}

export function verifyPassword(clientId, password) {
  const record = loadAdmins()[sanitizeClientId(clientId)];
  if (!record || !record.salt || !record.passwordHash) {
    return false;
  }

  const actual = Buffer.from(
    hashPassword(password, record.salt),
    "utf8"
  );
  const expected = Buffer.from(record.passwordHash, "utf8");

  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}

// Create or rotate the admin credential for a tenant.
export function upsertAdmin(clientId, password) {
  const id = sanitizeClientId(clientId);
  const admins = loadAdmins();
  const salt = crypto.randomBytes(16).toString("hex");

  admins[id] = {
    salt,
    passwordHash: hashPassword(password, salt),
    updatedAt: new Date().toISOString()
  };

  writeAdmins(admins);
  return id;
}
