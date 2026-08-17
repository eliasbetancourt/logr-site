# logr-site

The marketing and legal site for the LOGR iOS app. Plain static HTML and CSS,
no build step, no dependencies, and **no JavaScript at all**. Deployed on
Netlify.

## Before this goes live

**1. One placeholder is left.**

```
grep -rn "YOUR_STATE" .
```

`terms.html` section 11 needs the state or country whose law governs.

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
community-guidelines.html plain-language version of Terms section 5
cookies.html              says the site sets none, because it sets none
thanks.html               waitlist confirmation
404.html                  not found
style.css                 the whole design system
netlify.toml              publish dir, security headers
```

## Design

The look comes from the wireframe: warm paper (`#f5f4ef`), square corners,
Arial, and tight display type. Tokens are at the top of `style.css`. Note this
is deliberately **not** the app's own palette, which is cooler and rounded.

The phone mockups in the hero and feature sections are built from CSS, not
images. Replace them with real App Store screenshots when you have them: each
one is a `.phone` block, and `.screen-wrap` is the frame it sits in.
