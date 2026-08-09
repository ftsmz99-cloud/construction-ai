// Self-service onboarding tests.
// Uses the existing scratch-server infrastructure: the real server.js boots in
// an isolated sandbox (its own cwd/.env/data) with NO Groq key and a random
// AUTH_SECRET, so /chat only exercises its graceful fallback and no genuine
// runtime data is ever touched. Sandbox dirs are cleaned up automatically.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  startTestServer,
  request,
  login,
  buildScratchInstance,
  TEST_PASSWORD_THUNDERBOLT,
  CUSTOMER_ORIGIN
} from "./helpers/scratchServer.js";
import { provisionTenant } from "../utils/provisionTenant.js";

let srv;
let scratch;
let originalCwd;

before(async () => {
  srv = await startTestServer();

  // A second, separate scratch sandbox (same process) for the pure unit
  // validation tests. Changing cwd only affects THIS test process; the
  // spawned HTTP server keeps its own scratch cwd.
  scratch = buildScratchInstance();
  originalCwd = process.cwd();
  process.chdir(scratch.instanceDir);
});

after(async () => {
  process.chdir(originalCwd);
  await srv.stop();
  scratch.cleanup();
});

// ---------------------------------------------------------------
// A. Signup happy path
// ---------------------------------------------------------------
test("A. signup happy path creates a usable tenant", async () => {
  const res = await request(srv.baseUrl, "/auth/signup", {
    method: "POST",
    body: { businessName: "ACME Construction", clientId: "acme", password: "password-123" }
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.clientId, "acme");
  assert.equal(typeof res.body.message, "string");
  assert.equal(res.body.token, undefined, "signup must not auto-login");

  const base = path.join(srv.instanceDir, "data", "clients", "acme");
  assert.ok(fs.existsSync(path.join(base, "business.json")), "business.json created");
  const business = JSON.parse(fs.readFileSync(path.join(base, "business.json"), "utf8"));
  assert.equal(business.name, "ACME Construction");
  assert.deepEqual(business.services, []);
  assert.equal(business.industry, "");
  assert.equal(business.phone, "");
  assert.equal(business.greeting, "Welcome to ACME Construction. How can we help you?");

  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(base, "leads.json"), "utf8")),
    [],
    "leads.json starts empty"
  );

  assert.ok(
    fs.statSync(path.join(base, "conversations")).isDirectory(),
    "conversations directory created"
  );

  const admins = JSON.parse(
    fs.readFileSync(path.join(srv.instanceDir, "data", "admins.json"), "utf8")
  );
  assert.ok(admins.acme && admins.acme.salt && admins.acme.passwordHash, "admin credential created");

  const token = await login(srv.baseUrl, "acme", "password-123");
  assert.ok(token, "new admin can log in through the existing login flow");
});
// ---------------------------------------------------------------
// B. Anti-takeover
// ---------------------------------------------------------------
test("B. signup cannot take over the thunderbolt tenant", async () => {
  const adminsPath = path.join(srv.instanceDir, "data", "admins.json");
  const businessPath = path.join(srv.instanceDir, "data", "clients", "thunderbolt", "business.json");
  const adminsBefore = fs.readFileSync(adminsPath, "utf8");
  const businessBefore = fs.readFileSync(businessPath, "utf8");

  const res = await request(srv.baseUrl, "/auth/signup", {
    method: "POST",
    body: { businessName: "Hijack Co", clientId: "thunderbolt", password: "password-123" }
  });
  assert.equal(res.status, 409);
  assert.match(res.body.error, /reserved/i);

  assert.equal(
    fs.readFileSync(adminsPath, "utf8"),
    adminsBefore,
    "thunderbolt admin credential must not change"
  );
  assert.equal(
    fs.readFileSync(businessPath, "utf8"),
    businessBefore,
    "thunderbolt business profile must not change"
  );

  const token = await login(srv.baseUrl, "thunderbolt", TEST_PASSWORD_THUNDERBOLT);
  assert.ok(token, "original thunderbolt credential remains valid");
});

