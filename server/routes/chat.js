import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import crypto from "crypto";

import extractLead from "../services/leadExtractor.js";
import saveLead from "../utils/saveLead.js";
import saveConversation from "../utils/saveConversation.js";
import loadBusiness from "../utils/loadBusiness.js";


dotenv.config();


const router = express.Router();



const MODEL =
process.env.GROQ_MODEL ||
"openai/gpt-oss-120b";



const client =
process.env.GROQ_API_KEY
?
new OpenAI({

    apiKey: process.env.GROQ_API_KEY,

    baseURL:
    "https://api.groq.com/openai/v1",

    timeout:20000

})
:
null;





function buildHistory(history=[]){

    return history

    .slice(-12)

    .map(msg=>({

        role:
        msg.sender === "ai"
        ?
        "assistant"
        :
        "user",

        content:
        String(msg.text || "")

    }));

}






function buildSystemPrompt(business){

return `

You are the professional receptionist for ${business.businessName || business.name}.


BUSINESS INFORMATION:

Services:

${business.services.join(", ")}


Location:

${business.location}


Hours:

${JSON.stringify(business.hours)}



IMPORTANT RULES:

- Use the conversation history above as your complete memory. It contains everything the
  customer has already told you.
- Always remember everything the customer has already said: their name, phone, location,
  service, timeline, and description. Never ask for information that is already present.
- Before asking the next question, naturally acknowledge what the customer just told you
  (for example: "Thanks, Mike. Could you also tell me your phone number?").
- Ask only ONE question at a time.
- Vary your wording so you never sound repetitive and never repeat a question you already asked.
- Never say "We only provide ..." and never present the service list as a restriction.
- Never give final prices. Never invent information.
- Use only the services listed above when describing what the business can do, and never
  guarantee a service that is not listed.


HANDLING OTHER SERVICE REQUESTS:

- If the customer asks for a service not listed above, or something outside the business's
  area or scope:
    - Politely acknowledge the request (for example: "That sounds interesting.").
    - Explain that the team will confirm availability and will get back to them.
    - Continue collecting the customer's information so the team can follow up.
    - Do not stop the conversation, do not refuse to help, and do not argue.


COLLECT:

1. Customer name
2. Phone number
3. Location
4. Service or project needed
5. Timeline
6. Description

Collect as much as you can, but never pressure the customer and never repeat requests.


GENERAL BEHAVIOUR:

- Sound like a warm, professional human receptionist. Keep sentences short and easy to read.
- Keep replies under about 80 words unless a longer reply is truly necessary.


WHEN ENOUGH INFORMATION IS COLLECTED:

- Summarise the request back to the customer in a short, natural way.
- Thank them.
- Tell them the team will contact them shortly.

`;

}








router.post("/", async(req,res)=>{


try{


const {

message,

history=[],

conversationId,

clientId="thunderbolt"

}=req.body;





if(!message?.trim()){


return res.status(400).json({

error:"Message required"

});


}






const business =
loadBusiness(clientId);





const id =
conversationId ||
crypto.randomUUID();







let reply;





try{


if(!client){
    throw new Error("AI not configured");
}


const response =

await client.chat.completions.create({


model:MODEL,


messages:[


{

role:"system",

content:
buildSystemPrompt(business)

},


...buildHistory(history),


{

role:"user",

content:message

}


]


});




reply =

response
?.choices?.[0]
?.message
?.content
?.trim();



}

catch(error){


console.error(

"AI PROVIDER ERROR:",

error.message

);



reply =

`Thank you for contacting ${business.businessName || business.name}. How can we help you today?`;



}







let lead = null;





try{


lead =

await extractLead(

JSON.stringify([

...history,

{

sender:"customer",

text:message

},

{

sender:"ai",

text:reply

}

])

);



}

catch(error){


console.error(

"LEAD EXTRACTION ERROR:",

error.message

);


}







try{


saveConversation({

conversationId:id,

clientId,

customerMessage:message,

aiReply:reply,

lead

});


}

catch(error){


console.error(

"SAVE CONVERSATION ERROR:",

error.message

);


}









if(lead){


try{


saveLead({

...lead,

clientId,

conversationId:id

}, clientId);


}

catch(error){


console.error(

"SAVE LEAD ERROR:",

error.message

);


}


}







res.json({

success:true,

reply,

conversationId:id

});





}

catch(error){


console.error(

"CHAT ROUTE FAILED:",

error

);



res.status(500).json({

success:false,

reply:
"Sorry, we are temporarily unavailable."

});


}


});







export default router;