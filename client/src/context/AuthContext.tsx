import { createContext, useContext, useState, type ReactNode } from "react";
import { apiFetch } from "../services/api";
import {
  getToken,
  setToken,
  getClientId,
  setClientId,
  clearAuth
} from "../services/tokenStore";

type AuthContextType = {
  token: string;
  clientId: string;
  isAuthenticated: boolean;
  login: (clientId: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string>(() => getToken());
  const [clientId, setClientIdState] = useState<string>(() => getClientId());

  async function login(id: string, password: string) {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: id, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.token) {
      throw new Error(data.error || "Login failed");
    }

    setToken(data.token);
    setClientId(data.clientId);
    setTokenState(data.token);
    setClientIdState(data.clientId);
  }

  function logout() {
    clearAuth();
    setTokenState("");
    setClientIdState("");
    // Best-effort server logout (stateless token).
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
  }

  return (
    <AuthContext.Provider
      value={{ token, clientId, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
