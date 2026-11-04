import { randomBytes, createHash } from 'node:crypto';

export const token = () => randomBytes(32).toString('base64url');
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160);
export const shippingFor = (subtotalCents, settings) => subtotalCents >= settings.freeShippingFromCents ? 0 : settings.shippingFlatCents;
export const publicUser = ({ id, email, name, phone, role, googleSub, passwordHash, createdAt }) => ({ id, email, name, phone, role, hasGoogle: !!googleSub, hasPassword: !!passwordHash, createdAt });
export const orderNumber = () => `SLM-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
export const error = (status, message) => Object.assign(new Error(message), { status });
export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
