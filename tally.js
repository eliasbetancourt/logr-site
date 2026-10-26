/* The home page's running total, kept moving without a reload.
 *
 * This is the only JavaScript on getlogr.com, it runs on the home page only,
 * and it does one thing: ask /api/totals every so often and move the two
 * numbers in the band when they change.
 *
 * It is an enhancement, never the source. The page arrives with the real
 * figures already written in by netlify/edge-functions/live-totals.js, so with
 * this file blocked, failed or switched off the band is still correct. It
 * never writes a number the page did not already have a correct one for, and
 * a failed read leaves what is on screen exactly where it is.
 *
 * It sets no cookie, reads and writes no storage, and talks to no origin but
 * this one, which is all the page's CSP permits.
 */
(function () {
  'use strict';

  // Every place the page says either number. The two lists are read and
  // moved separately rather than in pairs.
  var volumeEls = [].slice.call(document.querySelectorAll('[data-tally-volume]'));
  var workoutsEls = [].slice.call(document.querySelectorAll('[data-tally-workouts]'));

  // Neither is on the page: the database could not be read when it was
  // served, so every template was left alone. There is no correct number to
  // move, and inventing one is the one thing this must never do.
  if (!volumeEls.length && !workoutsEls.length) return;

  var EVERY_MS = 15000;      // how often to ask while the tab is in front
  var BACKOFF_MAX_MS = 120000; // how far the gap grows while asking keeps failing
  var COUNT_MS = 900;        // how long a number takes to travel to its new value

  var smooth = !window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  // Whatever the server wrote, as a number. Digits and commas, so this is
  // exact; if it somehow is not a number, leave the page alone for good.
  function read(el) {
    var n = parseInt(String(el.textContent).replace(/[^0-9]/g, ''), 10);
    return isFinite(n) ? n : null;
  }

  var volume = volumeEls.length ? read(volumeEls[0]) : 0;
  var workouts = workoutsEls.length ? read(workoutsEls[0]) : 0;
  if (volume === null || workouts === null) return;

  function write(els, text) {
    for (var i = 0; i < els.length; i++) els[i].textContent = text;
  }

  var frame = null;

  function paint(fromV, fromW, toV, toW) {
    if (frame) cancelAnimationFrame(frame);

    if (!smooth || (fromV === toV && fromW === toW)) {
      write(volumeEls, nf.format(toV));
      write(workoutsEls, nf.format(toW));
      return;
    }

    var start = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - start) / COUNT_MS);
      var e = 1 - Math.pow(1 - t, 3); // ease out, so it settles rather than stops
      write(volumeEls, nf.format(Math.round(fromV + (toV - fromV) * e)));
      write(workoutsEls, nf.format(Math.round(fromW + (toW - fromW) * e)));
      frame = t < 1 ? requestAnimationFrame(step) : null;
    })(start);
  }

  var timer = null;
  var gap = EVERY_MS;

  function later(ms) {
    clearTimeout(timer);
    timer = setTimeout(tick, ms);
  }

  function tick() {
    // Nothing to see and nothing to pay for while the tab is in the background.
    // The listener below asks the moment it comes back.
    if (document.hidden) { later(EVERY_MS); return; }

    fetch('/api/totals', { headers: { Accept: 'application/json' }, credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        var v = Math.round(Number(d.volume));
        var w = Math.round(Number(d.workouts));
        // The same guard the server uses: two positive numbers or nothing.
        if (!(v > 0) || !(w > 0)) throw new Error('not two numbers');

        if (v !== volume || w !== workouts) {
          paint(volume, workouts, v, w);
          volume = v;
          workouts = w;
        }
        gap = EVERY_MS;
        later(gap);
      })
      .catch(function () {
        // Leave the numbers where they are and ask less often, so a database
        // that is down is not also being asked four times a minute by every
        // tab that happens to be open.
        gap = Math.min(gap * 2, BACKOFF_MAX_MS);
        later(gap);
      });
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { gap = EVERY_MS; later(0); }
  });

  later(EVERY_MS);
})();
