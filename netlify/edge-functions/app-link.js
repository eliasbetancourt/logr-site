// The page behind every link the app shares: getlogr.com/post/<id>,
// /routine/<id> and /@<handle>. The app builds them in lib/appInfo.js and
// routes them in lib/deepLinks.js (both in the app repo).
//
// With LOGR installed, iOS normally never asks for this page. The link is a
// Universal Link, claimed by /.well-known/apple-app-site-association, and it
// opens the app on that post, routine or profile. This page covers the two
// cases that are left:
//
//   - No app. The page says what was shared and sends them to the App Store.
//   - The app, inside an in-app browser (Instagram, Snapchat, TikTok). Those
//     load every link themselves and never hand a Universal Link to the app
//     it belongs to, so the page carries a logr:// link that does the same
//     job by hand. The app reads both forms.
//
// It is rendered here instead of as a static page for one reason: that logr://
// link has to carry the id or handle from the URL, and no page on this site
// runs JavaScript to build it. The HTML this returns still has no script in
// it, so the CSP's script-src 'none' holds.
//
// The three paths are written in FOUR places that must agree: ROUTES below,
// `config.path` at the bottom, the association file, and the app's parser.

const SITE = 'https://getlogr.com';
const APP_STORE_ID = '6795712216';
const APP_STORE = `https://apps.apple.com/app/id${APP_STORE_ID}`;

// Post and routine ids are uuids. A handle follows the app's username rule
// (lib/validation.js): letters, numbers, periods and underscores, 30 at most,
// stored lowercase, and a period never first, last or twice in a row. That
// last part matters here beyond tidiness: it keeps `/@.html`, which is what a
// server retries a missing `/@` as, from being drawn as somebody's profile.
// Anything else is not a link the app made, and falls through to the 404.
const HANDLE_MAX = 30;
const ROUTES = [
  { kind: 'post', re: /^\/post\/([0-9a-f-]{36})\/?$/i },
  { kind: 'routine', re: /^\/routine\/([0-9a-f-]{36})\/?$/i },
  { kind: 'profile', re: /^\/@([a-z0-9_]+(?:\.[a-z0-9_]+)*)\/?$/i },
];

// Copied from the [[headers]] block in netlify.toml, which is only promised
// for static files. Keep the two in step.
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self'; img-src 'self' data:; script-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

// Say what the link is and what the app does with it. Nothing about who sent
// it: the page cannot know, and the same link may sit in a public story.
function copyFor(kind, key) {
  if (kind === 'profile') {
    return {
      title: `@${key} on LOGR`,
      heading: `@${key} is on LOGR`,
      lede: 'Get LOGR free on the App Store to follow them and see their training.',
      appPath: `@${key}`,
      openLabel: 'Open their profile in the app',
    };
  }
  if (kind === 'routine') {
    return {
      title: 'A routine on LOGR',
      heading: 'A routine on LOGR',
      lede: 'Get LOGR free on the App Store to see every exercise and start it as a workout.',
      appPath: `routine/${key}`,
      openLabel: 'Open this routine in the app',
    };
  }
  return {
    title: 'A workout on LOGR',
    heading: 'A workout on LOGR',
    lede: 'Get LOGR free on the App Store to see the whole session.',
    appPath: `post/${key}`,
    openLabel: 'Open this workout in the app',
  };
}

// The routes above already limit every value to letters, digits, hyphens,
// periods and underscores. This is the second lock on the same door.
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const APPLE_ICON =
  'M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z';

function badge(small) {
  return `<a class="app-badge${small ? ' small header-cta' : ''}" href="${APP_STORE}" aria-label="Download LOGR on the App Store">
    <svg class="app-badge-icon" viewBox="0 0 384 512" aria-hidden="true" focusable="false">
      <path d="${APPLE_ICON}" />
    </svg>
    <span class="app-badge-text">
      <span class="app-badge-eyebrow">Download on the</span>
      <span class="app-badge-store">App Store</span>
    </span>
  </a>`;
}

// Header and footer are the same markup every other page on the site carries
// (see 404.html). A change to either there belongs here too.
function render({ url, title, heading, lede, appUrl, openLabel }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(lede)}">
<meta name="robots" content="noindex">
<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${esc(url)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="LOGR">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(lede)}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="LOGR. Training is better together.">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f9f9f9">
<link rel="stylesheet" href="/style.css">
</head>
<body>

<header class="site-header">
  <a class="logo" href="/" aria-label="LOGR home">LOGR</a>
  <nav class="site-nav">
    <a href="/#who">Who it's for</a>
    <a href="/#story">Our Story</a>
    <a href="/#faq">FAQ</a>
    <a href="/support">Support</a>
  </nav>
  ${badge(true)}
</header>

<main class="prose app-link">
  <h1>${esc(heading)}</h1>
  <p class="lede">${esc(lede)}</p>
  <p class="app-link-store">${badge(false)}</p>
  <p class="app-link-open">Already have LOGR? <a href="${esc(appUrl)}">${esc(openLabel)}</a>.</p>
</main>

<footer class="site-footer" id="footer">
  <div>
    <a class="logo footer-logo" href="/">LOGR</a>
    <p>Log the work. Share the journey.</p>
    <small>&copy; 2026 LOGR. All rights reserved.</small>
  </div>
  <div>
    <b>Product</b>
    <a href="/#who">Who it's for</a>
    <a href="/#story">Our Story</a>
    <a href="/#faq">FAQ</a>
  </div>
  <div>
    <b>Support</b>
    <a href="/support">Contact</a>
    <a href="/account-deletion">Account Deletion</a>
    <a href="/community-guidelines">Community Guidelines</a>
  </div>
  <div>
    <b>Legal</b>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
    <a href="/cookies">Cookie Policy</a>
  </div>
  <div>
    <b>Follow</b>
    <a href="https://instagram.com/getlogr" rel="me noopener">Instagram</a>
  </div>
</footer>

</body>
</html>
`;
}

export default async (request, context) => {
  const { pathname } = new URL(request.url);
  for (const { kind, re } of ROUTES) {
    const match = pathname.match(re);
    if (!match) continue;
    if (kind === 'profile' && match[1].length > HANDLE_MAX) break;
    // Stored ids and handles are lowercase, so the page and the app link use
    // that form whatever case the URL arrived in.
    const key = match[1].toLowerCase();
    const copy = copyFor(kind, key);
    const html = render({
      ...copy,
      url: `${SITE}/${copy.appPath}`,
      appUrl: `logr://${copy.appPath}`,
    });
    return new Response(request.method === 'HEAD' ? null : html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS },
    });
  }
  // Not a shape the app makes: let the site answer, which is its 404 page.
  return context.next();
};

export const config = {
  path: ['/post/*', '/routine/*', '/@*'],
  // If this function ever throws, serve what the site would have without it
  // (the 404 page) rather than Netlify's error page.
  onError: 'bypass',
};
