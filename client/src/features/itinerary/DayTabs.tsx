import type { Day } from '@travel-planner/shared'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cx } from '../../components/ui/cx.ts'
import { DAY_PANEL_ID, dayTabId } from './dayIds.ts'
import { formatDayDate } from './format.ts'

type DayTabsProps = {
  days: readonly Day[]
  selected: number
  onSelect: (dayNumber: number) => void
}

/**
 * One tab per day (WAI-ARIA tabs with automatic activation): only the selected tab is in the Tab order,
 * and the arrow keys (wrapping), Home and End move focus and select.
 */
export function DayTabs({ days, selected, onSelect }: DayTabsProps) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    // jsdom has no scrollIntoView.
    tabs.current[selected - 1]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [selected])

  function onKeyDown(event: KeyboardEvent) {
    const last = days.length
    const next = {
      ArrowRight: selected === last ? 1 : selected + 1,
      ArrowLeft: selected === 1 ? last : selected - 1,
      Home: 1,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onSelect(next)
    tabs.current[next - 1]?.focus()
  }

  return (
    <div role="tablist" aria-label="Days" onKeyDown={onKeyDown} className="-m-2 flex gap-1 overflow-x-auto p-2">
      {days.map((day, i) => {
        const isSelected = day.dayNumber === selected
        return (
          <button
            key={day.id}
            ref={(element) => {
              tabs.current[i] = element
            }}
            type="button"
            role="tab"
            id={dayTabId(day.dayNumber)}
            aria-selected={isSelected}
            aria-controls={DAY_PANEL_ID}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(day.dayNumber)}
            className={cx(
              'flex shrink-0 flex-col items-start rounded-t-lg border-b-2 px-4 py-2 text-left transition-[color,background-color,border-color] motion-reduce:transition-none',
              isSelected
                ? 'border-primary bg-mint text-primary'
                : 'border-transparent text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {/* The space keeps the accessible name "Day 2 Wed, 11 Nov"; a flex container does not render it. */}
            <span className="font-semibold">Day {day.dayNumber}</span>{' '}
            <span className="text-sm">{formatDayDate(day.date, 'short')}</span>
          </button>
        )
      })}
    </div>
  )
}
