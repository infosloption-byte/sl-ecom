import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { optionalAuth, requireAuth, requireAdmin, startSession, signOut, verifyGoogleCredential } from './auth.js';
import { asyncRoute as route, error, orderNumber, publicUser, shippingFor, slugify, token, sha256 } from './utils.js';
import { mailEnabled, smtpMissingSettings, verifySmtpConnection, sendSmtpTest, sendResetEmail, sendOrderEmails, sendContactMail, sendWelcomeEmail, sendOrderUpdateEmail, sendTrackingUpdateEmail, sendSecurityEmail } from './mail.js';
import { orderChange, trackingChanged } from './mailTemplates.js';
import { addressSchema, email, password, productSchema, settingsSchema, contactSchema } from './validators.js';
import { validateStatusChange } from './orderTracking.js';
import { recordEvent, analyticsSummary, analyticsAudience, startAnalyticsCleanup } from './analytics.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
const origins = (process.env.WEB_ORIGIN || 'http://localhost:5180').split(',').map(x => x.trim()).filter(Boolean);
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://accounts.google.com', 'https://*.gstatic.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'https://accounts.google.com'],
      frameSrc: ['https://accounts.google.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  }
}));
app.use(cors({ origin(origin, cb) { cb(null, !origin || origins.includes(origin)); }, credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use((req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('Origin');
    if (origin && !origins.includes(origin)) return next(error(403, 'Request origin is not allowed.'));
    if (!origin && process.env.NODE_ENV === 'production') return next(error(403, 'A valid Origin header is required.'));
    if (req.get('Sec-Fetch-Site') === 'cross-site') return next(error(403, 'Cross-site requests are not accepted.'));
  }
  next();
});
app.use('/api', optionalAuth);
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const uploads = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
app.use('/uploads', express.static(uploads, { maxAge: '7d', immutable: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'SL Options Market API' }));
app.get('/api/settings', route(async (_req, res) => {
  const store = await prisma.storeSettings.findUnique({ where: { id: 'main' } });
  if (!store) throw error(503, 'Store has not been initialized. Run the seed command.');
  res.json(store);
}));
// Public store enquiries are rate-limited and delivered only to the configured store inbox.
const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders:'draft-7',
  legacyHeaders:false, message:{error:'Too many contact requests. Please try again later.'} });
app.post('/api/contact', contactLimit, route(async (req, res) => {
  const input = contactSchema.parse(req.body);
  if (input.website) return res.status(202).json({ok:true});
  if (!mailEnabled()) throw error(503, 'Contact email is not configured. Please use the store email address.');
  const store = await prisma.storeSettings.findUnique({ where:{id:'main'}, select:{contactEmail:true} });
  const destination = process.env.CONTACT_ALERT_EMAIL || process.env.ORDER_ALERT_EMAIL || store?.contactEmail;
  if (!destination) throw error(503, 'Store contact email is not configured.');
  try { await sendContactMail(input, destination); }
  catch (err) { console.error('Contact delivery failed:', err.message); throw error(503, 'Message delivery is temporarily unavailable. Please email the store directly.'); }
  res.status(202).json({ok:true});
}));

// First-party shop engagement. An authenticated actor is always derived from the session cookie.
const analyticsLimiter = rateLimit({ windowMs:15*60*1000, limit:90, standardHeaders:'draft-7', legacyHeaders:false,
  message:{error:'Too many activity events.'} });
app.post('/api/analytics/event', analyticsLimiter, route(async (req,res)=>{
  const input=z.object({
    productId:z.string().min(5).max(64),
    type:z.enum(['CLICK','VIEW','CART_ADD','CHECKOUT_START']),
    visitorId:z.string().uuid()
  }).strict().parse(req.body);
  // Admin browsing does not count as customer engagement; authenticated cart adds are logged by the cart API.
  if(req.cookies?.slm_analytics_disabled==='1')return res.status(202).json({ok:true});
  if(req.user?.role==='ADMIN'||(req.user && input.type==='CART_ADD')||(!req.user&&input.type==='CHECKOUT_START'))
    return res.status(202).json({ok:true});
  const product=await prisma.product.findFirst({where:{id:input.productId,status:'ACTIVE'},select:{id:true}});
  if(!product)return res.status(202).json({ok:true});
  await recordEvent(prisma,{...input,userId:req.user?.id||null});
  res.status(202).json({ok:true});
}));

