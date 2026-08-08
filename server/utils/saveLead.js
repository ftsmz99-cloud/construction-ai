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






    const existingIndex =

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


        leads[existingIndex]={


            ...leads[existingIndex],


            ...lead,


            clientId,


            updatedAt:now


        };


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