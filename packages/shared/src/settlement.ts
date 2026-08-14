/**
 * Pick lifecycle & settlement — derives status/points from data ingestion
 * already writes (market.resolvedOutcomeIndex) rather than storing them.
 * See: implementation plan, "Settlement & My Picks".
 */

import { calculatePoints } from './points.js'

export type PickOutcomeStatus = 'upcoming' | 'pending' | 'won' | 'lost'

export interface ScoredPick {
  status: PickOutcomeStatus
  /** Set only once status is 'won' or 'lost'. */
  points: number | null
}

export function scorePick(input: {
  outcomeIndex: number
  priceAtPick: number
  marketStatus: 'scheduled' | 'closed' | 'resolved'
  resolvedOutcomeIndex: number | null
  eventStartTime: Date
  now?: Date
}): ScoredPick {
  const now = input.now ?? new Date()

  if (input.marketStatus === 'scheduled' && now < input.eventStartTime) {
    return { status: 'upcoming', points: null }
  }
  if (input.marketStatus !== 'resolved' || input.resolvedOutcomeIndex === null) {
    return { status: 'pending', points: null }
  }

  const isCorrect = input.outcomeIndex === input.resolvedOutcomeIndex
  return {
    status: isCorrect ? 'won' : 'lost',
    points: calculatePoints(input.priceAtPick, isCorrect),
  }
}
