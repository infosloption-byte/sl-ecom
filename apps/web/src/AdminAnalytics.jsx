import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Download, Eye, Heart, MousePointerClick, Package, ShoppingBag, Users, X } from 'lucide-react';
import { api, lkr } from './api';
import { Spinner } from './components';

const periods=[7,30,90];
const number=n=>Number(n||0).toLocaleString('en-LK');
function csvDownload(products,days){
  const fields=['Product','Views','Clicks','Wishlist adds','Cart adds','Checkout starts','Units ordered','In carts','Saved now','Ordered value (cents)'];
  const rows=products.map(p=>[p.title,p.views,p.clicks,p.wishlistAdds,p.cartAdds,p.checkoutStarts,p.unitsOrdered,p.inCarts,p.wishlistedNow,p.orderValueCents]);
  const csv=[fields,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='slmarket-product-analytics-'+days+'d.csv';a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const metricCards=m=>[
  ['Product views',m.VIEW,Eye],['Product clicks',m.CLICK,MousePointerClick],
  ['Wishlist adds',m.WISHLIST_ADD,Heart],['Cart adds',m.CART_ADD,ShoppingBag],
  ['Checkout starts',m.CHECKOUT_START,Activity],['Placed orders',m.orders,Package],
  ['Approx. visitors',m.estimatedVisitors,Users],['COD received',lkr(m.receivedCents),ShoppingBag]
];
function ActivityChart({daily}){
  const selected=daily.length>40?daily.filter((_,i)=>i%7===0):daily;
  const max=Math.max(1,...selected.map(x=>x.views),...selected.map(x=>x.orders));
  return <div>
    <div className="insight-legend"><span>● Product views</span><span>● Orders</span></div>
    <div className="insight-chart" role="img" aria-label="Comparison of product views and orders over time">
      {selected.map(row=><div className="insight-chart-day" key={row.day} title={row.day+': '+row.views+' views, '+row.orders+' orders'}>
        <div className="insight-chart-bars"><i className="insight-view-bar" style={{height:Math.max(2,row.views/max*100)+'%'}}/><i className="insight-order-bar" style={{height:Math.max(2,row.orders/max*100)+'%'}}/></div>
        <small>{row.day.slice(5)}</small>
      </div>)}
    </div>
    <p className="insight-note">{daily.length>40?'Weekly samples for readability.':'Daily activity.'} Engagement data starts when tracking is deployed.</p>
  </div>;
}
function AudienceReport({result,loading,close}){
  return <section className="insight-panel">
    <div className="insight-heading"><div><span className="eyebrow">CUSTOMER VS PRODUCT</span><h2>{result?.product?.title||'Customer interest'}</h2><p>Signed-in shoppers active in the chosen period. Purchases are checked against non-cancelled order history.</p></div><button className="insight-close" aria-label="Close" onClick={close}><X size={19}/></button></div>
    {loading?<Spinner/>:result?.customers?.length?<div className="admin-table-wrap"><table className="admin-table insight-table"><thead><tr><th>Customer</th><th>Views</th><th>Clicks</th><th>Wishlist</th><th>Cart</th><th>Purchased</th><th>Interest</th></tr></thead><tbody>
      {result.customers.map(row=><tr key={row.id}><td><strong>{row.name}</strong><small>{row.email}</small></td>
        <td>{row.views}</td><td>{row.clicks}</td><td>{row.wishlisted?'Saved':row.wishlistAdds?'Added earlier':'—'}</td>
        <td>{row.cartQuantity?row.cartQuantity+' in cart':row.cartAdds?'Added earlier':'—'}</td>
        <td>{row.purchasedUnits||'None'}</td><td><span className={'insight-status '+(row.purchasedUnits?'is-purchased':'is-interested')}>{row.purchasedUnits?'Purchased':'Interested · Not purchased'}</span></td>
      </tr>)}
    </tbody></table></div>:<div className="insight-empty">{result?.error||'No signed-in customers interacted with this item during this period. Guest events are anonymous.'}</div>}
    {result?.limited&&<p className="insight-note">This detail view is limited to 100 customers / 5,000 recent events.</p>}
  </section>;
}
export function AnalyticsOverviewShortcut(){
  const [stats,setStats]=useState(null);
  useEffect(()=>{let alive=true;api('/admin/analytics/summary?days=30').then(d=>{if(alive)setStats(d.metrics);}).catch(()=>{});return()=>{alive=false;};},[]);
  return <section className="insight-shortcut"><div><span className="eyebrow">CUSTOMER INTEREST</span><h2>See what shoppers explore.</h2><p>30-day product engagement, wishlists, carts and purchases.</p></div>
    <div className="insight-short-values"><span><b>{number(stats?.VIEW)}</b><small>Views</small></span><span><b>{number(stats?.CART_ADD)}</b><small>Cart adds</small></span><span><b>{number(stats?.WISHLIST_ADD)}</b><small>Saved</small></span></div>
    <Link className="button button-dark" to="/admin?tab=analytics">View analytics <ArrowRight size={17}/></Link>
  </section>;
}
export function AdminAnalytics(){
  const [days,setDays]=useState(30),[summary,setSummary]=useState(null),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[selected,setSelected]=useState(null),[audience,setAudience]=useState(null),[audienceLoading,setAudienceLoading]=useState(false);
  const [filter,setFilter]=useState('');
  useEffect(()=>{let alive=true;setLoading(true);setError('');setAudience(null);setSelected(null);
    api('/admin/analytics/summary?days='+days).then(v=>{if(alive)setSummary(v);}).catch(err=>{if(alive)setError(err.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[days]);
  useEffect(()=>{if(!selected)return;let alive=true;setAudience(null);setAudienceLoading(true);
    api('/admin/analytics/audience/'+encodeURIComponent(selected)+'?days='+days).then(v=>{if(alive)setAudience(v);}).catch(e=>{if(alive)setAudience({error:e.message,customers:[]});}).finally(()=>{if(alive)setAudienceLoading(false);});
    return()=>{alive=false;};
  },[selected,days]);
  const products=useMemo(()=>summary?.products?.filter(p=>p.title.toLowerCase().includes(filter.toLowerCase().trim()))||[],[summary,filter]);
  const m=summary?.metrics;
  return <div className="insight-page">
    <header className="insight-page-head"><div><span className="eyebrow">STORE ANALYTICS</span><h1>Customers & products.</h1><p>See what visitors viewed, clicked, saved and added to cart — and what actually sold.</p></div>
      <div className="insight-actions"><div className="insight-period">{periods.map(n=><button key={n} aria-pressed={days===n} className={days===n?'active':''} onClick={()=>setDays(n)}>{n} days</button>)}</div><button disabled={!summary} className="insight-export" onClick={()=>csvDownload(summary.products,days)}><Download size={17}/> Export CSV</button></div>
    </header>
    {error&&<div className="insight-error" role="alert">{error}</div>}
    {loading?<Spinner/>:summary&&<>
      <div className="insight-metrics">{metricCards(m).map(([title,value,Icon])=><div className="insight-metric" key={title}><div><small>{title}</small><Icon size={20}/></div><strong>{typeof value==='number'?number(value):value}</strong></div>)}</div>
      <div className="insight-row"><section className="insight-panel"><div className="insight-heading"><div><span className="eyebrow">ACTIVITY TREND</span><h2>Traffic vs orders</h2><p>Product views compared with placed, non-cancelled orders.</p></div></div><ActivityChart daily={summary.daily}/></section>
        <section className="insight-panel"><div className="insight-heading"><div><span className="eyebrow">ACTIVITY SIGNALS</span><h2>Shopping journey</h2><p>Event totals, not a strict unique-customer conversion funnel.</p></div></div>
          {[['Product views',m.VIEW],['Card clicks',m.CLICK],['Wishlist additions',m.WISHLIST_ADD],['Cart additions',m.CART_ADD],['Checkout openings',m.CHECKOUT_START],['Orders placed',m.orders]].map(([title,value])=><div className="insight-funnel" key={title}><div><span>{title}</span><b>{number(value)}</b></div><div className="insight-funnel-track"><span style={{width:Math.min(100,(value/Math.max(1,m.VIEW)*100))+'%'}}/></div></div>)}
          <p className="insight-note">{number(m.identifiedCustomers)} signed-in customers · {number(m.estimatedVisitors)} approximate visitors.</p>
        </section>
      </div>
      <section className="insight-panel"><div className="insight-heading"><div><span className="eyebrow">PRODUCT INTEREST</span><h2>What people consider.</h2><p>Products with high views and few purchases are worth reviewing. Choose an item for customer-level details.</p></div><input aria-label="Search analytics products" placeholder="Find product..." value={filter} onChange={e=>setFilter(e.target.value)}/></div>
        <div className="admin-table-wrap"><table className="admin-table insight-table"><thead><tr><th>Product</th><th>Views</th><th>Clicks</th><th>Saved now</th><th>In carts</th><th>Cart adds</th><th>Units ordered</th><th></th></tr></thead>
          <tbody>{products.map(p=><tr key={p.id}><td><div className="insight-product"><img src={p.imageUrl||'/demo/placeholder.svg'} alt=""/><span><b>{p.title}</b><small>{p.status}</small></span></div></td><td>{number(p.views)}</td><td>{number(p.clicks)}</td><td>{number(p.wishlistedNow)}</td><td>{number(p.inCarts)}</td><td>{number(p.cartAdds)}</td><td>{number(p.unitsOrdered)}</td><td><button className="insight-detail" onClick={()=>setSelected(p.id)}>Customers <ArrowRight size={16}/></button></td></tr>)}</tbody>
        </table></div>{!products.length&&<div className="insight-empty">No products found.</div>}
      </section>
      {selected&&<AudienceReport result={audience} loading={audienceLoading} close={()=>setSelected(null)}/>}
      <p className="insight-note insight-disclaimer">Tracking begins when this release is installed. Engagement events are retained for up to {summary.retentionDays} days; older orders remain in order history. Guest visitors are anonymous. Product clicks are not purchases; COD revenue is counted as received only when payment is marked PAID. Values shown are not tax reports.</p>
    </>}
  </div>;
}
