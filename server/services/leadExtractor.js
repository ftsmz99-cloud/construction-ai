import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();


const client =
process.env.GROQ_API_KEY
?
new OpenAI({

    apiKey: process.env.GROQ_API_KEY,

    baseURL:
    "https://api.groq.com/openai/v1",

    timeout:15000

})
:
null;



const MODEL =
process.env.GROQ_MODEL ||
"openai/gpt-oss-120b";





function cleanJSON(text){

    if(!text) return "{}";


    return text

    .replace(/```json/g,"")

    .replace(/```/g,"")

    .trim();

}







function validateLead(data){


return {


name:data.name || "",


phone:data.phone || "",


location:data.location || "",


project:data.project || "",


timeline:data.timeline || "",


description:data.description || ""


};


}







export default async function extractLead(conversation){


try{

if(!client){
    return null;
}


const response = await client.chat.completions.create({


model:MODEL,


response_format:{

type:"json_object"

},



messages:[


{


role:"system",


content:`

You extract customer leads from conversations.

Read the ENTIRE conversation.

Return ONLY JSON.

Extract information even if the customer gave it naturally.

Example:

Customer:
"My name is John and my number is 0812345678"

Return:

{
"name":"John",
"phone":"0812345678"
}


Schema:

{
"name":"",
"phone":"",
"location":"",
"project":"",
"timeline":"",
"description":""
}


Rules:

- Never invent information.
- Keep empty fields empty.
- Use customer words.
- Look through the whole conversation.
`

},



{

role:"user",

content:String(conversation)

}



]


});






const raw =

response

?.choices?.[0]

?.message?.content;





const parsed =

JSON.parse(

cleanJSON(raw)

);





return validateLead(parsed);




}

catch(error){


console.error(

"LEAD EXTRACTION FAILED:",

error.message

);


return null;


}



}