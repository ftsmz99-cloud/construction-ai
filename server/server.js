import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import chatRoute from "./routes/chat.js";
import authRoute from "./routes/auth.js";
import loadBusiness, { invalidateBusiness } from "./utils/loadBusiness.js";
import { requireAdmin, requireTenant, sanitizeClientId } from "./utils/auth.js";

dotenv.config();

const app = express();

// Allow only the admin dashboard origin. The customer widget is same-origin
// (served by this server), so it needs no CORS. Admin requests carry an
// Authorization header, which must be allowed.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());

// Auth: login/logout
app.use("/auth", authRoute);

const DATA_FOLDER = path.join(process.cwd(), "data");

// ===================================
// STATIC WIDGET ASSETS
// ===================================
// Serve the customer-facing widget bundle so the embed script and its
// CSS/JS can be loaded by any site. Kept separate from API routes.
const WIDGET_FOLDER = path.join(process.cwd(), "..", "widget");

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

app.use("/chat", chatRoute);

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

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);

});