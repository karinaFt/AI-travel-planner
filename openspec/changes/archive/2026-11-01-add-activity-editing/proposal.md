# Proposal

## Why

The trip page (steps 10–11) shows the AI's plan and whether it fits the budget, but the traveler can't change anything. AI plans are a starting point: a museum is closed, a dinner is too expensive, a day is too packed. This step lets the user add, edit, delete and move activities, with the day totals and the budget summary updating as they go. Step 14 then saves the edited trip.

## What Changes

- **Edit an activity** in place on the day timeline: title, day, start time, duration, category, estimated cost and description, in a form with the same validation as the generated data.
- **Move an activity** to another day by changing its day in the same form.
- **Add an activity** to the selected day with an "Add activity" button below the day's list, or in the empty-day message. A day holds at most 20 activities; a full day says so instead of offering the button, and a full day can't be picked as the target of a move.
- **Delete an activity** with an in-page confirmation ("Delete" / "Keep"), never `window.confirm`.
- **Activities stay in start-time order** after every change. An edit that keeps the time keeps the activity's place among activities at the same time; added and moved activities go after them.
- **Costs follow the edits**: the day cost, the activity count, the budget summary and the cost-by-day table are recomputed from the edited trip.
- **Status messages** in a polite live region say what happened ("Added "Tram 28".", "Moved "Lunch" to Day 2.", "Deleted "Lunch"."), and focus lands somewhere predictable after each action.
- **A pure reducer** applies every change to the trip: stable IDs (new IDs come with the action), new and edited activities always in the trip currency, re-sorting, and a `tripSchema` guard that leaves the trip unchanged if a result would be invalid.
- **The edited trip goes back to the trip store**, so leaving the page and returning within the tab shows the edits. It is still lost on reload until step 14.

## Capabilities

### New Capabilities
- `activity-editing`: adding, editing, moving and deleting activities on the trip page, validation, ordering, delete confirmation, focus and announcements, and keeping the edited trip.

### Modified Capabilities
- None. The `itinerary-view` and `budget-summary` requirements already describe totals as sums of the current activities. They hold unchanged for an edited trip.

## Impact

- **New**:
  - `client/src/features/editing/`: `editTrip` reducer, `activityFormSchema`, `ActivityForm` and `DeleteConfirmation`, with tests;
  - `client/src/components/ui/TextArea.tsx`.
- **Changed**:
  - `client/src/features/itinerary/ItineraryView.tsx` (holds the trip in a reducer and saves it to the store), `DayTimeline.tsx` (add button, open form, status messages), `ActivityItem.tsx` (Edit and Delete), and their tests;
  - `client/src/pages/TripPage.tsx` (keys the view by trip ID);
  - `README.md` (trip page section);
  - `openspec/ROADMAP.md` (the Editing decision, recorded as built).
- **Server and shared schemas**: no changes. **Dependencies**: none new (react-hook-form, Zod and the resolver are already used by the trip form).
- **Out of scope**:
  - editing day titles, the budget, the trip preferences, or regenerating a day with AI;
  - reordering by drag and drop (order comes from start times);
  - undo;
  - saving across reloads (step 14).
