# SL Options Market — Security notes

## Implemented foundations

- HttpOnly, SameSite=Lax, production-Secure session cookies; high-entropy opaque random session tokens; only SHA-256 hashes stored in MySQL.
- Explicit ADMIN role authorization for the entire admin router; no public role assignment.
- API payload validation via Zod and error messages that do not expose server stack traces.
- BCrypt password hashing (work factor 12); login throttling; hashed single-use password reset tokens with 30-minute expiration; session invalidation on password reset.
- Google identity validated by official library against the configured audience; verified email required and `sub` stored; no automatic account linking on email match.
- Strict allowed origins on state-changing requests, SameSite cookies, secure production cookies, Helmet headers with CSP and no unrestricted cross-origin API credentials.
- Orders priced from server-side product records, not submitted amounts. Transactional stock decrement and order creation with serializable isolation. Idempotent client checkout key.
- Product uploads limited to 5 MB with server-side magic-number verification for JPEG/PNG/WebP; random opaque filenames; uploads restricted to administrators.
- Product archive instead of destructive deletion; checkout rejects inactive/insufficient-stock products.

## Still required before public launch

- End-to-end tests with MySQL and a real browser, including multiple concurrent checkouts and retries.
- Admin multi-factor authentication and sensitive-action audit trail.
- Email verification for ordinary email/password signups; strengthen COD fraud screening and customer abuse controls.
- Forgot-password rate limiting per account/email and SMTP observability. Generic responses are recommended for anti-enumeration.
- Independent security review of authentication, routing, CSP, dependencies, uploads and proxy configuration.
- Hosted storage or secure backups for uploaded images; strict staff access and routine patches.
- Policy and regulatory review appropriate for the products sold in Sri Lanka.
- Online payment callback validation, webhook replay protection, and refunds/reconciliation when a local provider is integrated.

## Do not ship with examples

The sample database password, sample admin credentials, store contact email and product illustrations are demonstration-only. `.env` files are excluded by `.gitignore`; never commit real secrets. Store HTTPS certificates, database passwords, SMTP credentials and API keys in a secret manager or properly secured environment files.
