import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventDedupeKey, recordEvent, daysSince, analyticsSummary, analyticsAudience, EVENT_TYPES, ANALYTICS_RETENTION_DAYS } from '../src/analytics.js';

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

test('summary differentiates engagement from purchases and COD receipts',async()=>{
  let raw=0,aggregate=0,group=0;
  const today=new Date().toISOString().slice(0,10);
  const db={
    productEvent:{groupBy:async()=>[{productId:'p12345',type:'VIEW',_count:{_all:5}},{productId:'p12345',type:'CART_ADD',_count:{_all:2}}]},
    product:{findMany:async()=>[{id:'p12345',title:'Test pouch',slug:'test-pouch',imageUrl:'',stock:4,status:'ACTIVE'}]},
    orderItem:{groupBy:async()=>[{productId:'p12345',_count:{_all:1},_sum:{quantity:2,lineTotalCents:480000}}]},
    cartItem:{groupBy:async()=>[{productId:'p12345',_count:{_all:1},_sum:{quantity:1}}]},
    wishlistItem:{groupBy:async()=>[{productId:'p12345',_count:{_all:3}}]},
    order:{aggregate:async()=>++aggregate===1?{_count:{_all:1},_sum:{totalCents:520000}}:{_count:{_all:0},_sum:{totalCents:0}}},
    $queryRaw:async()=>{
      const n=raw++;
      if(n===0)return[{day:today,type:'VIEW',total:5n}];
      if(n===1)return[{day:today,orders:1n}];
      if(n===2)return[{visitors:3n}];
      if(n===3)return[{customers:2n}];
      return[{productId:'p12345',interestCount:1n}];
    }
  };
  const result=await analyticsSummary(db,7);
  assert.equal(result.metrics.VIEW,5);
  assert.equal(result.metrics.CART_ADD,2);
  assert.equal(result.metrics.receivedCents,0);
  assert.equal(result.metrics.orders,1);
  assert.equal(result.metrics.interestWithoutPurchasePairs,1);
  assert.equal(result.products[0].interestedNotPurchased,1);
  assert.equal(result.products[0].unitsOrdered,2);
  assert.equal(result.products[0].wishlistedNow,3);
  assert.equal(result.daily.at(-1).views,5);
});

test('audience identifies signed-in interest without asserting a purchase',async()=>{
  const now=new Date();
  const db={
    product:{findUnique:async()=>({id:'p12345',title:'Test pouch',slug:'test-pouch'})},
    productEvent:{findMany:async()=>[{userId:'u12345',type:'VIEW',createdAt:now},{userId:'u12345',type:'CART_ADD',createdAt:now}]},
    user:{findMany:async()=>[{id:'u12345',name:'Test Customer',email:'customer@example.com'}]},
    cartItem:{findMany:async()=>[{userId:'u12345',quantity:1}]},
    wishlistItem:{findMany:async()=>[]},
    orderItem:{findMany:async()=>[]}
  };
  const result=await analyticsAudience(db,'p12345',30);
  assert.equal(result.customers.length,1);
  assert.equal(result.customers[0].purchasedUnits,0);
  assert.equal(result.customers[0].cartQuantity,1);
  assert.equal(result.customers[0].views,1);
});
