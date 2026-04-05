/** Jedinstveni URL i anon ključ za Supabase (middleware + browser klijent). */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ymiyqhblbqkkycpdnlaq.supabase.co'

/**
 * Isto kao podrazumevani storageKey u @supabase/supabase-js (sb-<ref>-auth-token),
 * za prepoznavanje kolačića sesije u middleware-u.
 */
export function getSupabaseAuthStorageKey(): string {
  try {
    const host = new URL(SUPABASE_URL).hostname
    const ref = host.split('.')[0] || 'localhost'
    return `sb-${ref}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
}

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk'
