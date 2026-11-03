// A staging label is never authority to point a test build at production.
// Only a distinct Supabase project ref or the local loopback stack qualifies.
const PRODUCTION_PROJECT_REF = 'wagmelaupruptnzwjjta';

export function isIsolatedStagingTarget(url: string | undefined, projectRef: string | undefined): boolean {
  if (!url) return false;
  if (url === 'http://127.0.0.1:54321' || url === 'http://127.0.0.1:54321/') return true;
  return !!projectRef && /^[a-z0-9]{20}$/.test(projectRef)
    && projectRef !== PRODUCTION_PROJECT_REF
    && (url === `https://${projectRef}.supabase.co`
      || url === `https://${projectRef}.supabase.co/`);
}

export const IS_STAGING_BUILD = process.env.EXPO_PUBLIC_SUPABASE_ENV === 'staging';
export const IS_ISOLATED_STAGING_TARGET = isIsolatedStagingTarget(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_STAGING_PROJECT_REF
);
export const STAGING_BOOKING_REQUESTS_ENABLED = IS_STAGING_BUILD
  && IS_ISOLATED_STAGING_TARGET
  && process.env.EXPO_PUBLIC_BOOKING_REQUESTS_VERIFIED === 'true';
