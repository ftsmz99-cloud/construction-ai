// Test helper: boots the real server.js inside an isolated scratch sandbox.
// Every file the server reads or writes lives under test/.scratch/<id>/,
// so genuine runtime data is never touched. The scratch .env deliberately
// contains NO Groq/OpenAI key, which guarantees tests never make real AI
// calls (the chat route only exercises its existing graceful fallback).
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, "..", ".."); // server/
const SCRATCH_ROOT = path.join(SERVER_DIR, "test", ".scratch");

export const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";
export const TEST_PASSWORD_THUNDERBOLT = "test-password-thunderbolt";
export const TEST_PASSWORD_TENANTB = "test-password-tenantb";
export const CUSTOMER_ORIGIN = "https://customer.com";

function hashPassword(password, salt) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
}

function thunderboltBusiness() {
  return {
    name: "Rowens Mechanics",
    industry: "Electrical",
    services: ["Electrical repairs", "House wiring", "Installations"],
    location: "Windhoek",
    hours: "08:00 - 17:00",
    greeting: "Hello and welcome",
    phone: "",
    email: "",
    website: "",
    description: ""
  };
}

function tenantBBusiness() {
  return {
    name: "Tenant B Builders",
    industry: "Construction",
    services: ["House building"],
    location: "Swakopmund",
    hours: "08:00 - 17:00",
    greeting: "Welcome",
    phone: "",
    email: "",
    website: "",
    description: ""
  };
}

/**
 * Builds a scratch sandbox and returns its paths. The sandbox is a full
 * mini-server: instance/ holds the spawned process's cwd (its .env, data/),
 * and widget/ inside the server instance holds a copy of the real widget
 * folder so /widget assets resolve via the server's cwd-relative "widget"
 * path.
 */
export function buildScratchInstance(options = {}) {
  const id = crypto.randomUUID();
  const scratchBase = path.join(SCRATCH_ROOT, id);
  const instanceDir = path.join(scratchBase, "instance");
  const clientOrigin = options.clientOrigin || DEFAULT_CLIENT_ORIGIN;
  const authSecret = crypto.randomBytes(32).toString("hex");

  fs.rmSync(scratchBase, { recursive: true, force: true });

  const widgetDir = path.resolve(SERVER_DIR, "widget");
  if (fs.existsSync(widgetDir)) {
    fs.cpSync(widgetDir, path.join(instanceDir, "widget"), { recursive: true });
  }

  fs.mkdirSync(instanceDir, { recursive: true });
  fs.writeFileSync(
    path.join(instanceDir, ".env"),
    `CLIENT_ORIGIN=${clientOrigin}\nAUTH_SECRET=${authSecret}\n`
  );

  const dataDir = path.join(instanceDir, "data");
  const admins = {};
  for (const [clientId, password] of [
    ["thunderbolt", options.passwordThunderbolt || TEST_PASSWORD_THUNDERBOLT],
    ["tenantb", options.passwordTenantB || TEST_PASSWORD_TENANTB]
  ]) {
    const salt = crypto.randomBytes(16).toString("hex");
    admins[clientId] = {
      salt,
      passwordHash: hashPassword(password, salt),
      updatedAt: new Date().toISOString()
    };
  }

  fs.mkdirSync(path.join(dataDir, "clients", "thunderbolt", "conversations"), {
    recursive: true
  });
  fs.mkdirSync(path.join(dataDir, "clients", "tenantb", "conversations"), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(dataDir, "admins.json"),
    JSON.stringify(admins, null, 2)
  );
  fs.writeFileSync(
    path.join(dataDir, "clients", "thunderbolt", "business.json"),
    JSON.stringify(thunderboltBusiness(), null, 2)
  );
  fs.writeFileSync(
    path.join(dataDir, "clients", "thunderbolt", "leads.json"),
    "[]\n"
  );
  fs.writeFileSync(
    path.join(dataDir, "clients", "tenantb", "business.json"),
    JSON.stringify(tenantBBusiness(), null, 2)
  );
  fs.writeFileSync(path.join(dataDir, "clients", "tenantb", "leads.json"), "[]\n");

  return {
    id,
    instanceDir,
    scratchBase,
    cleanup() {
      try {
        fs.rmSync(scratchBase, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  };
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// Deliberately minimal, scrubbed env: tests must never make real AI calls or
// inherit developer secrets. AUTH_SECRET is supplied by the scratch .env.
function cleanSpawnEnv(port, clientOrigin) {
  const env = {
    PATH: process.env.PATH || "",
    SystemRoot: process.env.SystemRoot || process.env.WINDIR || "",
    TEMP: process.env.TEMP || "",
    TMP: process.env.TMP || ""
  };
  env.PORT = String(port);
  env.CLIENT_ORIGIN = clientOrigin;
  return env;
}

async function waitForHealth(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Server did not become healthy. ${lastError ? lastError.message : ""}`
  );
}

/**
 * Boots a real server instance inside a scratch sandbox.
 * Returns { baseUrl, instanceDir, port, stop }.
 */
export async function startTestServer(options = {}) {
  const scratch = buildScratchInstance(options);
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const clientOrigin = options.clientOrigin || DEFAULT_CLIENT_ORIGIN;

  const child = spawn(
    process.execPath,
    [path.join(SERVER_DIR, "server.js")],
    {
      cwd: scratch.instanceDir,
      env: cleanSpawnEnv(port, clientOrigin),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }
  );
  child.stdout.on("data", () => {});
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[test-server:${port}] ${chunk}`);
  });

  try {
    await waitForHealth(baseUrl);
  } catch (error) {
    child.kill();
    scratch.cleanup();
    throw error;
  }

  return {
    baseUrl,
    instanceDir: scratch.instanceDir,
    port,
    async stop() {
      if (child.exitCode === null) {
        await new Promise((resolve) => {
          const onExit = () => resolve();
          child.once("exit", onExit);
          child.kill();
          setTimeout(() => {
            try {
              child.kill("SIGKILL");
            } catch {
              /* already gone */
            }
          }, 2000).unref();
        });
      }
      scratch.cleanup();
    }
  };
}

/** Minimal JSON-aware HTTP helper. */
export async function request(
  baseUrl,
  pathname,
  { method = "GET", headers = {}, body } = {}
) {
  const res = await fetch(baseUrl + pathname, {
    method,
    headers:
      body !== undefined
        ? { "Content-Type": "application/json", ...headers }
        : headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: parsed,
    text
  };
}

/** Logs in against the scratch server and returns an admin token (or null). */
export async function login(baseUrl, clientId, password) {
  const res = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: { clientId, password }
  });
  return res.status === 200 && res.body && res.body.token
    ? res.body.token
    : null;
}