# Design

## Context

What the client has now:
- **`PlanPage`** holds a `Step` (`form` | `review` with the preferences) and moves focus between the steps.
- **`TripReview`** shows the summary, a "coming soon" note and "Edit details".
- **`TripDraftProvider`** (inside `RootLayout`) keeps the form values in a ref for the tab.
- **Routing:** the routes are `/`, `/plan` and `*`. The layout focuses the new page's `h1` after in-app navigation.
- **Tests:** Vitest + jsdom + Testing Library, `renderWithRouter` (MemoryRouter), and `testUtils.tsx` helpers that fill the form. There is no `fetch` mocking library.

What the server and shared code provide (steps 6–8):
- `POST /api/itineraries/generate` returns `{ data: { trip } }` or the error envelope.
- `shared` exports `tripSchema`, `apiErrorBodySchema` and `ERROR_CODES`, whose messages are safe for users.
- The server times out after 30 s, answers `429` with `Retry-After`, `409` while busy, and `503` with no key.
- Vite proxies `/api` in dev only; `vite preview` has no proxy.

The user chose to open a minimal `/trips/:id` page on success, backed by an in-memory store. Steps 10 and 13 replace the page and the store.

## Goals / Non-Goals

**Goals:**
- One small API client that turns every outcome into a typed result. UI code never handles raw `fetch` errors.
- Clear, accessible loading, cancel, error and retry states on the review. The user never loses input.
- A seam for steps 10 and 13: a `TripStore` interface and a route that can grow into the full view.

**Non-Goals:**
- The full itinerary view, persistence, automatic retries, progress streaming.
- Mapping server field errors onto form fields.

## Decisions

### D1. Layout
```
client/src/api/http.ts                    postJson(): fetch + envelope parsing → ApiResult<T>
client/src/api/itineraries.ts             generateItinerary(preferences, { signal }) → ApiResult<Trip>
client/src/features/generation/
  useGeneration.ts                        state machine hook (idle | loading | error | cancelled)
  messages.ts                             failure → { message, canRetry, retryAfterSeconds? }
  GenerationStatus.tsx                    loading panel + Cancel
  GenerationError.tsx                     error panel, Try again (with countdown), Edit details
client/src/features/trips/
  tripStoreContext.ts, TripStoreProvider.tsx   in-memory Map<id, Trip> for the tab
client/src/pages/TripPage.tsx             /trips/:id summary or "Trip not found" (pages/ holds one component per route)
```

### D2. The result type
```ts
type ApiFailure =
  | { kind: 'api'; code: ApiErrorCode; message: string; retryAfterSeconds?: number }
  | { kind: 'network' }       // fetch rejected without our abort
  | { kind: 'timeout' }       // our 45 s timer fired
  | { kind: 'cancelled' }     // the caller's signal fired
  | { kind: 'invalid-response' } // 2xx body failing the schema, or non-JSON
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure }
```

How `postJson(path, body, { signal, timeoutMs, parse })` works:
- **Never throws.** It runs `fetch` with `Content-Type: application/json`, `Accept: application/json` and its own `AbortController`.
- **Abort sources:** the caller's signal and a `setTimeout(timeoutMs)` both abort that controller, and a local flag records which one fired. We don't use `AbortSignal.any` or `AbortSignal.timeout`, so the reason stays explicit and fake timers work in tests.
- **Success:** a 2xx response with a parsable body gives `ok: true`. Otherwise the result is `invalid-response`.
- **Error responses:**
  - a non-2xx response whose body passes `apiErrorBodySchema` gives `api` with that code and message;
  - `Retry-After` (whole seconds) is parsed when present;
  - a non-2xx response with an unreadable body gives `api` with `INTERNAL_ERROR` and its shared message.
- **Rejected `fetch`:** it becomes `cancelled`, `timeout` or `network`, depending on the flag.
- **Clean-up:** the timer is cleared in `finally`.

`generateItinerary` calls `postJson('/api/itineraries/generate', preferences, { signal, timeoutMs: 45_000, parse: (b) => tripSchema.parse(b.data.trip) })`. The constant `CLIENT_TIMEOUT_MS = 45_000` lives in `api/itineraries.ts`.

### D3. Messages (`messages.ts`)
- **`api`:** use the server's `message`. Two exceptions:
  - `RATE_LIMITED` with `retryAfterSeconds` → "Too many requests. You can try again in N seconds." (or "in N minutes" from 120 s up, rounded up);
  - `VALIDATION_ERROR` → "Some of the trip details are not valid. Please edit them and try again.", with `canRetry: false`.
- **`timeout`:** `ERROR_CODES.AI_TIMEOUT.message`.
- **`invalid-response`:** `ERROR_CODES.AI_INVALID_RESPONSE.message`.
- **`network`:** "We couldn't reach the server. Check your connection and try again."
- **`cancelled`:** not an error; the hook handles it.

All other codes get `canRetry: true`.

### D4. `useGeneration(preferences)` state machine
- **States:** `idle` → `loading` → `idle` (cancelled, with notice) | `error` (with failure) | success.
- **`generate()`:**
  - ignored while loading;
  - creates a controller and calls `generateItinerary`;
  - on success it calls `onSuccess(trip)`.
