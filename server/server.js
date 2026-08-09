import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import chatRoute from "./routes/chat.js";
import authRoute from "./routes/auth.js";
import loadBusiness, { invalidateBusiness } from "./utils/loadBusiness.js";
import { requireAdmin, requireTenant, sanitizeClientId } from "./utils/auth.js";
import createRateLimiter from "./utils/rateLimit.js";

dotenv.config();

const app = express();

// Allow only the admin dashboard origin for the admin/default zone.
// The customer widget is embedded cross-origin on customer domains, so ONLY
// the public widget resources below get a separate public CORS configuration
// that reflects the requesting origin.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const restrictCors = cors({
  origin: CLIENT_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
});

// Public CORS for the customer-facing widget. Reflects whatever origin the
// widget is embedded on so a customer site can call it cross-origin. The
// public API is anonymous, so credentials are intentionally NOT enabled.
const publicCors = cors({ origin: true });

// Detect public widget requests so the restrictive CORS does not terminate
// their CORS preflights before publicCors runs at the public route mounts.
function isPublicWidgetRequest(req) {
  const method = String(req.method || "").toUpperCase();
  // For CORS preflights the browser announces the intended method in
  // Access-Control-Request-Method; /business uses that so it stays
  // method-aware: GET is public, PUT stays admin.
  const effectiveMethod =
    method === "OPTIONS"
      ? String(req.headers["access-control-request-method"] || "").toUpperCase()
      : method;

  const { path } = req;

  if (path === "/chat" || path.startsWith("/chat/")) return true;
  if (path === "/widget" || path.startsWith("/widget/")) return true;
  if (effectiveMethod === "GET" && path === "/business") return true;

  return false;
}

// Restrictive CORS for every route except the public widget resources above.
// Public widget requests get publicCors right here (single enforcement point)
// so CORS preflights to public resources are also answered with the
// reflecting origin; otherwise the restrictive CORS would terminate the
// preflight before any public route middleware could run.
app.use((req, res, next) => {
  if (isPublicWidgetRequest(req)) {
    return publicCors(req, res, next);
  }
  return restrictCors(req, res, next);
});
app.use(express.json());

// ===================================
// ABUSE / COST PROTECTION
// ===================================
// Per-IP in-memory rate limits (no database / Redis). The public widget chat
// endpoint costs Groq credits, so it is capped; login is capped to slow
// brute-force attempts. CORS preflights are answered by the CORS guard above
// before they reach these routes, so OPTIONS requests never consume quota.
const WIDGET_CHAT_LIMIT = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,                  // 30 chat messages per IP per 10 minutes
  name: "chat"
});

const LOGIN_LIMIT = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,                  // 10 login attempts per IP per 10 minutes
  name: "login"
});

// Login attempts only; logout stays unlimited.
app.use("/auth/login", LOGIN_LIMIT);

// Signup is a public, anonymous provisioning endpoint used to create tenants,
// so it is capped to slow abuse / mass account creation.
const SIGNUP_LIMIT = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,                   // 5 signup attempts per IP per 10 minutes
  name: "signup"
});

// Signup attempts only. This route stays under the RESTRICTIVE (CLIENT_ORIGIN)
// CORS policy; it must never join the public reflect-any-origin policy.
app.use("/auth/signup", SIGNUP_LIMIT);

// Auth: login/logout/signup
app.use("/auth", authRoute);

const DATA_FOLDER = path.join(process.cwd(), "data");

// ===================================
// STATIC WIDGET ASSETS
// ===================================
// Serve the customer-facing widget bundle so the embed script and its
// CSS/JS can be loaded by any site. Kept separate from API routes.
const WIDGET_FOLDER = path.join(process.cwd(), "widget");

if (fs.existsSync(WIDGET_FOLDER)) {
  app.use("/widget", express.static(WIDGET_FOLDER));
}

function readJson(clientId, fileName, fallback = []) {
  try {
    const filePath = path.join(DATA_FOLDER, "clients", clientId, fileName);

    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`READ ${fileName} ERROR:`, error.message);
    return fallback;
  }
}

// ===================================
// CHAT
// ===================================

app.use("/chat", WIDGET_CHAT_LIMIT, chatRoute);

// ===================================
// WIDGET CONFIG (NEW MAIN ENDPOINT)
// ===================================

