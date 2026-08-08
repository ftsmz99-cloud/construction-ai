import crypto from "crypto";

// ================================
// AUTHENTICATION (HMAC-signed session token)
// ================================
// Simple, dependency-free auth for v1 production readiness.
// A session token is a self-contained <payload>.<signature> value that
// embeds the authenticated clientId (tenant) and an expiry. It is signed
// with AUTH_SECRET and verified with timing-safe comparison.
//
// Future SaaS scaling: swap this token for real JWTs / an identity provider
// without touching the route guards below.

const SECRET = process.env.AUTH_SECRET || "";
const TTL_MS =
  (parseInt(process.env.ADMIN_TOKEN_TTL, 10) || 12) * 60 * 60 * 1000;

export function sanitizeClientId(clientId) {
  return (
    String(clientId || "")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .toLowerCase() || "thunderbolt"
  );
}

function sign(data) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSession(clientId) {
  if (!SECRET) {
    throw new Error("AUTH_SECRET not configured");
  }
  const payload = {
    clientId: sanitizeClientId(clientId),
    exp: Date.now() + TTL_MS
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(data);
  return `${data}.${signature}`;
}

export function verifySession(token) {
  if (!token || !SECRET) return null;

  const parts = String(token).split(".");
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expected = sign(data);

  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );
    if (
      !payload.clientId ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// ================================
// MIDDLEWARE
// ================================

// Requires a valid Bearer token in the Authorization header.
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = verifySession(token);

  if (!session) {
    return res.status(401).json({ error: "Authentication required" });
  }

  req.session = session;
  next();
}

// Requires the request's clientId to match the authenticated tenant.
// Must be used AFTER requireAdmin.
export function requireTenant(req, res, next) {
  const targetClientId = sanitizeClientId(req.query.clientId);

  if (!req.session || !req.session.clientId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.session.clientId !== targetClientId) {
    return res
      .status(403)
      .json({ error: "Forbidden: tenant mismatch" });
  }

  next();
}
