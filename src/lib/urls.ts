/**
 * Get the canonical app URL for sharing and OG tags.
 * Uses VITE_PUBLIC_APP_URL env var or falls back to current origin.
 */
export const getBaseUrl = (): string => {
  return import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
};
