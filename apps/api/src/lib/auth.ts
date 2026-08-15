import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { emailOTP, oneTap } from 'better-auth/plugins'
import { Resend } from 'resend'
import { getDb } from '../db/index.js'
import * as schema from '../db/schema.js'

const resend = new Resend(process.env.RESEND_API_KEY)

const OTP_SUBJECT: Record<'sign-in' | 'email-verification' | 'forget-password' | 'change-email', string> = {
  'sign-in': 'Your Pulse sign-in code',
  'email-verification': 'Verify your Pulse email',
  'forget-password': 'Reset your Pulse password',
  'change-email': 'Confirm your new Pulse email',
}

// Public, browser-facing origin (app.playpulse.co in prod) — same-origin via
// the apps/web rewrite, see ADR: Hosting & DevOps. NOT api.playpulse.co —
// better-auth's generated links/callbacks should point where users actually
// are.
const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173'

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    // Gate sign-in on verification; routed through OTP, not the default
    // link flow, via emailOTP's overrideDefaultEmailVerification below.
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      // Google verifies email ownership itself, so a Google sign-in is
      // allowed to attach to an existing email/password account with the
      // same address instead of erroring as a duplicate.
      trustedProviders: ['google'],
    },
  },
  trustedOrigins: [baseURL],
  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        await resend.emails.send({
          from: 'Pulse <auth@playpulse.co>',
          to: email,
          subject: OTP_SUBJECT[type],
          text: `Your code is ${otp}. It expires in 5 minutes.`,
        })
      },
    }),
    // Requires "Authorized JavaScript origins" configured in Google Cloud
    // Console (baseURL's origin) — separate from the OAuth redirect URI.
    oneTap(),
  ],
})
