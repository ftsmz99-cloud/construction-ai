import { upsertAdmin } from "../utils/admins.js";

// ================================
// CREATE / ROTATE ADMIN
// ================================
// Usage:
//   node scripts/createAdmin.js <clientId> <password>
//
// Stores a salted password hash for the given tenant in server/data/admins.json
// so a business owner can log into the admin dashboard.
// Re-running with the same clientId rotates the password.

const [clientId, password] = process.argv.slice(2);

if (!clientId || !password) {
  console.error("Usage: node scripts/createAdmin.js <clientId> <password>");
  process.exit(1);
}

const id = upsertAdmin(clientId, password);
console.log(`Admin created successfully for "${id}".`);
console.log("You can now log into the dashboard with this business ID and password.");