- **`cancel()`:** aborts the controller and sets `{ name: 'idle', notice: 'cancelled' }`.
- **On unmount:** an effect clean-up aborts any running request, and results that arrive after unmount or cancel are ignored (a request-sequence ref).
- **Rate limit:** when `retryAfterSeconds` is set, the hook keeps `retryAvailableAt = Date.now() + s*1000`. `GenerationError` runs a 1 s interval to show the remaining seconds and enables "Try again" at zero.
- **Where it lives:** in `TripReview`'s parent (`PlanPage`), so "Edit details" can still go back to the form. The review step keeps its preferences, and the draft keeps the form values, so nothing is lost on failure.

### D5. UI and accessibility
- **Review footer by state:**
  - `idle`: primary "Generate itinerary" plus secondary "Edit details", with a polite "Generation cancelled." line after a cancel;
  - `loading`: `GenerationStatus` replaces it;
  - `error`: `GenerationError` replaces it.
- **`GenerationStatus`:**
  - `role="status"` with "Generating your itinerary…" and "This usually takes up to half a minute.";
  - a small spinner that becomes static under reduced motion, via the existing `prefers-reduced-motion` rule;
  - a secondary "Cancel" button, focused when loading starts so keyboard users can cancel at once.
- **`GenerationError`:**
  - `role="alert"`, a heading "We couldn't generate your itinerary" and the message;
  - a primary "Try again" (when `canRetry`), labelled "Try again in N s" and `disabled` during a countdown;
  - a secondary "Edit details";
  - focus moves to the heading (`tabIndex=-1`) when it appears.
- **Copy:** in English, like the rest of the UI. Colors come from existing tokens; error text uses the existing error color.

### D6. Trip store and `/trips/:id`
- **Store:**
  - `TripStore = { get(id): Trip | undefined; save(trip): void }`, held in a `Map` ref by `TripStoreProvider`, which wraps the outlet next to `TripDraftProvider` in `RootLayout`;
  - step 13 swaps the implementation for localStorage behind the same interface.
- **Navigation:** on success, `PlanPage` saves the trip and calls `navigate('/trips/' + trip.id)`. The layout's focus handling moves focus to the new `h1`.
- **`TripPage`:**
  - reads `useParams().id`;
  - when found: `PageHeading` with the destination, the date range and day count (reusing `formatDate` and `plural`), an ordered list "Day N · title", a note "The full day-by-day view is coming soon.", and a `ButtonLink` "Plan another trip" to `/plan`;
  - title `"${destination} trip"` through `useDocumentTitle`;
  - when not found: the heading "Trip not found", the reload explanation, a link to `/plan`, and the title "Trip not found".
- **Draft:** it is left as it is after success, so `/plan` still shows the values (spec: "Form kept after success").

### D7. Preview proxy
`client/vite.config.ts` defines the proxy once and uses it for both `server.proxy` and `preview.proxy`, with the same `API_PROXY_TARGET` default.

### D8. Tests
- **`api/http.test.ts`** and **`api/itineraries.test.ts`**, with `vi.stubGlobal('fetch', …)`:
  - success and schema failure;
  - envelope error with `Retry-After`;
  - non-JSON 500 → `INTERNAL_ERROR`;
  - a network `TypeError`;
  - caller abort → `cancelled`;
  - fake timers at 45 s → `timeout`, with the fetch signal aborted.
- **`messages.test.ts`:** every failure kind and the minutes rounding.
- **`features/generation/*.test.tsx`** (full `App` at `/plan`, with `testUtils` to reach the review):
  - the request body equals the reviewed preferences;
  - loading status and Cancel, no double submit;
  - cancel → notice and values kept;
  - 503 message with both buttons;
  - network message;
  - 429 with fake timers: disabled, then enabled after 40 s;
  - 400 → only Edit details;
  - a retry sends a second request;
  - the 45 s timeout message;
  - Edit details after an error shows all values;
  - leaving the page aborts with no console error;
  - focus goes to Cancel, then to the error heading.
- **`features/trips/TripPage.test.tsx`:**
  - success navigates to `/trips/<id>` with the heading, dates, "3 days", day titles and tab title;
  - an unknown ID shows not found with its title;
  - after success `/plan` still shows the values.
- **Mock data:** a `tripFixture()` built to pass `tripSchema`, in `client/src/test/`.

## Risks / Trade-offs

- **The in-memory store loses trips on reload.** → The not-found page explains it, and step 13 adds persistence.
- **A cancel aborts only the browser request.** The server keeps its slot until it sees the disconnect (it does, in step 8) and may still use free-tier quota. → This is acceptable. A quick retry right after a cancel may briefly get `409 GENERATION_IN_PROGRESS`, which shows its own clear message with "Try again".
- **The client timeout (45 s) is longer than the server's (30 s)**, so the user normally sees the server's `504`. The client timer only covers a hung connection or proxy. → That is intended.
- **Fake timers with user-event hang**: Testing Library's async wrapper waits on a `setTimeout(0)` that Vitest's fake time never fires. → The timer tests reach the review with real timers, then fake all timers and click with the synchronous `fireEvent`, advancing time inside `act`.

## Migration Plan

Client-only. No new dependencies or configuration. To roll back, revert the commit.
