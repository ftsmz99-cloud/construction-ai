function Trust() {
  const items = [
    {
      title: "24/7 Availability",
      description: "Capture customer enquiries even when your team is busy.",
    },
    {
      title: "Qualified Leads",
      description: "Collect project details before your team follows up.",
    },
    {
      title: "Built For Construction",
      description: "Designed around real construction project enquiries.",
    },
    {
      title: "Faster Response",
      description: "Give potential clients an immediate professional experience.",
    },
  ];

  return (
    <section className="bg-slate-900 py-16">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-4 gap-8">

          {items.map((item) => (
            <div key={item.title}>

              <h3 className="text-lg font-semibold text-white">
                {item.title}
              </h3>

              <p className="mt-2 text-sm text-slate-300">
                {item.description}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}

export default Trust;