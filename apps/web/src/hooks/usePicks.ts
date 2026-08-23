import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch, type EventWithMarkets, type ListMyPicksResponse } from '@/lib/api'
import { myPicksSearchToQueryString, type MyPicksSearch } from '@/lib/picks-search'

// Home page / league directory need every pick to compute per-league
// records — the paginated My Picks table below has its own hook.
export function useAllMyPicks(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['my-picks-all'],
    queryFn: () => apiFetch<ListMyPicksResponse>('/picks?limit=all'),
    enabled: options.enabled,
  })
}

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

export function useMyPicks(search: MyPicksSearch) {
  return useQuery({
    queryKey: ['my-picks', search],
    queryFn: () => apiFetch<ListMyPicksResponse>(`/picks?${myPicksSearchToQueryString(search)}`),
    placeholderData: keepPreviousData,
  })
}
