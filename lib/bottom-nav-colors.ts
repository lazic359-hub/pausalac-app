/** Boja teksta/ikonice kada stavka nije aktivna — blaga nijansa po sekciji (vidi globals.css). */
export function bottomNavIdleColor(key: string): string {
  switch (key) {
    case 'dashboard':
      return 'var(--bottom-nav-idle-pregled)'
    case 'prihodi':
    case 'fakture':
      return 'var(--bottom-nav-idle-prihodi)'
    case 'faktura':
      return 'var(--bottom-nav-idle-faktura)'
    case 'kpo':
      return 'var(--bottom-nav-idle-kpo)'
    case 'doo':
      return 'var(--bottom-nav-idle-doo)'
    case 'settings':
      return 'var(--bottom-nav-idle-profil)'
    default:
      return 'var(--text-muted)'
  }
}
