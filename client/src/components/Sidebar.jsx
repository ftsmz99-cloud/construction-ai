import { NavLink } from "react-router-dom";

export default function Sidebar() {

  const links = [
    {
      name: "Dashboard",
      path: "/"
    },
    {
      name: "Conversations",
      path: "/conversations"
    },
    {
      name: "Leads",
      path: "/leads"
    },
    {
      name: "Settings",
      path: "/settings"
    }
  ];


  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white p-6">

      <div className="mb-10">

        <h1 className="text-2xl font-bold">
          AI Receptionist
        </h1>

        <p className="text-sm text-slate-400 mt-2">
          Business Assistant
        </p>

      </div>


      <nav className="space-y-2">

        {links.map((link) => (

          <NavLink
            key={link.path}
            to={link.path}
            className={({isActive}) =>
              `
              block px-4 py-3 rounded-lg transition
              ${
                isActive
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-800 text-slate-300"
              }
              `
            }
          >

            {link.name}

          </NavLink>

        ))}

      </nav>


    </aside>
  );
}