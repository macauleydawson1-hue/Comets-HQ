# Coach-recorded player benchmarks

## Install

Run the entire `supabase/migrations/20261106_player_benchmarks.sql` in the existing Supabase project using SQL Editor → New query. It adds one table and coach-only policies, preserving existing squad, personal logs and match stats. No Edge Function is needed. Publish the website only after this succeeds.

The app currently has only a publishable client key. It cannot apply database migrations itself; a Supabase management connection or a project owner's SQL Editor session is required.

## Use

Coach → Team → Squad → select a player → Progress tracker. Alternatively Coach → Training → Training → Progress → select a squad player. Both views read/write the same player-specific records. Existing personal browser logs are not assigned to players automatically, because their owner cannot be inferred safely. Old local 10 m/30 m entries remain stored, but those options are removed from new entry menus. Strength working-set benchmarks remain available.

- Bronco: minutes:seconds (e.g. 5:30), stored as 330 seconds. Lower is better.
- 100 m sprint: seconds to two decimal places (e.g. 14.25). Lower is better.
- Push-ups (1 min): whole repetitions, including zero. Higher is better.
- Plank: minutes:seconds or total seconds. Higher is better.
- Sit-ups (1 min): whole repetitions, including zero. Higher is better.
- Bench / Squat / Trap-bar working sets: kilograms; compare consistent reps and technique. Higher is better.

Enter a test date and optional conditions/notes, then Save Player Result. Use the View Benchmark selector to review latest/best results, a last-12-results trend and full dated history. Exact values and dates remain readable without the chart. Coaches can edit/delete incorrect entries; deletion asks for confirmation. The tracker is coach-only, not a public squad leaderboard. Normal player accounts have no table access. Archived player results remain in the database.

## Verify after installation

1. Use two different squad profiles. Save a Bronco result for one; verify it is absent from the other. Confirm Bronco 5:30 is stored/displayed consistently, and 5:10 becomes the better result.
2. Add 100 m sprint seconds, push-up/sit-up repetition counts (including zero) and Plank time. Reject fractional repetitions and invalid/zero durations.
3. Enter dated results, reopen the profile and test the Progress player selector. Check personal best direction and chronological history.
4. Correct a result, cancel deletion once, then delete a test entry. Failed saves must retain the current form input.
5. Confirm player/anonymous direct database access is denied, as well as the absence of editing controls in their UI.

Local tests (`node tests/benchmark-utils.cjs` and `node tests/browser.cjs`) use mocked services. They do not establish production database policies, real persistence or multi-account access; verify these after running the SQL. No production SQL was executed by the assistant without a management connection.
