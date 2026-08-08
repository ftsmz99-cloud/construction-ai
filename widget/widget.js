import { createWidgetUI } from "./ui.js";
import { sendMessage, getBusiness } from "./api.js";
import { saveMessages, loadMessages, saveConversationId, loadConversationId } from "./storage.js";


const params = new URLSearchParams(
    window.location.search
);


const CLIENT_ID =
    (window.AIWidgetConfig &&
     window.AIWidgetConfig.clientId) ||
    "thunderbolt";



const ui = createWidgetUI();



let business = {

    name:"AI Receptionist",

    greeting:
    "Hello! How can we help you today?"

};



let messages =
    loadMessages(CLIENT_ID);



let conversationId =
    loadConversationId();





function save(){

    saveMessages(
        CLIENT_ID,
        messages
    );

}





function addMessage(
    sender,
    text
){


    const div =
    document.createElement("div");


    div.className =
    `message ${sender}`;


    const strong =
    document.createElement("strong");

    strong.textContent =
    sender==="ai"
        ? business.name
        : "You";

    div.appendChild(strong);


    const paragraph =
    document.createElement("p");

    paragraph.textContent = text;

    div.appendChild(paragraph);



    ui.messages.appendChild(div);



    ui.messages.scrollTop =
    ui.messages.scrollHeight;


}





function render(){


    ui.messages.innerHTML="";


    messages.forEach(m=>{

        addMessage(
            m.sender,
            m.text
        );

    });


}






async function boot(){


try{


business =
await getBusiness(
    CLIENT_ID
);



if(messages.length===0){


messages.push({

sender:"ai",

text:
business.greeting ||
`Welcome to ${business.name}. How can we help you?`

});


save();


}



}

catch(error){


console.log(
"Business loading failed",
error
);


}



render();


}







async function handleSend(){


const text =
ui.input.value.trim();



if(!text)return;



ui.input.value="";



messages.push({

sender:"customer",

text

});



addMessage(
"customer",
text
);



save();




try{


const response =
await sendMessage(

text,

messages,

CLIENT_ID,

conversationId

);



if(response.conversationId){

conversationId =
response.conversationId;

saveConversationId(
conversationId
);

}




messages.push({

sender:"ai",

text:
response.reply ||
"Thank you. Someone will contact you shortly."

});



addMessage(

"ai",

response.reply

);



save();



}

catch(error){


console.log(error);


addMessage(

"ai",

"Connection error. Please try again."

);



}



}






ui.button.onclick=()=>{

ui.chat.style.display="flex";

};



ui.close.onclick=()=>{

ui.chat.style.display="none";

};




ui.send.onclick =
handleSend;




ui.input.addEventListener(

"keydown",

(e)=>{


if(e.key==="Enter"){

handleSend();

}


}

);




boot();