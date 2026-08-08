export function createWidgetUI(){


    const button = document.createElement("div");

    button.id = "construction-ai-button";

    button.innerHTML = "💬";




    const chat = document.createElement("div");

    chat.id = "construction-ai-window";


    chat.innerHTML = `

        <div class="ai-header">

            <strong id="ai-business-name">
                Loading...
            </strong>

            <button id="ai-close">
                ×
            </button>

        </div>


        <div id="ai-messages">

        </div>



        <div class="ai-input-area">


            <input

              id="ai-input"

              placeholder="Type your message..."

            />


            <button id="ai-send">

                Send

            </button>


        </div>

    `;



    document.body.appendChild(button);

    document.body.appendChild(chat);




    return {

        button,

        chat,

        messages:
        document.getElementById("ai-messages"),

        input:
        document.getElementById("ai-input"),

        send:
        document.getElementById("ai-send"),

        close:
        document.getElementById("ai-close")

    };


}