# JARVIS Google Calendar adapter (staged integration)

**Chosen direction: Google Calendar is the single source of truth.** JARVIS will read and manage events in the Google account's primary calendar. Use the Google Calendar app as the main calendar interface; Samsung Calendar is optional and not part of the integration target.

This folder contains a calendar API adapter for the existing JARVIS site. It is intentionally staged separately: **it does not modify `index.html`, the orb, voice code, Gemini model, Supabase functions, or any existing secrets.** It is not live-integrated until the main page is wired to it.

## Calendar choice

Google Calendar is the one calendar JARVIS will use. Create and manage events in the Google Calendar app or through JARVIS. This avoids splitting events between Google, Samsung account, and phone-only calendars. Existing birthdays may appear as a separate Google birthday calendar; ordinary events created in the primary Google calendar are managed by this adapter.

## 1. Enable Google Calendar API and create a browser OAuth client

1. In Google Cloud Console, create/select a project and enable **Google Calendar API**.
2. Configure the Google Auth Platform consent screen for personal testing.
3. Create an OAuth client with application type **Web application**.
4. Add this authorized JavaScript origin exactly: `https://k4iran.github.io`.
5. Copy the OAuth **Client ID**. Do not create or add a client secret to the website. The browser client ID is public configuration, not a secret.

Google's official guide: https://developers.google.com/workspace/calendar/api/quickstart/js

## 2. Load and initialize the adapter

Include this script on the JARVIS page (only after the main page is safely patched):

```html
<script src="./calendar/google-calendar.js"></script>
```

Before initializing, set the public OAuth client ID:

```html
<script>
  window.JARVIS_GOOGLE_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";
</script>
```

Then initialize it once:

```js
await window.JarvisGoogleCalendar.init();
```

A user-initiated button or action must call `connect()` to show Google's consent window:

```js
await window.JarvisGoogleCalendar.connect();
```

Google's access token is held only in JavaScript memory; it is not written to localStorage or sent to JARVIS/Supabase. It expires, so the user may need to reconnect. The requested scope is `calendar.events` (event read/write, not Gmail access).

## 3. Available API methods

- `listEvents({timeMin, timeMax, maxResults})` — list events on the primary Google calendar.
- `openCalendar(options)` — requests the calendar opening animation via the `jarvis:calendar-open-request` event, then dispatches actual data as `jarvis:calendar-events`.
- `createEvent({title, start, end, description, location, timeZone})`
- `updateEvent(eventId, changes)`
- `deleteEvent(eventId, true)` — requires the caller to pass explicit confirmation; the voice/UI layer must ask the user first.

The returned events include `id`, `title`, `start`, `end`, `allDay`, and other display fields.

## 4. Main-page wiring still required

The existing main `index.html` has not been changed in this staged branch. To finish integration, the existing voice-command handler needs to:
1. Route "open my calendar" to `JarvisGoogleCalendar.openCalendar()`.
2. Route event creation/edit requests to the matching methods after clarifying missing dates/times.
3. Ask for explicit confirmation before deletion.
4. Listen for `jarvis:calendar-open-request` to start the existing particle-to-calendar animation and for `jarvis:calendar-events` to render the real events.

The preview animation is a reference; this adapter does not copy the preview's styling into the main page. Do not merge a main-page patch until its integration points can be verified without exposing or changing existing secrets.

## Security notes

- Never put an OAuth client secret, access token, refresh token, API key, or Supabase secret in this file.
- Google will ask the user to authorize calendar access.
- Keep the requested scope limited to calendar events.
- Deletion confirmation must happen in the JARVIS interaction layer before calling the adapter.
