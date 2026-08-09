import WidgetConfig from "./config.js";



export async function sendMessage(

message,

history,

clientId,

conversationId

){



const response =
await fetch(

`${WidgetConfig.serverUrl}/chat`,

{


method:"POST",


headers:{


"Content-Type":"application/json"


},



body:JSON.stringify({

message,

history,

clientId,

conversationId


})


}

);



if(!response.ok){

throw new Error(
"Chat failed"
);

}



return response.json();



}







export async function getBusiness(

clientId

){



const response =
await fetch(

`${WidgetConfig.serverUrl}/business?clientId=${clientId}`

);



if(!response.ok){

throw new Error(
"Business load failed"
);

}



return response.json();


}