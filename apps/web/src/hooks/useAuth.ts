import { authClient } from '../lib/auth-client'

// Thin wrapper around authClient.useSession() so components get the current
// user alongside the action methods (signIn/signUp/signOut/oneTap) from a
// single import.
export function useAuth() {
  const { data, isPending, error, refetch } = authClient.useSession()

  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    isPending,
    error,
    refetch,
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: authClient.signOut,
    oneTap: authClient.oneTap,
  }
}
