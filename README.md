# logr-site

The marketing and legal site for the LOGR iOS app. Plain static HTML and CSS,
no build step, no dependencies, and **no JavaScript at all**. Deployed on
Netlify.

## Before this goes live

**1. One placeholder is left.**

```
grep -rn "YOUR_STATE" .
```

`terms.html` section 12 needs the state or country whose law governs.

**2. `support@getlogr.com` has to actually receive mail.** It is now the
contact address on five pages. Set up forwarding on `getlogr.com` before the
site is public, or every support route is a dead end.

**3. The privacy policy's deletion section describes the fixed behaviour.**
Section 6 says deletion removes the sign-in record and releases the email
address. That is true only once the `delete_my_account()` work has landed in
the app **and** the migration is applied to the live database. Do not paste the
privacy URL into App Store Connect before then.

**4. Read both legal pages.** They were drafted against what the app actually
does, but they are legal documents and nobody has reviewed them as such.

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

Paths are absolute, so open it through a server rather than from the file
system:

```bash
python3 -m http.server 8000
```

## Deploy

Netlify, connected to this repo, deploys on push to `main`. `netlify.toml` sets
the publish directory, an empty build command, and the security headers.

Netlify serves `privacy.html` at `/privacy` with no extension, which is why the
links have no `.html` in them.

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
```

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
