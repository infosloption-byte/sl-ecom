# SL Options Market — Email and Authentication (Phase 1)

This phase adds branded transactional messages and administrator diagnostics. It keeps **cash on delivery**, the existing user model and the database migrations unchanged.

## Transactional email matrix

| Trigger | Recipient | Email | What it means |
| --- | --- | --- | --- |
| New email/password registration | Customer | Welcome and account link | Sent after account creation (best effort) |
| First Google registration | Customer | Welcome and Google sign-in guidance | Only the first time, not every login |
| New COD order | Customer | Confirmation, items, delivery charges, address, pending payment | **Not a payment receipt** |
| New COD order | \`ORDER_ALERT_EMAIL\`, if configured | Staff order alert | Lets staff prepare a new order |
| Admin advances order | Customer | Status update | Only when status actually changes |
| Admin updates payment status | Customer | Payment update; receipt access if PAID | Only when payment state actually changes |
| Admin changes courier/tracking | Customer | Delivery information and order link | Only when information actually changes |
| Password recovery | Customer | Single-use token link, 30-minute validity | Sent immediately; token deleted on SMTP failure |
| Password changed/reset | Customer | Account security notice | Without disclosing passwords |
| Google account linked | Customer | Account security notice | Only after link is confirmed |
| Admin SMTP test | Signed-in administrator | Test message | Confirms SMTP accepted it, **not** inbox placement |
| Contact us form | Store inbox | Customer enquiry | Existing contact form behavior retained |

All templates contain both **plain text and escaped responsive HTML**, with SL Options Market branding and links to the configured public storefront.

### Delivery guarantees and failure behavior

For the MVP, transactional messages are **best effort**, not a durable job queue. An SMTP outage does **not** roll back a completed registration, payment status update, order status transition or checkout. Messages are logged without credential/token details but **not retried automatically** after a process crash or delivery failure. For reliable production delivery at scale, implement a durable email outbox with retry history, monitoring and dead-letter handling.

Password reset is different: the reset link is sent directly, and an unsent token is deleted. The endpoint continues using a generic response so outsiders cannot enumerate registered email addresses. If an SMTP outage persists, users can contact support.

## WAMP / localhost setup

Keep credentials in your **untracked** \`apps/api/.env\` and \`apps/web/.env\`. Do not commit them.

Example SMTP setup (replace every placeholder with your own provider credentials):

\`\`\`dotenv
NODE_ENV=development
WEB_ORIGIN=http://localhost:5180
STORE_URL=http://localhost:5180

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-approved-mailbox@example.com
SMTP_PASSWORD=your-provider-approved-app-password
SMTP_FROM="SL Options Market <your-approved-mailbox@example.com>"
ORDER_ALERT_EMAIL=your-business-inbox@example.com
CONTACT_ALERT_EMAIL=your-business-inbox@example.com
\`\`\`

Use provider-approved SMTP credentials, such as a Google app password when supported by the account's security setup. Do not use a normal Google account password as an SMTP substitute. Your mail provider may require the sender address to match your authenticated account or verified domain. Local development should not send bulk messages to real customers.

### Google sign-in

1. Create/configure an OAuth consent screen and a **Web application OAuth Client ID** in Google Cloud.
2. Add \`http://localhost:5180\` as an authorized JavaScript origin for local development. Add the live HTTPS storefront domain for production.
3. Set the **same web client ID** in both environments:
   - \`apps/api/.env\`: \`GOOGLE_CLIENT_ID=...\`
   - \`apps/web/.env\`: \`VITE_GOOGLE_CLIENT_ID=...\`
4. Restart Vite and Node after updating environment files.
5. Test new Google registration, existing Google login, and linking a matching Google account while signed in under Account → Settings.
6. Verify an existing email/password account is **not automatically linked** merely because an incoming Google email matches it; user must sign in first.

The administrator dashboard status only confirms that the backend Google Client ID is **configured**, not that OAuth is working. Test the real Google button in a browser.

## Admin-side verification

Open \`http://localhost:5180/admin?tab=settings\` and scroll to **Connected services**:

- **Transactional SMTP**: shows configured/missing environment variable names, without exposing their values.
- **Verify SMTP connection**: asks the SMTP provider to authenticate/verify the connection; no email is sent.
- **Send test email**: delivers to the **currently logged-in administrator's email only**, preventing arbitrary recipient abuse. Check that mailbox's inbox and spam folder.
- **Google sign-in**: indicates whether the backend Client ID exists; frontend and Google Cloud origin settings must still be tested manually.

If SMTP test fails, inspect Node server logs for a safe error code and verify provider authentication/port/firewall. Production customer email links require \`STORE_URL\` to be set to the correct **HTTPS** origin. Never leave production links pointed at localhost.

## Local test commands

\`\`\`powershell
cd C:\wamp\www\html\sl-ecom
git fetch origin
git switch --track origin/feature/transactional-email-auth-hardening-20261105
npm ci
npm run db:generate
npm test
npm run build
npm audit
npm run dev
\`\`\`

No new database migration is needed. Do not reset \`slstore\`.

### Browser acceptance checklist

- [ ] Confirm admin integration card shows configured/missing SMTP fields, and Google Client ID status.
- [ ] Verify SMTP connection and send a test email to the admin address.
- [ ] Register a new email/password customer; check welcome email and password sign-in.
- [ ] Register a new Google account; check welcome email exactly once and existing Google login.
- [ ] Verify duplicate-email Google sign-in cannot take over an existing password account; link only through signed-in settings.
- [ ] Request a password reset, follow the link, and set a new password. Confirm token expires in 30 minutes and cannot be used twice.
- [ ] Change password from Account Settings and receive security notice without including passwords.
- [ ] Link Google to existing account and receive security notification.
- [ ] Place COD order; verify customer confirmation and staff alert. Check line items, delivery charge and **payment pending** wording.
- [ ] In Admin Orders change PLACED → CONFIRMED → PACKED → SHIPPED → DELIVERED; verify correct emails and no email on repeated identical updates.
- [ ] Add/edit courier name and tracking number; check tracking email and protected order link.
- [ ] Mark COD payment PAID **only after test collection**; verify customer mail mentions a payment receipt. Changing to FAILED/REFUNDED should use the corresponding wording.
- [ ] Temporarily misconfigure SMTP **on a test instance** and confirm registration, checkout and admin updates still succeed, while password reset does not falsely expose whether the email exists.
- [ ] Verify email HTML escapes malicious-looking customer names and notes, and links point to the intended store origin.
- [ ] Verify mobile admin card and all existing checkout, cart, account and invoice screens.

## Next security and operations improvements

Production readiness still needs verified customer email ownership (email verification), administrator MFA, an email delivery outbox/retry system, monitoring, and Playwright end-to-end coverage. Do not treat the current SMTP integration check alone as proof of reliable customer delivery.
