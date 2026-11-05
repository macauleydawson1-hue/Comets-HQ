# One-time member activation

Prepared for the existing profiles / user_roles / player_links / squad_players schema. Existing email/password sign-in and existing accounts remain supported. Every coach can issue new Coach or Player activations; no member can select their own role. Players require a squad link. Coach activations may optionally also link a squad player.

## Install in Supabase dashboard

1. Open SQL Editor → New query. Paste the entire contents of `supabase/migrations/20261105_member_activation.sql`, then Run. This adds a new restricted table and service-only functions; it does not replace your existing accounts or policies. Save the success/error output.
2. Open Edge Functions → create/deploy a new function called **comets-access**, using the dashboard editor. Paste the contents of `supabase/functions/comets-access/index.ts` into its `index.ts`, then deploy.
3. For this function, turn **Verify JWT** / **Enforce JWT verification** OFF. Public activation must reach the function without a signed-in user. Coach actions still validate the token with Supabase Auth and check user_roles server-side. The repository's `supabase/config.toml` contains the equivalent CLI setting.
4. Supabase Edge Functions provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-side. Never add these credentials to website files, SQL query results or chat. If the platform reports a missing binding, configure it in project function secrets.
5. Publish the website changes only after the database and function are installed. No redirect allowlist or email delivery is needed for this code activation path. The original email-invite feature remains separate.

## Acceptance check (project owner)

- Sign in with your existing coach account. Home → Coach administration → Member access.
- Add a test squad player first. Generate a Player code using a new email you control and that player. Copy and share the code privately; it is shown only once, is bound to that email and expires in 24 hours. Codes are deliberately long (128 random bits); copy/paste is recommended.
- In a separate private browser window select “I HAVE AN ACTIVATION CODE”. Enter the code, assigned email, and a new password (12–128 characters). Activate, then use ordinary email/password sign-in. Confirm player-only navigation and the correct squad link.
- Try the same code again: it must fail. Try the wrong email, a revoked/expired code and mismatched passwords: none should activate an account.
- Repeat with Coach role and another new email. Confirm access to coaching tools and member administration.
- Revoke a fresh unused code and confirm redemption fails. Revocation applies to pending codes; it does not disable accounts already activated. Role changes and disabling existing accounts are outside this first activation release.

## Recovery and limitations

Account creation and database role assignment use different Supabase services. A code is atomically claimed before Auth account creation. New accounts are temporarily banned while role/profile/link assignment is committed in one database transaction. If provisioning fails, the function deletes only the account it just created; it reopens the code only after successful cleanup. If cleanup fails, the code stays claimed and requires project-administrator investigation. If enabling a completed account fails, the account stays provisioned and the administrator must enable it in Authentication → Users. Do not reset other users' passwords or delete existing accounts to resolve a duplicate email; they should use their existing sign-in.

The activation table and RPCs are inaccessible to browser roles, including authenticated coaches. The service credential stays in the Edge Function. Codes are stored as hashes. No password or raw code is logged by application code. Codes and passwords are sent only over HTTPS. Possession of an email-bound code is the activation proof; this flow does not independently verify mailbox ownership. Existing Auth signup triggers and database security rules still require real-project acceptance testing, since they are not in this repository. Supabase's normal password sign-in rate limits remain in effect; consider gateway request limits if the public activation endpoint receives abusive traffic.

Validation commands in the prepared environment:

```
node tests/access-function.cjs
node tests/browser.cjs
```

These use simulated services, not your production database. The migration and deployed Edge Function must be tested in Supabase before calling the feature live.
