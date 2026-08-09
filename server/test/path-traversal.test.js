import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { startTestServer, request } from "./helpers/scratchServer.js";

let srv;

before(async () => {
  srv = await startTestServer();
});

after(async () => {
  await srv.stop();
});

function scanTree(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanTree(full, results);
    else results.push(full);
  }
  return results;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test("a non-UUID (path-traversal) conversationId cannot write outside the conversations folder", async () => {
  const dataRoot = path.join(srv.instanceDir, "data");
  const before = scanTree(dataRoot);

  const res = await request(srv.baseUrl, "/chat", {
    method: "POST",
    body: {
      message: "Hi, I need an electrical quote.",
      clientId: "thunderbolt",
      conversationId: "../../../../pwned"
    }
  });

  // Graceful fallback still answers (no real AI call in the scratch env).
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const after = scanTree(dataRoot);
  const added = after.filter((file) => !before.includes(file));
  assert.ok(added.length >= 1, "a conversation record should be written");
  for (const file of added) {
    assert.ok(
      file.includes(path.join("clients", "thunderbolt", "conversations")),
      `file written outside conversations dir: ${file}`
    );
    const name = path.basename(file).replace(/\.json$/, "");
    assert.match(name, UUID_RE, `unsanitized conversation filename: ${name}`);
  }
});

test("a malicious clientId cannot write outside the scratch data tree", async () => {
  const dataRoot = path.join(srv.instanceDir, "data");
  const before = scanTree(dataRoot);

  const res = await request(srv.baseUrl, "/chat", {
    method: "POST",
    body: {
      message: "Hi there",
      clientId: "../../../escape",
      conversationId: "00000000-0000-4000-8000-000000000001"
    }
  });
  // The client is sanitized to an unknown tenant -> graceful 500 fallback.
  assert.equal(res.status, 500);

  const after = scanTree(dataRoot);
  for (const file of after) {
    assert.ok(file.startsWith(dataRoot), `file outside data root: ${file}`);
    if (!before.includes(file)) {
      assert.ok(
        file.includes(path.join("clients")),
        `file written outside clients dir: ${file}`
      );
    }
  }
});

test("a genuine UUID conversationId is honored and stored in the conversations folder", async () => {
  const convDir = path.join(
    srv.instanceDir,
    "data",
    "clients",
    "thunderbolt",
    "conversations"
  );
  const uuid = "11111111-2222-4333-8444-555555555555";
  const target = path.join(convDir, `${uuid}.json`);
  assert.equal(fs.existsSync(target), false);

  const res = await request(srv.baseUrl, "/chat", {
    method: "POST",
    body: {
      message: "Hello there",
      clientId: "thunderbolt",
      conversationId: uuid
    }
  });
  assert.equal(res.status, 200);
  assert.ok(fs.existsSync(target), "conversation saved under the provided UUID");
});