import express from "express";

import { verifyPassword, hasAdmin } from "../utils/admins.js";
import { createSession, sanitizeClientId } from "../utils/auth.js";
import { provisionTenant } from "../utils/provisionTenant.js";

const router = express.Router();

// ================================
// LOGIN
// ================================
router.post("/login", (req, res) => {
  try {
    const body = req.body || {};
    const clientId = sanitizeClientId(body.clientId);
    const password = String(body.password || "");

    if (!clientId || !password) {
      return res
        .status(400)
        .json({ error: "clientId and password are required" });
    }

    if (!hasAdmin(clientId) || !verifyPassword(clientId, password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createSession(clientId);

    return res.json({ success: true, token, clientId });
  } catch (error) {
    console.error("LOGIN ERROR:", error.message);
    return res.status(500).json({ error: "Login failed" });
  }
});

// ================================
// LOGOUT
// ================================
// Tokens are stateless; the client simply discards its token.
router.post("/logout", (req, res) => {
  res.json({ success: true });
});

// ================================
// SIGNUP (self-service onboarding)
// ================================
// Creates a brand-new tenant (business profile + admin credential) so the
// owner can then log in through the existing /login flow. Deliberately does
// NOT create a session here: signup -> login keeps a single authentication
// system.
router.post("/signup", (req, res) => {
  try {
    const body = req.body || {};
    const businessName = String(body.businessName || "").trim();
    const clientId = String(body.clientId || "").trim();
    const password = String(body.password || "");

    if (!businessName) {
      return res.status(400).json({ error: "Business name is required" });
    }
    if (!clientId) {
      return res.status(400).json({ error: "Business ID is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const result = provisionTenant({ businessName, clientId, password });

    return res.status(201).json({
      success: true,
      clientId: result.clientId,
      message: "Your account is ready. Please sign in with your Business ID and password."
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error("SIGNUP ERROR:", error.message);
    }
    return res.status(statusCode).json({ error: error.message });
  }
});

export default router;
