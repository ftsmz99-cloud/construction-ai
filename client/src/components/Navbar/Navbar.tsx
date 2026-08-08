function Navbar() {
  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">

        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Construction AI
          </h1>

          <p className="text-xs text-slate-500">
            Project Assistant Platform
          </p>
        </div>


        <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">

          <a href="#" className="hover:text-slate-900">
            Services
          </a>

          <a href="#" className="hover:text-slate-900">
            Projects
          </a>

          <a href="#" className="hover:text-slate-900">
            About
          </a>

          <a href="#" className="hover:text-slate-900">
            Contact
          </a>

        </div>


        <button className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">
          Start a Project
        </button>

      </div>
    </nav>
  );
}

export default Navbar;