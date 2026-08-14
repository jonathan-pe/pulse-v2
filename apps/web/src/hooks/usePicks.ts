import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, type EventWithMarkets } from '@/lib/api'

const marketsQueryKey = ['markets'] as const

export function useMarkets() {
  return useQuery({
    queryKey: marketsQueryKey,
    queryFn: () => apiFetch<{ events: EventWithMarkets[] }>('/markets'),
  })
}

export function useSubmitPick() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { marketId: string; outcomeIndex: 0 | 1 }) =>
      apiFetch('/picks', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketsQueryKey })
    },
  })
}

export function useWithdrawPick() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (marketId: string) => apiFetch(`/picks/${marketId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketsQueryKey })
    },
  })
}
