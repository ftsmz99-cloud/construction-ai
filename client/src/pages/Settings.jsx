import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import API_BASE from "../services/api";
import { useAuth } from "../context/AuthContext";


export default function Settings(){

  const { clientId } = useAuth();

  const [business,setBusiness] = useState({

    name:"",
    industry:"",
    greeting:"",
    services:[],
    location:"",
    hours:"",
    phone:"",
    email:"",
    website:"",
    description:""

  });


  const [serviceInput,setServiceInput] = useState("");

  const [saved,setSaved] = useState(false);

  const [copied,setCopied] = useState(false);





  useEffect(()=>{


    apiFetch(`/business/admin?clientId=${clientId}`)

      .then(res=>res.json())

      .then(data=>{


        setBusiness(data);


      });


  },[]);







  function addService(){


    if(!serviceInput.trim()) return;


    setBusiness({

      ...business,

      services:[

        ...business.services,

        serviceInput

      ]

    });


    setServiceInput("");

  }








  function removeService(index){


    setBusiness({


      ...business,


      services:business.services.filter(

        (_,i)=>i!==index

      )


    });


  }









  const embedSnippet =
    `<script src="${API_BASE}/widget/embed.js" data-client="${clientId}"></script>`;

  function copyEmbed(){
    navigator.clipboard.writeText(embedSnippet)
      .then(()=>{

        setCopied(true);

        setTimeout(()=>setCopied(false),2000);

      })
      .catch(()=>{

        alert(
          "Could not copy automatically. Please select and copy the code manually."
        );

      });
  }

  async function saveBusiness(){


    const res = await apiFetch(

      `/business?clientId=${clientId}`,

      {


        method:"PUT",


        headers:{


          "Content-Type":"application/json"

        },


        body:JSON.stringify(business)


      }

    );


    if (!res.ok) {
      console.error(
        "SAVE BUSINESS ERROR:",
        await res.text().catch(() => "")
      );
      alert(
        "Could not save business profile. Please try again."
      );
      return;
    }


    setSaved(true);


    setTimeout(()=>{


      setSaved(false);


    },2000);


  }









  return (


    <div className="p-8">


      <h1 className="text-3xl font-bold text-slate-800 mb-2">

        Business Settings

      </h1>


      <p className="text-slate-500 mb-8">

        Configure your AI receptionist.

      </p>






      <div className="bg-white rounded-xl shadow p-6 space-y-5">






        <div>


          <label className="font-semibold">

            Business Name

          </label>


          <input

            className="w-full border rounded-lg p-3 mt-2"

            value={business.name}

            onChange={(e)=>

              setBusiness({

                ...business,

                name:e.target.value

              })

            }

          />


        </div>







        <div>


          <label className="font-semibold">

            Greeting Message

          </label>


          <textarea

            className="w-full border rounded-lg p-3 mt-2"

            value={business.greeting}

            onChange={(e)=>

              setBusiness({

                ...business,

                greeting:e.target.value

              })

            }

          />


        </div>







        <div>


          <label className="font-semibold">

            Location

          </label>


          <input

            className="w-full border rounded-lg p-3 mt-2"

            value={business.location}

            onChange={(e)=>

              setBusiness({

                ...business,

                location:e.target.value

              })

            }

          />


        </div>







        <div>


          <label className="font-semibold">

            Opening Hours

          </label>


          <input

            className="w-full border rounded-lg p-3 mt-2"

            value={business.hours}

            onChange={(e)=>

              setBusiness({

                ...business,

                hours:e.target.value

              })

            }

          />


        </div>








        <div>

          <label className="font-semibold">

            Industry

          </label>

          <input
            className="w-full border rounded-lg p-3 mt-2"
            value={business.industry}
            onChange={(e)=>
              setBusiness({
                ...business,
                industry:e.target.value
              })
            }
          />

        </div>



        <div>

          <label className="font-semibold">

            Phone

          </label>

          <input
            className="w-full border rounded-lg p-3 mt-2"
            value={business.phone}
            onChange={(e)=>
              setBusiness({
                ...business,
                phone:e.target.value
              })
            }
          />

        </div>



        <div>

          <label className="font-semibold">

            Email

          </label>

          <input
            className="w-full border rounded-lg p-3 mt-2"
            value={business.email}
            onChange={(e)=>
              setBusiness({
                ...business,
                email:e.target.value
              })
            }
          />

        </div>



        <div>

          <label className="font-semibold">

            Website

          </label>

          <input
            className="w-full border rounded-lg p-3 mt-2"
            value={business.website}
            onChange={(e)=>
              setBusiness({
                ...business,
                website:e.target.value
              })
            }
          />

        </div>



        <div>

          <label className="font-semibold">

            Description

          </label>

          <textarea
            className="w-full border rounded-lg p-3 mt-2"
            value={business.description}
            onChange={(e)=>
              setBusiness({
                ...business,
                description:e.target.value
              })
            }
          />

        </div>




        <div>


          <label className="font-semibold">

            Services

          </label>



          <div className="flex gap-2 mt-2">


            <input

              className="flex-1 border rounded-lg p-3"

              value={serviceInput}

              onChange={(e)=>

                setServiceInput(e.target.value)

              }

              placeholder="Add service"

            />



            <button

              onClick={addService}

              className="bg-blue-600 text-white px-5 rounded-lg"

            >

              Add

            </button>


          </div>





          <div className="mt-3 space-y-2">


            {business.services.map((service,index)=>(


              <div

                key={index}

                className="flex justify-between bg-slate-100 p-3 rounded-lg"

              >

                <span>

                  {service}

                </span>


                <button

                  onClick={()=>removeService(index)}

                  className="text-red-500"

                >

                  Remove

                </button>


              </div>


            ))}


          </div>


        </div>







        <button

          onClick={saveBusiness}

          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"

        >

          Save Business Profile

        </button>





        {saved && (

          <p className="text-green-600 font-medium">

            Saved successfully!

          </p>

        )}




      </div>
      <div className="bg-white rounded-xl shadow p-6 mt-8 space-y-4">

        <div>

          <h2 className="text-xl font-semibold">

            Install on your website

          </h2>

          <p className="text-slate-500 mt-1">

            Paste this snippet into your website just before the closing{" "}

            <code className="text-slate-700">&lt;/body&gt;</code> tag to add

            your AI receptionist. It loads the business information saved on

            this page automatically.

          </p>

        </div>

        <pre className="bg-slate-900 text-green-300 text-sm p-4 rounded-xl overflow-x-auto">

          {embedSnippet}

        </pre>

        <button

          onClick={copyEmbed}

          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"

        >

          {copied ? "Copied!" : "Copy embed code"}

        </button>

        {copied && (

          <p className="text-green-600 font-medium">

            Embed code copied. Paste it into your website to go live.

          </p>

        )}

      </div>



    </div>


  );


}