import nodemailer from 'nodemailer';
import { lkrEmail } from './mailPricing.js';

export function mailEnabled() { return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM); }
const escape = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function transport() {
  if (!mailEnabled()) throw new Error('Transactional email is not configured.');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
}
export async function sendResetEmail(email, token) {
  const url = new URL('/reset-password', process.env.STORE_URL || 'http://localhost:5180');
  url.searchParams.set('token', token);
  await transport().sendMail({ from: process.env.SMTP_FROM, to: email, subject: 'Reset your SL Options Market password',
    text: `Use this link to reset your password. It expires in 30 minutes.\n\n${url}\n\nIf you did not request this, you can ignore the message.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:28px"><h2>Password reset</h2><p>We received a request to reset your SL Options Market password. This link expires in 30 minutes.</p><p><a href="${escape(url.toString())}" style="display:inline-block;padding:14px 24px;background:#1b2b21;color:white;text-decoration:none;border-radius:8px">Reset password</a></p><p>If you did not request this change, you can safely ignore this email.</p></div>`
  });
}
export async function sendOrderEmails(order, user) {
  if (!mailEnabled()) return;
  const items = order.items.map(item => `${item.quantity} × ${item.title}: ${lkrEmail(item.lineTotalCents)}`).join('\n');
  const summary = `Order ${order.number}\n\n${items}\n\nShipping: ${lkrEmail(order.shippingCents)}\nTotal: ${lkrEmail(order.totalCents)}\nPayment: Cash on delivery\nDeliver to: ${order.address.fullName}, ${order.address.line1}, ${order.address.city}, ${order.address.district}\nPhone: ${order.address.phone}`;
  const client = transport();
  const outgoing = [client.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: `Order received · ${order.number}`, text: `Thanks for shopping with SL Options Market!\n\n${summary}\n\nWe'll process your order and arrange delivery.` })];
  if (process.env.ORDER_ALERT_EMAIL) outgoing.push(client.sendMail({ from: process.env.SMTP_FROM, to: process.env.ORDER_ALERT_EMAIL, subject: `New store order · ${order.number}`, text: `Customer: ${user.name} <${user.email}>\n\n${summary}` }));
  const outcomes = await Promise.allSettled(outgoing);
  for (const result of outcomes) if (result.status === 'rejected') console.error('Order email failed:', result.reason?.message);
}
