import express from "express";
import fs from "fs";
import path from "path";


const router = express.Router();


const filePath = path.join(

  process.cwd(),

  "data",

  "conversations.json"

);



router.get("/", (req, res) => {


  try {


    if (!fs.existsSync(filePath)) {

      return res.json([]);

    }



    const data = fs.readFileSync(

      filePath,

      "utf8"

    );



    const conversations = data

      ? JSON.parse(data)

      : [];



    res.json(conversations);



  } catch(error) {


    console.error(

      "CONVERSATIONS ERROR:",

      error.message

    );


    res.status(500).json({

      error: "Could not load conversations"

    });


  }


});



export default router;