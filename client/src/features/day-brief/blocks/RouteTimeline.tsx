import type { RouteBlock, RouteMode } from '@travel-planner/shared'
import { CarTaxiFront, Footprints, Route, TramFront, type LucideIcon } from 'lucide-react'
import { ActivityLink } from '../ActivityLink.tsx'
import type { BlockProps } from './blockProps.ts'

const MODES: Record<RouteMode, { label: string; Icon: LucideIcon }> = {
  walk: { label: 'Walk', Icon: Footprints },
  transit: { label: 'Transit', Icon: TramFront },
  taxi: { label: 'Taxi', Icon: CarTaxiFront },
  other: { label: 'Other', Icon: Route },
}

/** How to get from one activity to the next, as a vertical timeline. */
export function RouteTimeline({ block, activities, titles }: BlockProps<RouteBlock>) {
  return (
    <ol className="mt-3 border-l-2 border-primary/25 pl-5">
      {block.steps.map((step, index) => {
        const { label, Icon } = MODES[step.mode]
        return (
          <li key={index} className="relative pb-4 last:pb-0">
            <span aria-hidden="true" className="absolute top-2 -left-[1.6rem] size-2.5 rounded-full bg-primary" />
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <ActivityLink activityId={step.fromActivityId} activities={activities} titles={titles} showTime />
              <span aria-label="to">→</span>
              <ActivityLink activityId={step.toActivityId} activities={activities} titles={titles} showTime />
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <Icon aria-hidden="true" className="size-4" />
              <span>
                {label}
                {step.minutes !== undefined && ` · ${step.minutes} min`}
              </span>
            </p>
            {step.note && <p className="mt-0.5 text-sm text-ink">{step.note}</p>}
          </li>
        )
      })}
    </ol>
  )
}
