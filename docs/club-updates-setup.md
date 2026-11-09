# Playing coaches, opposition briefings and personal-best notifications

## Install

In the existing Comets HQ Supabase project, open SQL Editor → New query. Run the entire `supabase/migrations/20261109_club_briefings_and_highs.sql`. It adds the private opposition notebook, separate briefing drafts/publications, notification inbox and new hit-ups match-stat column, plus checked linking/publishing functions and achievement triggers. No new Edge Function, API token or phone notification permission is needed. The website should be pushed after SQL succeeds; real signed-in acceptance checks remain necessary.

The migration is tested and rerunnable. Existing rows/accounts/passwords are preserved. No old match achievements or briefing notifications are sent merely by installing it. It reuses `comets_private.is_coach()`, `user_roles`, `profiles`, `player_links`, `fixtures`, `match_stats` and `squad_players`. It restricts direct authenticated player-link writes; the application uses `comets_link_member` instead. Existing activation functions use server-side/definer access and remain supported.

## A coach who also plays

Coach → Member Access → Link an existing account to the squad. Enter the member's existing sign-in email, select their active squad profile and Save Account Link. Do this separately for Macauley and Tommy using their own accounts. Linking never changes role, password or match/training records, and rejects a player already linked to someone else. Coach accounts without a squad link remain staff-only. A player account cannot be unlinked without a replacement squad link.

Once linked, Training shows a My Training tab alongside Training and Attendance. Playing coaches can access their own assigned programs and private logs there while retaining all coaching tools. Existing coaches may need to sign out/in after another coach changes their link. New coach codes remain staff-only at activation; use the same existing-account linking form after activation for a playing coach. This avoids needing to redeploy the existing activation Edge Function.

## Opposition notes and match preparation

Matches → Opposition Briefing. Choose a fixture. Coaches enter concise strengths, weaknesses, three team priorities and an optional YouTube link. Notes are remembered against a normalized opponent name (case and repeated spaces ignored); use consistent team names in fixtures. When that opponent returns, previous notes prefill a draft for review. Historical published match plans remain attached to their original fixture.

Save Private Draft updates only the coach workspace/notebook. Players continue seeing the previously published snapshot, if there is one. Publish to Squad publishes a separate snapshot and sends an in-app notification. Publish requires a team priority. Unpublish removes the player snapshot and its notification. Publishing identical content again does not create an unread update; changed published content reuses one notification per member/fixture and marks it unread. Revision checks prevent stale saves by different coaches. Unsaved changes warn before switching matches, main navigation, or opening announcements; browser close warnings depend on browser support.

## Personal season highs and leaders

Official Match Stats now includes optional Hit-ups. Leave it blank when unrecorded; zero means measured zero. Personal-best notices are created in PostgreSQL when official tries, tackles, metres or hit-ups strictly improve on an earlier match in the same calendar year. The first measured result is a baseline, ties do not alert, and errors are never rewarded. No benchmark/gym logs generate these match achievements.

Notifications are linked to the member's squad identity, so a playing coach can receive their own achievements. Corrections update or remove invalid existing notices without resetting read status or creating duplicate celebrations. Historical matches that become qualifying due only to another match's correction are not backfilled with new alerts; saving that match explicitly re-evaluates it. Changing a fixture year revalidates old/new seasons without a retrospective alert burst. Same-day fixtures use stable fixture-ID ordering because the existing fixture table has dates rather than kickoff timestamps.

Stats → Single-match season highs shows positive squad leaders (including ties), with the linked user's own best. It is separate from cumulative season totals. Archived players' official results remain eligible for historical leaders. Season means calendar year of the fixture date. Test match corrections and season selection using the team's real fixtures.

## Notification inbox

Account → Notifications, or Home → Notifications. An unread badge appears on Account and the home card. Counts refresh while the app is visible (approximately every minute); open/reopen the inbox to retrieve the latest 100 items. Opening an item marks it read and takes the member to its match briefing or season highs. Mark All Read is available. This is in-app only, not phone push, SMS or email; no notification is delivered while the app is closed. Future phone push requires separate opt-in infrastructure.

Private achievements can be read only by their recipient while their account remains linked to that player. Member clients can change only read_at; they cannot forge notifications or edit titles/messages. Opposition drafts/notebooks are coach-only, while published snapshots are available to club members. SQL functions check roles rather than relying on hidden buttons.

## Validation

- `node tests/club-features.cjs`: season filtering, high-vs-total distinction and ties.
- `node tests/browser.cjs`: 80 responsive coach/player screen checks plus playing-coach logs, staff-only unlinking, draft/public briefing flows and private inbox navigation; services are simulated.
- Real local PostgreSQL/PLpgSQL tests: install `@electric-sql/pglite@0.3.14` outside the checkout, then run `PGLITE_PATH=/tmp/comets-pg-tests/node_modules/@electric-sql/pglite node tests/club-database.cjs`. This checks actual migration syntax, RLS and column privileges, snapshots, revisions, deduplication, secure linking, baseline/tie/correction rules, unknown hit-ups and migration repeatability. This engine is development-only, not a production dependency.

After SQL installation, verify with separate real coach/player accounts: link a test playing coach, create a private draft and confirm it is hidden from the player, publish and check the player inbox, save official stats across two test fixtures and check the correct person's achievement, correct the result and verify no duplicate alert. Do not use production players/matches for destructive testing. The assistant cannot claim production validation until those checks or equivalent authorized connected checks have been completed.
