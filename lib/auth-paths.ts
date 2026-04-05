/** Zaštićene stranice aplikacije — usklađeno sa middleware-om. */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/prihodi',
  '/faktura',
  '/fakture',
  '/kpo',
  '/settings',
  '/profil',
  '/rashodi',
  '/doo',
  '/onboarding',
] as const

export function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
