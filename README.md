# logr-site

The marketing and legal site for the LOGR iOS app. Plain static HTML and CSS,
no build step, no dependencies, and **no JavaScript in any page**. Deployed on
Netlify.

The one piece of code is an edge function that runs on Netlify's servers and
draws the page behind a link shared from the app. It sends no script to the
browser. See *Links shared from the app*.

## Copy rules

**No em dashes.** This is the app repo's rule, in `CLAUDE.md` there, and it
applies to everything here too: page copy, the legal pages, code comments, and
commit messages. Not `—`, not `–`, not `&mdash;`, not `&ndash;`. Use a comma, a
period, or a hyphen. It creeps back in one paragraph at a time, so check it:

```sh
# must print nothing
grep -rn -e '—' -e '–' -e '&mdash;' -e '&ndash;' . \
  --include="*.html" --include="*.css" --include="*.md" --include="*.js"
```

**Direct and plain beats clever.** Say what the app does in the fewest words
that are still true. If a sentence is doing persuasion instead of explaining,
cut it.

**Do not tell the reader about their own life.** Copy that describes the
reader's setup in detail excludes everyone whose setup is different. A draft of
the landing page opened by listing where the reader's training "lives now": a
notes app, the team's spreadsheet, a coach's texts. Anyone without a team or a
coach reads that and concludes the app is not for them. Name what the app holds
and let people recognise their own case:

| Instead of | Write |
|---|---|
| "your team's lifts and your coach's programming live in three places" | "however you train, it goes in the same place" |
| "follow people a few steps ahead of you" | "follow people whose training you like" |
| "you do not need a program or a plan to begin" | "no plan needed" |

**Anything not built yet says so, in the sentence and in a label.** The coaches
card carries `PLANNED, NOT BUILT YET` and says "Later:" in the sentence itself.
Same for coach tools and video in the FAQ. The site has no users to disappoint
yet, and this is why it can be trusted when it does.

**Never write "analytics" unqualified.** On a workout app it reads as the
training analysis, which is the thing the app is for. See *Staying unlike Hevy*
for the full story.

## Before this goes live

Settled: governing law is **Pennsylvania** (terms section 12), and the domain
is **getlogr.com**, which is owned. Mail forwarding for `support@getlogr.com`
and a read-through of the legal pages are with Cohen.

**The privacy policy and `/account-deletion` describe deletion that removes the
sign-in record and releases the email address.** That is only true if
`delete_my_account()` deletes the `auth.users` row, not just the profile row.

**As of 2026-08-27 the live function appears to do exactly that**, and the
evidence is a real destructive test rather than a reading of the code: the top
of `supabase/demo_account_restore.sql` in the app repo records running
`select public.delete_my_account();` against the live database on 2026-08-24
and finding "auth user 0, profile 0, workouts 0, posts 0", with the cascade
taking GoTrue's `identities` rows with it. Releasing the identity is what
releases the address.

**Two things to know before treating this as closed:**

1. **The app repo contradicts itself, and the stale half is the dangerous
   half.** `supabase/profile_settings.sql` still holds a `create or replace`
   of `delete_my_account()` whose whole body is
   `delete from public.profiles where id = auth.uid();`, and the docstring on
   `deleteAccount()` in `lib/auth.js` still says the `auth.users` row "can only
   be removed by a service-role call". Anyone re-running that migration file
   would quietly revert the live function to the profiles-only version, and
   **this site would go on promising something the app had stopped doing, with
   nothing to signal it.** Fix the file and the docstring in the app repo.
2. This was confirmed by reading the app repo, not by querying the database
   from here. Re-run the destructive test on a throwaway account, or check the
   live function body, before pasting the privacy URL into App Store Connect.

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

## Form detection has to be switched on, and it is not code

**Symptom:** submitting the waitlist form lands on
`404 - No webpage was found for https://getlogr.com/thanks`.

**It is not `thanks.html`.** Measured against the live site:

