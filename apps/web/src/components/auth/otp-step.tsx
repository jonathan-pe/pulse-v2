import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function OtpStep({
  email,
  onVerified,
}: {
  email: string
  onVerified: () => void
}) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsVerifying(true)
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp })
    setIsVerifying(false)
    if (error) {
      setError(error.message ?? 'That code didn’t work. Try again.')
      return
    }
    onVerified()
  }

  async function handleResend() {
    setResendState('sending')
    await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
    setResendState('sent')
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleVerify}>
      <p className="text-sm text-muted-foreground">
        Enter the code we sent to <span className="text-foreground">{email}</span>.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp">Verification code</Label>
        <Input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isVerifying || otp.length === 0}>
        {isVerifying ? 'Verifying…' : 'Verify'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={resendState === 'sending'}
        onClick={handleResend}
      >
        {resendState === 'sent'
          ? 'Code resent'
          : resendState === 'sending'
            ? 'Resending…'
            : 'Resend code'}
      </Button>
    </form>
  )
}
