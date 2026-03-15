# Authentication Setup

Auth uses Supabase with Google, Email/Password, Magic Link, Phone OTP, and Password Reset.

## Fix "Google not enabled" / "Unsupported phone provider"

See **[docs/SUPABASE_PROVIDERS.md](./SUPABASE_PROVIDERS.md)** for step-by-step: enable Google (OAuth credentials) and Phone (SMS provider) in Supabase Dashboard.

## Email templates (match site UI)

Custom HTML for signup/magic-link/reset emails (dark + gold, Amby Luxe style):

- Copy from **supabase/email-templates/** into **Supabase Dashboard → Authentication → Email Templates** (Confirm signup, Magic Link, Reset Password).
- See **supabase/email-templates/README.md** for which file goes where.

## Redirect URLs

- **Authentication** → **URL Configuration**
- Add: `http://localhost:8080/**`, `https://www.sayandeep.store/**`

## Auth Methods

| Method | Flow |
|--------|------|
| Google | OAuth → redirect to `/auth/callback` |
| Email + Password | Sign up / Sign in form |
| Magic Link | Passwordless link sent to email |
| Phone OTP | Enter phone → SMS OTP → verify |
| Forgot Password | Reset link sent to email |

## Profile Binding

Profiles are created automatically on first sign-in. OAuth metadata and phone sync to `profiles` via `handle_new_user` trigger.