```
GET  /thanks -> 200      the page exists, pretty URLs work
POST /thanks -> 404
POST /       -> 404      even the root refuses the form POST
```

A POST carrying `form-name` should be intercepted by Netlify before it ever
reaches the file server, and answered with a 303 to the action URL. Getting a
404 on **both** paths means no form is registered for this site at all, so the
POST falls through to a static file server, which has no POST handler and says
404. The redirect target is a red herring: `/thanks` is fine, and the request
never gets that far.

**Cause:** form detection is opt-in per site, **and turning it on does nothing
to a deploy that already happened.** Detection registers a form by scanning the
published HTML at deploy time, so the switch only affects deploys that run
after it. This site had a live deploy from before the switch, so no form was
registered and every POST fell through.

The second half is the part that actually bit, and it is the easy one to miss:
the dashboard says "Form detection is enabled" while the live site still has no
form behind it, so the setting and the behaviour disagree and the setting looks
like it is lying.

**Fix:**

1. Project configuration → **Forms** → enable **form detection**.
2. **Deploy again.** Any push does it, or Trigger deploy → *Clear cache and
   deploy site*. This is not optional and is not a cache problem.

**The one-command check**, which beats reading the dashboard, because it tests
the thing users actually do:

```sh
# a registered form answers 200, an unknown name answers 404
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://getlogr.com/thanks \
  --data-urlencode 'form-name=waitlist' --data-urlencode 'email=t@getlogr.com'
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://getlogr.com/thanks \
  --data-urlencode 'form-name=does-not-exist' --data-urlencode 'email=t@getlogr.com'
```

**Run both lines, not just the first.** A 200 on its own proves only that
something answered; it is the 404 on the bogus name that proves Netlify is
matching on the form name rather than the path happening to be reachable. Note
that a successful POST files a real submission, so use an obviously fake
address and delete it afterwards.

The markup needs nothing. `data-netlify="true"`, the hidden `form-name`, and
the honeypot are all already correct in the deployed HTML, which is why this
looks like a code bug and is not one. `form-action 'self'` in the CSP already
allows the post, since it is same-origin.

**This is the fourth time this project has shipped correct code against a
service nobody switched on**, after the APNs push key, custom SMTP, and the SMS
provider. The tell is always the same: every layer looks healthy and the
feature delivers nothing. When something here does not work, check whether the
service is enabled before reading the code.

## The waitlist form

`index.html` carries a Netlify Forms signup (`name="waitlist"`). Netlify's
build bot finds the form in the deployed HTML and registers it, so nothing else
is needed. Submissions land under **Forms** in the Netlify dashboard.

- It posts to `/thanks`, which is `thanks.html`.
- `bot-field` is a honeypot, hidden with `.sr-only`.
- Free tier allows 100 submissions a month. Set up an email notification on the
  form so signups do not sit unread.

### Reading the deployed HTML tells you whether detection ran

Netlify **rewrites the form tag** when it registers a form: it strips the
`netlify` and `data-netlify` opt-in attributes, drops
`data-netlify-honeypot`, and normalises the quoting. So the source and the
deployed page do not match, and that mismatch is the good outcome.

```html
<!-- what is in index.html -->
<form name="waitlist" method="POST" action="/thanks"
      netlify data-netlify="true" data-netlify-honeypot="bot-field">

<!-- what https://getlogr.com/ served on 2026-08-27, opt-in attributes gone -->
<form action='/thanks' method='POST' name='waitlist'>
```

Seeing the second form means the build bot found and processed the form on that
deploy, which is the failure described under *Form detection has to be switched
on* not happening. It is a read-only check and costs nothing:

```sh
curl -s https://getlogr.com/ | grep -A1 '<form'
```

It is strong evidence, not proof of a working POST. The two `curl -X POST`
lines in that section are still the only test of what a real submitter gets,
and they file a real submission, so run them with an obviously fake address and
delete it from the dashboard afterwards.

