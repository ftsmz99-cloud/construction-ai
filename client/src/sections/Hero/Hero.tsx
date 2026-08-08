function Hero() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">

        <div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
            Capture More Construction Projects With AI
          </h1>


          <p className="mt-6 text-lg text-slate-600 max-w-xl">
            A project assistant that helps construction companies answer customer questions,
            understand enquiries, and capture new opportunities 24/7.
          </p>


          <div className="mt-8 flex gap-4">

            <button className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600">
              Start a Project
            </button>


            <button className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              See How It Works
            </button>

          </div>

        </div>


        <div className="rounded-2xl bg-slate-100 p-8">

          <div className="rounded-xl bg-white shadow-lg p-6">

            <p className="text-sm text-slate-500">
              AI Project Assistant
            </p>

            <p className="mt-4 text-slate-800">
              "Hi, I'd like to get a quote for a home renovation."
            </p>

            <div className="mt-4 rounded-lg bg-slate-100 p-4 text-sm">
              Great, we'd be happy to help. 
              Could you tell us a little about your project?
            </div>

          </div>

        </div>


      </div>
    </section>
  );
}

export default Hero;