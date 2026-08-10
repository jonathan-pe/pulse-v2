import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { emailOTP, oneTap } from 'better-auth/plugins'
import { getDb } from '../db/index.js'
import * as schema from '../db/schema.js'

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
        // No Resend key yet — console fallback, matches v1's dev pattern.
        // Swap for a real sendEmail() call once RESEND_API_KEY exists;
        // shape of this callback won't need to change.
        console.log(`[auth] ${type} OTP for ${email}: ${otp}`)
      },
    }),
    // Requires "Authorized JavaScript origins" configured in Google Cloud
    // Console (baseURL's origin) — separate from the OAuth redirect URI.
    oneTap(),
  ],
})
