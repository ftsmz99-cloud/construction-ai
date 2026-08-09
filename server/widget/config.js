// Resolve the API origin from the host that served the embed script,
// so the widget talks to the correct server in any environment.
let serverUrl = "http://localhost:5000";

if (
    window.AIWidgetConfig &&
    window.AIWidgetConfig.baseUrl
) {
    try {
        const origin =
        new URL(
            window.AIWidgetConfig.baseUrl,
            window.location.href
        ).origin;

        if (origin && origin !== "null") {
            serverUrl = origin;
        }
    } catch (error) {
        // Fall back to the local default.
    }
}

const WidgetConfig = {

    serverUrl,

    clientId:
    (window.AIWidgetConfig &&
     window.AIWidgetConfig.clientId) ||
    "thunderbolt"

};


export default WidgetConfig;