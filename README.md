# Link Vault

Your personal link library. Save video links — Instagram reels, YouTube Shorts,
TikTok, any URL — and Link Vault analyses each one, categorises it, and lets
you search everything you've saved. Then plan from it: pull up your travel
links to plan a trip, or your food links to pick a restaurant.

No login. No tracking. No account. Your links live on your device (localStorage
in the web app, inside the app on Android) unless you export them.

## What it does

- **Add a link** — paste a URL and an optional note. The app fetches whatever
  public details it can and shows you editable title / description / author
  fields before saving, so you can paste a caption yourself when auto-fetch
  comes back empty.
  - YouTube and TikTok: title, author and thumbnail come from their public
    oEmbed endpoints (no key, no login).
  - Instagram and everything else: there is no reliable public metadata
    endpoint, so the title is guessed from the link and you paste the
    description. The app marks the guess clearly.
- **Auto-categorisation** — keyword rules over the title, description, URL and
  note assign one primary category and up to two secondary tags, from:
  Travel, Food & Recipes, Tech & Gadgets, Finance & Money, Fitness & Health,
  Entertainment, Music, Sports, Education & How-to, News & Current Affairs,
  Shopping & Deals, Humour & Memes, Lifestyle & Home, Nature & Outdoors,
  Other, Uncategorised. You can change the category and tags on any saved link.
- **Search & filters** — full-text search across title, description, summary,
  author, tags, category and URL, plus category and platform chips.
- **Plan something** — pick a goal and the app groups your matching links:
  - *Plan a trip*: Places to stay · Food & restaurants · Transport & tips · Things to do
  - *Find a restaurant*: Restaurants & cafes · Dishes to try · Areas & tips
  - *Learn something*: Education & How-to · Tech & Gadgets
  - *Custom keyword*: results grouped by category
  - Each plan shows a count, a summary line, and a checklist you can tick off
    (your ticks are saved on the device). If nothing matches, it says so
    plainly and suggests adding links — it never invents options.
- **Detail view** — full description, a pinned-comment field, category/tags,
  author, dates, your note, open-original, edit and delete.
- **Export / Import** — download all links as JSON, or import a JSON export
  back in. Importing merges by URL (updates instead of duplicating).
- **Offline** — after the first load the app shell is cached by a service
  worker, so the library works without a connection.

## Run it locally

Any static server works — there is no build step:

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

or:

```sh
npx serve .
```

## Push it to GitHub

```sh
cd link-vault-app
git init
git add .
git commit -m "Link Vault v1"
# create an empty repo on github.com (do NOT add a README/license there),
# then:
git remote add origin https://github.com/<your-username>/link-vault.git
git branch -M main
git push -u origin main
```

Pushing to `main` triggers both workflows below.

## Get the APK (Android)

1. Push to `main` (see above).
2. On GitHub, open the repo → **Actions** → **Android APK** → the latest run.
3. Download the **link-vault-apk** artifact (a zip containing
   `app-debug.apk`).
4. On your Android phone, open the APK file to install it. If Android
   blocks it, allow **"Install unknown apps"** for the app you open it
   from (usually your browser or file manager), then install again.
5. The app is called **Link Vault** (`com.linkvault.app`).

This is a debug APK — fine for personal use. It is not signed for the
Play Store.

## Install it as a PWA (no APK needed)

After the first push, GitHub Pages publishes the app (see the
`GitHub Pages` workflow). Open the Pages URL in Chrome on Android, tap
the menu → **Add to Home screen** / **Install app**. It then opens
full-screen like a native app and works offline.

## How categorisation works — and its honest limits

- Categorisation is keyword rules, not AI. It reads the title, description,
  URL and your note. If nothing matches, the link is `Uncategorised` — open
  it and set the category yourself.
- **Instagram descriptions usually need pasting.** Instagram has no public
  metadata endpoint, so the app cannot pull a reel's caption by itself.
  Paste the caption into the description field when you save the link and
  the category will be computed from it.
- **Pinned comments** are not fetchable automatically either — there is a
  field for them on every link; paste the pinned comment in when you save.
- YouTube/TikTok titles and authors come from public oEmbed endpoints.
  Descriptions for those are not available from oEmbed, so paste them too
  if you want them searchable.
- The app never asks you to log in to anything.

## Project layout

```
index.html, styles.css, app.js   — the web app (plain HTML/CSS/JS, no build step)
manifest.json, sw.js, icon-*.png — PWA manifest, offline service worker, icons
package.json                     — Capacitor wrapper (Android)
capacitor.config.json            — appId com.linkvault.app, webDir www
www/                             — build copy of the web files, synced into Android
android/                         — Capacitor Android project (generated by `npx cap add android`)
.github/workflows/               — android.yml (APK) and pages.yml (GitHub Pages)
```

### A note on `webDir`

The original plan was `webDir: "."` (serve the repo root directly). Capacitor 8
rejects that — `npx cap add android` fails the copy step with
`"." is not a valid value for webDir`. So the config uses `webDir: "www"`,
and `www/` is a build copy of the root web files, made by `npm run sync-www`
and synced with `npm run sync:android`. Edit the files in the repo root, then
run `npm run sync:android` before building.

## Rebuilding the Android wrapper after changes

```sh
npm run sync:android   # copy root web files into www/ and sync into android/
cd android && ./gradlew assembleDebug   # needs JDK 17 + Android SDK; see .github/workflows/android.yml
```

## Seed data

The app ships with one saved link: an Instagram reel by
**meghana.ai** (verified, "Meghana | AI systems", posted Nov 5, 2026) — a
25-problem AI engineer interview practice list (RAG, agents, evals,
fine-tuning, serving). Categorised **Education & How-to** with the secondary
tag **Tech & Gadgets**. Only a short summary of the caption is stored, not
the full caption text.
