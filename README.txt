COMETS HQ V6.9 — iPhone home screen + persistent sign-in.
Deploy the contents of this ZIP to the SAME Netlify site URL to retain the browser session.
On iPhone: Safari > Share > Add to Home Screen > Add. Open from the new icon.
Supabase auth is stored locally per browser/app installation; an iOS standalone app may require one initial login separate from Safari.
Signing out, clearing site data, or session revocation requires signing in again.
Offline: app shell can load, but private club data needs an internet connection.
No changes to approved V6.8.1 visual layout, tabs, selection or stats.

V7.0.1: iOS icon fix. Root apple-touch-icon.png, explicit icon tags, refreshed cache, Netlify icon cache headers. After deploying, open the same Netlify site URL in Safari, remove previous shortcut, then Add to Home Screen again. Verify the logo in the iOS preview before tapping Add.
