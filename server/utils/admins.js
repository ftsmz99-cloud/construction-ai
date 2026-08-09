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

// The admins file lives next to the runtime data, resolved from the process
// working directory at call time like every other storage module. This keeps
// the helpers safe to use from any cwd (e.g. the isolated test sandboxes).
function adminsFile() {
  return path.join(process.cwd(), "data", "admins.json");
}

function loadAdmins() {
  const file = adminsFile();
  if (!fs.existsSync(file)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function writeAdmins(admins) {
  const file = adminsFile();
  const directory = path.dirname(file);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(
    file,
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

// Create the admin credential for a tenant that does NOT have one yet.
// Returns null (without writing anything) if the tenant already has an admin,
// so it can never overwrite or rotate an existing tenant's credential.
export function createAdmin(clientId, password) {
  const id = sanitizeClientId(clientId);
  const admins = loadAdmins();
  if (admins[id]) {
    return null;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  admins[id] = {
    salt,
    passwordHash: hashPassword(password, salt),
    updatedAt: new Date().toISOString()
  };

  writeAdmins(admins);
  return id;
}
