import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  startTestServer,
  request,
  login,
  TEST_PASSWORD_THUNDERBOLT,
  TEST_PASSWORD_TENANTB
} from "./helpers/scratchServer.js";

let srv;

before(async () => {
  srv = await startTestServer();
});

after(async () => {
  await srv.stop();
});

test("login with wrong password returns 401", async () => {
  const res = await request(srv.baseUrl, "/auth/login", {
    method: "POST",
    body: { clientId: "thunderbolt", password: "wrong-password" }
  });
  assert.equal(res.status, 401);
});

test("login with correct password returns a token", async () => {
  const res = await request(srv.baseUrl, "/auth/login", {
    method: "POST",
    body: { clientId: "thunderbolt", password: TEST_PASSWORD_THUNDERBOLT }
  });
  assert.equal(res.status, 200);
  assert.ok(res.body && typeof res.body.token === "string");
  assert.ok(res.body.token.includes("."));
});

test("admin endpoints return 401 without a token", async () => {
  const paths = [
    "/leads?clientId=thunderbolt",
    "/stats?clientId=thunderbolt",
    "/conversations?clientId=thunderbolt",
    "/business/admin?clientId=thunderbolt"
  ];
  for (const p of paths) {
    const res = await request(srv.baseUrl, p);
    assert.equal(res.status, 401, p);
  }
});

test("admin endpoints return 401 with a tampered token", async () => {
  const token = await login(srv.baseUrl, "thunderbolt", TEST_PASSWORD_THUNDERBOLT);
  assert.ok(token, "login should succeed");
  const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
  const res = await request(srv.baseUrl, "/leads?clientId=thunderbolt", {
    headers: { Authorization: `Bearer ${tampered}` }
  });
  assert.equal(res.status, 401);
});

test("own tenant can read its own data", async () => {
  const token = await login(srv.baseUrl, "thunderbolt", TEST_PASSWORD_THUNDERBOLT);
  const paths = [
    "/leads?clientId=thunderbolt",
    "/stats?clientId=thunderbolt",
    "/conversations?clientId=thunderbolt",
    "/business/admin?clientId=thunderbolt"
  ];
  for (const p of paths) {
    const res = await request(srv.baseUrl, p, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 200, p);
  }
});

test("cross-tenant access is forbidden with 403", async () => {
  const token = await login(srv.baseUrl, "thunderbolt", TEST_PASSWORD_THUNDERBOLT);
  const paths = [
    "/leads?clientId=tenantb",
    "/stats?clientId=tenantb",
    "/conversations?clientId=tenantb",
    "/business/admin?clientId=tenantb"
  ];
  for (const p of paths) {
    const res = await request(srv.baseUrl, p, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 403, p);
  }
});

test("second tenant's token cannot read the first tenant's data", async () => {
  const tokenB = await login(srv.baseUrl, "tenantb", TEST_PASSWORD_TENANTB);
  const res = await request(srv.baseUrl, "/leads?clientId=thunderbolt", {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.equal(res.status, 403);
});

test("PUT /business is admin-protected and tenant-isolated", async () => {
  // No token -> 401.
  let res = await request(srv.baseUrl, "/business?clientId=thunderbolt", {
    method: "PUT",
    body: { name: "Hijack" }
  });
  assert.equal(res.status, 401);

  const token = await login(srv.baseUrl, "thunderbolt", TEST_PASSWORD_THUNDERBOLT);

  // Own tenant -> allowed.
  res = await request(srv.baseUrl, "/business?clientId=thunderbolt", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: { name: "Rowens Mechanics (updated in test)" }
  });
  assert.equal(res.status, 200);

  // Cross tenant -> 403 (scratch tenantb profile untouched).
  res = await request(srv.baseUrl, "/business?clientId=tenantb", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: { name: "Hijacked!" }
  });
  assert.equal(res.status, 403);
});