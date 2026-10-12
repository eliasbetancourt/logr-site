// The two numbers as JSON, for /tally.js to poll so the home page's running
// total moves without a reload.
//
// It exists so the page never talks to the database directly: the public key
// stays on this side, the answer is cached here (lib/totals.js) so a room full
// of open tabs is still one lookup every FRESH_MS, and the browser only ever
// connects to this origin, which is all the home page's CSP allows.
//
// Two numbers and nothing else. No row, no name, no id, and nothing that says
// anything about who is looking.

import { liveTotals } from './lib/totals.js';

export default async () => {
  const totals = await liveTotals();

  // 503 rather than a zero or a stale guess. The page leaves the figure it is
  // showing exactly as it is and tries again on the next tick.
  if (!totals) {
    return new Response('{"error":"unavailable"}', {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return new Response(JSON.stringify({ volume: totals.volume, workouts: totals.workouts }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Matches the cache in lib/totals.js, so a reverse proxy or a browser
      // holding it for a few seconds costs nothing and changes nothing.
      'Cache-Control': 'public, max-age=15',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const config = {
  path: '/api/totals',
  onError: 'bypass',
};
