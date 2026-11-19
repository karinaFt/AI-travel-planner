import type { ActivityCategory } from '@travel-planner/shared'
import {
  Landmark,
  MapPin,
  Moon,
  Mountain,
  Palette,
  ShoppingBag,
  Sun,
  TramFront,
  Trees,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  sightseeing: Landmark,
  culture: Palette,
  food: Utensils,
  nature: Trees,
  adventure: Mountain,
  relaxation: Sun,
  shopping: ShoppingBag,
  nightlife: Moon,
  transport: TramFront,
  other: MapPin,
}

/** The icon for an activity category; a map pin without one. */
export function categoryIcon(category: ActivityCategory | undefined): LucideIcon {
  return category ? CATEGORY_ICONS[category] : MapPin
}
