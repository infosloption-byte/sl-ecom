# Security dependency upgrade validation (2026-11-04)

This branch is a **candidate** to address 11 initial vulnerabilities (5 moderate, 6 high). The first candidate passed all 11 unit tests, Vite build, Prisma generate/validate/migrate status on WAMP, but still reported 4 high findings from Prisma's `effect` and `deepmerge-ts` dependencies. The second candidate adds Prisma 6.19.3 and a root-level deepmerge override. **Do not merge until the updated local WAMP checks and a new audit pass.**

## What was changed

- `nodemailer` to `^10.3.1` (SMTP/parser advisories). The app uses the stable `createTransport` and `sendMail` APIs.
- `file-type` to `^22.3.0` (parsing / denial-of-service advisories). It still exports `fileTypeFromBuffer`.
- `zod` to `^4.6.7` (oversized constrained collection advisory). Existing validator methods are supported but changes across major versions need testing.
- `react-router-dom` to `^7.18.5` (router advisories). v7 provides a compatible re-export layer for the app's v6 declarative routing APIs.
- `google-auth-library` to `^11.3.2`, updating its older `gaxios` / `uuid` dependency chain.
- Prisma CLI and Client are both updated from `6.19.0` to `6.19.3` (Prisma 6 patch release), which upgrades Prisma's transitive `effect` version to `3.21.0`, fixing its advisory. The root-level npm `overrides` now specify `deepmerge-ts: ^8.0.2`; this overrides Prisma's old exact pin in `@prisma/config`. The previous nested `@prisma/config` overrides did not clear the user's audit findings. **This override still crosses a major version in a Prisma internal dependency, so recheck migrations and runtime carefully.**

No database schema or migration files are changed.

## Validation on Windows / WAMP

From a clean checkout of this branch, with WAMP MySQL running:

```powershell
npm install
npm ls prisma @prisma/client @prisma/config effect deepmerge-ts
npm run db:generate
npm exec -w apps/api -- prisma validate
npm exec -w apps/api -- prisma migrate status
npm test
npm run build
npm audit
npm run audit:prod
npm run dev
```

- Keep `apps/api/.env` and `apps/web/.env` locally; neither should be committed.
- **Do not** run `prisma migrate reset`: this dependency patch has no schema changes and should preserve existing data.
- If any dependency check, migration status, audit, or API/UI flow fails, do not merge. Copy the log and fix the candidate first. If `npm audit` still reports the same vulnerable paths after installation, use `npm explain deepmerge-ts` and `npm explain effect` before considering any lockfile regeneration; do not delete `node_modules`/lockfile blindly.
- Open the app at `http://localhost:5180`, and test customer signup/login, Google login, product upload (valid and invalid images), wishlist/cart, COD checkout, admin order management and cancellation, password recovery and SMTP test email if configured.
- Run an actual Google sign-in and SMTP sending test after the automated smoke tests; these involve external services and are **not** covered by `npm test`.
- If the new audit still lists vulnerable packages, inspect `npm audit --json` and `npm ls <package>`, then remediate the remaining dependency chains individually. Do not assert zero vulnerabilities before observing the actual result.

## Lockfile

The repository was created without a committed `package-lock.json`. `npm install` will generate/update it. After tests pass, commit the generated lockfile on this branch so the reviewed dependency graph can be reproduced with `npm ci` in CI/deployment.

## Do not use blind forced upgrades

Avoid `npm audit fix --force` because it may upgrade Prisma 6 to Prisma 7, which requires separate architectural and database-client changes. For reference, see the upstream Prisma issue: https://github.com/prisma/orm/issues/30052

## Merge requirements

- All existing and new unit tests pass.
- Vite production build succeeds.
- Prisma generation, validation and migration status succeed against the existing WAMP database.
- Both `npm audit` and `npm audit --omit=dev` are reviewed and remaining risks are recorded.
- Customer/admin smoke test and a test COD order complete successfully.
