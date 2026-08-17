# logr-site

The marketing and legal site for the LOGR iOS app. Plain static HTML, no build
step, no dependencies. Deployed on Netlify.

## Before this goes live

Three placeholders are deliberately left in the files so they cannot ship by
accident. Find them all with:

```
grep -rn "SUPPORT_EMAIL@example.com\|YOUR_STATE\|APP_STORE_URL" .
```

| Placeholder | Where | Replace with |
|---|---|---|
| `SUPPORT_EMAIL@example.com` | privacy, terms, support | The address you will actually read. It also goes in App Store Connect. |
| `YOUR_STATE` | terms, section 11 | The state or country whose law governs. |
| `APP_STORE_URL` | index | The App Store listing, once it exists. |

**Read both legal pages before publishing them.** They were drafted against what
the app actually does, but they are legal documents and nobody has reviewed them
as such.

## Local preview

No server needed, but paths are absolute, so open it through one:

```
python3 -m http.server 8000
```

## Deploy

Netlify, connected to this repo, deploys on push to `main`. Build command is
empty and the publish directory is `.`, which `netlify.toml` already sets.

Netlify serves `privacy.html` at `/privacy` with no extension, which is why the
links have no `.html` in them.

## Structure

```
index.html     landing page
privacy.html   privacy policy      -> App Store Connect "Privacy Policy URL"
terms.html     terms of service    -> App Store Connect "EULA", if you use a custom one
support.html   support and FAQ     -> App Store Connect "Support URL"
404.html       not found
style.css      shared styles, using the app's design tokens
netlify.toml   publish dir and security headers
```