### The `role` field

The form also carries an optional `<select name="role">`, so the four audiences
on the page can be told apart on the list: `solo`, `team`, `coached`,
`starting`, `coach`. It is optional on purpose. The email is the conversion and
nothing should stand between it and the button.

**Netlify learns a form's fields when it scans the deployed HTML, which means a
new field is captured from the next deploy onward, not retroactively.** Early
submissions will simply have no `role`. That is expected and is not worth
chasing.

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

It has already happened once. The CSS activity chart's seven bars carried
`style="height:35%"` and would have rendered flat on Netlify while looking
correct under every local server, because a local server sends no CSP header.
The heights were moved into `style.css`, and that chart has since been replaced
by the real screenshots, so the bug is gone along with the element that carried
it. **The rule is not.** Keep new styles in the stylesheet, or the same class of
bug comes back invisible.

The screenshots do not reopen this: `img-src 'self' data:` already covers files
served from this site, and they are styled entirely from `style.css`.

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

### The domain is written into four files

`getlogr.com` appears in the canonical and `og:` tags of every page, in
`sitemap.xml`, in `robots.txt`, and in `netlify/edge-functions/app-link.js`.
If the domain changes:

```bash
grep -rln "getlogr.com" . --include="*.html" --include="*.xml" --include="*.txt" --include="*.js"
```

The app has it too: `LINKS.website` in `lib/appInfo.js` and
`ios.associatedDomains` in `app.json`, which needs a new build to change.

Until DNS is pointed, those tags name a domain that does not resolve. That is
harmless for a preview deploy and should not be left that way once the site is
public, since it is what a shared link and a search result both read.

## Structure

```
index.html                landing page: hero, features, who it's for, story,
                          FAQ, waitlist
privacy.html              -> App Store Connect "Privacy Policy URL"
terms.html                -> App Store Connect EULA, if you use a custom one
support.html              -> App Store Connect "Support URL"
account-deletion.html     Apple looks for this; linked from the footer
community-guidelines.html plain-language version of Terms sections 5 and 6
cookies.html              says the site sets none, because it sets none
thanks.html               waitlist confirmation
404.html                  not found
style.css                 the whole design system
screens/                  the eight app screenshots, see The screenshots below
netlify.toml              publish dir, security headers
netlify/edge-functions/app-link.js
                          the page behind a link shared from the app
.well-known/apple-app-site-association
                          which links iOS opens in the app, see below
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

## Links shared from the app

Every share in the app sends one of four links, built in `lib/appInfo.js`
there:

| Link | Shared from |
|---|---|
| `getlogr.com/post/<uuid>` | a post in the feed or on its own screen, a session in History |
| `getlogr.com/routine/<uuid>` | My Routines |
| `getlogr.com/@<username>` | a profile, a badge, an invite |
| `getlogr.com/join/<code>` | Invite Teammates on a team, community or group chat |

**With LOGR installed, the link opens the app on that post, routine or
profile.** That is a Universal Link, and it takes two halves, one per repo:

- The app claims the domain: `ios.associatedDomains` in `app.json` is
  `applinks:getlogr.com`. That is an entitlement, so **only a new native build
  carries it**. A build from before it opens every link in Safari no matter
  what this site serves.
- The site agrees: `.well-known/apple-app-site-association` names the app
  (`234GLLDCQN.com.eliasbetancourt.LOGR`, Team ID then bundle id) and the
  four paths. The Team ID was read off the Apple Development certificate on
  the Mac this was written on. Check it against *Membership details* in the
  Apple Developer account if links still open Safari on a new build.

**Without the app, the same link opens a page here** that says what was
shared and sends them to the App Store. `netlify/edge-functions/app-link.js`
draws it on Netlify's servers, per link. That is the only reason it is code
and not a static page: its *Already have LOGR?* link is `logr://post/<uuid>`,
which has to carry the id from the URL, and no page here runs a script to
build it. That link is for in-app browsers (Instagram, Snapchat, TikTok),
which load every link themselves and never hand a Universal Link to the app.
The page also carries Apple's Smart App Banner, which in Safari reads *Open*
when the app is installed and passes the link along.

