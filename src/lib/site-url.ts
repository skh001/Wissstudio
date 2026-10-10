import "server-only";

/**
 * Public URL of the app, without trailing slash. Used for OAuth redirects, auth emails and webhooks.
 * NEXT_PUBLIC_SITE_URL wins; on Vercel it falls back to the production domain, so a missing
 * variable never produces "undefined/api/..." redirect URIs.
 */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
