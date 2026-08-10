import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  const [isPending, setIsPending] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isPending}
      onClick={() => {
        setIsPending(true)
        void authClient.signIn.social({ provider: 'google', callbackURL: '/' })
      }}
    >
      {isPending ? 'Redirecting…' : label}
    </Button>
  )
}