app.get('/api/categories', route(async (_req, res) => {
  const categories = await prisma.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  res.json(categories);
}));
app.get('/api/products', route(async (req, res) => {
  const query = z.object({ q: z.string().trim().max(120).optional(), category: z.string().max(120).optional(), sort: z.enum(['newest','price-low','price-high','name']).default('newest'), featured: z.enum(['true','false']).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(24).default(12) }).parse(req.query);
  const where = { status: 'ACTIVE', category: { active: true }, ...(query.category ? { category: { slug: query.category, active: true } } : {}), ...(query.featured === 'true' ? { featured: true } : {}), ...(query.q ? { OR: [{ title: { contains: query.q } }, { description: { contains: query.q } }] } : {}) };
  const orderBy = query.sort === 'price-low' ? { priceCents: 'asc' } : query.sort === 'price-high' ? { priceCents: 'desc' } : query.sort === 'name' ? { title: 'asc' } : { createdAt: 'desc' };
  const [items, total] = await Promise.all([prisma.product.findMany({ where, include: { category: { select: { id: true, name: true, slug: true } } }, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.product.count({ where })]);
  res.json({ items, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
}));
app.get('/api/products/:slug', route(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, include: { category: true } });
  if (!product || product.status !== 'ACTIVE' || !product.category.active) throw error(404, 'Product not found.');
  res.json(product);
}));

app.post('/api/auth/register', loginLimit, route(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(120), email, password }).strict().parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw error(409, 'An account with this email already exists.');
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) } });
  const publicProfile = await startSession(res, user);
  res.status(201).json({ user: publicProfile });
  void sendWelcomeEmail(user);
}));
app.post('/api/auth/login', loginLimit, route(async (req, res) => {
  const input = z.object({ email, password: z.string().min(1) }).strict().parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) throw error(401, 'Invalid email or password.');
  res.json({ user: await startSession(res, user) });
}));
app.post('/api/auth/google', loginLimit, route(async (req, res) => {
  const { credential } = z.object({ credential: z.string().min(50).max(10000) }).strict().parse(req.body);
  const profile = await verifyGoogleCredential(credential);
  let user = await prisma.user.findUnique({ where: { googleSub: profile.sub } });
  let createdNow = false;
  if (!user) {
    const existing = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existing) throw error(409, 'This email already has an account. Sign in first, then link Google under Account settings.');
    user = await prisma.user.create({ data: { name: profile.name, email: profile.email, googleSub: profile.sub } });
    createdNow = true;
  }
  const publicProfile = await startSession(res, user);
  res.json({ user: publicProfile });
  if(createdNow) void sendWelcomeEmail(user,{google:true});
}));
app.post('/api/auth/forgot-password', loginLimit, route(async (req, res) => {
  const input = z.object({ email }).strict().parse(req.body);
  if (!mailEnabled()) throw error(503, 'Password recovery is not yet configured. Contact store support.');
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user?.passwordHash) {
    const secret = token();
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(secret), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    try { await sendResetEmail(user.email, secret); }
    catch (err) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash: sha256(secret) } });
      console.error('Password recovery email failed:', String(err.code || err.name || 'delivery_error'));
    }
  }
  res.json({ message: 'If an email/password account exists, we have sent a reset link.' });
}));
app.post('/api/auth/reset-password', loginLimit, route(async (req, res) => {
  const input = z.object({ token: z.string().min(20).max(256), newPassword: password }).strict().parse(req.body);
  const tokenHash = sha256(input.token);
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw error(400, 'This reset link is invalid or has expired.');
  await prisma.$transaction(async tx => {
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw error(400, 'This reset link has already been used.');
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: reset.userId, id: { not: reset.id } } });
  });
  res.json({ ok: true });
  void prisma.user.findUnique({where:{id:reset.userId},select:{name:true,email:true}})
    .then(user=>user && sendSecurityEmail(user,'PASSWORD_CHANGED'))
    .catch(err=>console.error('Password notification failed:',String(err.code||err.name||'delivery_error')));
}));
app.post('/api/auth/logout', route(signOut));
app.get('/api/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
app.put('/api/me', requireAuth, route(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).nullable().optional() }).strict().parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: input });
  res.json({ user: publicUser(user) });
}));
app.put('/api/me/password', requireAuth, route(async (req, res) => {
  const input = z.object({ oldPassword: z.string().optional(), newPassword: password }).strict().parse(req.body);
  if (req.user.passwordHash && (!input.oldPassword || !(await bcrypt.compare(input.oldPassword, req.user.passwordHash)))) throw error(401, 'Current password is incorrect.');
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } });
  await prisma.session.deleteMany({ where: { userId: req.user.id, id: { not: req.sessionId } } });
  res.json({ ok: true });
  void sendSecurityEmail(req.user,'PASSWORD_CHANGED');
}));
app.post('/api/me/link-google', requireAuth, route(async (req, res) => {
  const { credential } = z.object({ credential: z.string().min(50).max(10000) }).strict().parse(req.body);
  const google = await verifyGoogleCredential(credential);
  if (google.email !== req.user.email) throw error(409, 'Google email must match the signed-in account.');
  const owned = await prisma.user.findUnique({ where: { googleSub: google.sub } });
  if (owned && owned.id !== req.user.id) throw error(409, 'This Google account is already linked elsewhere.');
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { googleSub: google.sub } });
  res.json({ user: publicUser(user) });
  void sendSecurityEmail(user,'GOOGLE_LINKED');
}));

