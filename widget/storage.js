export function saveMessages(messages){

    localStorage.setItem(

        "construction_ai_chat",

        JSON.stringify(messages)

    );

}



export function loadMessages(){

    const saved = localStorage.getItem(
        "construction_ai_chat"
    );


    return saved
        ? JSON.parse(saved)
        : [];

}



const CONVERSATION_KEY =
    "construction_ai_conversation_id";



export function saveConversationId(id){



    if(!id) return;



    localStorage.setItem(



        CONVERSATION_KEY,



        id



    );



}



export function loadConversationId(){



    return localStorage.getItem(



        CONVERSATION_KEY



    ) || "";



}