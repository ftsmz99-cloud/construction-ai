import { useAuth } from "../context/AuthContext";

export default function TopBar() {
  const { clientId, logout } = useAuth();

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-8">
      <h2 className="text-xl font-semibold">
        Dashboard
      </h2>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-500">
          AI Online
        </div>

        {clientId && (
          <span className="text-sm text-gray-500 font-medium">
            {clientId}
          </span>
        )}

        <button
          onClick={logout}
          className="text-sm text-red-600 font-medium hover:underline"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
