import type { DayBriefBlock, DayBriefBlockType } from '@travel-planner/shared'
import { Footprints, Lightbulb, Ticket, Wallet, type LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { BlockProps } from './blocks/blockProps.ts'
import { BudgetTable } from './blocks/BudgetTable.tsx'
import { HighlightBlock } from './blocks/HighlightBlock.tsx'
import { BookingCard, TipCard } from './blocks/NoteCard.tsx'
import { RouteTimeline } from './blocks/RouteTimeline.tsx'

/** Where a block goes in the card: the lead, the full-width route, the grid of notes, the budget at the end. */
export type BlockSlot = 'lead' | 'route' | 'grid' | 'budget'

type Entry<T extends DayBriefBlockType> = {
  slot: BlockSlot
  /** Visible heading; the highlight has its own title instead. */
  heading?: string
  icon?: LucideIcon
  /** Background of the block's panel. */
  tone?: string
  /** Colour of the heading. */
  headingTone?: string
  Component: ComponentType<BlockProps<Extract<DayBriefBlock, { type: T }>>>
}

/** Every block type the client knows: the model picks blocks, the app decides how they look. */
export const BLOCK_REGISTRY: { [T in DayBriefBlockType]: Entry<T> } = {
  highlight: { slot: 'lead', Component: HighlightBlock },
  route: { slot: 'route', heading: 'Route', icon: Footprints, tone: 'bg-sky', Component: RouteTimeline },
  tip: { slot: 'grid', heading: 'Tip', icon: Lightbulb, tone: 'bg-mint', Component: TipCard },
  booking: {
    slot: 'grid',
    heading: 'Book ahead',
    icon: Ticket,
    tone: 'bg-coral-soft',
    headingTone: 'text-coral-text',
    Component: BookingCard,
  },
  budgetNote: { slot: 'budget', heading: 'Day budget', icon: Wallet, Component: BudgetTable },
}

/** The registry entry for a block, or undefined for a type this client doesn't know. */
export function entryFor(block: { type: string }) {
  return Object.hasOwn(BLOCK_REGISTRY, block.type)
    ? (BLOCK_REGISTRY[block.type as DayBriefBlockType] as unknown as Entry<DayBriefBlockType>)
    : undefined
}
