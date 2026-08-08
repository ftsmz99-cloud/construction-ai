import { useEffect, useState } from "react";

import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import API_BASE from "../services/api";

export default function Conversations() {

  const clientId = "thunderbolt";


  const [conversationId, setConversationId] = useState("");


  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");





  useEffect(() => {

    fetch(`${API_BASE}/business`)

      .then(res => res.json())

      .then(data => {

        setMessages([
          {
            sender: "ai",
            text:
              data.greeting ||
              `Hello! Welcome to ${data.name}. How can I help you today?`
          }
        ]);

      })

      .catch(() => {

        setMessages([
          {
            sender: "ai",
            text: "Hello! How can I help you today?"
          }
        ]);

      });


  }, []);







  async function sendMessage() {


    if (!input.trim()) return;



    const customerMessage = {

      sender: "customer",

      text: input

    };



    const newMessages = [

      ...messages,

      customerMessage

    ];



    setMessages(newMessages);


    const userText = input;


    setInput("");




    try {


      const response = await fetch(

        `${API_BASE}/chat`,

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json"

          },


          body: JSON.stringify({

            message: userText,


            history: newMessages,


            conversationId,


            clientId

          })


        }

      );





      const data = await response.json();


      if (data.conversationId) {
        setConversationId(data.conversationId);
      }



      setMessages(prev => [

        ...prev,


        {

          sender: "ai",

          text: data.reply

        }

      ]);





    } catch(error) {


      console.error(

        "CHAT FRONTEND ERROR:",

        error

      );



      setMessages(prev => [

        ...prev,


        {

          sender:"ai",

          text:"Sorry, I couldn't connect right now."

        }

      ]);


    }


  }







  return (

    <div className="p-8">


      <h1 className="text-3xl font-bold text-slate-800 mb-8">

        Conversations

      </h1>




      <div className="bg-white rounded-xl shadow p-6">


        <ChatWindow

          messages={messages}

        />



        <ChatInput

          value={input}

          onChange={setInput}

          onSend={sendMessage}

        />



      </div>


    </div>

  );


}