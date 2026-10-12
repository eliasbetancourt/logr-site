// The security headers, for the pages an edge function returns. Copied from
// the [[headers]] block in netlify.toml, which is only promised for static
// files. Keep the two in step.
//
// This folder is not a function: Netlify only runs a file that sits directly
// in netlify/edge-functions/, or one named after its own folder or index.

const BASE =
  "default-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
  'Content-Security-Policy': `${BASE}; script-src 'none'`,
};

// The home page is the ONE page that runs a script: /tally.js, which keeps the
// running total moving without a reload. Everything else on this site, static
// pages and app-link.js alike, keeps script-src 'none'.
//
// What this allows and nothing more: a script from this origin, and a fetch to
// this origin. No inline script ('unsafe-inline' is absent, so an injected
// <script> or onclick still does nothing), no third-party script, and no
// connection off this domain. The page reads /api/totals and nothing else.
export const HOME_HEADERS = {
  ...SECURITY_HEADERS,
  'Content-Security-Policy': `${BASE}; script-src 'self'; connect-src 'self'`,
};
