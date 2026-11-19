import type { BookingBlock, TipBlock } from '@travel-planner/shared'
import { ActivityLink } from '../ActivityLink.tsx'
import type { BlockProps } from './blockProps.ts'

/** The text of a tip or booking block and the activities it is about. */
function NoteBody({ block, activities, titles }: BlockProps<TipBlock | BookingBlock>) {
  return (
    <>
      <p className="mt-2 text-ink">{block.text}</p>
      {block.activityIds.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm" aria-label="About">
          {block.activityIds.map((id) => (
            <li key={id}>
              <ActivityLink activityId={id} activities={activities} titles={titles} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export const TipCard = (props: BlockProps<TipBlock>) => <NoteBody {...props} />
export const BookingCard = (props: BlockProps<BookingBlock>) => <NoteBody {...props} />
