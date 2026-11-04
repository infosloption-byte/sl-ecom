// First-party, per-tab anonymous visitor token. Never includes IP, email or device fingerprints.
const key='slm_shop_activity_session';
let fallback=null;
export function visitorId(){
  try{
    const existing=sessionStorage.getItem(key);
    if(existing && /^[0-9a-f-]{36}$/i.test(existing))return existing;
    const value=crypto.randomUUID();
    sessionStorage.setItem(key,value);
    return value;
  }catch{
    if(!fallback)fallback=crypto.randomUUID();
    return fallback;
  }
}
export function trackProduct(productId,type){
  if(!productId||!['CLICK','VIEW','CART_ADD','CHECKOUT_START'].includes(type))return;
  try{
    const payload=JSON.stringify({productId,type,visitorId:visitorId()});
    // Analytics is always best effort and never blocks cart, checkout or navigation.
    void fetch('/api/analytics/event',{method:'POST',credentials:'include',
      headers:{'Content-Type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
  }catch{/* Browser privacy settings may block activity tracking. */}
}
