// The security headers, for the pages an edge function returns. Copied from
// the [[headers]] block in netlify.toml, which is only promised for static
// files. Keep the two in step.
//
// This folder is not a function: Netlify only runs a file that sits directly
// in netlify/edge-functions/, or one named after its own folder or index.
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self'; img-src 'self' data:; script-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};
