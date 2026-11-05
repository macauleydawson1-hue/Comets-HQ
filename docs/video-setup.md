# Game-week video and analysis

## Backend installation

In the existing Supabase project, open SQL Editor → New query. Run the full contents of `supabase/migrations/20261105_game_video.sql`. It creates the clip metadata table, a private `comets-game-video` Storage bucket and role-based policies. The migration can be rerun and does not delete existing clips. There is no new Edge Function or secret to configure for video. Existing `comets_private.is_coach()` and `user_roles` are reused.

The frontend should be deployed after this succeeds. If it is deployed before installation, Video shows an explicit unavailable/retry message; existing app pages remain usable. Backend installation and real-account acceptance are not proven by local mocks.

## YouTube (recommended default)

Coaches can choose YouTube link, enter a normal watch/share/Shorts/live video URL, add the title, game week and analysis, and save a draft. Publish when ready. Existing direct uploads remain supported through the Video source selector. No additional SQL or Edge Function deployment is needed for YouTube after the original video setup.

YouTube stores and streams the footage; Supabase stores only the library reference and coaching analysis. The existing owner-prefixed object_path field uses the reserved `user-id/youtube/video-id/random-uuid` reference namespace, satisfying existing insert policies without creating a Storage object. Existing file paths retain their original meaning. Each entry can have its own game week and analysis, even if it references the same YouTube video.

Only recognised YouTube hosts and valid 11-character IDs are accepted. The embed URL is built from the validated ID; arbitrary iframe markup is never accepted. Players load a responsive youtube-nocookie.com iframe on demand, with fullscreen and a separate Open in YouTube fallback. The app does not autoplay. Removing a YouTube entry deletes its app analysis/reference, not the original YouTube video, and never invokes Storage deletion.

Use Unlisted for footage you do not want in YouTube search. Anyone with the URL can still watch or share it, even before it is published in COMETS HQ; the app's draft/published permissions control library visibility, not YouTube access. Private, age-restricted, copyright-blocked or embedding-disabled videos may not play inside the app. Enable embedding in YouTube and test the intended footage. YouTube branding and advertising remain controlled by YouTube. This release does not transcode, download or back up YouTube footage.

## Direct uploads (optional)

- Coaches and players have Home, Team, Matches, Stats, Training/My Training and Video navigation. Nutrition is within Training rather than a separate main tab.
- Coaches open Video to upload MP4, WebM or MOV clips up to 50 MiB. Prefer MP4 with H.264 video and AAC audio for broad phone/desktop playback. No transcoding is performed; a supported file extension alone cannot guarantee codec compatibility. Full-match footage should be trimmed into short analysis clips before upload. Supabase plan storage and bandwidth limits apply.
- Every new clip starts as a private draft. Add the game week/round, optional match date, title and coaching notes (including timestamps in text), then publish to players. Coaches can filter by game week, edit the title/week/analysis, unpublish and delete clips. To replace footage, upload a new draft rather than overwriting the original file.
- Players can filter published clips by game week, load clips on demand, play inline or use the native player's fullscreen controls, and read coaching analysis. Players cannot upload or edit metadata. Both database and Storage policies enforce access, not just hidden UI controls.
- The bucket is private. Playback uses signed URLs lasting five minutes; links issued before unpublishing may continue working until expiry. Video is not cached for offline viewing. Reload Clip requests a fresh URL after an expired link/playback failure. Revocation cannot recall downloaded copies.
- Deletion removes the library entry first, then the stored file. If file cleanup fails, coaches get an explicit warning; the project administrator can remove the orphan in Storage. A failed metadata insert after an upload attempts to clean up the unused upload, preserving the coach's entered form data.

## Coach accounts outside the squad

Member Access → choose Coach. The squad selector is disabled and cleared; no squad profile is needed. The email and name identify the staff member. The role is assigned by the issuing coach and cannot be chosen during activation. Player activations still require a squad link. Existing deployed comets-access already accepts coach invitations without a player link. The updated Edge Function source additionally ignores any submitted player link when issuing a coach code; redeploy it if you want that extra server-side normalization.

## Acceptance checks after SQL installation

1. As a coach, upload a small real MP4 with round and analysis. Confirm it is marked Draft.
2. As a separate player, confirm the draft is absent and cannot be fetched via Storage.
3. Publish the clip. As the player, confirm it appears, plays on the intended phones/computers and shows the right analysis. Filter the game week.
4. Edit the analysis, unpublish, then confirm the player library no longer lists the clip. An already-issued link can live for up to five minutes.
5. Delete a test clip and confirm its library entry and Storage object are removed. Cancel another deletion to confirm it remains.
6. Check player writes and anonymous reads are denied by database/Storage policies. Do not change the bucket to public.

Local tests (`node tests/browser.cjs`) use simulated Storage/metadata services and cover 60 populated phone/tablet/desktop screens, draft upload, publication, analysis editing, deletion, published-only player queries and inline player controls. These do not verify live storage quotas, codecs, actual Supabase RLS enforcement or device playback; run the acceptance checks above with real accounts before wider use.

## YouTube acceptance check

Upload an Unlisted test video to YouTube with embedding enabled. In COMETS HQ choose Video → YouTube link, add the link and analysis, save as draft, load the embedded video, then publish. Verify playback in a separate player account on a phone and computer. Test Open in YouTube if embedding is blocked. Actual YouTube playback and account-specific restrictions require this live check; local tests validate URL handling, iframe attributes, library operations and unchanged direct uploads using simulated services. Run `node tests/video-utils.cjs` for link-parser tests.
