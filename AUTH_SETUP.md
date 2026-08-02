# Kodex Authentication Setup Guide

## Overview

Kodex uses **Supabase Auth** for user authentication with signup, login, and password recovery.

**Auth Routes:**
- `/auth/login` - Sign in with email/password
- `/auth/signup` - Create new account
- `/auth/reset-password` - Request password reset
- `/auth/reset-password-confirm` - Set new password (after email link)

**Protected Routes:**
- `/admin/*` - Lead inbox, SEO queue (requires login)
- `/assess/*` - Assessment forms (requires login)

---

## Setup Instructions

### Step 1: Enable Supabase Auth (Required for Features)

**If using Supabase database:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication → Settings**
4. Verify **Email/Password** provider is enabled ✓

**Email Configuration (For Password Recovery):**

1. Go to **Email Templates** in Auth settings
2. Update "Reset Password" email template with your branding:
   ```
   Reset your password by clicking: {{ .ConfirmationURL }}
   ```
3. The URL will redirect to `/auth/reset-password-confirm` (auto-configured)

### Step 2: Get Supabase Credentials

In Supabase Dashboard → Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ... (copy the anon key)
```

### Step 3: Add to Environment Variables

**Local Development (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Render Dashboard Env Vars:**
Same values as above

### Step 4: Test Locally

```bash
npm run dev

# Visit http://localhost:3000/auth/signup
# Create account → Should show "Check your email" message

# Visit http://localhost:3000/auth/login
# Login with credentials → Redirects to /admin/leads
```

---

## User Flows

### New User Signup

1. User visits `/auth/signup`
2. Enters: Full Name, Email, Password (8+ chars)
3. Account created in Supabase Auth
4. Confirmation email sent
5. Redirected to `/auth/login` with message
6. User clicks email link to confirm account
7. Returns to login page
8. User logs in → Access to `/admin/*` and `/assess/*`

### Existing User Login

1. User visits `/auth/login`
2. Enters email and password
3. Supabase validates credentials
4. Session token stored in browser cookies
5. Redirects to `/admin/leads` (lead inbox)

### Forgot Password

1. User visits `/auth/reset-password`
2. Enters email address
3. Confirmation email sent with reset link
4. User clicks link in email
5. Redirected to `/auth/reset-password-confirm`
6. User enters new password (2x for confirmation)
7. Password updated in Supabase
8. Redirected to `/auth/login` with success message

---

## File Structure

```
lib/
  ├── auth-client.ts       # Supabase auth functions
  │   ├── signUp()
  │   ├── signIn()
  │   ├── signOut()
  │   ├── resetPassword()
  │   ├── updatePassword()
  │   └── getCurrentUser()

app/auth/
  ├── login/page.tsx       # Login form
  ├── signup/page.tsx      # Signup form
  ├── reset-password/page.tsx          # Request password reset
  └── reset-password-confirm/page.tsx  # Set new password

middleware.ts             # Route protection (redirects to login)
```

---

## API Functions

### signUp(email, password, fullName)
Create new user account
```typescript
import { signUp } from "@/lib/auth-client";

await signUp("user@example.com", "password123", "John Doe");
// Returns: { user, session }
```

### signIn(email, password)
Authenticate existing user
```typescript
import { signIn } from "@/lib/auth-client";

await signIn("user@example.com", "password123");
// Returns: { user, session }
```

### resetPassword(email)
Send password reset email
```typescript
import { resetPassword } from "@/lib/auth-client";

await resetPassword("user@example.com");
// User receives email with reset link → /auth/reset-password-confirm
```

### updatePassword(newPassword)
Set new password (called from reset-password-confirm page)
```typescript
import { updatePassword } from "@/lib/auth-client";

await updatePassword("newPassword123");
// Password updated, user redirected to login
```

### signOut()
Logout user
```typescript
import { signOut } from "@/lib/auth-client";

await signOut();
```

### getCurrentUser()
Get authenticated user info
```typescript
import { getCurrentUser } from "@/lib/auth-client";

const user = await getCurrentUser();
// Returns: { id, email, user_metadata, ... }
```

---

## Email Configuration

### Password Reset Email

Supabase sends a password reset email with a link like:
```
https://kodex-leads.onrender.com/auth/reset-password-confirm?token=...
```

The token is automatically extracted and used to update the password.

**To customize the email:**
1. Supabase Dashboard → Authentication → Email Templates
2. Edit "Reset Password" template
3. Change the link text or add branding

### Confirmation Email

When user signs up, Supabase sends a confirmation email. Users must click the link to activate their account before logging in.

**To customize:**
1. Supabase Dashboard → Authentication → Email Templates
2. Edit "Confirm signup" template

---

## Security Best Practices

✅ **What's Implemented:**
- Passwords hashed by Supabase (bcrypt)
- HTTPS-only auth tokens
- Session tokens expire (default 24 hours)
- Middleware protects admin routes
- Email confirmation required

✅ **Additional Steps (Recommended):**
- Enable MFA (Multi-Factor Auth) in Supabase settings
- Set password requirements (min length 8+)
- Monitor auth logs for suspicious activity
- Use strong NEXT_PUBLIC_SUPABASE_ANON_KEY (rotate periodically)

---

## Troubleshooting

### "Missing Supabase credentials for auth"
**Problem:** NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set

**Fix:**
1. Set both env vars in Render dashboard
2. Restart Render service
3. Verify variables in .env.local locally

### "User already registered"
**Problem:** Email already has account

**Fix:** User should click "Forgot your password?" to reset

### "Invalid or expired password reset link"
**Problem:** Reset link expired (usually after 24 hours)

**Fix:** User should request a new reset link via `/auth/reset-password`

### "Session expired"
**Problem:** Auth token expired

**Fix:** User logs out and logs in again (automatic on /auth/login)

---

## Integration with SEO System

Auth system is **independent** from SEO lead capture:

- **Public:** Assessment forms (`/assess/*`) accept leads without login
- **Protected:** Admin dashboards (`/admin/*`) require login to view leads

This allows:
- Visitors to take assessments and be scored (public)
- Team members to view leads and manage campaigns (protected)

---

## Next Steps

1. ✅ Auth system is fully implemented
2. **TODO:** Add admin user invite system (optional)
3. **TODO:** Add audit logs for auth events (optional)
4. **TODO:** Add password strength meter (UX enhancement)

---

**Status:** Ready for deployment ✓

All auth files committed. Just ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Render.
