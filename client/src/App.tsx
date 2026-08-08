import { BrowserRouter, Routes, Route } from "react-router-dom";

import { LeadProvider } from "./context/LeadContext";
import { AuthProvider } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import RequireAuth from "./components/RequireAuth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import Leads from "./pages/Leads";
import Settings from "./pages/Settings";
import ConversationView from "./pages/ConversationView";


function AdminLayout() {

  return (

    <div className="flex bg-slate-100 min-h-screen">

      <Sidebar />

      <main className="flex-1">

        <TopBar />

        <Routes>

          <Route path="/" element={<Dashboard />} />

          <Route path="/conversations" element={<Conversations />} />

          <Route path="/conversation/:id" element={<ConversationView />} />

          <Route path="/leads" element={<Leads />} />

          <Route path="/settings" element={<Settings />} />

        </Routes>

      </main>

    </div>

  );

}


function App() {

  return (

    <LeadProvider>

      <AuthProvider>

        <BrowserRouter>

          <Routes>

            <Route path="/login" element={<Login />} />

            <Route
              path="/*"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            />

          </Routes>

        </BrowserRouter>

      </AuthProvider>

    </LeadProvider>

  );

}


export default App;
