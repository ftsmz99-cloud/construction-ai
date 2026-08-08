import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!clientId.trim() || !password) {
      setError("Business ID and password are required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await login(clientId.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow p-8 w-full max-w-sm space-y-5"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            AI Receptionist
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sign in to your business dashboard
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <div>
          <label className="font-semibold text-sm">
            Business ID
          </label>
          <input
            className="w-full border rounded-lg p-3 mt-2"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g. thunderbolt"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="font-semibold text-sm">
            Password
          </label>
          <input
            type="password"
            className="w-full border rounded-lg p-3 mt-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
