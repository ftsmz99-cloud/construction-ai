import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";



export default function ConversationView() {


  const { id } = useParams();

  const { clientId } = useAuth();


  const [conversation, setConversation] = useState(null);

  const [loading, setLoading] = useState(true);



  useEffect(()=>{

    setLoading(true);


    apiFetch(`/conversations?clientId=${clientId}`)

      .then(res=>res.json())

      .then(data=>{

        const found = data.find(

          item =>

          String(item.conversationId) === String(id)

        );

        setConversation(found || null);

        setLoading(false);


      })

      .catch(()=>{

        setLoading(false);

      });


  },[id]);



  if (loading) {

    return (

      <div className="p-8">

        Loading conversation...

      </div>

    );

  }



  if (!conversation) {

    return (

      <div className="p-8">

        Conversation not found

      </div>

    );

  }



  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
    : [];



  return (

    <div className="p-8">


      <h1 className="text-3xl font-bold mb-6">

        Customer Conversation

      </h1>




      <div className="space-y-4">


        {messages.map((message,index)=>(

          message.role === "customer" ? (

            <div key={index} className="bg-slate-100 rounded-xl p-4">

              <b>Customer</b>

              <p className="mt-2 whitespace-pre-wrap">

                {message.content}

              </p>

            </div>

          ) : (

            <div key={index} className="bg-blue-600 text-white rounded-xl p-4">

              <b>AI Receptionist</b>

              <p className="mt-2 whitespace-pre-wrap">

                {message.content}

              </p>

            </div>

          )

        ))}


      </div>

    </div>

  );

}
