const url = "https://exuberant-muskox-aud-11f63574.koyeb.app";

const state = {
    events: [],
};

const storageKey = "eventHubEmail";
const messageElement = document.getElementById("message");

function showMessage(text, type = "success") {
    if (!messageElement) return;
    messageElement.textContent = text;
    messageElement.className = "message " + type;
    setTimeout(() => {
        if (messageElement) {
            messageElement.textContent = "";
            messageElement.className = "message";
        }
    }, 5000);
}

function getSavedEmail() {
    return localStorage.getItem(storageKey) || "";
}

function saveEmail(email) {
    localStorage.setItem(storageKey, email);
    renderEmailBanner();
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

function formatDate(value) {
    if (!value) return "TBA";
    return new Date(value).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function renderEmailBanner() {
    const banner = document.getElementById("email-banner");
    if (!banner) return;
    const savedEmail = getSavedEmail();
    if (savedEmail) {
        banner.innerHTML = `
            <div class="banner-content">
                <p>Welcome back! Using <strong>${savedEmail}</strong> for ticket lookup.</p>
                <button id="change-email" class="secondary-button">Change Email</button>
            </div>
        `;
        document.getElementById("change-email")?.addEventListener("click", () => {
            saveEmail("");
            renderEmailBanner();
            document.getElementById("user-email")?.focus();
        });
        document.getElementById("user-email")?.setAttribute("value", savedEmail);
        document.getElementById("user-email").value = savedEmail;
    } else {
        banner.innerHTML = `
            <div class="banner-content">
                <p>Enter your email so we can save your tickets locally and show them every time you come back.</p>
                <div class="banner-actions">
                    <input id="banner-email" type="email" placeholder="Enter your email" required>
                    <button id="save-email" class="secondary-button">Save Email</button>
                </div>
            </div>
        `;
        document.getElementById("save-email")?.addEventListener("click", () => {
            const emailField = document.getElementById("banner-email");
            const email = emailField?.value.trim();
            if (!email) {
                showMessage("Please enter a valid email.", "error");
                return;
            }
            saveEmail(email);
            document.getElementById("user-email")?.setAttribute("value", email);
            document.getElementById("user-email").value = email;
            loadRegistrations();
            showMessage("Email saved. You can now view your tickets.");
        });
    }
}

function renderEvents() {
    const container = document.getElementById("event-container");
    const select = document.getElementById("event-select");
    if (!container || !select) return;

    if (!state.events.length) {
        container.innerHTML = `
            <div class="event-card empty-state">
                <p>Loading events from the API...</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.events
        .map((event) => {
            const id = getEventId(event);
            return `
                <div class="event-card">
                    <h3>${event.name || "Untitled Event"}</h3>
                    <p><i class="fa-solid fa-calendar"></i> ${formatDate(event.date)}</p>
                    <p><i class="fa-solid fa-clock"></i> ${event.time || "TBA"}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${event.location || "Online / TBA"}</p>
                    <p class="event-description">${event.description || "No description available."}</p>
                    <button class="register-btn" data-event-id="${id}">Register</button>
                </div>
            `;
        })
        .join("\n");

    select.innerHTML = `
        <option value="">Select an Event</option>
        ${state.events
            .map((event) => {
                const id = getEventId(event);
                return `<option value="${id}">${event.name || "Untitled Event"} - ${formatDate(event.date)}</option>`;
            })
            .join("")}
    `;
}

async function loadEvents() {
    try {
        const events = await apiRequest("/events");
        if (Array.isArray(events)) {
            state.events = events;
        } else if (events?.data) {
            state.events = events.data;
        } else {
            state.events = [];
        }
    } catch (error) {
        console.error(error);
        showMessage("Unable to load events from the API.", "error");
        state.events = [];
    }
    renderEvents();
}

function renderTickets(registrations) {
    const container = document.getElementById("ticket-container");
    if (!container) return;

    if (!registrations || !registrations.length) {
        container.innerHTML = `
            <div class="ticket-placeholder">
                <i class="fa-solid fa-ticket fa-3x"></i>
                <p>You have not registered for any event yet. Please enter your email to see ticket details.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = registrations
        .map((registration) => {
            const eventId = registration.event_id || registration.eventId || registration.event_id || "";
            const event = state.events.find((item) => getEventId(item) === eventId) || {};
            return `
                <div class="ticket-card">
                    <h3>${event.name || registration.event_name || "Registered Event"}</h3>
                    <p><strong>Name:</strong> ${registration.name || "N/A"}</p>
                    <p><strong>Email:</strong> ${registration.email || "N/A"}</p>
                    <p><strong>Phone:</strong> ${registration.phone || "N/A"}</p>
                    <p><strong>Event Date:</strong> ${formatDate(event.date || registration.registration_date)}</p>
                    <p><strong>Registration ID:</strong> ${registration.id || registration._id || "N/A"}</p>
                </div>
            `;
        })
        .join("\n");
}

async function loadRegistrations() {
    const email = getSavedEmail();
    if (!email) {
        renderTickets([]);
        return;
    }

    try {
        const registrations = await apiRequest(`/registrations/${encodeURIComponent(email)}`);
        if (Array.isArray(registrations)) {
            renderTickets(registrations);
        } else if (registrations?.data) {
            renderTickets(registrations.data);
        } else {
            renderTickets([registrations]);
        }
    } catch (error) {
        console.error(error);
        renderTickets([]);
    }
}

async function registerEvent(eventData) {
    try {
        await apiRequest("/register", {
            method: "POST",
            body: JSON.stringify(eventData),
        });
        showMessage("Registration successful! Your ticket is now saved.");
        loadRegistrations();
    } catch (error) {
        console.error(error);
        showMessage("Registration failed. Please try again.", "error");
    }
}

function clearRegistrationForm() {
    document.getElementById("user-name").value = "";
    document.getElementById("user-phone").value = "";
    const savedEmail = getSavedEmail();
    if (savedEmail) {
        document.getElementById("user-email").value = savedEmail;
    } else {
        document.getElementById("user-email").value = "";
    }
    document.getElementById("event-select").value = "";
}

function highlightSelectedEvent(eventId) {
    const select = document.getElementById("event-select");
    if (!select) return;
    select.value = eventId;
    select.scrollIntoView({ behavior: "smooth" });
}

function initializeUI() {
    renderEmailBanner();
    document.getElementById("registration-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("user-name").value.trim();
        const email = document.getElementById("user-email").value.trim();
        const phone = document.getElementById("user-phone").value.trim();
        const eventId = document.getElementById("event-select").value;

        if (!name || !email || !phone || !eventId) {
            showMessage("Please complete all registration fields.", "error");
            return;
        }

        saveEmail(email);

        const eventData = {
            event_id: eventId,
            name,
            email,
            phone,
            registration_date: new Date().toISOString().slice(0, 10),
        };

        await registerEvent(eventData);
        clearRegistrationForm();
    });

    document.getElementById("event-container")?.addEventListener("click", (e) => {
        if (e.target.matches(".register-btn")) {
            const eventId = e.target.dataset.eventId;
            highlightSelectedEvent(eventId);
        }
    });
}

window.addEventListener("DOMContentLoaded", async () => {
    initializeUI();
    await loadEvents();
    await loadRegistrations();
    const savedEmail = getSavedEmail();
    if (savedEmail) {
        const emailInput = document.getElementById("user-email");
        if (emailInput) emailInput.value = savedEmail;
    }
});

