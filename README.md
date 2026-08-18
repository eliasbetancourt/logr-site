# logr-site

The marketing and legal site for the LOGR iOS app. Plain static HTML and CSS,
no build step, no dependencies, and **no JavaScript at all**. Deployed on
Netlify.

## Before this goes live

Settled: governing law is **Pennsylvania** (terms section 12), and the domain
is **getlogr.com**, which is owned. Mail forwarding for `support@getlogr.com`
and a read-through of the legal pages are with Cohen.

**The one hard blocker left: the privacy policy and `/account-deletion`
describe deletion that removes the sign-in record and releases the email
address.** That is true only once `delete_my_account()` has landed in the app
**and** the migration is applied to the live database. Do not paste the privacy
URL into App Store Connect before then, and do not make the site public with
`/account-deletion` promising something the app does not yet do.

## User-generated content

Terms section 6, a section on the community guidelines, and two FAQ entries
cover the four things Apple's Guideline 1.2 looks for in an app with a social
feed: filtering, reporting, blocking, and published contact details. The app
already does all four, so this is documentation rather than a promise.

Two commitments in that text are real and operational, not boilerplate:

- **"We aim to review every report within 24 hours."** Someone has to actually
  read the `reports` table. It has no SELECT policy, so that means the Supabase
  dashboard.
- The disclosure is written to cover **video and other media we support in
  future**, so it does not need rewriting the day video ships. What will need
  revisiting then: the App Store age rating questionnaire, and whether photo
  and video moderation needs more than the banned-phrase filter, which only
  applies to message text.

## The waitlist form

`index.html` carries a Netlify Forms signup (`name="waitlist"`). Netlify's
build bot finds the form in the deployed HTML and registers it, so nothing else
is needed. Submissions land under **Forms** in the Netlify dashboard.

- It posts to `/thanks`, which is `thanks.html`.
- `bot-field` is a honeypot, hidden with `.sr-only`.
- Free tier allows 100 submissions a month. Set up an email notification on the
  form so signups do not sit unread.

## Local preview

```bash
python3 serve.py
```

Then open http://localhost:8000. Zero dependencies.

**Do not use `python3 -m http.server` here.** Every link on this site is written
without the extension (`/privacy`, `/terms`), because Netlify resolves those
itself. A plain static server 404s on all of them, so the entire site appears
broken locally while being perfectly fine in production. `serve.py` exists only
to add that one behaviour, plus a real 404 page.

To check anything that depends on `netlify.toml` (the CSP, the other security
headers, form handling), run the real thing instead:

```bash
npx netlify-cli dev
```

That is a large first download and is worth it only before a deploy that
touches headers or the form. **Run it after any change involving inline
styles** (see below).

### The CSP will silently break inline styles

`netlify.toml` sets `style-src 'self'` with no `'unsafe-inline'`. In CSP that
governs `style="..."` **attributes**, not just `<style>` blocks, so any inline
style is dropped. This does not fail loudly: the element just renders unstyled.

It has already happened once. The activity chart's seven bars carried
`style="height:35%"` and would have rendered flat on Netlify while looking
correct under every local server, because a local server sends no CSP header.
The heights now live in `style.css` as `.bars i:nth-child(n)`. Keep new styles
in the stylesheet, or the same class of bug comes back invisible.

## Deploy

Netlify, connected to this repo, deploys on push to `main`. `netlify.toml` sets
the publish directory, an empty build command, and the security headers.

Netlify serves `privacy.html` at `/privacy` with no extension, which is why the
links have no `.html` in them.

### Connecting it the first time

1. Netlify → **Add new site** → **Import an existing project** → GitHub →
   `logr-site`.
2. Leave the build command **empty** and the publish directory as `.`.
   `netlify.toml` already says this, so the defaults it offers should be right.
3. Deploy. The site is live on a `*.netlify.app` name straight away.
4. **Domain settings** → add `getlogr.com`, and point DNS at Netlify. HTTPS is
   automatic once DNS resolves.
5. **Forms** → the `waitlist` form appears after the first deploy. Add an email
   notification there, or signups accumulate with nobody being told.

