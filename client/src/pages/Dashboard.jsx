import { useEffect, useState } from "react";
import DashboardCard from "../components/DashboardCard";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";


export default function Dashboard() {

  const { clientId } = useAuth();

  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0
  });


  useEffect(() => {

    apiFetch(`/stats?clientId=${clientId}`)

      .then(res => res.json())

      .then(data => {

        setStats(data);

      })

      .catch(err => {

        console.error(
          "STATS ERROR:",
          err
        );

      });

  }, []);



  return (

    <div className="p-8">


      <div className="mb-8">

        <h1 className="text-3xl font-bold">
          Business Dashboard
        </h1>


        <p className="text-gray-500 mt-2">
          Your AI receptionist is handling customers 24/7
        </p>

      </div>



      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


        <DashboardCard
          title="Total Leads"
          value={stats.totalLeads}
        />


        <DashboardCard
          title="New Leads"
          value={stats.newLeads}
        />


        <DashboardCard
          title="AI Conversations"
          value={stats.totalLeads}
        />


      </div>




      <div className="mt-8 bg-white rounded-xl shadow p-6">


        <h2 className="text-xl font-semibold mb-4">
          AI Receptionist Status
        </h2>


        <div className="flex items-center gap-3">


          <div className="w-3 h-3 bg-green-500 rounded-full"></div>


          <p>
            Online and responding to customers
          </p>


        </div>


      </div>


    </div>

  );

}