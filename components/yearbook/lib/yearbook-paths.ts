/**
 * Path per section sidebar yearbook. Setiap sidebar punya path sendiri agar navigasi instant.
 */

export const SECTION_SLUGS = ['sampul', 'kelas', 'preview', 'sambutan', 'flipbook', 'akses', 'tim', 'ai-labs'] as const
export type SectionSlug = typeof SECTION_SLUGS[number]

export type SectionMode = 'cover' | 'classes' | 'approval' | 'team' | 'sambutan' | 'ai-labs' | 'flipbook' | 'preview'

const SLUG_TO_MODE: Record<SectionSlug, SectionMode> = {
  sampul: 'cover',
  kelas: 'classes',
  preview: 'preview',
  sambutan: 'sambutan',
  flipbook: 'flipbook',
  akses: 'approval',
  tim: 'team',
  'ai-labs': 'ai-labs',
}

const MODE_TO_SLUG: Record<SectionMode, SectionSlug | null> = {
  cover: 'sampul',
  classes: 'kelas',
  preview: 'preview',
  sambutan: 'sambutan',
  flipbook: 'flipbook',
  approval: 'akses',
  team: 'tim',
  'ai-labs': 'ai-labs',
}

const BASE_USER = '/user/portal/album/yearbook'
const BASE_ADMIN = '/admin/album/yearbook'

/** Base path album (sampul/cover). Deteksi admin dari pathname agar sidebar tidak selalu balik ke Sampul. */
export function getYearbookBasePath(id: string, pathname?: string | null): string {
  if (pathname && pathname.startsWith(BASE_ADMIN + '/')) return `${BASE_ADMIN}/${id}`
  return `${BASE_USER}/${id}`
}

/** Path untuk section tertentu. Cover = base tanpa segment. */
export function getYearbookSectionPath(id: string, mode: SectionMode, pathname?: string | null): string {
  const slug = MODE_TO_SLUG[mode]
  const base = getYearbookBasePath(id, pathname)
  return slug ? `${base}/${slug}` : base
}

/** URL dengan query ?section= untuk navigasi instant. Beri pathname saat dipanggil dari konteks admin. */
export function getYearbookSectionQueryUrl(id: string, mode: SectionMode, pathname?: string | null): string {
  const slug = MODE_TO_SLUG[mode]
  const base = getYearbookBasePath(id, pathname)
  return slug ? `${base}?section=${slug}` : base
}

/** Ambil section mode dari pathname. Return 'cover' jika di base path atau segment sampul. */
export function getSectionModeFromPathname(pathname: string | null, id: string): SectionMode {
  if (!pathname || !id) return 'cover'
  const base = getYearbookBasePath(id, pathname)
  if (pathname === base || pathname === base + '/') return 'cover'
  const rest = pathname.slice(base.length).replace(/^\//, '')
  const segment = rest.split('/')[0].split('?')[0] as SectionSlug | undefined
  if (segment && SECTION_SLUGS.includes(segment)) return SLUG_TO_MODE[segment]
  return 'cover'
}

/** Ambil section mode dari pathname + searchParams. Prioritas: segment path > query ?section= > cover. */
export function getSectionModeFromUrl(
  pathname: string | null,
  sectionQuery: string | null,
  id: string
): SectionMode {
  const fromPath = getSectionModeFromPathname(pathname, id)
  const base = getYearbookBasePath(id, pathname)
  const isBasePath = pathname === base || pathname === base + '/'
  if (!isBasePath) return fromPath
  const fromQuery = toSkeletonSection(sectionQuery)
  return fromQuery ?? 'cover'
}

/** Apakah segment URL valid section slug */
export function isValidSectionSlug(segment: string | undefined): segment is SectionSlug {
  return segment !== undefined && SECTION_SLUGS.includes(segment as SectionSlug)
}

/** Convert query param atau URL slug ke SectionMode untuk skeleton/navigasi. */
export function toSkeletonSection(value: string | null): SectionMode | null {
  if (!value) return null
  const asSlug = value as SectionSlug
  if (SECTION_SLUGS.includes(asSlug)) return SLUG_TO_MODE[asSlug]
  const modes: SectionMode[] = ['cover', 'classes', 'approval', 'team', 'sambutan', 'ai-labs', 'flipbook', 'preview']
  return modes.includes(value as SectionMode) ? (value as SectionMode) : null
}