app.get('/api/me/addresses', requireAuth, route(async (req, res) => {
  res.json(await prisma.address.findMany({ where: { userId: req.user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }));
}));
app.post('/api/me/addresses', requireAuth, route(async (req, res) => {
  const input = addressSchema.parse(req.body);
  const count = await prisma.address.count({ where: { userId: req.user.id } });
  const address = await prisma.$transaction(async tx => {
    if (input.isDefault || count === 0) await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, isDefault: input.isDefault || count === 0, userId: req.user.id } });
  });
  res.status(201).json(address);
}));
app.put('/api/me/addresses/:id', requireAuth, route(async (req, res) => {
  const input = addressSchema.parse(req.body);
  const found = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!found) throw error(404, 'Address not found.');
  const address = await prisma.$transaction(async tx => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    return tx.address.update({ where: { id: found.id }, data: input });
  });
  res.json(address);
}));
app.delete('/api/me/addresses/:id', requireAuth, route(async (req, res) => {
  const found = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!found) throw error(404, 'Address not found.');
  await prisma.address.delete({ where: { id: found.id } });
  res.json({ ok: true });
}));

const cartInclude = { product: { include: { category: { select: { name: true, slug: true } } } } };
app.get('/api/cart', requireAuth, route(async (req, res) => {
  res.json(await prisma.cartItem.findMany({ where: { userId: req.user.id }, include: cartInclude, orderBy: { createdAt: 'desc' } }));
}));
app.post('/api/cart', requireAuth, route(async (req, res) => {
  const { productId, quantity } = z.object({ productId: z.string().min(5), quantity: z.number().int().min(1).max(10).default(1) }).strict().parse(req.body);
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { category: true } });
  if (!product || product.status !== 'ACTIVE' || !product.category.active) throw error(404, 'Product not available.');
  const existing = await prisma.cartItem.findUnique({ where: { userId_productId: { userId: req.user.id, productId } } });
  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (nextQuantity > Math.min(10, product.stock)) throw error(409, 'Not enough stock for the requested quantity.');
  await prisma.cartItem.upsert({ where: { userId_productId: { userId: req.user.id, productId } }, update: { quantity: nextQuantity }, create: { userId: req.user.id, productId, quantity: nextQuantity } });
  if(req.cookies?.slm_analytics_disabled!=='1')await recordEvent(prisma,{type:'CART_ADD',productId,userId:req.user.id}).catch(err=>console.error('Cart analytics failed:',err.message));
  res.json({ ok: true });
}));
app.post('/api/cart/sync', requireAuth, route(async (req, res) => {
  const input = z.object({ items: z.array(z.object({ productId: z.string().min(5), quantity: z.number().int().min(1).max(10) })).max(30) }).strict().parse(req.body);
  for (const item of input.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId }, include: { category: true } });
    if (!product || product.status !== 'ACTIVE' || !product.category.active || product.stock === 0) continue;
    const existing = await prisma.cartItem.findUnique({ where: { userId_productId: { userId: req.user.id, productId: item.productId } } });
    const quantity = Math.min((existing?.quantity || 0) + item.quantity, product.stock, 10);
    if (quantity < 1) continue;
    await prisma.cartItem.upsert({ where: { userId_productId: { userId: req.user.id, productId: item.productId } }, update: { quantity }, create: { userId: req.user.id, productId: item.productId, quantity } });
    if(req.cookies?.slm_analytics_disabled!=='1')await recordEvent(prisma,{type:'CART_ADD',productId:item.productId,userId:req.user.id}).catch(err=>console.error('Cart sync analytics failed:',err.message));
  }
  res.json({ ok: true });
}));
app.put('/api/cart/:productId', requireAuth, route(async (req, res) => {
  const { quantity } = z.object({ quantity: z.number().int().min(0).max(10) }).strict().parse(req.body);
  const key = { userId_productId: { userId: req.user.id, productId: req.params.productId } };
  if (quantity === 0) { await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } }); return res.json({ ok: true }); }
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product || product.status !== 'ACTIVE' || quantity > product.stock) throw error(409, 'Not enough stock.');
  const updated = await prisma.cartItem.updateMany({ where: { userId: req.user.id, productId: req.params.productId }, data: { quantity } });
  if (!updated.count) throw error(404, 'Cart item not found.');
  res.json({ ok: true });
}));
app.delete('/api/cart/:productId', requireAuth, route(async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
  res.json({ ok: true });
}));

