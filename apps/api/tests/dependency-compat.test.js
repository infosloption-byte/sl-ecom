import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileTypeFromBuffer } from 'file-type';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { addressSchema, email, password, productSchema } from '../src/validators.js';

test('Zod 4 validates and normalizes customer email', () => {
  assert.equal(email.parse('  Example@EXAMPLE.com  '), 'example@example.com');
  assert.equal(password.safeParse('123456789').success, false);
  assert.equal(password.safeParse('a-strong-local-password').success, true);
});

test('Zod 4 rejects extra address keys and invalid product prices', () => {
  const address = { fullName: 'Customer', phone: '+94771234567', line1: 'Main Street', city: 'Kandy', district: 'Kandy' };
  assert.equal(addressSchema.safeParse(address).success, true);
  assert.equal(addressSchema.safeParse({ ...address, role: 'ADMIN' }).success, false);
  assert.equal(productSchema.safeParse({
    title: 'Sample', description: 'Sample item', imageUrl: '/demo/mug.svg',
    priceCents: -500, stock: 1, categoryId: 'category-1'
  }).success, false);
});

test('file-type 22 retains ESM buffer detection', async () => {
  const pngSignature = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
  const kind = await fileTypeFromBuffer(pngSignature);
  assert.equal(kind?.mime, 'image/png');
});

test('Nodemailer 10 still provides the configured SMTP-compatible sendMail API', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const info = await transport.sendMail({ from: 'shop@example.com', to: 'customer@example.com', subject: 'Test order', text: 'Order placed' });
  assert.match(String(info.message), /Order placed/);
  transport.close();
});

test('Google Auth Library 11 retains ID token verification entrypoint', () => {
  const client = new OAuth2Client('local-test-client-id');
  assert.equal(typeof client.verifyIdToken, 'function');
});