A path that is not one of the four shapes, or a handle the app would never
have allowed, falls through to the 404 page.

### The invite page reads the database, and needs two variables

`/join/<code>` is the one page that looks something up: it calls
`invite_link_card()` (the app repo's `supabase/space_invite_links.sql`, the
only function the public key may call) so a link dropped in a team's group
chat previews as *Join Harvard M Soccer on LOGR* with who sent it and how many
are in, instead of a generic invite. It needs these in Netlify, under *Site
configuration, Environment variables*:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://wzijnstensrrjdcsdpij.supabase.co` |
| `SUPABASE_ANON_KEY` | the app's `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public by design, it ships inside the app) |

Without them, or when the lookup takes longer than 2.5 seconds, the page is
drawn generic ("You're invited on LOGR") and still works. The page also
prints the code itself, since a link does not survive an App Store install:
someone who installs from it can tap the link again, or type the code in the
app.

### The paths live in four places

`ROUTES` and `config.path` in `app-link.js`, the `components` in the
association file, and `parseDeepLink()` in the app's `lib/deepLinks.js`. A new
kind of link changes all four, plus a new app build. Apple's CDN can take a
day or two to pick up a changed association file.

### The headers are set twice, on purpose

`netlify.toml`'s headers are only promised for static files, so `app-link.js`
sets the same CSP and security headers on its own pages. Change one, change
both.

### Checking it once deployed

```sh
# must be 200, JSON, and no redirect. Apple follows no redirects for this file
curl -sI https://getlogr.com/.well-known/apple-app-site-association
# what Apple's CDN holds, which is what devices actually read
curl -s https://app-site-association.cdn-apple.com/a/v1/getlogr.com
# the fallback page
curl -s https://getlogr.com/@logrdemo | grep '<h1>'
```

Apple's CDN caches the association file for up to a day or two, so a change
to it reaches phones that slowly. Two iOS behaviours look like bugs and are
not:

- **Typing or pasting a link into Safari never opens the app.** A tap on a
  link does. Test from Messages or Notes.
- **Tapping the `getlogr.com` breadcrumb in the corner, after a link opened
  the app, tells iOS to prefer Safari** for this domain from then on. Long-press
  a link and choose *Open in LOGR* to switch it back.

To try the page locally, `netlify dev` runs the edge function. `serve.py`
does not.

## Who the page is written for

The landing page says one thing: **all of your training belongs in the same
log, whoever it came from.** Personal sessions, team training, and whatever a
coach hands you, plus the people you do it with.

- The hero states it in two sentences, and that is the only place it is stated
  outright. There was briefly a "one place" section under the proof bar as
  well, listing what fits in the log. It said the same thing as the who it's
  for section directly below it, so it went. **The page makes this argument
  once.** If a new section needs the same sentence to work, the section is the
  problem.
- The **who it's for section** (`#who`) is four short cards, and each audience
  has to be able to see itself: athletes, teams, anyone starting out, coaches
  and creators. The first three describe the app today. The fourth splits what
  exists now (team chat, a following, sharing routines) from what does not
  (training plans athletes follow and log in the app), and labels it.
- Beginners are a real audience, not a footnote, and the argument for them is a
  feature that already exists: follow whoever you like, save a routine from a
  post, run it.

Keep new copy pointed at that, and keep it short. Three ways this page has gone
wrong before: the generic version, "track your workouts, share with friends",
which is the competition's page; the overwritten version, which explained the
reader's own training to them; and the repetitive version, which made the same
point in two sections in a row. See *Copy rules* at the top.

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

  **Never write "no analytics" unqualified on this site.** The first draft of
  that bar said `No ads. No analytics. No trackers of any kind.`, three
  sentences above a feature section promising personal records and a training
  calendar. On a workout app "analytics" reads as the training analysis, so the
  line said we do not do the thing the app is for. The bar now says
  **"The only thing LOGR tracks is your training"**, which turns the collision
  into the message. Everywhere else the word carries a qualifier: `analytics
  SDK`, `product analytics`, or `web analytics` on the site-only claims. The
  privacy policy and the FAQ both name the two meanings and separate them.
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

