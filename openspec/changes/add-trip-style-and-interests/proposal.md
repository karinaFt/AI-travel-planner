# Proposal

## Why

The trip basics alone (where, when, budget, how many people) are not enough for the AI to plan a trip that suits the traveler. It also needs to know what kind of trip they want, how busy the days should be, what they enjoy, and optionally where they start from, so that arrival and departure days are planned sensibly.

Two more problems show up in today's flow:
- The summary after "Continue" is a stand-in for a proper review step.
- Entered values disappear as soon as the user leaves `/plan`.

This step completes the trip description, so the generation steps (6–9) can work from a full, validated set of trip preferences.

## What Changes

- Extend the shared schema from trip basics to **trip preferences**. Besides the existing basics, it gains:
  - `origin` ("Starting from"): optional free text. When given, 2–100 characters after trimming; an empty value means not provided;
  - `travelStyle`: one of relaxation, adventure, culture, food, nature. Required, no default;
  - `pace`: relaxed, balanced or packed. Default balanced;
  - `interests`: up to 10 items, each 2–40 characters after trimming, unique ignoring case. An empty list is allowed.
- Extend the `/plan` form:
  - an optional "Starting from" field in "Where & when";
  - a new "Your style" section with travel style and pace as accessible radio cards, and an interests list (add with Enter or a button, remove per item);
  - the submit button becomes "Review trip".
- State on the form that the budget covers the trip at the destination, not getting there and back.
- **BREAKING** (spec-level): replace the basics summary with a review step. It shows every preference (the basics with the trip length in days, plus starting point, style, pace and interests), offers "Edit details" to return to the form, and says that itinerary generation comes next.
- **Draft retention**: values entered on `/plan` are kept while the user moves between pages in the same tab. They are not kept across a full reload. This replaces the temporary "keep the form mounted but hidden" trick from step 4.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `trip-setup`:
  - The form requirement is renamed from "Trip basics form" to "Trip preferences form" and lists the new fields and the "Review trip" button.
  - "Valid submission" now produces full trip preferences and shows a review step.
  - New requirements cover the starting point, travel style, pace, interests, the budget scope note and draft retention.

## Impact

- **shared**: `src/trip-preferences.ts` (new schema extending `tripBasicsSchema`, the constants `TRAVEL_STYLES`, `PACES` and `INTEREST_LIMITS`, and the messages), `src/index.ts`, tests.
- **client**:
  - `features/trip-setup/`: the form schema now covers preferences; new `TravelStyleField`, `PaceField` and `InterestsField` components; the review replaces the summary; new `TripDraftProvider`;
  - `components/ui/`: a `RadioCardGroup` primitive;
  - `layouts/RootLayout.tsx`: hosts the draft provider;
  - `pages/PlanPage.tsx`, tests, README.
- **Docs**: `openspec/ROADMAP.md` already records the "Starting from" decision; step 5 is marked done on archive.
- **Dependencies**: none new.
- **Out of scope**:
  - calling the API and the "Generate itinerary" action (step 9);
  - keeping the draft across reloads (localStorage comes with saved trips in step 13);
  - a places dropdown or autocomplete for the destination or starting point;
  - travel costs to the destination.