app.get("/widget/config", (req, res) => {
  try {
    const clientId = req.query.clientId || "thunderbolt";

    const business = loadBusiness(clientId);

    res.json({
      success: true,
      clientId,

      businessName: business.name || "",

      greeting:
        business.greeting ||
        `Welcome to ${business.name}`,

      services: business.services || [],

      hours: business.hours || "",

      location: business.location || "",

      logo: business.logo || "",

      primaryColor:
        business.primaryColor || "#2563eb"
    });

  } catch (error) {

    console.error(
      "WIDGET CONFIG ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
});

// ===================================
// PUBLIC BUSINESS PROFILE
// ===================================
// Publicly readable because the customer-facing widget renders this on a
// visitor's browser. Returns ONLY non-sensitive public fields. Sensitive
// fields (phone, email, website, description, industry, ...) are never
// returned here; see GET /business/admin for the authenticated profile.
app.get("/business", (req, res) => {
  try {
    const clientId =
      sanitizeClientId(req.query.clientId || "thunderbolt");

    const business = loadBusiness(clientId);

    res.json({
      id: business.id,
      name: business.name,
      services: business.services,
      location: business.location,
      hours: business.hours,
      greeting: business.greeting
    });

  } catch (error) {

    console.error(
      "BUSINESS ERROR:",
      error.message
    );

    res.status(500).json({
      error: error.message
    });

  }
});

// ===================================
// ADMIN BUSINESS PROFILE (FULL)
// ===================================
// Requires a valid, tenant-matching admin token. Returns the complete profile
// including sensitive fields for the admin dashboard.
app.get("/business/admin", requireAdmin, requireTenant, (req, res) => {
  try {
    const clientId = sanitizeClientId(req.query.clientId);
    res.json(loadBusiness(clientId));
  } catch (error) {
    console.error("BUSINESS ADMIN ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===================================
// UPDATE BUSINESS
// ===================================

app.put("/business", requireAdmin, requireTenant, (req, res) => {
  try {
    const clientId = String(req.query.clientId || "thunderbolt")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .toLowerCase();

    const body = req.body || {};

    const allowedFields = [
      "name",
      "industry",
      "services",
      "location",
      "hours",
      "greeting",
      "phone",
      "email",
      "website",
      "description"
    ];

    const folder = path.join(DATA_FOLDER, "clients", clientId);
    const filePath = path.join(folder, "business.json");

    let current = {};
    if (fs.existsSync(filePath)) {
      current = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } else {
      fs.mkdirSync(folder, { recursive: true });
    }

    const updated = { ...current };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updated[field] = body[field];
      }
    }

    fs.writeFileSync(
      filePath,
      JSON.stringify(updated, null, 2),
      "utf8"
    );

    invalidateBusiness(clientId);

    res.json({
      success: true,
      business: loadBusiness(clientId)
    });

  } catch (error) {

    console.error(
      "PUT BUSINESS ERROR:",
      error.message
    );

    res.status(500).json({
      error: error.message
    });

  }
});

// ===================================
// LEADS
// ===================================

app.get("/leads", requireAdmin, requireTenant, (req, res) => {

  const clientId = req.query.clientId || "thunderbolt";

  const leads = readJson(
    clientId,
    "leads.json",
    []
  );

  res.json(leads);

});

app.put("/leads/:id/status", requireAdmin, requireTenant, (req, res) => {

  const clientId = String(req.query.clientId || "thunderbolt")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();

  const leadId = String(req.params.id || "");

  const { status } = req.body || {};

  if (!leadId || !status) {
    return res.status(400).json({ error: "Lead id and status are required" });
  }

  const filePath = path.join(
    DATA_FOLDER,
    "clients",
    clientId,
    "leads.json"
  );

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "No leads file" });
    }

    const leads = JSON.parse(fs.readFileSync(filePath, "utf8"));

    const index = leads.findIndex(lead => String(lead.id) === leadId);

    if (index === -1) {
      return res.status(404).json({ error: "Lead not found" });
    }

    leads[index] = {
      ...leads[index],
      status,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      filePath,
      JSON.stringify(leads, null, 2),
      "utf8"
    );

    res.json(leads[index]);

  } catch (error) {
    console.error("UPDATE LEAD STATUS ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }

});

// ===================================
// CONVERSATIONS
// ===================================

app.get("/conversations", requireAdmin, requireTenant, (req, res) => {

  const clientId = req.query.clientId || "thunderbolt";

  const safeClientId = String(clientId).replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();

  const convFolder = path.join(
    DATA_FOLDER,
    "clients",
    safeClientId,
    "conversations"
  );

  if (!fs.existsSync(convFolder)) {
    return res.json([]);
  }

  const conversations = fs
    .readdirSync(convFolder)
    .filter(file => file.endsWith(".json"))
    .map(file => {
      try {
        const conversation = JSON.parse(
          fs.readFileSync(path.join(convFolder, file), "utf8")
        );
        return {
          ...conversation,
          conversationId: conversation.id
        };
      } catch (error) {
        console.error(`CONVERSATION ${file} ERROR:`, error.message);
        return null;
      }
    })
    .filter(Boolean);

  res.json(conversations);

});

// ===================================
// DASHBOARD STATS
// ===================================

app.get("/stats", requireAdmin, requireTenant, (req, res) => {

  const clientId = req.query.clientId || "thunderbolt";

  const leads = readJson(
    clientId,
    "leads.json",
    []
  );

  res.json({

    totalLeads: leads.length,

    newLeads: leads.filter(

      lead =>

      (lead.status || "NEW") === "NEW"

    ).length

  });

});

// ===================================
// HEALTH CHECK
// ===================================

app.get("/health", (req, res) => {

  res.json({

    success: true,

    status: "online",

    timestamp: new Date().toISOString()

  });

});

// ===================================
// ROOT
// ===================================

app.get("/", (req, res) => {

  res.send("Construction AI API is running.");

});

// ===================================
// START
// ===================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Construction AI server running on port ${PORT}`);
});

  console.log(`Server running on ${PORT}`);