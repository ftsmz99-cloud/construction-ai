import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function Signup() {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!businessName.trim() || !clientId.trim() || !password) {
      setError("Business name, Business ID and password are required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          clientId: clientId.trim(),
          password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Signup failed. Please try again.");
      }

      // Account created. Route back to the existing sign-in flow.
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
            Create your business account
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <div>
          <label className="font-semibold text-sm">
            Business Name
          </label>
          <input
            className="w-full border rounded-lg p-3 mt-2"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Rowens Mechanics"
            autoComplete="organization"
            required
          />
        </div>

        <div>
          <label className="font-semibold text-sm">
            Business ID
          </label>
          <input
            className="w-full border rounded-lg p-3 mt-2"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g. acme-builders"
            autoComplete="username"
            required
          />
          <p className="text-slate-500 text-xs mt-1">
            A short address used to load your AI receptionist on your website.
            Use letters, numbers, dashes and underscores only (no spaces).
            Your embed code will use it automatically.
          </p>
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-slate-500 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}