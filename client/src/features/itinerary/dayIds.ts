/** IDs that tie each day tab to the single day panel. */
export const DAY_PANEL_ID = 'day-panel'
export const dayTabId = (dayNumber: number) => `day-tab-${dayNumber}`

/** The element ID of an activity in the day list, so the day overview can jump to it. */
export const activityAnchorId = (activityId: string) => `activity-${activityId}`
