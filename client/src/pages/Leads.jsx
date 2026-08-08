import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";


export default function Leads() {

  const { clientId } = useAuth();

  const [leads,setLeads] = useState([]);




  useEffect(()=>{


    loadLeads();


  },[]);




  async function loadLeads(){


    try {


      const res = await apiFetch(

        `/leads?clientId=${clientId}`

      );


      const data = await res.json();


      setLeads(data);



    } catch(error){


      console.error(

        "LEADS ERROR:",

        error

      );


    }


  }







  async function updateStatus(id,status){



    try {



      await apiFetch(

        `/leads/${id}/status?clientId=${clientId}`,

        {


          method:"PUT",


          headers:{


            "Content-Type":"application/json"

          },


          body:JSON.stringify({

            status

          })


        }

      );





      setLeads(current =>


        current.map(lead =>


          lead.id === id

          ?

          {

            ...lead,

            status

          }

          :

          lead


        )


      );





    } catch(error){


      console.error(

        "STATUS ERROR:",

        error

      );


    }



  }







  function statusColor(status){


    switch(status){


      case "NEW":

        return "bg-green-100 text-green-700";


      case "CONTACTED":

        return "bg-blue-100 text-blue-700";


      case "QUOTE SENT":

        return "bg-yellow-100 text-yellow-700";


      case "COMPLETED":

        return "bg-purple-100 text-purple-700";


      case "LOST":

        return "bg-red-100 text-red-700";


      default:

        return "bg-slate-100 text-slate-700";


    }


  }







  return (

    <div className="p-6">



      <div className="mb-8">


        <h1 className="text-3xl font-bold text-slate-800">

          Leads

        </h1>


        <p className="text-slate-500 mt-2">

          Manage customers captured by your AI receptionist.

        </p>


      </div>






      {leads.length === 0 ? (


        <div className="bg-white rounded-xl shadow p-8 text-center">


          No leads yet.


        </div>



      ) : (



        <div className="grid gap-5">



          {leads.map((lead)=>(



            <div

              key={lead.id}

              className="bg-white rounded-xl shadow border p-6"

            >





              <div className="flex justify-between gap-5">


                <div>


                  <h2 className="text-2xl font-bold">

                    {lead.name || "Unknown Customer"}

                  </h2>



                  <div className="mt-4 space-y-2 text-slate-600">


                    <p>📞 {lead.phone || "No phone"}</p>

                    <p>📍 {lead.location || "No location"}</p>

                    <p>🏗 {lead.project || "No project"}</p>

                    <p>⏱ {lead.timeline || "No timeline"}</p>


                  </div>


                </div>





                <select

                  value={lead.status || "NEW"}

                  onChange={(e)=>

                    updateStatus(

                      lead.id,

                      e.target.value

                    )

                  }

                  className={`h-fit px-4 py-2 rounded-full font-medium ${statusColor(lead.status || "NEW")}`}


                >


                  <option>NEW</option>

                  <option>CONTACTED</option>

                  <option>QUOTE SENT</option>

                  <option>COMPLETED</option>

                  <option>LOST</option>


                </select>



              </div>







              {lead.description && (


                <div className="mt-5 bg-slate-50 rounded-xl p-4">


                  <h3 className="font-semibold">

                    Description

                  </h3>


                  <p className="text-slate-600">

                    {lead.description}

                  </p>


                </div>


              )}








              <div className="mt-6 flex justify-between items-center">


                <p className="text-sm text-slate-400">

                  {lead.createdAt

                    ?

                    new Date(

                      lead.createdAt

                    ).toLocaleDateString()

                    :

                    "Unknown"

                  }

                </p>




                <Link

                  to={`/conversation/${lead.conversationId}`}

                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"

                >

                  View Conversation

                </Link>



              </div>



            </div>



          ))}



        </div>



      )}



    </div>

  );

}