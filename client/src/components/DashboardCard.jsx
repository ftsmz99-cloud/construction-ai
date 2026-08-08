export default function DashboardCard({title, value}) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-gray-500">
        {title}
      </p>

      <h3 className="text-3xl font-bold mt-2">
        {value}
      </h3>
    </div>
  );
}