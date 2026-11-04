import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, shippingFor, publicUser, orderNumber, token, sha256 } from '../src/utils.js';

test('slugify normalizes product URLs', () => assert.equal(slugify('  Studio Wireless Headphones!  '), 'studio-wireless-headphones'));
test('shipping charged below threshold', () => assert.equal(shippingFor(1499999, { shippingFlatCents: 45000, freeShippingFromCents: 1500000 }), 45000));
test('shipping free at threshold', () => assert.equal(shippingFor(1500000, { shippingFlatCents: 45000, freeShippingFromCents: 1500000 }), 0));
test('public user removes credential material', () => {
  const data = publicUser({ id:'1', email:'x@example.com', name:'X', phone:null, role:'CUSTOMER', googleSub:'secret', passwordHash:'secret2', createdAt:new Date() });
  assert.equal(data.hasGoogle, true);
  assert.equal(data.hasPassword, true);
  assert.ok(!('passwordHash' in data));
  assert.ok(!('googleSub' in data));
});
test('order number is reasonably unique', () => assert.notEqual(orderNumber(), orderNumber()));
test('opaque session token hashes', () => assert.equal(sha256(token()).length, 64));
