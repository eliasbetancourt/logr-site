// The home page's running total: how much has been lifted on LOGR and how
// many workouts have been logged, read from the database as the page is
// requested.
//
// No page on this site runs JavaScript, so the number cannot be fetched by
// the browser. It is written into the HTML here, on Netlify's servers, and
// what reaches the browser is still a plain page with no script in it.
//
// index.html carries the band inside <template id="live-totals">, which a
// browser never draws. This asks site_totals() (the app repo's
// supabase/site_totals.sql, callable with the public key) for the two
// numbers, writes them over {volume} and {workouts}, and puts the template's
// contents in its place. The markup and the words live in index.html and the
// look in style.css (.tally); only the numbers come from here.
//
// A number that cannot be read is not shown. No credentials in this
// environment, a slow or failed lookup with nothing recent to fall back on,
// or an answer that is not two positive numbers: the page goes out as the
// file is, template and all, which is the home page without the band. Never
// a zero, and never a number typed in by hand.
//
// It needs SUPABASE_URL and SUPABASE_ANON_KEY in the site's Netlify
// environment variables, the same two the invite page uses (app-link.js).

import { SECURITY_HEADERS } from './lib/headers.js';

// How long the home page waits on the database before going out without the
// band. The lookup runs alongside the fetch of the page itself.
const TOTALS_TIMEOUT_MS = 1500;

// One answer serves every visitor this server sees for a minute, so a busy
// hour is one lookup a minute, not one a visitor. If a lookup then fails, the
// last answer still stands for up to an hour before the band is dropped.
const FRESH_MS = 60 * 1000;
const KEEP_MS = 60 * 60 * 1000;

const TEMPLATE = /<template id="live-totals">([\s\S]*?)<\/template>/;

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// The last answer this server got, and when: { totals, at }.
let last = null;

/**
 * What the database says, as { volume, workouts }, or null when it cannot
 * say or the answer is not one to print.
 */
async function readTotals() {
  const url = Netlify.env.get('SUPABASE_URL');
  const key = Netlify.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TOTALS_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/site_totals`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: abort.signal,
    });
    if (!res.ok) return null;
    const row = await res.json();
    const volume = Math.round(Number(row?.volume_lbs));
    const workouts = Math.round(Number(row?.workouts));
    if (!(volume > 0) || !(workouts > 0)) return null;
    return { volume, workouts };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function liveTotals() {
  const now = Date.now();
  if (last && now - last.at < FRESH_MS) return last.totals;
  const totals = await readTotals();
  if (totals) {
    last = { totals, at: now };
    return totals;
  }
  return last && now - last.at < KEEP_MS ? last.totals : null;
}

// The numbers are digits and commas, so there is nothing in them to escape.
function fill(html, totals) {
  return html.replace(TEMPLATE, (_, band) =>
    band
      .replaceAll('{volume}', whole.format(totals.volume))
      .replaceAll('{workouts}', whole.format(totals.workouts)));
}

export default async (request, context) => {
  // Returning nothing hands the request on untouched.
  if (request.method !== 'GET') return;

  const [response, totals] = await Promise.all([context.next(), liveTotals()]);
  const type = response.headers.get('content-type') || '';
  if (!totals || response.status !== 200 || !type.includes('text/html')) return response;

  const html = fill(await response.text(), totals);

  // The file's own validators describe the file, not this page: the same
  // file goes out with a different number a minute later. Without them the
  // browser asks again on every visit, which is the point.
  const headers = new Headers(response.headers);
  for (const name of ['content-length', 'content-encoding', 'etag', 'last-modified']) {
    headers.delete(name);
  }
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);

  return new Response(html, { status: 200, headers });
};

export const config = {
  path: ['/', '/index.html'],
  // If this ever throws, serve the page as the file is, without the band.
  onError: 'bypass',
};
