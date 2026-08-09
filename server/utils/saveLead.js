import fs from "fs";
import path from "path";
import crypto from "crypto";



function getPaths(clientId){


    const folder =
        path.join(

            process.cwd(),

            "data",

            "clients",

            clientId

        );


    return {

        folder,

        file:

        path.join(

            folder,

            "leads.json"

        )

    };

}





function normalizePhone(phone){


    if(!phone) return "";


    return String(phone)

        .replace(/\D/g,"");


}





function createId(){


    return crypto.randomUUID();


}





export default function saveLead(

    lead,

    clientId="thunderbolt"

){


try{


    const {

        folder,

        file

    } = getPaths(clientId);





    if(!fs.existsSync(folder)){


        fs.mkdirSync(

            folder,

            {
                recursive:true
            }

        );


    }






    let leads=[];




    if(fs.existsSync(file)){


        try{


            const data =
            fs.readFileSync(

                file,

                "utf8"

            );


            leads =
            data
            ?
            JSON.parse(data)
            :
            [];


        }

        catch{


            leads=[];

        }


    }







    const phone =
    normalizePhone(

        lead.phone

    );

    const leadName =
    String(lead.name || "")
    .trim();

    // Junk-lead guard: a record without a name or phone cannot be followed
    // up, so it is not a lead at all. Extraction runs on every chat message
    // and can return a fully blank (or only-project) object early in a
    // conversation; skip those without writing a record.
    if(!leadName && !phone){
        return false;
    }

    const conversationId =
    lead.conversationId || null;






    // One conversation must never produce more than one lead, even when
    // extraction returns slightly different fields across messages. Prefer
    // matching on conversation id first; fall back to phone/name matches.
    const matchingConversation =

    conversationId ?

    leads.findIndex(item=>

        item.conversationId &&

        String(item.conversationId)===String(conversationId)

    ) :

    -1;

    const existingIndex =

    matchingConversation !== -1 ?

    matchingConversation :

    leads.findIndex(item=>{


        const samePhone =

        phone &&

        normalizePhone(item.phone)===phone;



        const sameName =

        lead.name &&

        item.name &&

        item.name.toLowerCase()

        ===

        lead.name.toLowerCase();



        return samePhone || sameName;


    });







    const now =
    new Date().toISOString();







    if(existingIndex !== -1){


        // Merge: keep stored fields unless the new extraction provides a
        // non-empty replacement, so incremental extractions never wipe out
        // info that was already collected. Refresh the lead score too.
        const merged = {
            ...leads[existingIndex]
        };

        for(const key of Object.keys(lead)){
            const value = lead[key];

            const nonEmpty =
            typeof value === "string" ?
            value.trim() !== "" :
            value !== undefined && value !== null;

            if(nonEmpty){
                merged[key] = value;
            }
        }

        merged.clientId = clientId;
        merged.updatedAt = now;
        merged.score = calculateScore(merged);

        leads[existingIndex] = merged;


    }

    else{


        leads.push({


            id:createId(),


            clientId,


            createdAt:now,


            updatedAt:now,


            status:"NEW",


            source:"AI_WIDGET",


            score:

            calculateScore(lead),


            ...lead


        });


    }







    fs.writeFileSync(


        file,


        JSON.stringify(

            leads,

            null,

            2

        )

    );





    return true;



}

catch(error){


    console.error(

        "SAVE LEAD FAILED:",

        error.message

    );


    return false;


}


}





function calculateScore(lead){


let score=0;



if(lead.name)

score+=20;



if(lead.phone)

score+=30;



if(lead.project)

score+=20;



if(lead.timeline)

score+=15;



if(lead.description)

score+=15;



return score;



}