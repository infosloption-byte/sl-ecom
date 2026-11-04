import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

export const EVENT_TYPES = ['CLICK','VIEW','CART_ADD','WISHLIST_ADD','CHECKOUT_START'];
export const ANALYTICS_RETENTION_DAYS = 90;
const WINDOW = 5 * 60 * 1000;
const DAY = 86400000;
export const daysSince = days => new Date(Date.now()-days*DAY);
export function eventDedupeKey(type,productId,userId,visitorId,timestamp=Date.now()){
  if (!['CLICK','VIEW','CHECKOUT_START'].includes(type)) return null;
  return createHash('sha256').update([type,productId,userId?'u:'+userId:'v:'+visitorId,Math.floor(timestamp/WINDOW)].join('|')).digest('hex');
}
export async function recordEvent(prisma,{type,productId,userId=null,visitorId=null}){
  if(!EVENT_TYPES.includes(type)||(!userId&&!visitorId))return false;
  try{
    await prisma.productEvent.create({data:{type,productId,userId,visitorId,dedupeKey:eventDedupeKey(type,productId,userId,visitorId)}});
    return true;
  }catch(err){if(err.code==='P2002')return false;throw err;}
}
const zero=()=>Object.fromEntries(EVENT_TYPES.map(x=>[x,0]));
const num=v=>Number(v??0);
export async function analyticsSummary(prisma,days){
  const since=daysSince(days),where={createdAt:{gte:since}};
  const validOrders={status:{not:'CANCELLED'},createdAt:{gte:since}};
  const [eventGroups,products,itemsOrdered,carts,wishes,orderTotals,paidTotals,dailyEvents,dailyOrders,visitorRows,customerRows,noPurchaseRows]=await Promise.all([
    prisma.productEvent.groupBy({by:['productId','type'],where,_count:{_all:true}}),
    prisma.product.findMany({select:{id:true,title:true,slug:true,imageUrl:true,stock:true,status:true},orderBy:{createdAt:'desc'},take:500}),
    prisma.orderItem.groupBy({by:['productId'],where:{order:validOrders},_sum:{quantity:true,lineTotalCents:true},_count:{_all:true}}),
    prisma.cartItem.groupBy({by:['productId'],_count:{_all:true},_sum:{quantity:true}}),
    prisma.wishlistItem.groupBy({by:['productId'],_count:{_all:true}}),
    prisma.order.aggregate({where:validOrders,_sum:{totalCents:true},_count:{_all:true}}),
    prisma.order.aggregate({where:{...validOrders,paymentStatus:'PAID'},_sum:{totalCents:true},_count:{_all:true}}),
    prisma.$queryRaw(Prisma.sql(["SELECT DATE_FORMAT(createdAt,'%Y-%m-%d') AS day, type, COUNT(*) AS total FROM ProductEvent WHERE createdAt >= "," GROUP BY DATE_FORMAT(createdAt,'%Y-%m-%d'),type ORDER BY day ASC"],since)),
    prisma.$queryRaw(Prisma.sql(["SELECT DATE_FORMAT(createdAt,'%Y-%m-%d') AS day, COUNT(*) AS orders FROM \u0060Order\u0060 WHERE createdAt >= "," AND status <> 'CANCELLED' GROUP BY DATE_FORMAT(createdAt,'%Y-%m-%d') ORDER BY day ASC"],since)),
    prisma.$queryRaw(Prisma.sql(["SELECT COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN CONCAT('u:',userId) ELSE CONCAT('v:',visitorId) END) AS visitors FROM ProductEvent WHERE createdAt >= ",""],since)),
    prisma.$queryRaw(Prisma.sql(["SELECT COUNT(DISTINCT userId) AS customers FROM ProductEvent WHERE createdAt >= "," AND userId IS NOT NULL"],since)),
    prisma.$queryRaw(Prisma.sql(["SELECT pe.productId AS productId, COUNT(DISTINCT pe.userId) AS interestCount FROM ProductEvent pe WHERE pe.createdAt >= ",
      " AND pe.userId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM OrderItem oi JOIN \u0060Order\u0060 o ON o.id = oi.orderId WHERE oi.productId = pe.productId AND o.userId = pe.userId AND o.status <> 'CANCELLED') GROUP BY pe.productId"],since))
  ]);
  const grouped=new Map(),totals=zero();
  for(const e of eventGroups){
    if(!grouped.has(e.productId))grouped.set(e.productId,zero());
    grouped.get(e.productId)[e.type]=e._count._all;
    totals[e.type]+=e._count._all;
  }
  const purchases=new Map(itemsOrdered.map(x=>[x.productId,x])), inCarts=new Map(carts.map(x=>[x.productId,x])),wishlisted=new Map(wishes.map(x=>[x.productId,x]));
  const withoutPurchase=new Map(noPurchaseRows.map(x=>[x.productId,num(x.interestCount)]));
  const allProducts=products.map(p=>{
    const e=grouped.get(p.id)||zero(),o=purchases.get(p.id),c=inCarts.get(p.id),w=wishlisted.get(p.id);
    return {...p,views:e.VIEW,clicks:e.CLICK,cartAdds:e.CART_ADD,wishlistAdds:e.WISHLIST_ADD,checkoutStarts:e.CHECKOUT_START,
      orderLines:o?._count._all||0,unitsOrdered:o?._sum.quantity||0,orderValueCents:o?._sum.lineTotalCents||0,
      inCarts:c?._count._all||0,cartUnits:c?._sum.quantity||0,wishlistedNow:w?._count._all||0,
      interestedNotPurchased:withoutPurchase.get(p.id)||0};
  }).sort((a,b)=>b.views-a.views||b.cartAdds-a.cartAdds||b.unitsOrdered-a.unitsOrdered);
  const byDay=new Map();
  for(let i=days-1;i>=0;i--){const day=new Date(Date.now()-i*DAY).toISOString().slice(0,10);byDay.set(day,{day,views:0,clicks:0,cartAdds:0,wishlistAdds:0,checkoutStarts:0,orders:0});}
  for(const x of dailyEvents){const row=byDay.get(String(x.day));if(!row)continue;const key={VIEW:'views',CLICK:'clicks',CART_ADD:'cartAdds',WISHLIST_ADD:'wishlistAdds',CHECKOUT_START:'checkoutStarts'}[x.type];if(key)row[key]=num(x.total);}
  for(const x of dailyOrders){const row=byDay.get(String(x.day));if(row)row.orders=num(x.orders);}
  return {days,from:since.toISOString(),retentionDays:ANALYTICS_RETENTION_DAYS,metrics:{...totals,
    estimatedVisitors:num(visitorRows[0]?.visitors),identifiedCustomers:num(customerRows[0]?.customers),
    interestWithoutPurchasePairs:noPurchaseRows.reduce((sum,x)=>sum+num(x.interestCount),0),
    orders:orderTotals._count._all,orderedValueCents:orderTotals._sum.totalCents||0,
    paidOrders:paidTotals._count._all,receivedCents:paidTotals._sum.totalCents||0},
    products:allProducts,daily:[...byDay.values()]};
}
export async function analyticsAudience(prisma,productId,days){
  const product=await prisma.product.findUnique({where:{id:productId},select:{id:true,title:true,slug:true}});
  if(!product)return null;
  const events=await prisma.productEvent.findMany({where:{productId,userId:{not:null},createdAt:{gte:daysSince(days)}},
    select:{userId:true,type:true,createdAt:true},orderBy:{createdAt:'desc'},take:5000});
  const activity=new Map();
  for(const e of events){
    if(!e.userId)continue;
    if(!activity.has(e.userId))activity.set(e.userId,{userId:e.userId,views:0,clicks:0,cartAdds:0,wishlistAdds:0,checkoutStarts:0,lastSeen:e.createdAt});
    const row=activity.get(e.userId),key={VIEW:'views',CLICK:'clicks',CART_ADD:'cartAdds',WISHLIST_ADD:'wishlistAdds',CHECKOUT_START:'checkoutStarts'}[e.type];
    if(key)row[key]++;
  }
  const ids=[...activity.keys()].slice(0,100);
  if(!ids.length)return {product,customers:[],limited:events.length===5000};
  const [users,carts,wishes,orders]=await Promise.all([
    prisma.user.findMany({where:{id:{in:ids},role:'CUSTOMER'},select:{id:true,name:true,email:true}}),
    prisma.cartItem.findMany({where:{productId,userId:{in:ids}},select:{userId:true,quantity:true}}),
    prisma.wishlistItem.findMany({where:{productId,userId:{in:ids}},select:{userId:true}}),
    prisma.orderItem.findMany({where:{productId,order:{userId:{in:ids},status:{not:'CANCELLED'}}},select:{quantity:true,order:{select:{userId:true,createdAt:true}}}})
  ]);
  const customers=users.map(user=>{
    const purchases=orders.filter(o=>o.order.userId===user.id);
    return {...user,...activity.get(user.id),cartQuantity:carts.find(c=>c.userId===user.id)?.quantity||0,
      wishlisted:wishes.some(w=>w.userId===user.id),purchasedUnits:purchases.reduce((sum,o)=>sum+o.quantity,0),
      lastPurchase:purchases.sort((a,b)=>b.order.createdAt-a.order.createdAt)[0]?.order.createdAt||null};
  }).sort((a,b)=>new Date(b.lastSeen)-new Date(a.lastSeen));
  return {product,customers,limited:events.length===5000||activity.size>100};
}
export function startAnalyticsCleanup(prisma){
  const prune=()=>prisma.productEvent.deleteMany({where:{createdAt:{lt:daysSince(ANALYTICS_RETENTION_DAYS)}}})
    .catch(err=>console.error('Analytics retention cleanup failed:',err.message));
  prune();const timer=setInterval(prune,DAY);timer.unref?.();return()=>clearInterval(timer);
}
