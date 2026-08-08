import fs from "fs";
import path from "path";
import crypto from "crypto";



function conversationFolder(clientId){


    return path.join(

        process.cwd(),

        "data",

        "clients",

        clientId,

        "conversations"

    );


}





function ensureDirectory(folder){


    if(!fs.existsSync(folder)){


        fs.mkdirSync(

            folder,

            {
                recursive:true
            }

        );


    }


}





function safeClient(clientId){


    return String(clientId || "thunderbolt")

    .replace(/[^a-zA-Z0-9-_]/g,"")

    .toLowerCase();


}





function createConversationId(){


    return crypto.randomUUID();


}




function isValidUuid(value){


    return typeof value === "string" &&

    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);


}





export default function saveConversation(data){


try{


    const clientId =
    safeClient(data.clientId);



    const folder =
    conversationFolder(clientId);



    ensureDirectory(folder);





    const conversationId =

    isValidUuid(data.conversationId)
    ? data.conversationId
    : createConversationId();





    const filePath =

    path.join(

        folder,

        `${conversationId}.json`

    );







    let conversation = {


        id:

        conversationId,


        clientId,


        createdAt:

        new Date().toISOString(),


        updatedAt:

        new Date().toISOString(),


        status:"ACTIVE",


        messages:[],


        lead:null,


        metadata:{


            source:"AI_WIDGET"


        }


    };








    if(fs.existsSync(filePath)){


        try{


            conversation =

            JSON.parse(

                fs.readFileSync(

                    filePath,

                    "utf8"

                )

            );


        }

        catch{


            console.warn(

            "Conversation corrupted. Creating backup."

            );


            fs.renameSync(

                filePath,

                filePath+".backup"

            );


        }


    }








    const timestamp =

    new Date().toISOString();







    if(data.customerMessage){


        conversation.messages.push({


            id:

            crypto.randomUUID(),


            role:"customer",


            content:

            data.customerMessage,


            timestamp


        });


    }







    if(data.aiReply){


        conversation.messages.push({


            id:

            crypto.randomUUID(),


            role:"assistant",


            content:

            data.aiReply,


            timestamp


        });


    }







    if(data.lead){


        conversation.lead = {


            ...

            conversation.lead,

            ...data.lead


        };


    }







    conversation.messageCount =

    conversation.messages.length;




    conversation.updatedAt =

    timestamp;







    fs.writeFileSync(


        filePath,


        JSON.stringify(

            conversation,

            null,

            2

        ),


        "utf8"


    );







    return conversation;



}

catch(error){


    console.error(

        "CONVERSATION STORAGE FAILED:",

        error

    );


    return null;


}


}