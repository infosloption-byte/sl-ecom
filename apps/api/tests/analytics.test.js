import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventDedupeKey, recordEvent, daysSince, EVENT_TYPES, ANALYTICS_RETENTION_DAYS } from '../src/analytics.js';

test('product views use stable per-visitor five-minute deduplication keys', () => {
  const t=Date.UTC(2026,10,5,9,5,1);
  const same=eventDedupeKey('VIEW','product-1',null,'visitor-1',t);
  assert.equal(same,eventDedupeKey('VIEW','product-1',null,'visitor-1',t+1000));
  assert.notEqual(same,eventDedupeKey('VIEW','product-1',null,'visitor-2',t));
  assert.notEqual(same,eventDedupeKey('VIEW','product-1','customer-1','visitor-1',t));
  assert.notEqual(same,eventDedupeKey('CLICK','product-1',null,'visitor-1',t));
  assert.equal(eventDedupeKey('CART_ADD','product-1',null,'visitor-1',t),null);
});

test('duplicate customer views are nonfatal and anonymous events require visitor token', async () => {
  let writes=0;
  const db={productEvent:{create:async({data})=>{
    assert.equal(data.type,'VIEW'); assert.equal(data.userId,'user-123');
    assert.equal(data.dedupeKey?.length,64);writes++;
    if(writes>1){const e=new Error('Unique key');e.code='P2002';throw e;}
  }}};
  assert.equal(await recordEvent(db,{type:'VIEW',productId:'product-123',userId:'user-123'}),true);
  assert.equal(await recordEvent(db,{type:'VIEW',productId:'product-123',userId:'user-123'}),false);
  assert.equal(await recordEvent(db,{type:'VIEW',productId:'product-123'}),false);
  assert.equal(writes,2);
});

test('analytics periods and retention are bounded',()=>{
  assert.deepEqual(EVENT_TYPES,['CLICK','VIEW','CART_ADD','WISHLIST_ADD','CHECKOUT_START']);
  assert.equal(ANALYTICS_RETENTION_DAYS,90);
  const days=(Date.now()-daysSince(30).getTime())/86400000;
  assert.ok(days>=29.99&&days<=30.01);
});
