import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

// Router-wide fallback (wired via createRouter's defaultErrorComponent) for
// any render error thrown inside a matched route — without this, one thrown
// error blanks the whole app instead of degrading the route that threw.
export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
