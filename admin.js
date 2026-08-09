const url = "https://exuberant-muskox-aud-11f63574.koyeb.app";
const ADMIN_USERNAME = "admin@example.com";
const ADMIN_PASSWORD = "admin123";
const adminDashboard = document.getElementById("admin-dashboard");
const adminLoginMessage = document.getElementById("admin-login-message");
const adminDashboardMessage = document.getElementById("admin-dashboard-message");
const eventListContainer = document.getElementById("admin-event-list");

function showAdminMessage(element, text, type = "error") {
    if (!element) return;
    element.textContent = text;
    element.className = "message " + type;
    setTimeout(() => {
        if (element) {
            element.textContent = "";
            element.className = "message";
        }
    }, 5000);
}

function apiRequest(path, options = {}) {
    return fetch(`${url}${path}`, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    }).then(async (response) => {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
            throw new Error(data?.message || response.statusText || "API request failed");
        }
        return data;
    });
}

function getEventId(event) {
    return event.id || event._id || event.event_id || event.eventId || "";
}

async function loadAdminEvents() {
    if (!eventListContainer) return;
    eventListContainer.textContent = "Loading events...";
    try {
        const events = await apiRequest("/events");
        const list = Array.isArray(events) ? events : events.data || [];
        if (!list.length) {
            eventListContainer.innerHTML = "<p>No events found.</p>";
            return;
        }
        eventListContainer.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${list
                        .map((event) => {
                            const id = getEventId(event);
                            return `
                                <tr>
                                    <td>${event.name || "Untitled"}</td>
                                    <td>${event.date || "TBA"}</td>
                                    <td>${event.time || "TBA"}</td>
                                    <td>${event.location || "TBA"}</td>
                                    <td><button class="delete-event" data-id="${id}">Delete</button></td>
                                </tr>
                            `;
                        })
                        .join("")}
                </tbody>
            </table>
        `;
        document.querySelectorAll(".delete-event").forEach((button) => {
            button.addEventListener("click", async (event) => {
                const id = event.target.dataset.id;
                if (!id) return;
                if (!confirm("Delete this event?")) return;
                await deleteEvent(id);
            });
        });
    } catch (error) {
        console.error(error);
        eventListContainer.innerHTML = "<p>Unable to load events.</p>";
    }
}

async function deleteEvent(id) {
    try {
        await apiRequest(`/events/${encodeURIComponent(id)}`, { method: "DELETE" });
        showAdminMessage(adminDashboardMessage, "Event deleted successfully.", "success");
        await loadAdminEvents();
    } catch (error) {
        console.error(error);
        showAdminMessage(adminDashboardMessage, "Unable to delete event.", "error");
    }
}

async function createEvent(eventData) {
    try {
        await apiRequest("/events", {
            method: "POST",
            body: JSON.stringify(eventData),
        });
        showAdminMessage(adminDashboardMessage, "Event created successfully.", "success");
        document.getElementById("admin-event-form").reset();
        await loadAdminEvents();
    } catch (error) {
        console.error(error);
        showAdminMessage(adminDashboardMessage, "Unable to create event.", "error");
    }
}

document.getElementById("admin-login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value.trim();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        if (adminLoginMessage) adminLoginMessage.textContent = "";
        if (adminDashboard) {
            adminDashboard.style.display = "block";
        }
        document.getElementById("admin-login-card").style.display = "none";
        loadAdminEvents();
    } else {
        showAdminMessage(adminLoginMessage, "Invalid admin email or password.", "error");
    }
});

document.getElementById("admin-logout")?.addEventListener("click", () => {
    if (adminDashboard) adminDashboard.style.display = "none";
    document.getElementById("admin-login-card").style.display = "block";
    document.getElementById("admin-login-form").reset();
});

document.getElementById("admin-event-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const eventData = {
        name: document.getElementById("event-name").value.trim(),
        date: document.getElementById("event-date").value,
        time: document.getElementById("event-time").value.trim(),
        location: document.getElementById("event-location").value.trim(),
        description: document.getElementById("event-description").value.trim(),
        image_url: document.getElementById("event-image").value.trim(),
    };
    if (!eventData.name || !eventData.date || !eventData.time || !eventData.location || !eventData.description) {
        showAdminMessage(adminDashboardMessage, "Please complete all required event fields.", "error");
        return;
    }
    await createEvent(eventData);
});
