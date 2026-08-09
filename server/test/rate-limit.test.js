import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, request, CUSTOMER_ORIGIN } from "./helpers/scratchServer.js";

let shared;

before(async () => {
  shared = await startTestServer();
});

after(async () => {
  await shared.stop();
});

// Each case that needs a fresh limiter state uses its own server instance,
// because the in-memory rate-limit counters live per process.
async function withFreshServer(fn) {
  const srv = await startTestServer();
  try {
    await fn(srv);
  } finally {
    await srv.stop();
  }
}

test("login is rate limited: 10 attempts allowed, then 429 with Retry-After", async () => {
  const statuses = [];
  for (let i = 0; i < 12; i += 1) {
    const res = await request(shared.baseUrl, "/auth/login", {
      method: "POST",
      body: { clientId: "thunderbolt", password: "wrong-password" }
    });
    statuses.push(res.status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array.from({ length: 10 }, () => 401));
  assert.equal(statuses[10], 429);
  assert.equal(statuses[11], 429);

  const limited = await request(shared.baseUrl, "/auth/login", {
    method: "POST",
    body: { clientId: "thunderbolt", password: "wrong-password" }
  });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers["retry-after"]) > 0, "Retry-After header present");
});

test("chat is rate limited: 30 messages allowed, then 429", async () => {
  const statuses = [];
  for (let i = 0; i < 32; i += 1) {
    const res = await request(shared.baseUrl, "/chat", {
      method: "POST",
      body: { message: "", clientId: "thunderbolt" }
    });
    statuses.push(res.status);
  }
  assert.deepEqual(statuses.slice(0, 30), Array.from({ length: 30 }, () => 400));
  assert.equal(statuses[30], 429);
  assert.equal(statuses[31], 429);
});

test("OPTIONS preflight is NOT consumed by the chat limiter", async () => {
  await withFreshServer(async (srv) => {
    for (let i = 0; i < 31; i += 1) {
      await request(srv.baseUrl, "/chat", {
        method: "POST",
        body: { message: "", clientId: "thunderbolt" }
      });
    }
    const blocked = await request(srv.baseUrl, "/chat", {
      method: "POST",
      body: { message: "", clientId: "thunderbolt" }
    });
    assert.equal(blocked.status, 429);

    const preflight = await request(srv.baseUrl, "/chat", {
      method: "OPTIONS",
      headers: {
        Origin: CUSTOMER_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers["access-control-allow-origin"], CUSTOMER_ORIGIN);
  });
});

test("logout is NOT rate limited", async () => {
  await withFreshServer(async (srv) => {
    for (let i = 0; i < 20; i += 1) {
      const res = await request(srv.baseUrl, "/auth/logout", {
        method: "POST",
        body: {}
      });
      assert.equal(res.status, 200);
    }
  });
});

test("health is unaffected by rate limiting", async () => {
  await withFreshServer(async (srv) => {
    for (let i = 0; i < 8; i += 1) {
      const res = await request(srv.baseUrl, "/health");
      assert.equal(res.status, 200);
    }
  });
});