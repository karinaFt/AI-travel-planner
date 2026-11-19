import type { HighlightBlock as Highlight } from '@travel-planner/shared'
import { createElement, useState } from 'react'
import { ActivityLink } from '../ActivityLink.tsx'
import { categoryIcon } from '../categoryIcon.ts'
import type { BlockProps } from './blockProps.ts'

/** The day's lead: a photo of its main place (or a tinted panel), a title and a short summary. */
export function HighlightBlock({ block, activities, titles }: BlockProps<Highlight>) {
  const [failed, setFailed] = useState(false)
  const linkedId = block.activityIds[0]
  const linked = activities.find((activity) => activity.id === linkedId)
  const showPhoto = block.image && !failed

  return (
    <div>
      {showPhoto ? (
        <figure>
          <img
            src={block.image!.url}
            alt={`Photo of ${block.place ?? block.title}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="aspect-video w-full rounded-xl bg-sky object-cover"
          />
          <figcaption className="mt-1.5 text-xs text-muted">
            <a href={block.image!.sourceUrl} target="_blank" rel="noreferrer">
              Photo: Wikimedia Commons
            </a>
          </figcaption>
        </figure>
      ) : (
        <div
          data-testid="highlight-fallback"
          className="flex aspect-video w-full items-center justify-center rounded-xl bg-linear-to-br from-sky to-mint"
        >
          {createElement(categoryIcon(linked?.category), {
            'aria-hidden': true,
            className: 'size-14 text-primary/70',
            strokeWidth: 1.5,
          })}
        </div>
      )}
      <h4 className="mt-5 text-2xl text-ink">{block.title}</h4>
      <p className="mt-2 text-ink">{block.text}</p>
      {linkedId && (
        <p className="mt-2 text-sm text-muted">
          Featuring <ActivityLink activityId={linkedId} activities={activities} titles={titles} />
        </p>
      )}
    </div>
  )
}