// ---------------------------------------------------------------
// C. Duplicate signup
// ---------------------------------------------------------------
test("C. duplicate signup for the same Business ID is rejected without overwrite", async () => {
  const base = path.join(srv.instanceDir, "data", "clients", "acme");
  const businessBefore = fs.readFileSync(path.join(base, "business.json"), "utf8");
  const adminsBefore = fs.readFileSync(path.join(srv.instanceDir, "data", "admins.json"), "utf8");

  const res = await request(srv.baseUrl, "/auth/signup", {
    method: "POST",
    body: { businessName: "ACME Renamed", clientId: "acme", password: "totally-different-password" }
  });
  assert.equal(res.status, 409);
  assert.match(res.body.error, /already registered/i);

  assert.equal(
    fs.readFileSync(path.join(base, "business.json"), "utf8"),
    businessBefore,
    "business profile must not be overwritten"
  );
  assert.equal(
    fs.readFileSync(path.join(srv.instanceDir, "data", "admins.json"), "utf8"),
    adminsBefore,
    "admin credential must not be overwritten"
  );

  const token = await login(srv.baseUrl, "acme", "password-123");
  assert.ok(token, "original acme credential still works");
});
// ---------------------------------------------------------------
// E. Tenant isolation
// ---------------------------------------------------------------
test("E. new tenants cannot access each other's data", async () => {
  for (const id of ["alpha", "beta"]) {
    const res = await request(srv.baseUrl, "/auth/signup", {
      method: "POST",
      body: { businessName: `Builder ${id}`, clientId: id, password: "password-123" }
    });
    assert.equal(res.status, 201, `signup for ${id}`);
  }

  const alphaToken = await login(srv.baseUrl, "alpha", "password-123");
  const betaToken = await login(srv.baseUrl, "beta", "password-123");
  assert.ok(alphaToken && betaToken, "both admins can log in");

  // alpha can read alpha's own data.
  for (const p of [
    "/leads?clientId=alpha",
    "/stats?clientId=alpha",
    "/business/admin?clientId=alpha",
    "/conversations?clientId=alpha"
  ]) {
    const res = await request(srv.baseUrl, p, {
      headers: { Authorization: `Bearer ${alphaToken}` }
    });
    assert.equal(res.status, 200, p);
  }

  // alpha is forbidden from beta's data.
  for (const p of [
    "/leads?clientId=beta",
    "/stats?clientId=beta",
    "/business/admin?clientId=beta",
    "/conversations?clientId=beta"
  ]) {
    const res = await request(srv.baseUrl, p, {
      headers: { Authorization: `Bearer ${alphaToken}` }
    });
    assert.equal(res.status, 403, p);
  }

  // beta is forbidden from alpha's data.
  const res = await request(srv.baseUrl, "/leads?clientId=alpha", {
    headers: { Authorization: `Bearer ${betaToken}` }
  });
  assert.equal(res.status, 403);
});

