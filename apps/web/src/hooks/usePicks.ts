import { useQuery } from '@tanstack/react-query'
import { apiFetch, type EventWithMarkets } from '@/lib/api'

// Exported so usePicksStaging can invalidate the same cache entry after a
// confirm — picking and confirming are two different code paths now.
export const marketsQueryKey = ['markets'] as const

export function useMarkets() {
  return useQuery({
    queryKey: marketsQueryKey,
    queryFn: () => apiFetch<{ events: EventWithMarkets[] }>('/markets'),
  })
}
