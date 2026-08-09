(function () {

    "use strict";


    // ==============================
    // AI RECEPTIONIST EMBED LOADER
    // ==============================


    const currentScript = document.currentScript;


    if (!currentScript) {

        console.error(
            "AI Widget: Could not find embed script"
        );

        return;

    }



    // Prevent duplicate loading

    if (window.AIReceptionistLoaded) {

        console.warn(
            "AI Widget already loaded"
        );

        return;

    }


    window.AIReceptionistLoaded = true;



    // ==============================
    // CLIENT CONFIG
    // ==============================


    const clientId =
        currentScript.dataset.client ||
        "thunderbolt";



    const baseUrl =
        currentScript.src
            .replace(
                "embed.js",
                ""
            );



    window.AIWidgetConfig = {

        clientId,

        baseUrl

    };





    // ==============================
    // LOAD CSS
    // ==============================


    function loadCSS(){


        const existing =
            document.querySelector(
                'link[data-ai-widget-css]'
            );


        if(existing) return;



        const css =
            document.createElement(
                "link"
            );


        css.rel =
            "stylesheet";


        css.href =
            baseUrl + "widget.css";


        css.dataset.aiWidgetCss =
            "true";


        document.head.appendChild(css);


    }





    // ==============================
    // LOAD WIDGET APP
    // ==============================


    function loadWidget(){


        const existing =
            document.querySelector(
                'script[data-ai-widget]'
            );


        if(existing) return;



        const script =
            document.createElement(
                "script"
            );


        script.type =
            "module";


        script.src =
            baseUrl + "widget.js";


        script.dataset.client =
            clientId;


        script.dataset.aiWidget =
            "true";



        script.onerror =
            function(){


                console.error(
                    "AI Widget failed to load"
                );


            };



        document.head.appendChild(
            script
        );


    }





    // ==============================
    // START
    // ==============================


    loadCSS();


    loadWidget();



})();