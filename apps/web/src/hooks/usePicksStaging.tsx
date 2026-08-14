import { createContext, useContext, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { marketsQueryKey } from '@/hooks/usePicks'

// Carries enough display info to render a slip item on its own — a locked
// market disappears from the grid entirely (see GET /api/markets), so the
// slip can't rely on looking data back up from the fetched list.
export interface StagedPick {
  marketId: string
  outcomeIndex: 0 | 1
  eventTitle: string
  marketType: 'moneyline' | 'spreads' | 'totals'
  line: string | null
  outcomeName: string
  price: string
}

interface StagingContextValue {
  staged: Map<string, StagedPick>
  errors: Map<string, string>
  isConfirming: boolean
  stage: (pick: StagedPick) => void
  unstage: (marketId: string) => void
  clearStaged: () => void
  confirmAll: () => Promise<void>
}

const StagingContext = createContext<StagingContextValue | null>(null)

export function StagingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [staged, setStaged] = useState<Map<string, StagedPick>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const [isConfirming, setIsConfirming] = useState(false)

  // Clicking a market's already-staged outcome un-stages it; clicking the
  // other outcome switches the staged choice. Never touches a *confirmed*
  // pick — removing those is deferred to the future My Picks page.
  function stage(entry: StagedPick) {
    setErrors((prev) => {
      if (!prev.has(entry.marketId)) return prev
      const next = new Map(prev)
      next.delete(entry.marketId)
      return next
    })
    setStaged((prev) => {
      const next = new Map(prev)
      if (next.get(entry.marketId)?.outcomeIndex === entry.outcomeIndex) {
        next.delete(entry.marketId)
      } else {
        next.set(entry.marketId, entry)
      }
      return next
    })
  }

  function unstage(marketId: string) {
    setStaged((prev) => {
      if (!prev.has(marketId)) return prev
      const next = new Map(prev)
      next.delete(marketId)
      return next
    })
    setErrors((prev) => {
      if (!prev.has(marketId)) return prev
      const next = new Map(prev)
      next.delete(marketId)
      return next
    })
  }

  function clearStaged() {
    setStaged(new Map())
    setErrors(new Map())
  }

  // Fires the existing single-pick upsert once per staged leg — a batch
  // endpoint isn't worth building until there's a real combo/parlay feature
  // with its own semantics to design around. A leg can fail on its own (e.g.
  // its market locked between staging and confirming); the rest still go
  // through.
  async function confirmAll() {
    const entries = [...staged.entries()]
    if (entries.length === 0) return
    setIsConfirming(true)
    const results = await Promise.allSettled(
      entries.map(([marketId, entry]) =>
        apiFetch('/picks', { method: 'POST', body: JSON.stringify({ marketId, outcomeIndex: entry.outcomeIndex }) }),
      ),
    )
    const succeededIds = new Set<string>()
    const failedById = new Map<string, string>()
    results.forEach((result, i) => {
      const marketId = entries[i][0]
      if (result.status === 'fulfilled') {
        succeededIds.add(marketId)
      } else {
        failedById.set(marketId, result.reason instanceof Error ? result.reason.message : 'Could not confirm this pick.')
      }
    })
    // Functional updates, not a snapshot taken before the await — staging
    // something new while this confirm was in flight must survive, not get
    // clobbered by whatever `staged` looked like when confirmAll started.
    setStaged((prev) => {
      if (succeededIds.size === 0) return prev
      const next = new Map(prev)
      for (const id of succeededIds) next.delete(id)
      return next
    })
    setErrors((prev) => {
      const next = new Map(prev)
      for (const id of succeededIds) next.delete(id)
      for (const [id, message] of failedById) next.set(id, message)
      return next
    })
    setIsConfirming(false)
    void queryClient.invalidateQueries({ queryKey: marketsQueryKey })
  }

  return (
    <StagingContext.Provider value={{ staged, errors, isConfirming, stage, unstage, clearStaged, confirmAll }}>
      {children}
    </StagingContext.Provider>
  )
}

export function useStaging() {
  const ctx = useContext(StagingContext)
  if (!ctx) throw new Error('useStaging must be used within a StagingProvider')
  return ctx
}
