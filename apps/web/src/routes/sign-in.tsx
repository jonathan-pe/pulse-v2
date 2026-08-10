import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { GoogleButton } from '@/components/auth/google-button'
import { OtpStep } from '@/components/auth/otp-step'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

function SignInPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await authClient.signIn.email({ email, password })

    if (!signInError) {
      setIsSubmitting(false)
      void navigate({ to: '/' })
      return
    }

    if (signInError.code === 'EMAIL_NOT_VERIFIED') {
      await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
      setIsSubmitting(false)
      setStep('otp')
      return
    }

    setIsSubmitting(false)
    setError(signInError.message ?? 'Could not sign in.')
  }

  async function handleVerified() {
    // Email is verified now — complete the sign-in that was blocked on it.
    const { error: signInError } = await authClient.signIn.email({ email, password })
    if (signInError) {
      setStep('form')
      setError(signInError.message ?? 'Could not sign in.')
      return
    }
    void navigate({ to: '/' })
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{step === 'form' ? 'Sign in' : 'Verify your email'}</CardTitle>
          {step === 'form' ? (
            <CardDescription>Welcome back.</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {step === 'form' ? (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              <GoogleButton />
              <p className="text-center text-sm text-muted-foreground">
                New here?{' '}
                <Link to="/sign-up" className="text-foreground underline underline-offset-4">
                  Create an account
                </Link>
              </p>
            </form>
          ) : (
            <OtpStep email={email} onVerified={() => void handleVerified()} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
