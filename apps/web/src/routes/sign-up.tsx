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
import { CalibrationGauge } from '@/components/picks/calibration-gauge'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
})

function SignUpPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signUpError } = await authClient.signUp.email({ name, email, password })
    if (signUpError) {
      setIsSubmitting(false)
      setError(signUpError.message ?? 'Could not create your account.')
      return
    }

    // requireEmailVerification means signUp.email() above never creates a
    // session (better-auth skips auto-sign-in whenever verification is
    // required, regardless of the autoSignIn setting) — so a real session
    // only exists after handleVerified() below explicitly signs in.
    //
    // No explicit sendVerificationOtp() call here: the emailOTP plugin's
    // overrideDefaultEmailVerification already sends one as a side effect of
    // signUp.email() itself (it wires into emailVerification.sendVerificationEmail,
    // which the core sign-up route calls whenever requireEmailVerification is
    // on). Calling it again here would just issue a second code that
    // immediately invalidates the first one (resendStrategy defaults to
    // "rotate"), wasting an email send.
    setIsSubmitting(false)
    setStep('otp')
  }

  async function handleVerified() {
    const { error: signInError } = await authClient.signIn.email({ email, password })
    if (signInError) {
      setStep('form')
      setError(signInError.message ?? 'Account created, but sign-in failed. Try signing in.')
      return
    }
    void navigate({ to: '/' })
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 grid-cols-[1fr_384px] items-center gap-12 px-4 py-16 max-lg:grid-cols-1 max-lg:gap-6 max-lg:py-10">
      <div className="max-lg:hidden">
        <div className="mb-2 font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Free · every game · every week
        </div>
        <h1 className="mb-2 font-heading text-3xl leading-tight font-semibold text-foreground">
          Being right isn't enough.
          <br />
          Being sure counts too.
        </h1>
        <p className="mb-6 max-w-[38ch] text-sm text-muted-foreground">
          Free picks, real odds, and a score that shows exactly how sharp your reads are — not just whether you won.
        </p>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <div className="mb-3 font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Calibration — example
          </div>
          <CalibrationGauge brierScore={0.14} caption="Top 18% last week" />
        </div>
      </div>

      <Card className="w-full max-w-sm justify-self-center">
        <CardHeader>
          <CardTitle>{step === 'form' ? 'Create an account' : 'Verify your email'}</CardTitle>
          {step === 'form' ? (
            <CardDescription>Free picks, real odds, and a score that shows exactly how sharp your reads are.</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {step === 'form' ? (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </Button>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              <GoogleButton />
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/sign-in" className="text-foreground underline underline-offset-4">
                  Sign in
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
