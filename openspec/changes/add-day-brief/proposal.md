# Proposal

## Why

A day in the itinerary is only a title and a list of activities. Nothing explains how the day fits together: how to get from one place to the next, what to book ahead, where the money goes, what is worth knowing on the spot. Writing that for every day during the main generation would make the request bigger and slower, and the free Gemini quota would pay for days nobody opens. This change adds a **Day overview** that the user creates for one day with a button. The model decides which parts the day needs, and the app shows them with its own components (generative UI). The model never writes markup.

## What Changes

- **"Create day overview" button** in the day panel, between the day heading and the activity list. Nothing is generated automatically. Days without activities show no button.
- **New endpoint `POST /api/days/brief`.** It takes the trip context and the day's activities and returns up to 5 **blocks** from a fixed catalog:
  - `highlight`: title, 2–3 sentence summary, and a place name for a photo;
  - `route`: steps between activities, each with a mode (walk, transit, taxi, other), minutes and a short note;
  - `tip` and `booking`: short text linked to specific activities;
  - `budgetNote`: a comment on the day's spending. The numbers are computed in the browser from the activities, never by the model.
- **The model refers to activities by short keys** (`a1`, `a2`, …), never by UUID. The server maps the keys back and drops each block that is invalid or references an unknown key, instead of failing the whole answer.
- **Photos come from Wikipedia, not the model.** The server looks up the highlight's place name with the Wikipedia API (free, no key) and adds the image URL and a link to its Wikimedia Commons file page. When nothing is found, the block shows a tinted panel with the activity's category icon. The model never returns URLs.
- **The overview is saved with the trip.** `Day` gains an optional `brief` (`blocks`, `basedOn`, `generatedAt`). Trips saved before this change stay valid.
- **Stale overview notice.** `basedOn` is a signature of the day's activities. When the user edits the day afterwards, the overview stays and shows "The plan for this day changed" with an "Update overview" button. It never regenerates on its own.
- **Interactive blocks.** Each activity mentioned in a route step, tip or booking is a button that scrolls to that activity in the list, focuses it and briefly highlights it.
- **Own protection for briefs.** Briefs have their own per-IP rate limit (10/min, 60/hour) and their own one-at-a-time guard, so creating overviews never blocks trip generation and the reverse.
- **Content Security Policy** allows images from the Wikimedia media hosts (`https://upload.wikimedia.org`, `https://thumb.wikimedia.org`). The rest of helmet's defaults stay.
- **New dependency:** `lucide-react` for icons. No component library: the blocks use the existing `Card`, `Button` and Tailwind theme tokens.

## Capabilities

### New Capabilities
- `day-brief-generation`: the `POST /api/days/brief` endpoint, its request and block contracts, activity keys, normalization, photo lookup, rate limit, one-at-a-time guard, timeout and errors.
- `day-brief`: the Day overview in the day panel: create button, loading skeleton, errors and retry, block rendering and layout, photos and fallbacks, links to activities, saving with the trip and the stale notice.

### Modified Capabilities
- `itinerary-view`: "Day timeline" gains the Day overview area between the day heading and the activity list.
- `api-server`: "Security headers" adds a Content Security Policy that allows Wikimedia images.

## Impact

- **New**:
  - `shared/src/day-brief.ts`: block catalog, `dayBriefSchema`, request schema, `activitySignature`, plus tests;
  - `server/src/ai/brief-prompt.ts`, `brief-response-schema.ts`, `brief-normalize.ts`, `generate-brief.ts`;
  - `server/src/photos/wikipedia.ts` (lookup with timeout and an in-memory cache);
  - `server/src/routes/day-briefs.ts`;
  - `client/src/api/dayBriefs.ts`;
  - `client/src/features/day-brief/`: `useDayBrief.ts`, `DayBrief.tsx`, `registry.tsx`, `blocks/` (`HighlightBlock`, `RouteTimeline`, `TipCard`, `BookingCard`, `BudgetTable`), `ActivityLink.tsx`, `DayBriefSkeleton.tsx`, plus tests.
- **Changed**:
  - `shared/src/itinerary.ts` (optional `brief` on `daySchema`) and `shared/src/index.ts`;
  - `server/src/app.ts` (CSP directives, brief rate limit, router), `server/src/protection.ts` (`BRIEF_LIMITS`);
  - `client/src/features/editing/editTrip.ts` (a `setBrief` action through the same `tripSchema` guard and auto-save);
  - `client/src/features/itinerary/DayTimeline.tsx` and `ActivityItem.tsx` (an anchor and a focus target for each activity);
  - `client/package.json` (`lucide-react`), `README.md`, `openspec/ROADMAP.md`.
- **Unchanged**: the generate endpoint, its prompt and its limits; the saved-trips storage format (`version: 1`).
- **Running cost**: still free. One Gemini Flash-Lite call per click with a short answer, and at most one Wikipedia lookup per overview.
- **Out of scope**:
  - creating overviews automatically or for all days at once;
  - streaming blocks as they are generated;
  - maps, live opening hours, prices or availability;
  - AI-generated images, or photos for blocks other than `highlight`;
  - editing an overview by hand, or chatting with the model about it;
  - languages other than English.
