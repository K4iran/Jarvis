/* JARVIS Google Calendar adapter.
 * Browser-only OAuth token model: access tokens stay in memory and are never
 * written to localStorage, cookies, or the JARVIS backend.
 *
 * Configure window.JARVIS_GOOGLE_CLIENT_ID before calling init().
 * This is an OAuth Web client ID (not a client secret).
 */
(function () {
  "use strict";

  const API = "https://www.googleapis.com/calendar/v3";
  const SCOPE = "https://www.googleapis.com/auth/calendar.events";
  let clientId = "";
  let tokenClient = null;
  let accessToken = "";
  let tokenExpiresAt = 0;
  let pendingToken = null;

  function loadGIS() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-jarvis-google-identity]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Google sign-in library failed to load.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.jarvisGoogleIdentity = "true";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Google sign-in library failed to load."));
      document.head.appendChild(script);
    });
  }

  function init(id) {
    clientId = String(id || window.JARVIS_GOOGLE_CLIENT_ID || "").trim();
    if (!clientId || !clientId.includes(".apps.googleusercontent.com")) {
      throw new Error("Set a valid Google OAuth Web client ID before initializing JARVIS Calendar.");
    }
    return loadGIS().then(() => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response && response.access_token) {
            accessToken = response.access_token;
            const seconds = Number(response.expires_in || 3600);
            tokenExpiresAt = Date.now() + Math.max(0, seconds - 60) * 1000;
            if (pendingToken) pendingToken.resolve({ connected: true });
          } else if (pendingToken) {
            pendingToken.reject(new Error(response && response.error_description || response && response.error || "Google authorization was not completed."));
          }
          pendingToken = null;
        },
        error_callback: (error) => {
          if (pendingToken) pendingToken.reject(new Error(error && error.message || "Google authorization was cancelled."));
          pendingToken = null;
        }
      });
      return true;
    });
  }

  function connect() {
    if (!tokenClient) return Promise.reject(new Error("Calendar adapter is not initialized."));
    return new Promise((resolve, reject) => {
      pendingToken = { resolve, reject };
      try {
        tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
      } catch (error) {
        pendingToken = null;
        reject(error);
      }
    });
  }

  function requireToken() {
    if (!accessToken || Date.now() >= tokenExpiresAt) {
      accessToken = "";
      throw new Error("Calendar access expired. Please reconnect using the Connect Calendar button.");
    }
    return accessToken;
  }

  async function request(path, options) {
    const token = requireToken();
    const response = await fetch(API + path, {
      method: (options && options.method) || "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: options && options.body ? JSON.stringify(options.body) : undefined
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        accessToken = "";
        tokenExpiresAt = 0;
      }
      throw new Error(body.error && body.error.message || "Google Calendar request failed (" + response.status + ").");
    }
    return body;
  }

  function encode(value) { return encodeURIComponent(value); }

  async function listEvents(options) {
    const opts = options || {};
    const now = new Date();
    const timeMin = opts.timeMin || now.toISOString();
    const timeMax = opts.timeMax || new Date(now.getTime() + 30 * 86400000).toISOString();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(Math.min(250, Math.max(1, Number(opts.maxResults) || 100)))
    });
    const result = await request("/calendars/primary/events?" + params.toString());
    return (result.items || []).map(normalizeEvent);
  }

  function normalizeEvent(event) {
    return {
      id: event.id,
      title: event.summary || "(Untitled event)",
      description: event.description || "",
      location: event.location || "",
      start: event.start && (event.start.dateTime || event.start.date),
      end: event.end && (event.end.dateTime || event.end.date),
      allDay: Boolean(event.start && event.start.date && !event.start.dateTime),
      status: event.status || "confirmed",
      htmlLink: event.htmlLink || ""
    };
  }

  async function createEvent(event) {
    validateEvent(event);
    const result = await request("/calendars/primary/events", {
      method: "POST",
      body: toGoogleEvent(event)
    });
    return normalizeEvent(result);
  }

  async function updateEvent(eventId, changes) {
    if (!eventId) throw new Error("An event ID is required to update an event.");
    if (!changes || typeof changes !== "object") throw new Error("Event changes are required.");
    const safeChanges = {};
    if ("title" in changes) safeChanges.summary = String(changes.title).trim();
    if ("description" in changes) safeChanges.description = String(changes.description || "");
    if ("location" in changes) safeChanges.location = String(changes.location || "");
    if ("start" in changes) safeChanges.start = changes.start;
    if ("end" in changes) safeChanges.end = changes.end;
    if ("timeZone" in changes) {
      if (safeChanges.start) safeChanges.start.timeZone = changes.timeZone;
      if (safeChanges.end) safeChanges.end.timeZone = changes.timeZone;
    }
    if (!Object.keys(safeChanges).length) throw new Error("No supported event changes were supplied.");
    const result = await request("/calendars/primary/events/" + encode(eventId), {
      method: "PATCH",
      body: safeChanges
    });
    return normalizeEvent(result);
  }

  async function deleteEvent(eventId, confirmed) {
    if (confirmed !== true) {
      throw new Error("Deletion requires explicit confirmation from the user.");
    }
    if (!eventId) throw new Error("An event ID is required to delete an event.");
    await request("/calendars/primary/events/" + encode(eventId), { method: "DELETE" });
    return { deleted: true, id: eventId };
  }

  function validateEvent(event) {
    if (!event || typeof event !== "object") throw new Error("Event details are required.");
    if (!String(event.title || "").trim()) throw new Error("Please provide an event title.");
    if (!event.start || !event.end) throw new Error("Please provide both a start and end time.");
    const start = new Date(event.start.dateTime || event.start.date || event.start);
    const end = new Date(event.end.dateTime || event.end.date || event.end);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new Error("The event start or end time is invalid.");
    }
    if (end <= start) throw new Error("The event end must be after its start.");
  }

  function toGoogleEvent(event) {
    const result = { summary: String(event.title).trim() };
    if (event.description) result.description = String(event.description);
    if (event.location) result.location = String(event.location);
    if (event.allDay) {
      result.start = { date: String(event.start).slice(0, 10) };
      result.end = { date: String(event.end).slice(0, 10) };
    } else {
      result.start = { dateTime: new Date(event.start).toISOString(), timeZone: event.timeZone || "Europe/London" };
      result.end = { dateTime: new Date(event.end).toISOString(), timeZone: event.timeZone || "Europe/London" };
    }
    return result;
  }

  function openCalendar(options) {
    // Main JARVIS can listen for this event to trigger the existing particle transition.
    window.dispatchEvent(new CustomEvent("jarvis:calendar-open-request", { detail: options || {} }));
    return listEvents(options).then(events => {
      window.dispatchEvent(new CustomEvent("jarvis:calendar-events", { detail: { events } }));
      return events;
    });
  }

  function disconnect() {
    accessToken = "";
    tokenExpiresAt = 0;
    if (window.google && window.google.accounts && window.google.accounts.oauth2 && accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
  }

  window.JarvisGoogleCalendar = Object.freeze({
    init,
    connect,
    listEvents,
    openCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    disconnect,
    isConnected: () => Boolean(accessToken && Date.now() < tokenExpiresAt)
  });
})();