### The domain is written into three files

`getlogr.com` appears in the canonical and `og:` tags of every page, in
`sitemap.xml`, and in `robots.txt`. If the domain changes:

```bash
grep -rln "getlogr.com" . --include="*.html" --include="*.xml" --include="*.txt"
```

Until DNS is pointed, those tags name a domain that does not resolve. That is
harmless for a preview deploy and should not be left that way once the site is
public, since it is what a shared link and a search result both read.

## Structure

```
index.html                landing page: hero, features, teams, story, FAQ, waitlist
privacy.html              -> App Store Connect "Privacy Policy URL"
terms.html                -> App Store Connect EULA, if you use a custom one
support.html              -> App Store Connect "Support URL"
account-deletion.html     Apple looks for this; linked from the footer
community-guidelines.html plain-language version of Terms sections 5 and 6
cookies.html              says the site sets none, because it sets none
thanks.html               waitlist confirmation
404.html                  not found
style.css                 the whole design system
netlify.toml              publish dir, security headers
serve.py                  local preview with Netlify's clean URLs
robots.txt / sitemap.xml  crawling. Both name the domain
favicon.svg               PLACEHOLDER mark, see below
favicon-32.png            rendered from favicon.svg
apple-touch-icon.png      rendered from favicon.svg
og.png                    1200x630 link preview
```

The favicon is a placeholder: a white `L` on the app's `#1a1a1a` at the card
radius. The app icon itself is the full LOGR wordmark, which is illegible at
16px, so it could not be reused directly. Swap `favicon.svg` if a real mark
gets drawn, then re-render the two PNGs from it.

## Staying unlike Hevy

Hevy is the closest competitor and the biggest workout tracker there is, so the
site is deliberately built away from theirs. Theirs, as of August 2026:

| | Hevy | LOGR |
|---|---|---|
| Accent | blue `#1d83ea` throughout | monochrome, no accent hue |
| Buttons | 100px pills | 14px radius, the app's own |
| Type | Arial | system stack, tabular numerals |
| Cookies | consent banner, tracking | none, and the site says so |
| Proof | "More than 15 million athletes" | nothing, because we have no users yet |

Two things changed specifically to widen that gap:

- **The proof bar was three imperatives** (`Log the work. / See the progress. /
  Share the journey.`) which echoed Hevy's hero, a stack of three two-word
  imperatives. It is now a privacy claim, which is both further from them and a
  real difference: they run a consent banner, LOGR has no analytics SDK at all.
  The tagline still lives in the footer, where it belongs to us.
- **The consistency grid** is the page's signature and has no counterpart on
  their site. It is drawn from what the app actually records, `streak_days`
  crossed with workouts, so it advertises a real feature rather than decorating.
  It is **monochrome on purpose**: the app tints these black, blue and green,
  but blue is Hevy's entire identity and a density ramp reads better at 24px
  anyway.

Do not copy their copy, their section order, or their screenshots. The
resemblance that is unavoidable is a phone mockup in the hero, which is the
category convention rather than anyone's idea.

## Design

**The site uses the app's own design tokens**, so the two read as one product:

| | |
|---|---|
| Background | `#f9f9f9` |
| Text | `#1a1a1a` |
| Surface | `#ffffff` |
| Muted | `#9ca3af` |
| Borders | `#f0f0f0` |

Shapes match too: cards are white at radius 16 with a 1px `#f0f0f0` border,
buttons are `#1a1a1a` at radius 14, and the wordmark is 800 weight with
**positive** 2px tracking, copied from `wordmark` in the app's FeedScreen. Keep
these in step with `CLAUDE.md` in the app repo if the app's tokens ever move.

The page STRUCTURE came from the wireframe (hero, proof bar, three feature
sections, teams, story, FAQ, waitlist). Its warm-paper palette and square
corners did not.

The phone mockups in the hero and feature sections are built from CSS, not
images. Replace them with real App Store screenshots when you have them: each
one is a `.phone` block, and `.screen-wrap` is the frame it sits in.
