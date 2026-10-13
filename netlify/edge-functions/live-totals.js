// The home page's running total: how much has been lifted on LOGR and how
// many workouts have been logged, written into the page as it is requested.
//
// index.html carries each place the numbers appear inside a
// <template data-totals>, which a browser never draws: one line in the hero,
// and the band under it. This reads the two numbers (lib/totals.js), writes
// them over {volume} and {workouts}, and puts each template's contents in its
// place. The markup and the words live in index.html and the look in
// style.css (.hero-live, .tally); only the numbers come from here.
//
// The number then keeps moving without a reload: /tally.js polls /api/totals
// (totals-json.js). That is an enhancement on top of this, never instead of
// it. The figure the page arrives with is already correct and already the
// real one, so the band is right with no JavaScript at all, and the script
// only ever changes a number that is on the page already.
//
// A number that cannot be read is not shown. No credentials, a slow or failed
// lookup with nothing recent to fall back on, or an answer that is not two
// positive numbers: the page goes out as the file is, template and all, which
// is the home page without the band. Never a zero, and never a number typed
// in by hand.

import { HOME_HEADERS } from './lib/headers.js';
import { liveTotals } from './lib/totals.js';

// Global: the page has TWO of these, the hero's one line and the band below
// it, and both are filled from the same answer so they can never disagree. A
// template a browser never draws is also the fallback: if the database cannot
// be read, neither is replaced and both simply are not there.
//
// ANCHORED TO THE START OF A LINE on purpose. Unanchored, this matched the
// words inside an HTML COMMENT in index.html that described the tag, and the
// replacement then began mid-comment and ran to the real template's closing
// tag: the comment was mangled, the opening tag was orphaned, and the hero's
// line was sealed inside an unclosed template where a browser never draws it.
// The page still looked filled to curl. Keep the anchor, and keep an opening
// template tag out of the comments either side of it.
const TEMPLATE = /^([ \t]*)<template data-totals(?: [^>]*)?>([\s\S]*?)<\/template>/gm;

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// The numbers are digits and commas, so there is nothing in them to escape.
function fill(html, totals) {
  return html.replace(TEMPLATE, (_, indent, band) =>
    indent + band
      .replaceAll('{volume}', whole.format(totals.volume))
      .replaceAll('{workouts}', whole.format(totals.workouts)));
}

export default async (request, context) => {
  // Returning nothing hands the request on untouched.
  if (request.method !== 'GET') return;

  const [response, totals] = await Promise.all([context.next(), liveTotals()]);
  const type = response.headers.get('content-type') || '';
  if (response.status !== 200 || !type.includes('text/html')) return response;

  const headers = new Headers(response.headers);

  // The file's own validators describe the file, not this page: the same file
  // goes out with a different number a minute later. Without them the browser
  // asks again on every visit, which is the point.
  for (const name of ['content-length', 'content-encoding', 'etag', 'last-modified']) {
    headers.delete(name);
  }
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');

  // HOME_HEADERS, not SECURITY_HEADERS: this is the one page that may run a
  // script of its own. It is set whether or not the band was filled, so the
  // header a page carries never depends on whether the database answered.
  for (const [name, value] of Object.entries(HOME_HEADERS)) headers.set(name, value);

  if (!totals) return new Response(await response.text(), { status: 200, headers });

  return new Response(fill(await response.text(), totals), { status: 200, headers });
};

export const config = {
  path: ['/', '/index.html'],
  // If this ever throws, serve the page as the file is, without the band.
  onError: 'bypass',
};