// ---------------------------------------------------------------
// F. Widget / public flow
// ---------------------------------------------------------------
test("F. public widget flow works for a newly created tenant", async () => {
  // Public business profile + public CORS.
  let res = await request(srv.baseUrl, "/business?clientId=alpha", {
    headers: { Origin: CUSTOMER_ORIGIN }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, "Builder alpha");
  assert.equal(res.headers["access-control-allow-origin"], CUSTOMER_ORIGIN);

  // Public widget config.
  res = await request(srv.baseUrl, "/widget/config?clientId=alpha", {
    headers: { Origin: CUSTOMER_ORIGIN }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.businessName, "Builder alpha");

  // Widget assets remain publicly accessible cross-origin.
  for (const asset of ["/widget/embed.js", "/widget/widget.js", "/widget/config.js", "/widget/widget.css"]) {
    res = await request(srv.baseUrl, asset, {
      headers: { Origin: CUSTOMER_ORIGIN }
    });
    assert.equal(res.status, 200, asset);
    assert.equal(res.headers["access-control-allow-origin"], CUSTOMER_ORIGIN, asset);
  }

  // Chat writes ONLY into the new tenant's conversation directory.
  const alphaConvDir = path.join(srv.instanceDir, "data", "clients", "alpha", "conversations");
  const betaConvDir = path.join(srv.instanceDir, "data", "clients", "beta", "conversations");
  const alphaBefore = fs.readdirSync(alphaConvDir).sort();
  const betaBefore = fs.readdirSync(betaConvDir).sort();

  res = await request(srv.baseUrl, "/chat", {
    method: "POST",
    headers: { Origin: CUSTOMER_ORIGIN },
    body: { message: "Hello, I need a quote for a boundary wall.", clientId: "alpha" }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.reply, "graceful fallback reply (no Groq key in scratch)");

  const alphaAdded = fs
    .readdirSync(alphaConvDir)
    .sort()
    .filter((file) => !alphaBefore.includes(file));
  const betaAfter = fs.readdirSync(betaConvDir).sort();
  assert.ok(alphaAdded.length >= 1, "one conversation written for alpha");
  assert.deepEqual(betaAfter, betaBefore, "beta conversations untouched");

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/i;
  for (const file of alphaAdded) {
    assert.match(file, UUID_RE, "conversation filenames remain UUIDs");
  }
});
// ---------------------------------------------------------------
// D. Slug validation (unit level - no HTTP/rate-limit interference)
// ---------------------------------------------------------------
test("D. provisionTenant rejects blank, traversal and invalid Business IDs", () => {
  const invalid = ["", "   ", "../../x", "..", "bad id!", "acme.com", "with/slash"];
  for (const raw of invalid) {
    assert.throws(
      () => provisionTenant({ businessName: "Test Co", clientId: raw, password: "password-123" }),
      (error) => error.statusCode === 400,
      `expected 400 for raw clientId "${raw}"`
    );
  }
});

test("D2. provisionTenant rejects the reserved thunderbolt ID", () => {
  assert.throws(
    () => provisionTenant({ businessName: "Test Co", clientId: "thunderbolt", password: "password-123" }),
    (error) => error.statusCode === 409
  );
});

test("D3. provisionTenant rejects IDs that already exist as an admin or business", () => {
  // thunderbolt + tenantb are pre-seeded in the scratch instance as both admin
  // and business; prove a rewrite/hijack attempt is refused.
  for (const id of ["thunderbolt", "tenantb"]) {
    assert.throws(
      () => provisionTenant({ businessName: "Hijack Co", clientId: id, password: "password-123" }),
      (error) => error.statusCode === 409,
      `expected 409 for existing "${id}"`
    );
  }
});

test("D4. provisionTenant rejects a weak password and leaves no artifacts", () => {
  assert.throws(
    () => provisionTenant({ businessName: "Test Co", clientId: "weakco", password: "1234" }),
    (error) => error.statusCode === 400
  );
  assert.equal(
    fs.existsSync(path.join(scratch.instanceDir, "data", "clients", "weakco")),
    false,
    "a failed provisioning must not leave a partial tenant folder"
  );
});
test("D5. provisionTenant creates a tenant and a re-attempt never overwrites", () => {
  const result = provisionTenant({
    businessName: "Unit Test Builders",
    clientId: "unittestco",
    password: "password-123"
  });
  assert.equal(result.clientId, "unittestco");

  const base = path.join(scratch.instanceDir, "data", "clients", "unittestco");
  const businessPath = path.join(base, "business.json");
  assert.equal(JSON.parse(fs.readFileSync(businessPath, "utf8")).name, "Unit Test Builders");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(base, "leads.json"), "utf8")), []);
  assert.ok(fs.statSync(path.join(base, "conversations")).isDirectory());

  const adminsPath = path.join(scratch.instanceDir, "data", "admins.json");
  const adminsBefore = fs.readFileSync(adminsPath, "utf8");

  assert.throws(
    () => provisionTenant({ businessName: "Gone", clientId: "unittestco", password: "another-password" }),
    (error) => error.statusCode === 409
  );

  assert.equal(
    fs.readFileSync(adminsPath, "utf8"),
    adminsBefore,
    "admin credential is never rewritten"
  );
  assert.equal(
    fs.readFileSync(businessPath, "utf8"),
    JSON.stringify(
      {
        name: "Unit Test Builders",
        industry: "",
        services: [],
        location: "",
        hours: "",
        greeting: "Welcome to Unit Test Builders. How can we help you?",
        phone: "",
        email: "",
        website: "",
        description: ""
      },
      null,
      2
    ),
    "business profile is never rewritten"
  );
});

// ---------------------------------------------------------------
// G. Signup rate limiting
// ---------------------------------------------------------------
test("G. signup is rate limited (5 attempts / 10 min / IP)", async () => {
  const fresh = await startTestServer();
  try {
    const statuses = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await request(fresh.baseUrl, "/auth/signup", {
        method: "POST",
        body: { businessName: "", clientId: "zap", password: "password-123" }
      });
      statuses.push(res.status);
    }
    assert.deepEqual(statuses.slice(0, 5), Array.from({ length: 5 }, () => 400));
    assert.equal(statuses[5], 429);
    assert.equal(statuses[6], 429);

    const limited = await request(fresh.baseUrl, "/auth/signup", {
      method: "POST",
      body: { businessName: "", clientId: "zap", password: "password-123" }
    });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers["retry-after"]) > 0, "Retry-After header present");
  } finally {
    await fresh.stop();
  }
});