## The screenshots

The phone mockups used to be drawn in CSS: a few hundred lines of fake posts,
fake set tables and a fake seven-bar activity chart. They are **real
screenshots** now, and all of that CSS is gone. What is left is the frame:
`.shot-frame` is the black body, `.shot img` is the screen, `.shot figcaption`
is the label under it.

### The grouping is the point, and it comes from the file names

Sources live in `~/Desktop/App Screens`, named `Pair <n><letter> <screen>.png`.
**A pair stays together in one feature section.** That is the whole convention:
the group number says which section, the letter says the order within it.

| Source | On the site | Section |
|---|---|---|
| `Pair 1a Library Screen` | `pair-1a-library.jpg` | 02, See your progress |
| `Pair 1b Chase Gallery` | `pair-1b-gallery.jpg` | 02, See your progress |
| `Pair 2a Live Workout Screen` | `pair-2a-live-workout.jpg` | 01, Log every session |
| `Pair 2b Workout Preview Screen` | `pair-2b-routine.jpg` | 01, Log every session |
| `Pair 2c Workout Complete Notes Screen` | `pair-2c-complete.jpg` | 01, Log every session |
| `Pair 3a Feed Screen` | `pair-3a-feed.jpg` | 03, Train together |
| `Pair 3b Post Screen` | `pair-3b-post.jpg` | 03, Train together |
| `Playlists Screen` | `playlists.jpg` | hero, behind |

The web file names keep the group prefix so this table stays checkable against
the folder. `Other/` is not used: one of the two is named "Old" and the other
is an alternate take.

Two placements are worth the note:

- **Group 2 renders b, a, c**, not a, b, c. The section is the arc of a
  session, so it reads routine, then live, then summary, which is the order the
  app puts them in. It also lands `2a`, the strongest of the three, in the
  middle slot.
- **Playlists is the one screen with no pair**, so it gets no section. It sits
  behind the front phone in the hero, where a background phone is texture
  rather than a claim, and where its album art is the only colour in an
  otherwise monochrome hero. It is also the reason the hero repeats only ONE
  screenshot (`3a`) from the sections below.

The captions under each phone are **the app's own tab and screen names**
(Library, Gallery, Feed, Post), so a reader who installs the app finds the word
they just read. Do not invent friendlier ones.

### Regenerating them

Sources are 1206x2622 (iPhone 16 Pro at 3x) and about 6 MB for the set. The web
copies are 440px wide, which is 2x the widest they are ever displayed, and 568
KB for all eight.

```sh
cd ~/logr-site
sips --resampleWidth 440 -s format jpeg -s formatOptions 86 \
  "$HOME/Desktop/App Screens/Pair 3a Feed Screen.png" --out screens/pair-3a-feed.jpg
```

**JPEG, not WebP, and that is a tooling limit rather than a preference.** This
machine has no `cwebp`, no ImageMagick, and its `ffmpeg` has no WebP encoder;
`sips` reads WebP but cannot write it. WebP would be roughly a third smaller,
so install `webp` and reconvert if the page ever needs the weight back.

Everything below the hero carries `loading="lazy"`, so a first paint downloads
the two hero images and nothing else. Every `<img>` also carries `width` and
`height`, and `.shot img` sets the matching `aspect-ratio`, so the boxes are
reserved before the files land and the page does not jump while they load.

**Do not resize these by eye.** The aspect ratio is written into the CSS as
`440 / 956`. A source at a different device size needs that number changed too,
or every screenshot letterboxes inside its frame.
