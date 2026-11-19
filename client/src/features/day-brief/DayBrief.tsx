import {
  activitySignature,
  type Day,
  type DayBrief as Brief,
  type DayBriefBlock,
  type TripPreferences,
} from '@travel-planner/shared'
import { format, parseISO } from 'date-fns'
import { Info, RefreshCw, Sparkles } from 'lucide-react'
import { useId, useRef } from 'react'
import { dayBriefRequest } from '../../api/dayBriefs.ts'
import { Button } from '../../components/ui/Button.tsx'
import { cx } from '../../components/ui/cx.ts'
import { useSecondsLeft } from '../../hooks/useSecondsLeft.ts'
import { describeBriefFailure, type BriefFailure } from './messages.ts'
import { DayBriefSkeleton } from './DayBriefSkeleton.tsx'
import { entryFor, type BlockSlot } from './registry.tsx'
import { useDayBrief } from './useDayBrief.ts'

type DayBriefProps = {
  day: Day
  preferences: TripPreferences
  /** Saves a new overview on the day. */
  onSave: (brief: Brief) => void
}

/**
 * The day overview: created only when the user asks, saved with the trip, and marked as out of date
 * when the day's activities change afterwards. Blocks render with the app's own components.
 */
export function DayBrief({ day, preferences, onSave }: DayBriefProps) {
  const headingId = useId()
  // What the request was made from, captured at click time, so edits made while it runs show as stale.
  const sentFrom = useRef<Pick<Brief, 'basedOn' | 'activityTitles'> | null>(null)
  const { state, create } = useDayBrief({
    onSuccess: (result) => {
      if (sentFrom.current) onSave({ ...result, ...sentFrom.current })
    },
  })
  const { brief, activities } = day
  const hasActivities = activities.length > 0
  if (!brief && !hasActivities) return null

  const loading = state.name === 'loading'
  const stale = brief !== undefined && brief.basedOn !== activitySignature(activities)

  const start = () => {
    sentFrom.current = {
      basedOn: activitySignature(activities),
      activityTitles: Object.fromEntries(activities.map((activity) => [activity.id, activity.title])),
    }
    void create(dayBriefRequest(preferences, day))
  }

  return (
    <section aria-labelledby={headingId} className="mt-6 rounded-card border border-line bg-canvas p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={headingId} className="flex items-center gap-2 text-xl text-ink">
          <Sparkles aria-hidden="true" className="size-5 text-coral" />
          Day overview
        </h3>
        {brief && hasActivities && !stale && !loading && (
          <Button variant="secondary" onClick={start}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Update overview
          </Button>
        )}
      </div>

      {!brief && !loading && (
        <div className="mt-2">
          <p className="text-muted">
            An AI-written guide to this day: how to get between the activities, what to book ahead, practical tips
            and where the money goes.
          </p>
          {state.name !== 'error' && (
            <Button className="mt-4" onClick={start}>
              <Sparkles aria-hidden="true" className="size-4" />
              Create day overview
            </Button>
          )}
        </div>
      )}

      {loading && (
        <>
          <Button className="mt-4" disabled>
            Creating overview…
          </Button>
          <DayBriefSkeleton />
        </>
      )}

      {state.name === 'error' && (
        <BriefError key={state.failedAt} failure={state.failure} failedAt={state.failedAt} onRetry={start} />
      )}

      {brief && !loading && (
        <>
          {stale && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-sky px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-ink">
                <Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                The plan for this day changed since this overview was created.
              </p>
              {hasActivities && (
                <Button className="shrink-0" onClick={start}>
                  Update overview
                </Button>
              )}
            </div>
          )}
          <BriefBlocks blocks={brief.blocks} day={day} titles={brief.activityTitles} currency={preferences.currency} />
          <p className="mt-5 text-xs text-muted">
            Created {format(parseISO(brief.generatedAt), 'd MMM yyyy, HH:mm')} · AI-generated, check details before
            you go.
          </p>
        </>
      )}

      {/* Always in the DOM, so screen readers announce changes to its text. Not role="status": the page has
          one for edits already. */}
      <p aria-live="polite" className="sr-only">
        {loading ? 'Creating the day overview' : ''}
      </p>
    </section>
  )
}

type BriefErrorProps = { failure: BriefFailure; failedAt: number; onRetry: () => void }

function BriefError({ failure, failedAt, onRetry }: BriefErrorProps) {
  const { message, retryAfterSeconds } = describeBriefFailure(failure)
  const secondsLeft = useSecondsLeft(retryAfterSeconds === undefined ? undefined : failedAt + retryAfterSeconds * 1000)
  return (
    <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl bg-coral-soft px-4 py-3">
      <p className="text-ink">{message}</p>
      <div>
        <Button onClick={onRetry} disabled={secondsLeft > 0}>
          {secondsLeft > 0 ? `Try again in ${secondsLeft} s` : 'Try again'}
        </Button>
      </div>
    </div>
  )
}

type BriefBlocksProps = {
  blocks: readonly DayBriefBlock[]
  day: Day
  titles: Brief['activityTitles']
  currency: string
}

const SLOT_ORDER: BlockSlot[] = ['lead', 'route', 'grid', 'budget']

/** The blocks in a fixed layout, whatever order they came in. Unknown types render nothing. */
function BriefBlocks({ blocks, day, titles, currency }: BriefBlocksProps) {
  const known = blocks.flatMap((block) => {
    const entry = entryFor(block)
    return entry ? [{ block, entry }] : []
  })
  const inSlot = (slot: BlockSlot) => known.filter(({ entry }) => entry.slot === slot)

  const render = ({ block, entry }: (typeof known)[number], index: number) => {
    const { Component, heading, icon: Icon, tone, headingTone } = entry
    const content = <Component block={block} activities={day.activities} titles={titles} currency={currency} />
    if (!heading) return <div key={index}>{content}</div>
    return (
      <div key={index} className={cx('rounded-xl', tone ? `${tone} px-4 py-4` : 'pt-2')}>
        <h4 className={cx('flex items-center gap-2 font-sans text-sm font-semibold tracking-wide uppercase', headingTone ?? 'text-primary')}>
          {Icon && <Icon aria-hidden="true" className="size-4" />}
          {heading}
        </h4>
        {content}
      </div>
    )
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      {SLOT_ORDER.map((slot) => {
        const items = inSlot(slot)
        if (items.length === 0) return null
        if (slot === 'grid') {
          return (
            <div key={slot} className="grid gap-4 sm:grid-cols-2">
              {items.map(render)}
            </div>
          )
        }
        return items.map(render)
      })}
    </div>
  )
}
