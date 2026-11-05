# Training attendance

## Install

In the existing Supabase project, open SQL Editor → New query and run the complete `supabase/migrations/20261106_training_attendance.sql`. It creates two coach-only tables and one restricted save function. Existing sessions, accounts, video and personal logs are unchanged. No Edge Function or secrets are required. Deploy the website changes after SQL succeeds.

## Use

Coach → Training → Attendance. The separate Training tab retains the existing personal training and program tools. Select a scheduled team-training session (using its local calendar date), or choose a day directly. Name the session and mark active squad players Present, Absent, Excused or Not marked using the labelled radio controls. Search by name or position to find a player; hidden search results retain their marks. The four summary tiles always count the entire active squad. “Mark all present” is a shortcut and still requires Save Attendance. Reopen the date to review/edit saved marks. Saved marks for archived players are retained and displayed read-only under Archived players.

All coaches share one register per calendar date. Multiple scheduled sessions on the same date use the same register. It is a daily attendance record rather than a separate headcount per session. A day can be added even if no training session has been scheduled. Session selection does not modify the scheduling table. Attendance is not exposed to players in either the UI or database policies.

Saving is one database transaction. A revision check rejects stale saves if another coach has already saved the same day; your unsaved marks remain visible. Reload Saved Register discards that draft and retrieves the latest version after confirmation. Failed/network saves preserve the current marks and do not show a false success message. Switching dates or leaving via the main navigation asks before discarding unsaved marks; browser close/reload warns where the browser supports it. Unsaved attendance is held in memory, not guaranteed after browser/app closure, so save before closing the app.

## Verify after installation

1. As a coach, choose a scheduled training day, mark at least one player and save. Reload the register and confirm the date/status remain correct.
2. Choose a different manual date. It should begin with Not marked; changes must not affect the earlier date. Test both Present and Absent/Excused.
3. Open the same date with another coach. Save once in the first browser; a stale save in the second must be rejected, not overwrite the first. Reload and reapply intended changes.
4. Sign in as a player: the attendance section must be absent and direct reads/save-RPC access must be denied. Coach-only access must be checked in Supabase, not inferred from UI alone.
5. Check on a phone and computer. No database tables need to be changed manually when recording attendance.

Local browser tests use simulated services and cover saved-session startup, responsive layouts, scheduled and manual dates, defaults, save/reload, unsaved navigation cancellation, failed-save preservation and absence of the register for players. They do not establish deployed SQL/RLS or concurrency correctness; the real-account checks above are still required.

The nested tabs support Left/Right arrow keys and Home/End, with roving keyboard focus and explicitly labelled tab panels. Radio groups use the player name as their legend, preserve native keyboard behaviour and provide large touch targets. Selected statuses have a visible checked control and text, so colour is not the only signal. Returning to Training from a dirty register asks before discarding unsaved changes. This layout update uses the existing database and needs no additional SQL.
