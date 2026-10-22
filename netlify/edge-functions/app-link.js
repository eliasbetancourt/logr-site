// The page behind every link the app shares: getlogr.com/post/<id>,
// /routine/<id>, /@<handle> and /join/<invite code>. The app builds them in
// lib/appInfo.js and routes them in lib/deepLinks.js (both in the app repo).
//
// With LOGR installed, iOS normally never asks for this page. The link is a
// Universal Link, claimed by /.well-known/apple-app-site-association, and it
// opens the app on that post, routine or profile. This page covers the two
// cases that are left:
//
//   - No app. The page says what was shared and sends them to the App Store.
//   - The app, inside an in-app browser (Instagram, Snapchat, TikTok), or a
//     link typed or PASTED into Safari's address bar. iOS never hands either
//     of those to the app (Apple's rule: a Universal Link opens the app only
//     when it is TAPPED from another site or app), so the page leads with a
//     big Open in LOGR button, a logr:// link that does the same job in one
//     tap, and the App Store second. The app reads both forms.
//
// It is rendered here instead of as a static page for one reason: that logr://
// link has to carry the id or handle from the URL, and no page on this site
// runs JavaScript to build it. The HTML this returns still has no script in
// it, so the CSP's script-src 'none' holds.
//
// The four paths are written in FOUR places that must agree: ROUTES below,
// `config.path` at the bottom, the association file, and the app's parser.
//
// A /join/ link is the one page drawn here that reads the database: it asks
// invite_link_card() (the app repo's supabase/space_invite_links.sql, callable
// with the public key) for the team's real name and size, so a link dropped
// in a team's group chat previews as "Join Harvard M Soccer on LOGR" rather
// than as a generic invite. It needs SUPABASE_URL and SUPABASE_ANON_KEY in the
// site's Netlify environment variables; without them, or if the lookup is slow
// or fails, the page is drawn generic and still works. (The home page reads
// the database too, through live-totals.js, with the same two variables.)

import { SECURITY_HEADERS } from './lib/headers.js';

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
// An invite code is 8 letters and digits (the app's normalizeInviteCode).
const ROUTES = [
  { kind: 'post', re: /^\/post\/([0-9a-f-]{36})\/?$/i },
  { kind: 'routine', re: /^\/routine\/([0-9a-f-]{36})\/?$/i },
  { kind: 'profile', re: /^\/@([a-z0-9_]+(?:\.[a-z0-9_]+)*)\/?$/i },
  { kind: 'join', re: /^\/join\/([a-z0-9]{8})\/?$/i },
];

// How long a /join/ page waits on the database before drawing itself generic.
// A link preview bot gives up after a few seconds, and a slow card is worse
// than a plain one.
const CARD_TIMEOUT_MS = 2500;

// The picture under each kind of link, rendered from og-source/ (README, "The
// link preview"). An expired invite gets the site's own, since its card would
// say "You're invited" over a title that says the invite has expired.
const PREVIEWS = {
  site: { image: 'og.png', alt: 'LOGR. Create routines, log workouts, share with friends.' },
  post: { image: 'og/post.png', alt: 'LOGR. See the whole session.' },
  routine: { image: 'og/routine.png', alt: 'LOGR. Save it, start it, log it.' },
  profile: { image: 'og/profile.png', alt: 'LOGR. Follow their training.' },
  join: { image: 'og/join.png', alt: "LOGR. You're invited." },
};

// A crowd only helps once it is a crowd. The app's lib/shareCopy.js uses the
// same number.
const SOCIAL_PROOF_MIN = 3;

// " on LOGR", unless the name already says it ("Join LOGR on LOGR").
function onLogr(name) {
  return /logr/i.test(String(name || '')) ? '' : ' on LOGR';
}

/**
 * What the database says about an invite code, or null when it cannot say:
 * no credentials in this environment, too slow, or unreachable. `{ ok: false }`
 * is a real answer (the link has been turned off, run out, or its space is
 * gone), and draws a different page from null.
 */
