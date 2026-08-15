import { useQuery } from '@tanstack/react-query'
import { apiFetch, type EventWithMarkets, type PickResult } from '@/lib/api'

// Exported so usePicksStaging can invalidate the same cache entry after a
// confirm — picking and confirming are two different code paths now.
export const marketsQueryKey = ['markets'] as const

export function useMarkets(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: marketsQueryKey,
    queryFn: () => apiFetch<{ events: EventWithMarkets[] }>('/markets'),
    enabled: options.enabled,
  })
}

export function useMyPicks(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['my-picks'],
    queryFn: () => apiFetch<{ picks: PickResult[] }>('/picks'),
    enabled: options.enabled,
  })
}
