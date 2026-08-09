// Direct unit tests for saveLead's junk/duplicate protections.
// The test process changes its working directory into a scratch sandbox, so
// every write lands in scratch and genuine runtime data is untouched
// (node --test runs each file in its own process, making chdir safe).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildScratchInstance } from "./helpers/scratchServer.js";
import saveLead from "../utils/saveLead.js";

const CLIENT = "thunderbolt";

let instanceDir;
let originalCwd;

before(() => {
  const scratch = buildScratchInstance();
  instanceDir = scratch.instanceDir;
  originalCwd = process.cwd();
  process.chdir(instanceDir);
});

after(() => {
  process.chdir(originalCwd);
  try {
    fs.rmSync(path.dirname(instanceDir), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

function leadsFile() {
  return path.join(process.cwd(), "data", "clients", CLIENT, "leads.json");
}

function readLeads() {
  const file = leadsFile();
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
}

function makeLead(overrides = {}) {
  return {
    name: "",
    phone: "",
    location: "",
    project: "",
    timeline: "",
    description: "",
    clientId: CLIENT,
    ...overrides
  };
}

test("project-only lead (no name/phone) is rejected and no file is written", () => {
  fs.rmSync(leadsFile(), { force: true });
  const ok = saveLead(makeLead({ project: "boundary wall", conversationId: "conv-junk" }), CLIENT);
  assert.equal(ok, false);
  assert.equal(fs.existsSync(leadsFile()), false);
});

test("fully-blank lead is rejected", () => {
  const ok = saveLead(makeLead({ conversationId: "conv-blank" }), CLIENT);
  assert.equal(ok, false);
  assert.equal(fs.existsSync(leadsFile()), false);
});

test("a meaningful lead is created once", () => {
  const ok = saveLead(
    makeLead({
      name: "John",
      phone: "0812 345 678",
      location: "Windhoek",
      conversationId: "conv-1"
    }),
    CLIENT
  );
  assert.equal(ok, true);
  const leads = readLeads();
  assert.equal(leads.length, 1);
  assert.equal(leads[0].name, "John");
  assert.equal(leads[0].phone, "0812 345 678");
});

test("same conversation never creates duplicates and never clobbers collected info", () => {
  saveLead(
    makeLead({
      name: "John",
      phone: "",
      location: "Windhoek",
      project: "fence",
      conversationId: "conv-1"
    }),
    CLIENT
  );
  const leads = readLeads();
  assert.equal(leads.length, 1, "same conversation must stay a single lead");
  assert.equal(leads[0].phone, "0812 345 678", "empty re-extraction must not erase phone");
  assert.equal(leads[0].project, "fence", "new non-empty info is applied");
});

test("same phone across conversations merges (returning customer), score recomputed", () => {
  saveLead(
    makeLead({
      name: "John Smith",
      phone: "0812345678",
      project: "house",
      conversationId: "conv-2"
    }),
    CLIENT
  );
  const leads = readLeads();
  assert.equal(leads.length, 1, "phone dedupe keeps one lead");
  assert.equal(leads[0].name, "John Smith");
  assert.equal(leads[0].score, 70); // name 20 + phone 30 + project 20
});

test("junk merge attempt never mutates an existing lead", () => {
  const snapshot = JSON.stringify(readLeads());
  const ok = saveLead(
    makeLead({ conversationId: "conv-2" }),
    CLIENT
  );
  assert.equal(ok, false);
  assert.equal(JSON.stringify(readLeads()), snapshot);
});

test("distinct conversation and phone creates a second genuine lead", () => {
  saveLead(
    makeLead({
      name: "Jane",
      phone: "0991112222",
      conversationId: "conv-3"
    }),
    CLIENT
  );
  assert.equal(readLeads().length, 2);
});

test("case-insensitive same name across conversations merges", () => {
  saveLead(
    makeLead({
      name: "jane",
      location: "Swakopmund",
      conversationId: "conv-4"
    }),
    CLIENT
  );
  const leads = readLeads();
  assert.equal(leads.length, 2, "name dedupe keeps one Jane");
  assert.equal(leads.find((l) => l.name === "jane").location, "Swakopmund");
});