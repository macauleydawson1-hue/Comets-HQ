# Responsive polish and validation

The site remains a static deployment. Serve this directory with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`polish.css` is the final stylesheet after the legacy inline styles. `ui.js` owns reusable dialogs, status feedback, connectivity messages, field labels and navigation accessibility. `live.js` continues to own authentication and backend writes. Shared squad, selection and private log data are kept in memory rather than serialized into the legacy browser backup. Existing personal gym logs and local team standards remain device-only.

## Browser regression suite

With Node, Playwright and Chromium installed:

```sh
node tests/browser.cjs
```

Set `CHROMIUM_PATH` if Chromium is installed somewhere other than `/usr/bin/chromium`. The test imports Playwright from the execution environment; no production dependency or build step is needed. All Supabase calls are intercepted with simulated accounts. Tests cover populated screens at 320, 390, 768 and 1440 pixels, input labels, horizontal overflow, compact headers, log creation/editing/deletion, duplicate clicks, failed saves preserving drafts, invitation redirects, restored selections and sign-out cleanup. Production data is never touched.

The home-screen icon uses the existing 180×180 `apple-touch-icon.png` in both the Apple touch link and web manifest, with relative URLs for GitHub Pages project sites. Devices may retain an old installed icon; remove and re-add the shortcut after deployment. Real iOS/Android installation still needs device verification.

## Backend work still required

- Team selection replacement still uses the existing delete/insert API sequence. Move this to a single server-side transaction with coach authorization and conflict detection. The repository contains no database schema/migrations or configured database administration access; this release does not claim atomic saving.
- Verify row-level access policies with real coach and player accounts, including private logs, drafts, profile updates and log editing/deletion. Frontend role checks do not replace these policies.
- In Supabase Auth, allow the deployed GitHub/custom-domain callback URL. Invitations now send the current site's base URL, including a GitHub Pages repository path, rather than the old Netlify URL. The Edge Function must honor this redirect and enforce coach authorization.
- Set/change password is available in Account; verify invitation acceptance and password setup against the deployed Supabase project. Live email delivery and production sign-in were not exercised by simulated tests.
- Offline mode displays a reconnect message and caches only the local shell. Supabase's external SDK and private APIs are not cached; authentication and writes require connectivity.

Older device-only team standards and personal gym tools remain separate from shared backend records. Local-only profile notes and manual stat editors are removed from live profile screens; official statistics are edited through Match Centre. A later refactor can consolidate the remaining legacy render functions and inline themes after broader production-account coverage exists.
