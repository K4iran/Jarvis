/* JARVIS Calendar panel — staged UI, not yet loaded by the live page.
 * Expects calendar/config.js and calendar/google-calendar.js to load first.
 * Does not store tokens or credentials.
 */
(function () {
  "use strict";
  if (window.JarvisCalendarPanel) return;

  const style = document.createElement("style");
  style.textContent = `
    #jarvis-calendar-panel{position:fixed;inset:0;z-index:9999;background:rgba(2,8,20,.94);color:#d9f4ff;
      font:15px/1.45 system-ui,sans-serif;display:none;overflow:auto;padding:clamp(16px,4vw,36px);box-sizing:border-box}
    #jarvis-calendar-panel *{box-sizing:border-box}
    #jarvis-calendar-panel .jcp-shell{max-width:760px;margin:0 auto}
    #jarvis-calendar-panel .jcp-top{display:flex;align-items:center;justify-content:space-between;gap:16px}
    #jarvis-calendar-panel h2{font-size:clamp(24px,5vw,34px);font-weight:500;letter-spacing:.08em;margin:8px 0}
    #jarvis-calendar-panel .jcp-muted{color:#89aebe}
    #jarvis-calendar-panel button,#jarvis-calendar-panel input,#jarvis-calendar-panel textarea{
      font:inherit;color:inherit;border:1px solid rgba(104,204,255,.35);border-radius:10px;background:rgba(20,52,75,.45);padding:10px 12px}
    #jarvis-calendar-panel button{cursor:pointer}
    #jarvis-calendar-panel button:hover{background:rgba(42,117,157,.45)}
    #jarvis-calendar-panel .jcp-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
    #jarvis-calendar-panel .jcp-event{border:1px solid rgba(104,204,255,.2);border-radius:12px;padding:14px;margin:10px 0;background:rgba(11,29,45,.7)}
    #jarvis-calendar-panel .jcp-event-title{font-size:17px}
    #jarvis-calendar-panel .jcp-form{display:grid;gap:10px;margin-top:16px}
    #jarvis-calendar-panel .jcp-form[hidden]{display:none!important}
    #jarvis-calendar-panel .jcp-form label{display:grid;gap:5px;color:#9dc5d5}
    #jarvis-calendar-panel .jcp-status{min-height:24px;color:#8de1ff;margin:12px 0}
    #jarvis-calendar-panel .jcp-close{font-size:22px}
  `;
  document.head.appendChild(style);

  const root = document.createElement("section");
  root.id = "jarvis-calendar-panel";
  root.setAttribute("aria-label", "JARVIS Calendar");
  root.innerHTML = `
    <div class="jcp-shell">
      <div class="jcp-top"><div><div class="jcp-muted">J.A.R.V.I.S. / PERSONAL SYSTEMS</div><h2>CALENDAR</h2></div><button class="jcp-close" type="button" aria-label="Close calendar">×</button></div>
      <p class="jcp-muted">Google Calendar · upcoming events</p>
      <div class="jcp-status" role="status" aria-live="polite">Connect Google Calendar to load your events.</div>
      <div class="jcp-actions"><button type="button" data-action="connect">Connect Google Calendar</button><button type="button" data-action="refresh">Refresh events</button><button type="button" data-action="new">+ New event</button></div>
      <div data-role="events"></div>
      <form class="jcp-form" data-role="form" hidden>
        <h3 data-role="form-title">New event</h3>
        <label>Event title<input name="title" required maxlength="160" placeholder="Basketball training"></label>
        <label>Starts<input name="start" type="datetime-local" required></label>
        <label>Ends<input name="end" type="datetime-local" required></label>
        <label>Location (optional)<input name="location" maxlength="200" placeholder="Sports hall"></label>
        <label>Notes (optional)<textarea name="description" rows="2" maxlength="2000"></textarea></label>
        <div class="jcp-actions"><button type="submit">Save event</button><button type="button" data-action="cancel">Cancel</button></div>
      </form>
    </div>`;
  document.body.appendChild(root);

  const status = root.querySelector(".jcp-status");
  const connectButton = root.querySelector('[data-action="connect"]');
  const eventsNode = root.querySelector('[data-role="events"]');

  function updateConnectionUI(api) {
    const connected = Boolean(api && api.isConnected());
    connectButton.hidden = connected;
    connectButton.style.display = connected ? "none" : "";
    connectButton.textContent = connected ? "Google Calendar connected" : "Connect Google Calendar";
    connectButton.disabled = false;
  }
  const form = root.querySelector('[data-role="form"]');
  let editingId = null;
  let latestEvents = [];

  function say(message) { status.textContent = message; }
  function show() { root.style.display = "block"; updateConnectionUI(window.JarvisGoogleCalendar); refresh(); }
  function hide() { root.style.display = "none"; form.hidden = true; }
  function dateLabel(value, allDay) {
    if (!value) return "Time not set";
    if (allDay) return new Date(value + "T12:00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString(undefined,{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  }
  function localInputValue(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0,16);
  }
  function renderEvents(events) {
    latestEvents = Array.isArray(events) ? events : [];
    eventsNode.replaceChildren();
    if (!latestEvents.length) {
      const empty = document.createElement("p");
      empty.className = "jcp-muted";
      empty.textContent = "No upcoming events found in your primary Google Calendar.";
      eventsNode.appendChild(empty);
      return;
    }
    latestEvents.forEach(event => {
      const card = document.createElement("article");
      card.className = "jcp-event";
      const title = document.createElement("div");
      title.className = "jcp-event-title";
      title.textContent = event.title || "(Untitled event)";
      const time = document.createElement("div");
      time.className = "jcp-muted";
      time.textContent = dateLabel(event.start,event.allDay) + (event.end ? " — " + dateLabel(event.end,event.allDay) : "");
      card.append(title,time);
      if (event.location) {
        const location = document.createElement("div");
        location.className = "jcp-muted";
        location.textContent = event.location;
        card.appendChild(location);
      }
      const actions = document.createElement("div");
      actions.className = "jcp-actions";
      const edit = document.createElement("button");
      edit.type = "button"; edit.textContent = "Edit"; edit.addEventListener("click", () => openForm(event));
      const remove = document.createElement("button");
      remove.type = "button"; remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!window.JarvisGoogleCalendar || !window.JarvisGoogleCalendar.isConnected()) {
          say("Reconnect Google Calendar before deleting events."); return;
        }
        if (!window.confirm('Delete "' + (event.title || "this event") + '" from Google Calendar?')) return;
        try {
          await window.JarvisGoogleCalendar.deleteEvent(event.id, true);
          say("Event deleted.");
          await refresh();
        } catch (error) { say(error.message || "Could not delete event."); }
      });
      actions.append(edit,remove); card.appendChild(actions); eventsNode.appendChild(card);
    });
  }
  function openForm(event) {
    editingId = event ? event.id : null;
    form.reset();
    form.hidden = false;
    root.querySelector('[data-role="form-title"]').textContent = event ? "Edit event" : "New event";
    form.elements.title.value = event ? event.title : "";
    form.elements.start.value = event && !event.allDay ? localInputValue(event.start) : "";
    form.elements.end.value = event && !event.allDay ? localInputValue(event.end) : "";
    form.elements.location.value = event ? event.location || "" : "";
    form.elements.description.value = event ? event.description || "" : "";
    form.scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function refresh() {
    const api = window.JarvisGoogleCalendar;
    updateConnectionUI(api);
    if (!api) { say("Calendar adapter has not been loaded yet."); return; }
    if (!api.isConnected()) { say("Tap Connect Google Calendar to authorise access."); return; }
    try {
      say("Loading your events…");
      renderEvents(await api.listEvents({}));
      updateConnectionUI(api);
      say("Calendar synced.");
    } catch (error) {
      updateConnectionUI(api);
      say(error.message || "Could not load calendar.");
    }
  }
  root.querySelector(".jcp-close").addEventListener("click", hide);
  connectButton.addEventListener("click", async () => {
    try {
      connectButton.disabled = true;
      connectButton.textContent = "Connecting…";
      const api = window.JarvisGoogleCalendar;
      if (!api) throw new Error("Calendar adapter has not been loaded.");
      const ready = await (window.JarvisGoogleCalendarReady || api.init());
      if (ready !== true) await api.init();
      await api.connect();
      say("Google Calendar connected.");
      window.dispatchEvent(new CustomEvent("jarvis:calendar-connected"));
      await refresh();
    } catch (error) {
      updateConnectionUI(window.JarvisGoogleCalendar);
      say(error.message || "Google Calendar connection failed.");
    }
  });
  root.querySelector('[data-action="refresh"]').addEventListener("click", refresh);
  root.querySelector('[data-action="new"]').addEventListener("click", () => openForm(null));
  root.querySelector('[data-action="cancel"]').addEventListener("click", () => { form.hidden = true; });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const api = window.JarvisGoogleCalendar;
    if (!api || !api.isConnected()) { say("Connect Google Calendar before saving."); return; }
    const payload = {
      title: form.elements.title.value.trim(),
      start: new Date(form.elements.start.value).toISOString(),
      end: new Date(form.elements.end.value).toISOString(),
      location: form.elements.location.value.trim(),
      description: form.elements.description.value.trim(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London"
    };
    if (new Date(payload.end) <= new Date(payload.start)) { say("End time must be after the start time."); return; }
    try {
      say(editingId ? "Updating event…" : "Creating event…");
      if (editingId) await api.updateEvent(editingId,payload); else await api.createEvent(payload);
      form.hidden = true;
      say("Saved to Google Calendar.");
      await refresh();
    } catch (error) { say(error.message || "Could not save event."); }
  });
  window.addEventListener("jarvis:calendar-open-request", show);
  window.addEventListener("jarvis:calendar-events", event => {
    show();
    renderEvents(event.detail && event.detail.events);
    updateConnectionUI(window.JarvisGoogleCalendar);
    say("Calendar synced.");
  });
  window.JarvisCalendarPanel = Object.freeze({ open: show, close: hide, refresh, newEvent: () => openForm(null) });
})();