import fs from "fs";
import path from "path";


// ================================
// BUSINESS CACHE
// ================================

const cache = new Map();

const CACHE_TIME = 5 * 60 * 1000;





// ================================
// CLIENT ID CLEANER
// ================================

function cleanClientId(clientId){


    return (

        String(clientId || "")

        .replace(/[^a-zA-Z0-9-_]/g,"")

        .toLowerCase()

        ||

        "thunderbolt"

    );


}






// ================================
// VALIDATE BUSINESS
// ================================

function normalizeBusiness(data,id){


    return {


        id,


        name:

        typeof data.name === "string"

        ?

        data.name.trim()

        :

        "Unnamed Business",




        services:

        Array.isArray(data.services)

        ?

        data.services

        :

        [],




        location:

        data.location || "Unknown",




        hours:

        data.hours || "Not provided",




        greeting:

        data.greeting || null,



        phone:

        data.phone || "",




        email:

        data.email || "",



        industry:

        data.industry || "",



        website:

        data.website || "",



        description:

        data.description || ""



    };


}







// ================================
// LOAD BUSINESS
// ================================

export default function loadBusiness(

    clientId="thunderbolt"

){



    const id =
    cleanClientId(clientId);





    const cached =
    cache.get(id);




    if(cached){


        const age =

        Date.now() -

        cached.timestamp;




        if(age < CACHE_TIME){


            return cached.data;


        }



    }







    const filePath =

    path.join(

        process.cwd(),

        "data",

        "clients",

        id,

        "business.json"

    );







    if(!fs.existsSync(filePath)){


        throw new Error(

            `Business profile missing: ${id}`

        );


    }







    try{


        const raw =

        fs.readFileSync(

            filePath,

            "utf8"

        );




        const json =

        JSON.parse(raw);





        const business =

        normalizeBusiness(

            json,

            id

        );






        cache.set(

            id,

            {


                data:business,


                timestamp:Date.now()


            }

        );





        return business;



    }



    catch(error){


        console.error(

            "BUSINESS LOAD ERROR:",

            error.message

        );



        throw new Error(

            `Could not load business: ${id}`

        );


    }



}





// ================================
// INVALIDATE CACHE
// ================================

export function invalidateBusiness(

    clientId

){



    const id =

    cleanClientId(clientId);



    cache.delete(id);



}
