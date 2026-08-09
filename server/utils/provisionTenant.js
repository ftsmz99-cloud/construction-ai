import fs from "fs";
import path from "path";

import { hasAdmin, createAdmin } from "./admins.js";

// ================================
// SELF-SERVICE TENANT PROVISIONING
// ================================
// Creates a brand-new tenant (clientId) with its business profile, empty lead
// store, conversations folder and admin credential. Used only by the public
// signup endpoint.
//
// Safety rules enforced here:
//   - The RAW clientId is validated before any sanitization, so blank or
//     path-like input can never coerce into / collide with an existing tenant
//     (sanitizeClientId() maps an empty value to "thunderbolt").
//   - Only [a-zA-Z0-9_-] IDs are allowed (lowercased afterwards).
//   - Reserved platform IDs and IDs that already exist (as an admin or as a
//     business folder) are rejected. createAdmin() below NEVER overwrites.
//   - On any failure, only the artifacts created by THIS call are removed.

const RESERVED_CLIENT_IDS = new Set(["thunderbolt"]);

const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const MIN_PASSWORD_LENGTH = 8;

// Resolved at call time (never at import time) like every other storage
// module, so files always land next to the running process's data folder
// (this includes the isolated test sandboxes).
function dataPaths() {
  const dataFolder = path.join(process.cwd(), "data");
  return {
    dataFolder,
    clientsFolder: path.join(dataFolder, "clients")
  };
}

function signupError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateBusinessName(businessName) {
  const name = String(businessName || "").trim();
  if (!name) {
    throw signupError(400, "Business name is required");
  }
  return name;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw signupError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }
}

// Validates the RAW clientId before any sanitization. Returns the normalized
// (lowercased) id or throws a 4xx error.
function validateClientId(rawClientId) {
  const raw = String(rawClientId || "").trim();

  if (!raw) {
    throw signupError(400, "Business ID is required");
  }

  if (!CLIENT_ID_PATTERN.test(raw)) {
    throw signupError(
      400,
      "Business ID may only contain letters, numbers, dashes and underscores (e.g. acme-builders)"
    );
  }

  const id = raw.toLowerCase();

  if (RESERVED_CLIENT_IDS.has(id)) {
    throw signupError(409, `The Business ID "${id}" is reserved`);
  }

  return id;
}

// Uses the exact business profile schema/fields already understood by
// loadBusiness.js and the PUT /business allow-list.
function defaultBusiness(name) {
  return {
    name,
    industry: "",
    services: [],
    location: "",
    hours: "",
    greeting: `Welcome to ${name}. How can we help you?`,
    phone: "",
    email: "",
    website: "",
    description: ""
  };
}

/**
 * Provisions a brand-new tenant.
 * @param {object} input
 * @param {string} input.businessName
 * @param {string} input.clientId   Raw tenant ID chosen by the user.
 * @param {string} input.password   Admin password.
 * @returns {{ clientId: string, businessName: string }}
 * @throws {Error} with a `.statusCode` (400/409) on any validation failure.
 */
export function provisionTenant({ businessName, clientId, password }) {
  const { clientsFolder } = dataPaths();
  const id = validateClientId(clientId);
  const name = validateBusinessName(businessName);
  validatePassword(password);

  // Duplicate / takeover guard. These checks run BEFORE any file is created,
  // and createAdmin() (which never overwrites) is the final backstop, so a
  // signup can never rotate an existing tenant's credential.
  if (hasAdmin(id)) {
    throw signupError(409, `The Business ID "${id}" is already registered`);
  }

  const clientFolder = path.join(clientsFolder, id);
  if (fs.existsSync(clientFolder)) {
    throw signupError(409, `The Business ID "${id}" is already registered`);
  }

  let createdFolder = false;
  try {
    fs.mkdirSync(clientFolder, { recursive: true });
    createdFolder = true;

    fs.writeFileSync(
      path.join(clientFolder, "business.json"),
      JSON.stringify(defaultBusiness(name), null, 2),
      "utf8"
    );

    fs.writeFileSync(
      path.join(clientFolder, "leads.json"),
      "[]\n",
      "utf8"
    );

    fs.mkdirSync(path.join(clientFolder, "conversations"), { recursive: true });

    // The admin credential is created LAST so a failure while writing the
    // tenant artifacts never leaves a credential without a tenant (or a
    // tenant without a credential that needs manual fixing).
    if (createAdmin(id, password) === null) {
      throw signupError(409, `The Business ID "${id}" is already registered`);
    }

    return { clientId: id, businessName: name };
  } catch (error) {
    // Clean up ONLY the artifacts created by this call. The folder did not
    // exist before we started, so removing it removes nothing that belongs to
    // another tenant.
    if (createdFolder) {
      try {
        fs.rmSync(clientFolder, { recursive: true, force: true });
      } catch {
        /* ignore cleanup errors; the original error is what matters */
      }
    }
    throw error;
  }
}

export default provisionTenant;