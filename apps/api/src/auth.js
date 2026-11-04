import { OAuth2Client } from 'google-auth-library';
import { prisma } from './db.js';
import { error, publicUser, sha256, token } from './utils.js';

const cookieName = 'slm_session';
const duration = 1000 * 60 * 60 * 24 * 14;
const google = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function startSession(res, user) {
  const secret = token();
  await prisma.session.create({ data: { userId: user.id, tokenHash: sha256(secret), expiresAt: new Date(Date.now() + duration) } });
  res.cookie(cookieName, secret, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: duration });
  return publicUser(user);
}

export function clearSession(res) {
  res.clearCookie(cookieName, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
}

export async function optionalAuth(req, _res, next) {
  try {
    const secret = req.cookies?.[cookieName];
    if (secret && typeof secret === 'string' && secret.length < 256) {
      const session = await prisma.session.findUnique({ where: { tokenHash: sha256(secret) }, include: { user: true } });
      if (session && session.expiresAt > new Date()) {
        req.user = session.user;
        req.sessionId = session.id;
      }
    }
    next();
  } catch (err) { next(err); }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(error(401, 'Please sign in to continue.'));
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(error(401, 'Please sign in to continue.'));
  if (req.user.role !== 'ADMIN') return next(error(403, 'Admin access required.'));
  next();
}

export async function signOut(req, res) {
  if (req.sessionId) await prisma.session.deleteMany({ where: { id: req.sessionId } });
  clearSession(res);
  res.json({ ok: true });
}

export async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) throw error(503, 'Google sign-in is not configured yet.');
  let ticket;
  try { ticket = await google.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID }); }
  catch { throw error(401, 'Google sign-in could not be verified.'); }
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified) throw error(401, 'A verified Google account is required.');
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: payload.name?.slice(0, 120) || 'Customer' };
}