app.get('/api/wishlist', requireAuth, route(async (req, res) => {
  res.json(await prisma.wishlistItem.findMany({ where: { userId: req.user.id }, include: cartInclude, orderBy: { id: 'desc' } }));
}));
app.post('/api/wishlist/:productId', requireAuth, route(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product || product.status !== 'ACTIVE') throw error(404, 'Product unavailable.');
  await prisma.wishlistItem.upsert({ where: { userId_productId: { userId: req.user.id, productId: product.id } }, create: { userId: req.user.id, productId: product.id }, update: {} });
  if(req.cookies?.slm_analytics_disabled!=='1')await recordEvent(prisma,{type:'WISHLIST_ADD',productId:product.id,userId:req.user.id}).catch(err=>console.error('Wishlist analytics failed:',err.message));
  res.json({ ok: true });
}));
app.delete('/api/wishlist/:productId', requireAuth, route(async (req, res) => {
  await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
  res.json({ ok: true });
}));

const orderInclude = { items: true, statusEvents: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } };
app.get('/api/orders', requireAuth, route(async (req, res) => {
  res.json(await prisma.order.findMany({ where: { userId: req.user.id }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 100 }));
}));
app.get('/api/orders/:id', requireAuth, route(async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { ...orderInclude, user: { select: { name: true, email: true } } } });
  if (!order) throw error(404, 'Order not found.');
  res.json(order);
}));
app.post('/api/checkout', requireAuth, route(async (req, res) => {
  const input = z.object({ address: addressSchema.omit({ isDefault: true }), note: z.string().trim().max(500).optional().default(''), checkoutKey: z.string().uuid(), saveAddress: z.boolean().optional().default(false), acceptTerms: z.literal(true), paymentMethod: z.literal('COD') }).strict().parse(req.body);
  const old = await prisma.order.findUnique({ where: { checkoutKey: input.checkoutKey } });
  if (old) {
    if (old.userId !== req.user.id) throw error(409, 'Checkout key cannot be reused.');
    return res.json(old);
  }
  const order = await prisma.$transaction(async tx => {
    const entries = await tx.cartItem.findMany({ where: { userId: req.user.id }, include: { product: { include: { category: true } } } });
    if (!entries.length) throw error(400, 'Your bag is empty.');
    const subtotalCents = entries.reduce((sum, entry) => {
      if (entry.product.status !== 'ACTIVE' || !entry.product.category.active || entry.quantity < 1 || entry.quantity > 10) throw error(409, 'An item in your bag is no longer available.');
      return sum + entry.quantity * entry.product.priceCents;
    }, 0);
    const store = await tx.storeSettings.findUnique({ where: { id: 'main' } });
    if (!store) throw error(503, 'Store settings are unavailable.');
    const shippingCents = shippingFor(subtotalCents, store);
    for (const entry of entries) {
      const changed = await tx.product.updateMany({ where: { id: entry.productId, stock: { gte: entry.quantity }, status: 'ACTIVE' }, data: { stock: { decrement: entry.quantity } } });
      if (!changed.count) throw error(409, `Not enough stock for ${entry.product.title}.`);
    }
    const created = await tx.order.create({ data: {
      number: orderNumber(), checkoutKey: input.checkoutKey, userId: req.user.id, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents,
      address: input.address, note: input.note, paymentMethod: 'COD',
      statusEvents: { create: { status: 'PLACED', createdBy: 'Store' } },
      items: { create: entries.map(e => ({ productId: e.productId, title: e.product.title, imageUrl: e.product.imageUrl, unitPriceCents: e.product.priceCents, quantity: e.quantity, lineTotalCents: e.product.priceCents * e.quantity })) }
    }, include: orderInclude });
    if (input.saveAddress) {
      const count = await tx.address.count({ where: { userId: req.user.id } });
      await tx.address.create({ data: { ...input.address, userId: req.user.id, isDefault: count === 0 } });
    }
    await tx.cartItem.deleteMany({ where: { userId: req.user.id } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  // Return the confirmed order immediately; SMTP delivery is best-effort after commit.
  res.status(201).json(order);
  void sendOrderEmails(order, req.user).catch(err =>
    console.error('Order notification failed:',String(err.code||err.name||'delivery_error')));
}));

// All administration endpoints are protected in one place.
const admin = express.Router();
admin.use(requireAdmin);
// Admin-only integration diagnostics; never return SMTP passwords or Google secrets.
admin.get('/integrations',route(async (_req,res)=>{
  res.json({
    smtp:{configured:mailEnabled(),missing:smtpMissingSettings()},
    google:{configured:Boolean(process.env.GOOGLE_CLIENT_ID)}
  });
}));
admin.post('/integrations/verify-smtp',loginLimit,route(async (_req,res)=>{
  const result=await verifySmtpConnection();
  res.json(result);
}));
admin.post('/integrations/test-email',loginLimit,route(async (req,res)=>{
  if(!mailEnabled())throw error(503,'Configure SMTP settings before sending a test.');
  try { await sendSmtpTest(req.user); }
  catch(err){
    console.error('SMTP test delivery failed:',String(err.code||err.name||'delivery_error'));
    throw error(503,'The mail server could not accept a test email. Check SMTP settings and your inbox.');
  }
  res.json({ok:true,message:'SMTP accepted the test email for your administrator address.'});
}));

admin.get('/overview', route(async (_req, res) => {
  const [products, customers, orders, recent, total] = await Promise.all([
    prisma.product.count(), prisma.user.count({ where: { role: 'CUSTOMER' } }), prisma.order.count(),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { name: true, email: true } } } }),
    prisma.order.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { totalCents: true } })
  ]);
  res.json({ products, customers, orders, orderValueCents: total._sum.totalCents || 0, recent });
}));
admin.get('/analytics/summary',route(async(req,res)=>{
  const {days}=z.object({days:z.coerce.number().int().refine(x=>[7,30,90].includes(x)).default(30)}).parse(req.query);
  res.json(await analyticsSummary(prisma,days));
}));
admin.get('/analytics/audience/:productId',route(async(req,res)=>{
  const {days}=z.object({days:z.coerce.number().int().refine(x=>[7,30,90].includes(x)).default(30)}).parse(req.query);
  const result=await analyticsAudience(prisma,req.params.productId,days);
  if(!result)throw error(404,'Product not found.');
  res.json(result);
}));
admin.get('/products', route(async (_req, res) => res.json(await prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: 'desc' }, take: 500 }))));
admin.get('/products/:id', route(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { category: true } });
  if (!product) throw error(404, 'Product not found.');
  res.json(product);
}));
function normalizedProduct(input) {
  const images = [...new Set(input.images.length ? input.images : input.imageUrl ? [input.imageUrl] : [])];
  return { ...input, images, imageUrl: images[0] || input.imageUrl || '', shortDescription: input.shortDescription || null, sku: input.sku || null };
}
admin.post('/products', route(async (req, res) => {
  const input = productSchema.parse(req.body);
  if (input.compareAtCents != null && input.compareAtCents <= input.priceCents) throw error(400, 'Compare-at price must exceed the selling price.');
  const product = await prisma.product.create({ data: { ...normalizedProduct(input), slug: input.slug || slugify(input.title) || `item-${randomUUID().slice(0, 8)}` } });
  res.status(201).json(product);
}));
admin.put('/products/:id', route(async (req, res) => {
  const input = productSchema.parse(req.body);
  if (input.compareAtCents != null && input.compareAtCents <= input.priceCents) throw error(400, 'Compare-at price must exceed the selling price.');
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { ...normalizedProduct(input), ...(input.slug ? { slug: input.slug } : {}) } });
  res.json(product);
}));
admin.delete('/products/:id', route(async (req, res) => {
  // Archive rather than delete: preserve order history and cart reference integrity.
  await prisma.product.update({ where: { id: req.params.id }, data: { status: 'DRAFT' } });
  res.json({ ok: true });
}));
admin.get('/categories', route(async (_req, res) => res.json(await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }))));
admin.post('/categories', route(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(100), active: z.boolean().default(true), sortOrder: z.number().int().default(0) }).strict().parse(req.body);
  res.status(201).json(await prisma.category.create({ data: { ...input, slug: slugify(input.name) } }));
}));
admin.put('/categories/:id', route(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(100), active: z.boolean(), sortOrder: z.number().int() }).strict().parse(req.body);
  res.json(await prisma.category.update({ where: { id: req.params.id }, data: { ...input, slug: slugify(input.name) } }));
}));
admin.delete('/categories/:id', route(async (req, res) => {
  if (await prisma.product.count({ where: { categoryId: req.params.id } })) throw error(409, 'Move or archive this category’s products first.');
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));
admin.get('/orders', route(async (_req, res) => res.json(await prisma.order.findMany({ include: { items: true, user: { select: { name: true, email: true, phone: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }))));
admin.get('/orders/:id', route(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { ...orderInclude, user: { select: { name: true, email: true, phone: true } } } });
  if (!order) throw error(404, 'Order not found.');
  res.json(order);
}));
admin.patch('/orders/:id', route(async (req, res) => {
  const { status, paymentStatus } = z.object({ status: z.enum(['PLACED','CONFIRMED','PACKED','SHIPPED','DELIVERED','CANCELLED']), paymentStatus: z.enum(['PENDING','PAID','FAILED','REFUNDED']) }).strict().parse(req.body);
  const {updated,before} = await prisma.$transaction(async tx => {
    const current = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!current) throw error(404, 'Order not found.');
    if (!validateStatusChange(current.status, status)) throw error(409, 'Order status cannot go backwards; shipped and delivered orders cannot be cancelled here.');
    if (status === 'CANCELLED' && current.status !== 'CANCELLED') {
      for (const item of current.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    const changed = await tx.order.update({ where: { id: current.id }, data: { status, paymentStatus, ...(status !== current.status ? { statusEvents: { create: { status, createdBy: req.user.name.slice(0, 120) } } } : {}) } });
    return {updated:changed,before:{status:current.status,paymentStatus:current.paymentStatus}};
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  res.json(updated);
  const change = orderChange(before,updated);
  if(change.statusChanged||change.paymentChanged){
    void prisma.user.findUnique({where:{id:updated.userId},select:{name:true,email:true}})
      .then(user=>user && sendOrderUpdateEmail(updated,user,before))
      .catch(err=>console.error('Order email lookup failed:',String(err.code||err.name||'delivery_error')));
  }
}));
admin.patch('/orders/:id/tracking', route(async (req, res) => {
  const input = z.object({
    courierName: z.string().trim().max(120).nullable().optional(),
    trackingNumber: z.string().trim().max(120).nullable().optional(),
    trackingUrl: z.string().trim().max(500).refine(v => !v || /^https:\/\//i.test(v), 'Tracking link must use HTTPS').nullable().optional(),
    estimatedDeliveryAt: z.string().datetime({ offset: true }).nullable().optional()
  }).strict().parse(req.body);
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) throw error(404, 'Order not found.');
  const updated = await prisma.order.update({ where: { id: order.id }, data: {
    ...Object.fromEntries(Object.entries(input).filter(([k]) => k !== 'estimatedDeliveryAt').map(([k, v]) => [k, v || null])),
    ...(Object.prototype.hasOwnProperty.call(input, 'estimatedDeliveryAt') ? { estimatedDeliveryAt: input.estimatedDeliveryAt ? new Date(input.estimatedDeliveryAt) : null } : {})
  } });
  res.json(updated);
  if(trackingChanged(order,updated)){
    void prisma.user.findUnique({where:{id:updated.userId},select:{name:true,email:true}})
      .then(user=>user && sendTrackingUpdateEmail(updated,user))
      .catch(err=>console.error('Tracking email lookup failed:',String(err.code||err.name||'delivery_error')));
  }
}));
admin.get('/customers', route(async (_req, res) => res.json(await prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }))));
admin.put('/settings', route(async (req, res) => {
  const input = settingsSchema.parse(req.body);
  res.json(await prisma.storeSettings.upsert({ where: { id: 'main' }, update: input, create: { id: 'main', ...input } }));
}));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
admin.post('/upload', upload.single('image'), route(async (req, res) => {
  if (!req.file) throw error(400, 'Select an image first.');
  const detected = await fileTypeFromBuffer(req.file.buffer);
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!detected || !extensions[detected.mime]) throw error(400, 'Only JPG, PNG and WebP images are allowed.');
  await mkdir(uploads, { recursive: true });
  const filename = `${randomUUID()}.${extensions[detected.mime]}`;
  await writeFile(path.join(uploads, filename), req.file.buffer, { flag: 'wx' });
  res.status(201).json({ imageUrl: `/uploads/${filename}` });
}));
app.use('/api/admin', admin);

// In production, the same Node server can serve the built React app.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
app.use(express.static(webDist, { index: false }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next(error(404, 'Not found.'));
  res.sendFile(path.join(webDist, 'index.html'), err => { if (err) next(error(404, 'Frontend not built yet.')); });
});
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message || 'Invalid input.', issues: err.issues });
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'This record already exists.' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found.' });
    if (err.code === 'P2034') return res.status(409).json({ error: 'Another transaction updated this order. Please try again.' });
  }
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB.' : 'Invalid image upload.' });
  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server.' : err.message });
});

startAnalyticsCleanup(prisma);
const port = Number(process.env.PORT || 4010);
app.listen(port, () => console.log(`SL Options Market API listening on http://localhost:${port}`));
