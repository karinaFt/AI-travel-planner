# Proposal

## Why

The server can now generate an itinerary safely (steps 7–8), but the app still stops at the review step with "This is coming soon". This step connects the review to `POST /api/itineraries/generate`. It gives users a clear experience for a request that takes several seconds and can fail in many ways: loading, cancel, a client timeout, readable errors, retry, and no lost input.

## What Changes

- **API client** (`client/src/api/`): a typed `generateItinerary(preferences, { signal })`.
  - It sends JSON to the same-origin `/api` route and checks the success body against the shared `tripSchema`.
  - It turns every outcome into one result type: success, API error (code, safe message, `Retry-After`), network failure, client timeout, cancelled, or unusable response.
- **Generate from the review**: the review's "coming soon" note is replaced by a "Generate itinerary" button.
- **Loading state**:
  - an announced "Generating your itinerary…" status with a typical-duration hint and a **Cancel** button;
  - the generate button can't be pressed twice;
  - leaving the page aborts the request.
- **Client timeout**: 45 seconds. After that the request is aborted and a timeout error shown. The server's own limit is 30 s.
- **Errors and retry**:
  - each failure shows a message users understand, with **Try again** and **Edit details**;
  - `429 RATE_LIMITED` shows how long to wait and keeps **Try again** disabled until then;
  - `VALIDATION_ERROR` offers only **Edit details**.
- **Values kept on failure**: errors, cancel and timeout keep the review and the form draft intact.
- **Generated trip page** `/trips/:id`:
  - on success the trip is kept in memory for the tab, and the app opens `/trips/:id`;
  - it shows a short summary (destination, dates, length, day titles) and a link to plan another trip;
  - an unknown or no-longer-kept ID shows "Trip not found";
  - step 10 replaces this page with the full itinerary view, and step 13 replaces the in-memory store with saved trips.
- **Preview proxy**: `npm run preview` also forwards `/api` to the API, so generation works in the production preview as in dev.

## Capabilities

### New Capabilities
- `itinerary-request`: the client's generate flow: request, loading, cancel, timeout, error messages, retry, values kept, and the generated trip page.

### Modified Capabilities
- `trip-setup`: "Trip review" now offers generation instead of saying it is coming soon.
- `build-tooling`: "Preview of production build" adds forwarding `/api` to the API.

## Impact

- **New**:
  - `client/src/api/{http,itineraries}.ts`;
  - `client/src/features/generation/` (state hook, status and error panels, messages);
  - `client/src/features/trips/` (in-memory trip store, `TripPage`);
  - tests for all of them.
- **Changed**:
  - `TripReview.tsx` and `PlanPage.tsx` (generate step);
  - `App.tsx` (`/trips/:id` route);
  - `RootLayout.tsx` (trip store provider);
  - `client/vite.config.ts` (preview proxy);
  - `README.md`.
- **Server**: no changes. **Dependencies**: none new. Tests mock `fetch`.
- **Out of scope**:
  - the full itinerary view (step 10);
  - saving trips across reloads (step 13);
  - automatic retries;
  - streaming or progress percentages;
  - showing server field errors next to form fields (client and server use the same schema).