async function inviteCard(code) {
  const url = Netlify.env.get('SUPABASE_URL');
  const key = Netlify.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), CARD_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/invite_link_card`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: code }),
      signal: abort.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// An invite. With the card: the space's name, who sent it and how many are in,
// which is the whole reason to tap. Without it: the same page, generic.
function joinCopy(code, card) {
  const appPath = `join/${code}`;
  if (card && card.ok === false) {
    return {
      title: 'This invite has expired',
      heading: 'This invite no longer works',
      glyph: 'expired',
      lede: 'Ask whoever sent it for a new link. LOGR is free on the App Store in the meantime.',
      appPath,
      openLabel: 'Open LOGR',
      preview: PREVIEWS.site,
    };
  }
  const name = card?.ok ? String(card.name || '').trim() : '';
  const type = card?.ok ? card.type : null;
  const about = card?.ok ? String(card.description || '').trim() : '';
  const n = Number(card?.member_count) || 0;
  const noun = type === 'team' ? 'team' : type === 'community' ? 'community' : 'group';
  const inviter = card?.inviter_username ? String(card.inviter_username) : '';

  // The only tiles on any of these pages that come from the database, so the
  // only ones drawn at all. Both values are short BY CONSTRUCTION: a count and
  // one word. The inviter's handle deliberately does NOT go in a tile. It is
  // up to 30 characters, a third of this card is nowhere near wide enough, and
  // it spilled over the edge when it was tried.
  const tiles = [];
  if (n >= SOCIAL_PROOF_MIN) {
    tiles.push({ value: String(n), label: type === 'team' ? 'TEAMMATES' : 'MEMBERS' });
  }
  if (type) tiles.push({ value: noun[0].toUpperCase() + noun.slice(1), label: 'ON LOGR' });

  const next = card?.grants === 'request'
    ? 'Open it in LOGR to ask to join.'
    : 'Open it in LOGR to jump straight in.';

  // The space's own description when it has written one, because that says
  // more than anything this file could put there.
  const blurb = about
    || (name ? `They train together on LOGR, logging sessions where the rest of the ${noun} can see them.` : '');

  return {
    title: name ? `Join ${name}${onLogr(name)}` : `You're invited to a ${type ? noun : 'team'} on LOGR`,
    heading: name
      ? (type === 'team' ? `Join the rest of ${name}` : `Join ${name}${onLogr(name)}`)
      : "You're invited on LOGR",
    // Where the inviter goes: its own line under the name, which can wrap, the
    // way a handle does everywhere else.
    handle: inviter ? `@${inviter} invited you` : '',
    letter: name ? name[0] : '',
    glyph: 'join',
    lede: blurb ? `${blurb} ${next}` : `You have been invited to a ${type ? noun : 'group'} on LOGR. ${next}`,
    appPath,
    openLabel: name ? `Open ${name}` : 'Open the invite',
    preview: PREVIEWS.join,
    tiles,
    // Typed by hand in the app (Messages, Browse, Have a code) if the link
    // does not make it through the install.
    code,
  };
}

