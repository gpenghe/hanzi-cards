# Hanzi Cards

One very large character. Tap, show someone, and play again.

A small, offline-first character game to share with family and friends.
No pronunciation, definitions, scores, progress, accounts, or backend.
The simplified game requested in the follow-up instructions replaces the
original flashcard/reveal and learning-progress design.

## Play

- **Tap, swipe left, →, Space, or Enter:** another character.
- **Swipe right or ←:** the previous character.
- **Gear:** choose a character set, shuffle, and light/dark/system appearance.
- Shuffle visits every character once before reshuffling, with no consecutive
  repeat at the boundary. Going backward follows the actual recent order.
- Only preferences are saved. Reopening starts a fresh game. There is no
  saved progress, score, session counter, or automatic timed flashing.

The default set is **Up to 二年级**, to start with familiar material.
The three bundled choices are:

| Set | Characters | Coverage |
| --- | ---: | --- |
| Up to 二年级 | 275 | 暨南《中文》第一至二册 |
| Up to 三年级 | 429 | 暨南《中文》第一至三册 |
| Basic 500 | 500 | Independent everyday starter collection |

The family confirmed one textbook volume per grade. The textbook sets use
the publisher's public character database. Its edition is unspecified; check
against the learner's printed 生字表 if needed. See [data sources and adding sets](DATA_SOURCES.md).

## Run on macOS

Install Node.js 22.12+ (Node 24 LTS recommended) and npm. From this folder:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/hanzi-cards/**. All fonts are local system fonts,
with PingFang SC preferred on Apple devices. No font or API downloads occur.

Production preview, including the service worker:

```sh
npm run build
npm run preview
```

Open **http://localhost:4173/hanzi-cards/**. Development mode does not install
the service worker. Use the production preview to check offline behavior.
A phone can reach a Mac's development server over the same LAN, but a plain
HTTP LAN IP is not a secure context and cannot validate offline installation.
Use HTTPS hosting for the real iPhone acceptance check.

## Tests

```sh
npm run typecheck
npm test
npx playwright install chromium webkit
npm run test:e2e
```

Unit tests cover dataset size/uniqueness, cumulative textbook membership,
sequential navigation, nonrepeating shuffle rounds, back navigation across
rounds, preference recovery, and gesture thresholds. Browser tests use
Chromium and WebKit with an iPhone-sized viewport to exercise controls,
settings, layouts, and offline production reload at a repository subpath.
These are desktop browser simulations, **not tests on a physical iPhone**.

To regenerate the PNG icons from the original SVG after changing it:

```sh
node scripts/generate-icons.mjs
```

Requires the Playwright Chromium installation above. Generated PNGs are
committed assets, so normal builds do not need a browser or an image service.

## GitHub Pages deployment

Deployment target: [gpenghe.github.io/hanzi-cards](https://gpenghe.github.io/hanzi-cards/).
Repository: [gpenghe/hanzi-cards](https://github.com/gpenghe/hanzi-cards).

To deploy or update the site:

1. Create/use a GitHub repository and push these files to its `main` branch.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. In **Actions**, select **Check and deploy Hanzi Cards**, then **Run workflow**
   on `main`. Deployments are manual; pushes and PRs only run checks.
4. Open the URL reported by the deployment, normally
   `https://YOUR-USERNAME.github.io/hanzi-cards/`.

The workflow derives the deployment base from the repository name. Local
builds default to `/hanzi-cards/`. For another static hosting path:

```sh
VITE_BASE_PATH=/another-repo/ npm run build
VITE_BASE_PATH=/another-repo/ npm run preview
```

For a custom domain or a `USERNAME.github.io` root repository, use `/` and
change the deployment workflow's `VITE_BASE_PATH` to `/` as well. The base
must start and end with `/`. HTML assets, manifest ID/start URL/scope, icons,
and service worker registration all respect that base. Upload the contents
of `dist/` to the corresponding path; no server routing is needed.

Configuration follows the [Vite Pages guide](https://vite.dev/guide/static-deploy.html#github-pages)
and [Vite PWA update prompt guidance](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).

## Install on an iPhone and check offline play

1. Open the deployed **HTTPS** URL in Safari while online.
2. Open the gear and wait for **Ready to play offline**.
3. In Safari's Share menu, choose **Add to Home Screen**, enable **Open as Web
   App** if offered, then Add. No Apple Developer account is needed.
4. Launch Hanzi from its Home Screen icon. Confirm Safari's navigation bars
   are absent and the character is large and fully visible.
5. Close the app, enable airplane mode (and disable Wi-Fi), and reopen the
   Home Screen app. Tap, swipe, and switch among all three sets.
6. Confirm portrait and landscape fit without scrolling, including safe areas.
7. Turn connectivity back on. Updates download in the background; when ready,
   an **Update** button appears in Settings. Applying it reloads into a fresh
   game while preserving preferences. It never reloads mid-game on its own.

All HTML, CSS, JavaScript (including all character sets), manifest, and icons
are precached. iOS can evict site data under storage pressure, and clearing
Safari website data can remove the offline cache. Reopen online to recache.

## Manual acceptance checklist

- [ ] Physical iPhone: launches directly to one character, with no answer or progress.
- [ ] Tap advances once; left swipe advances once; right swipe returns correctly.
- [ ] Controls do not interfere with Safari's edge navigation gestures.
- [ ] All three sets appear; textbook characters match the learner's edition.
- [ ] Character fits smaller/larger iPhones and landscape; no clipped glyphs or scroll.
- [ ] Light, dark, and system appearance work, including a system theme change.
- [ ] Home Screen launch is standalone and respects notches/home indicator.
- [ ] Cold launch in airplane mode works, with all sets available.
- [ ] A later deployment offers an update in Settings and applies successfully.
- [ ] The live GitHub Pages repository URL works and caches correctly.

## Small codebase

- `src/App.tsx`, `src/styles.css`: full-screen character, gestures, settings.
- `src/game.ts`: in-memory deck and safe preference storage.
- `src/data/`: Basic 500, textbook volume lists, and set registry.
- `vite.config.ts`, `public/`: PWA manifest generation, caching, original icons.
- `tests/`: pure-logic tests and production browser checks.
- `.github/workflows/pages.yml`: checks and manually triggered Pages deployment.

Back navigation retains up to three rounds to keep memory bounded. Settings
change the deck immediately. Browser-storage failures are nonfatal and are
reported quietly in Settings; only set, shuffle, and theme are written to
localStorage. No analytics, cookies, external services, or runtime requests
other than same-origin app/update assets are used.
