import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactSchema } from '../src/validators.js';

const valid = {
  name: 'Sri Lankan Customer',
  email: 'shopper@example.com',
  topic: 'Order question',
  orderNumber: 'SLM-1001',
  message: 'Could you confirm the delivery details for my order?'
};

test('contact validation normalizes email and permits optional order number', () => {
  const input = contactSchema.parse({ ...valid, email: '  CUSTOMER@EXAMPLE.COM  ' });
  assert.equal(input.email, 'customer@example.com');
  assert.equal(input.orderNumber, 'SLM-1001');
  assert.equal(input.website, '');
});

test('contact form rejects oversized messages and extra fields', () => {
  assert.equal(contactSchema.safeParse({ ...valid, message:'too short' }).success, false);
  assert.equal(contactSchema.safeParse({ ...valid, message:'a'.repeat(3001) }).success, false);
  assert.equal(contactSchema.safeParse({ ...valid, admin:true }).success, false);
  assert.equal(contactSchema.safeParse({ ...valid, topic:'Billing account transfer' }).success, false);
});

test('contact form accepts a honeypot field for server-side spam suppression', () => {
  const data = contactSchema.parse({ ...valid, website:'https://example.com' });
  assert.equal(data.website, 'https://example.com');
});
