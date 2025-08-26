document.addEventListener('DOMContentLoaded', function() {
    // Request notification permission
    if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Notification permission granted.");
            } else {
                console.warn("Notification permission denied.");
            }
        });
    }

    // Establish EventSource connection
    const eventSource = new EventSource('/stream');

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (Notification.permission === "granted") {
            new Notification(data.title || "New Notification", {
                body: data.body || "You have a new notification.",
                icon: '/static/chronos.png' // Assuming you have a chronos.png in static
            });
        } else {
            showNotification(data.message, data.type)
            // Fallback for when permission is not granted
            // alert(`Notification: ${data.title || "New Notification"} - ${data.body || "You have a new notification."}`);
        }
    };

    eventSource.onerror = function(error) {
        console.error("EventSource failed:", error);
        eventSource.close(); // Close and try to reconnect if needed
        // You might want to implement a reconnection strategy here
    };
});