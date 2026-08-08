import express from "express";

import { verifyPassword, hasAdmin } from "../utils/admins.js";
import { createSession, sanitizeClientId } from "../utils/auth.js";

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

export default router;
