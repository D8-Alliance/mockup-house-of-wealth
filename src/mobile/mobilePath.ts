/** The mini-app lives under this path of the same site, so the web app at "/" is untouched. */
export const MOBILE_BASE = '/m';

/** True when the page was opened as the mini-app (in the super app, or a phone browser at /m). */
export function isMobileApp(): boolean {
  const path = window.location.pathname;
  return path === MOBILE_BASE || path.startsWith(`${MOBILE_BASE}/`);
}

/**
 * Where Keycloak sends the user back after signing in or out. The web app uses the configured address; the
 * mini-app uses the same site's /m/, so a sign-in started in the mini-app returns to it. Keycloak accepts it
 * because the client's redirect URIs cover the whole site (https://<site>/*).
 */
export function signInReturnUri(configured: string): string {
  return isMobileApp() ? `${new URL(configured).origin}${MOBILE_BASE}/` : configured;
}
