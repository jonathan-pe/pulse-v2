import { createAuthClient } from 'better-auth/react'
import { emailOTPClient, oneTapClient } from 'better-auth/client/plugins'

// No baseURL: the dev-server proxy (vite.config.ts) and the prod rewrite
// (vercel.json) both put the API behind the same origin as the app, so a
// relative /api/auth path resolves correctly in every environment.
export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    oneTapClient({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    }),
  ],
})