// Say what the link is and what the app does with it. Nothing about who sent
// it: the page cannot know, and the same link may sit in a public story.
function copyFor(kind, key) {
  if (kind === 'profile') {
    return {
      title: `@${key} on LOGR`,
      // The handle is the one real thing a profile link carries, so the card
      // leads with it the way the app's own profile header does: the avatar,
      // then the name, then the handle under it.
      heading: `@${key}`,
      handle: 'is training on LOGR',
      letter: key[0],
      lede: 'Follow them to see their workouts, records, and streak in your feed.',
      appPath: `@${key}`,
      openLabel: 'Open their profile',
      preview: PREVIEWS.profile,
    };
  }
  if (kind === 'routine') {
    return {
      title: 'A routine on LOGR',
      heading: 'Someone shared a routine',
      glyph: 'routine',
      lede: 'Open it in LOGR to see every exercise and set, then start it as your own workout.',
      appPath: `routine/${key}`,
      openLabel: 'Open this routine',
      preview: PREVIEWS.routine,
    };
  }
  return {
    title: 'A workout on LOGR',
    heading: 'Someone shared a workout',
    glyph: 'post',
    lede: 'Open it in LOGR to see the whole session, every set, and what it added up to.',
    appPath: `post/${key}`,
    openLabel: 'Open this workout',
    preview: PREVIEWS.post,
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

// Feather line icons, the set the app itself draws with. A link only tells us
// what KIND of thing was shared, so when there is no name to make an initial
// from, the mark says that much and no more.
const GLYPHS = {
  // activity: a workout
  post: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  // list: a routine
  routine: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  // users: a team or community
  join: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  // link-2 broken: an invite that has run out
  expired: '<path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M9 17H7A5 5 0 0 1 7 7h2"/><line x1="8" y1="12" x2="16" y2="12"/>',
};

/**
 * The round mark at the top of the card: an initial when we know a name, and
 * the kind's glyph when we do not. Matches components/Avatar.js in the app,
 * which draws every avatar round and has no square variant.
 */
function mark({ letter, glyph }) {
  if (letter) return `<div class="applink-mark" aria-hidden="true">${esc(letter)}</div>`;
  return `<div class="applink-mark" aria-hidden="true"><svg viewBox="0 0 24 24">${GLYPHS[glyph] || GLYPHS.post}</svg></div>`;
}

/** The app's stat tiles. Only ever called with numbers the database gave us. */
function stats(tiles) {
  if (!tiles || !tiles.length) return '';
  return `<div class="applink-stats">${tiles
    .map((t) => `<div><b>${esc(t.value)}</b><span>${esc(t.label)}</span></div>`)
    .join('')}</div>`;
}

// Apple's own badge artwork, never redrawn (style.css, "App Store badge").
function badge(small) {
  return `<a class="app-badge${small ? ' small header-cta' : ''}" href="${APP_STORE}" aria-label="Download LOGR on the App Store">
    <img class="app-badge-art" src="/app-store-badge.svg" alt="" width="120" height="40">
  </a>`;
}

// Header and footer are the same markup every other page on the site carries
// (see 404.html). A change to either there belongs here too.
function render({ url, title, heading, handle, lede, appUrl, openLabel, code, preview, letter, glyph, tiles }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
<meta property="og:image" content="${SITE}/${preview.image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(preview.alt)}">
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

<main class="applink">
  <div class="applink-card">
    ${mark({ letter, glyph })}
    <h1 class="applink-title">${esc(heading)}</h1>
    ${handle ? `<p class="applink-handle">${esc(handle)}</p>` : ''}
    <p class="applink-sub">${esc(lede)}</p>
    ${stats(tiles)}
    <a class="button applink-open" href="${esc(appUrl)}">${esc(openLabel)}</a>
    <p class="applink-alt">Don't have LOGR yet?</p>
    <div class="applink-store">${badge(false)}</div>
    ${code ? `<p class="applink-code">Invite code <strong>${esc(code)}</strong><br>In the app, open Messages, tap Browse, then Have a code.</p>` : ''}
  </div>
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
    <a href="/teens">Teen Accounts</a>
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
    // that form whatever case the URL arrived in. An invite code is the other
    // way round: minted in capitals.
    const key = kind === 'join' ? match[1].toUpperCase() : match[1].toLowerCase();
    const copy = kind === 'join'
      ? joinCopy(key, request.method === 'HEAD' ? null : await inviteCard(key))
      : copyFor(kind, key);
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
  path: ['/post/*', '/routine/*', '/@*', '/join/*'],
  // If this function ever throws, serve what the site would have without it
  // (the 404 page) rather than Netlify's error page.
  onError: 'bypass',
};
