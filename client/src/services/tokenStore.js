// Minimal in-browser token storage for the admin session.
// Uses sessionStorage (per-tab, cleared when the tab closes).
const TOKEN_KEY = "ai_admin_token";
const CLIENT_KEY = "ai_admin_client";

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function getClientId() {
  try {
    return sessionStorage.getItem(CLIENT_KEY) || "";
  } catch {
    return "";
  }
}

export function setClientId(clientId) {
  try {
    if (clientId) {
      sessionStorage.setItem(CLIENT_KEY, clientId);
    } else {
      sessionStorage.removeItem(CLIENT_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function clearAuth() {
  setToken("");
  setClientId("");
}
