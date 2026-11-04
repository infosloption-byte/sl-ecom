import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStatusChange, invoiceType } from '../src/orderTracking.js';
import { productSchema } from '../src/validators.js';

test('order progress only advances and shipped orders cannot be cancelled', () => {
  assert.equal(validateStatusChange('PLACED', 'PACKED'), true);
  assert.equal(validateStatusChange('PACKED', 'CONFIRMED'), false);
  assert.equal(validateStatusChange('SHIPPED', 'CANCELLED'), false);
  assert.equal(validateStatusChange('PLACED', 'CANCELLED'), true);
  assert.equal(validateStatusChange('CANCELLED', 'PLACED'), false);
  assert.equal(validateStatusChange('DELIVERED', 'SHIPPED'), false);
});
test('invoice titles do not claim COD payment until marked paid', () => {
  assert.match(invoiceType('PENDING'), /pending/);
  assert.equal(invoiceType('PAID'), 'Payment receipt');
});
test('product gallery and specs are constrained to safe short entries', () => {
  const base = { title:'Test product', description:'Details', priceCents:1000, stock:4, categoryId:'cat-1', status:'DRAFT' };
  assert.equal(productSchema.safeParse({ ...base, images:['/uploads/test.png'], specifications:[{label:'Material', value:'Cotton'}] }).success, true);
  assert.equal(productSchema.safeParse({ ...base, images:['javascript:alert(1)'] }).success, false);
  assert.equal(productSchema.safeParse({ ...base, specifications:[{label:'',value:'A'}] }).success, false);
  assert.equal(productSchema.safeParse({ ...base, images:Array(9).fill('/demo/mug.svg') }).success, false);
});
