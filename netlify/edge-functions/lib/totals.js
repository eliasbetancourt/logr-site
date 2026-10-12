// The two numbers behind the home page's running total, and the one place
// that reads them.
//
// Both the page (live-totals.js, which writes them into the HTML) and the
// JSON endpoint (totals-json.js, which the page polls) come through here, so
// there is one timeout, one cache and one definition of a number worth
// printing.
//
// It needs SUPABASE_URL and SUPABASE_ANON_KEY in the site's Netlify
// environment variables, the same two app-link.js uses.

// How long to wait on the database before giving up. The page's lookup runs
// alongside the fetch of the page itself, so this is the longest it can add.
const TIMEOUT_MS = 1500;

// One answer serves every visitor this server sees for FRESH_MS, so a busy
// minute is one lookup, not one a visitor. If a lookup then fails, the last
// answer still stands for KEEP_MS before the band is dropped altogether.
const FRESH_MS = 15 * 1000;
const KEEP_MS = 60 * 60 * 1000;

// The last answer this server got, and when: { totals, at }.
let last = null;

// Set while a lookup is in flight, so ten requests landing together make one
// call to the database rather than ten.
let inFlight = null;

/**
 * What the database says, as { volume, workouts }, or null when it cannot say
 * or the answer is not one to print.
 */
async function readTotals() {
  const url = Netlify.env.get('SUPABASE_URL');
  const key = Netlify.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
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
    // Never a zero, and never a number that is not a number: the band is
    // dropped rather than shown wrong.
    if (!(volume > 0) || !(workouts > 0)) return null;
    return { volume, workouts };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The totals to print, cached, or null when there is nothing worth printing.
 */
export async function liveTotals() {
  const now = Date.now();
  if (last && now - last.at < FRESH_MS) return last.totals;

  if (!inFlight) {
    inFlight = readTotals().finally(() => { inFlight = null; });
  }
  const totals = await inFlight;

  if (totals) {
    last = { totals, at: Date.now() };
    return totals;
  }
  // A failed lookup falls back to the last good answer for an hour.
  return last && Date.now() - last.at < KEEP_MS ? last.totals : null;
}
