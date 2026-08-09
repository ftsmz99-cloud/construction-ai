import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  startTestServer,
  request,
  CUSTOMER_ORIGIN,
  DEFAULT_CLIENT_ORIGIN
} from "./helpers/scratchServer.js";

let srv;

before(async () => {
  srv = await startTestServer();
});

after(async () => {
  await srv.stop();
});

test("GET /business reflects the customer origin (public CORS)", async () => {
  const res = await request(srv.baseUrl, "/business?clientId=thunderbolt", {
    headers: { Origin: CUSTOMER_ORIGIN }
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers["access-control-allow-origin"], CUSTOMER_ORIGIN);
  assert.equal(
    res.headers["access-control-allow-credentials"],
    undefined,
    "public responses must not enable credentials"
  );
});

test("OPTIONS /chat preflight succeeds for the customer origin", async () => {
  const res = await request(srv.baseUrl, "/chat", {
    method: "OPTIONS",
    headers: {
      Origin: CUSTOMER_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers["access-control-allow-origin"], CUSTOMER_ORIGIN);
  assert.ok(/POST/.test(res.headers["access-control-allow-methods"] || ""));
  assert.ok(
    /content-type/i.test(res.headers["access-control-allow-headers"] || "")
  );
  assert.equal(
    res.headers["access-control-allow-credentials"],
    undefined,
    "preflight must not enable credentials"
  );
});

test("widget config and static assets are cross-origin readable", async () => {
  const paths = [
    "/widget/config?clientId=thunderbolt",
    "/widget/widget.js",
    "/widget/config.js",
    "/widget/api.js",
    "/widget/ui.js",
    "/widget/storage.js",
    "/widget/widget.css"
  ];
  for (const p of paths) {
    const res = await request(srv.baseUrl, p, {
      headers: { Origin: CUSTOMER_ORIGIN }
    });
    assert.equal(res.status, 200, p);
    assert.equal(res.headers["access-control-allow-origin"], CUSTOMER_ORIGIN, p);
  }
});

test("admin endpoints are NOT publicly CORS-enabled", async () => {
  // PUT /business preflight from a foreign origin -> CLIENT_ORIGIN, not customer.
  let res = await request(srv.baseUrl, "/business", {
    method: "OPTIONS",
    headers: {
      Origin: CUSTOMER_ORIGIN,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type,authorization"
    }
  });
  assert.equal(
    res.headers["access-control-allow-origin"],
    DEFAULT_CLIENT_ORIGIN
  );

  // /auth/login preflight from a foreign origin.
  res = await request(srv.baseUrl, "/auth/login", {
    method: "OPTIONS",
    headers: {
      Origin: CUSTOMER_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  });
  assert.equal(
    res.headers["access-control-allow-origin"],
    DEFAULT_CLIENT_ORIGIN
  );

  // /leads from a foreign origin -> 401 and ACAO is CLIENT_ORIGIN.
  res = await request(srv.baseUrl, "/leads?clientId=thunderbolt", {
    headers: { Origin: CUSTOMER_ORIGIN }
  });
  assert.equal(res.status, 401);
  assert.equal(
    res.headers["access-control-allow-origin"],
    DEFAULT_CLIENT_ORIGIN
  );
  assert.notEqual(res.headers["access-control-allow-origin"], CUSTOMER_ORIGIN);
});

test("admin dashboard works from CLIENT_ORIGIN", async () => {
  // Preflights for admin actions from the allowed origin succeed.
  let res = await request(srv.baseUrl, "/auth/login", {
    method: "OPTIONS",
    headers: {
      Origin: DEFAULT_CLIENT_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers["access-control-allow-origin"], DEFAULT_CLIENT_ORIGIN);
  assert.equal(
    res.headers["access-control-allow-credentials"],
    undefined
  );

  res = await request(srv.baseUrl, "/leads", {
    method: "OPTIONS",
    headers: {
      Origin: DEFAULT_CLIENT_ORIGIN,
      "Access-Control-Request-Method": "GET"
    }
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers["access-control-allow-origin"], DEFAULT_CLIENT_ORIGIN);
  assert.ok(/GET/.test(res.headers["access-control-allow-methods"] || ""));

  // Public business profile still reachable from the allowed origin.
  res = await request(srv.baseUrl, "/business?clientId=thunderbolt", {
    headers: { Origin: DEFAULT_CLIENT_ORIGIN }
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers["access-control-allow-origin"], DEFAULT_CLIENT_ORIGIN);
});

test("method-aware /business preflight: GET public, PUT admin", async () => {
  const getPreflight = await request(srv.baseUrl, "/business", {
    method: "OPTIONS",
    headers: {
      Origin: CUSTOMER_ORIGIN,
      "Access-Control-Request-Method": "GET"
    }
  });
  assert.equal(getPreflight.status, 204);
  assert.equal(
    getPreflight.headers["access-control-allow-origin"],
    CUSTOMER_ORIGIN
  );

  const putPreflight = await request(srv.baseUrl, "/business", {
    method: "OPTIONS",
    headers: {
      Origin: CUSTOMER_ORIGIN,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type,authorization"
    }
  });
  assert.equal(
    putPreflight.headers["access-control-allow-origin"],
    DEFAULT_CLIENT_ORIGIN
  );
});