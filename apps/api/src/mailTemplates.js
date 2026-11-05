import { lkrEmail } from './mailPricing.js';

export const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);

export function storeLink(route, storeUrl=process.env.STORE_URL || 'http://localhost:5180') {
  if(process.env.NODE_ENV==='production'&&!process.env.STORE_URL && storeUrl==='http://localhost:5180')throw new Error('Set STORE_URL for customer email links in production.');
  const base=new URL(storeUrl);
  if(!['https:','http:'].includes(base.protocol)) throw new Error('STORE_URL must use HTTP(S).');
  return new URL(route,base.origin).toString();
}
const nameOf=user=>String(user?.name||'there').trim().split(/\s+/)[0];
const addressOf=address=>[address?.fullName,address?.line1,address?.line2,address?.city,address?.district].filter(Boolean).join(', ');

export function makeMessage({to,subject,title,eyebrow='SL OPTIONS MARKET',paragraphs=[],details=[],action=null,closing=''}) {
  const text=[title, ...paragraphs, ...details.map(([k,v])=>k+': '+v),action?action.label+': '+action.href:null,closing].filter(Boolean).join('\n\n');
  const rows=details.map(([k,v])=>'<tr><td style="padding:12px 6px;border-bottom:1px solid #eaf0e7;color:#70816f;font-size:13px">'+htmlEscape(k)+'</td>'+
    '<td style="padding:12px 6px;border-bottom:1px solid #eaf0e7;text-align:right;color:#223c2b;font-size:13px;font-weight:bold">'+htmlEscape(v)+'</td></tr>').join('');
  const html='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>'+
    '<body style="margin:0;padding:22px 12px;background:#f3f6f0;color:#263c2d;font-family:Arial,Helvetica,sans-serif">'+
    '<div style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #e4ece0;border-radius:14px;overflow:hidden">'+
    '<div style="background:#20372a;color:#eff7e6;padding:26px 30px"><strong style="letter-spacing:2px">SL OPTIONS ✳</strong>'+
    '<p style="font-size:11px;letter-spacing:3px;margin:5px 0 0">MARKET · SRI LANKA</p></div>'+
    '<div style="padding:32px 30px"><div style="font-size:11px;letter-spacing:1.5px;color:#698d64;font-weight:bold">'+htmlEscape(eyebrow)+'</div>'+
    '<h1 style="font-size:27px;line-height:1.35;margin:12px 0 20px">'+htmlEscape(title)+'</h1>'+
    paragraphs.map(p=>'<p style="font-size:15px;line-height:1.8;color:#526b59">'+htmlEscape(p)+'</p>').join('')+
    (rows?'<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin-top:20px">'+rows+'</table>':'')+
    (action?'<p style="margin:30px 0"><a href="'+htmlEscape(action.href)+'" style="background:#294732;color:white;padding:14px 22px;border-radius:9px;text-decoration:none;display:inline-block;font-weight:bold">'+htmlEscape(action.label)+'</a></p>':'')+
    (closing?'<p style="font-size:13px;color:#647b68;line-height:1.7">'+htmlEscape(closing)+'</p>':'')+
    '</div><div style="padding:20px 30px;background:#f7faf4;color:#849487;font-size:11px;line-height:1.6">A transactional email from SL Options Market. Never share your passwords or reset links.</div></div></body></html>';
  return {to,subject,text,html};
}

export function welcomeMessage(user,{google=false,storeUrl}={}){
  return makeMessage({to:user.email,subject:'Welcome to SL Options Market',title:'Your little corner is ready.',eyebrow:'WELCOME TO THE MARKET',
    paragraphs:['Hello '+nameOf(user)+', thanks for joining SL Options Market!',
      'Your account is ready. You can save favourites, manage delivery addresses and track every order.'],
    action:{label:'Explore the collection',href:storeLink('/shop',storeUrl)},
    closing:google?'You signed up using Google. You can create a password in Account settings.':'Keep your password private. Our team will never ask for it.'});
}
const orderUrl=(order,base)=>storeLink('/orders/'+encodeURIComponent(order.id),base);
export function placedMessage(order,user,{storeUrl}={}){
  return makeMessage({to:user.email,subject:'Order received · '+order.number,title:'Your order is placed.',eyebrow:'ORDER CONFIRMATION',
    paragraphs:['Hello '+nameOf(user)+', thank you for shopping with SL Options Market.',
      'We have received your order and will prepare it for delivery.'],
    details:[['Order',order.number],['Items',order.items.map(i=>i.quantity+' × '+i.title).join(' · ')],
      ['Subtotal',lkrEmail(order.subtotalCents)],['Delivery',lkrEmail(order.shippingCents)],
      ['Total payable',lkrEmail(order.totalCents)],['Payment','Cash on delivery · pending'],
      ['Delivery address',addressOf(order.address)]],
    action:{label:'View order and tracking',href:orderUrl(order,storeUrl)},
    closing:'This order confirmation is not a receipt. Payment is due when the order is delivered.'});
}
export function staffOrderMessage(order,user){
  return makeMessage({subject:'New store order · '+order.number,title:'A new order has arrived.',eyebrow:'STAFF NOTIFICATION',
    paragraphs:['Customer: '+user.name+' ('+user.email+')','Review this new cash-on-delivery order in the administration workspace.'],
    details:[['Order',order.number],['Total',lkrEmail(order.totalCents)],
      ['Delivery address',addressOf(order.address)],['Phone',order.address?.phone||'Not provided']]});
}
const statusMessages={
  PLACED:'We have received your order.',
  CONFIRMED:'Your order has been confirmed and is being prepared.',
  PACKED:'Your items are packed and ready for dispatch.',
  SHIPPED:'Your order has been handed over for delivery.',
  DELIVERED:'Your order has been marked delivered. Thank you for shopping with us!',
  CANCELLED:'Your order was cancelled. Contact store support if you have any questions.'
};
const paymentMessages={
  PENDING:'Payment is still pending.',
  PAID:'The store has recorded payment as received.',
  FAILED:'The store has marked this payment as failed. Please contact support.',
  REFUNDED:'The store has marked the payment as refunded. Contact support if you need help.'
};
export function orderChange(before,after){
  return {statusChanged:before.status!==after.status,paymentChanged:before.paymentStatus!==after.paymentStatus};
}
export function orderUpdateMessage(order,user,before,{storeUrl}={}){
  const {statusChanged,paymentChanged}=orderChange(before,order);
  if(!statusChanged&&!paymentChanged)return null;
  return makeMessage({to:user.email,subject:'Order update · '+order.number,title:'An update on your order.',eyebrow:'ORDER STATUS',
    paragraphs:['Hello '+nameOf(user)+', there is an update to order '+order.number+'.',
      statusChanged?statusMessages[order.status]:null,paymentChanged?paymentMessages[order.paymentStatus]:null].filter(Boolean),
    details:[['Order',order.number],['Order status',order.status],['Payment status',order.paymentStatus],
      ['Order total',lkrEmail(order.totalCents)],
      ...(order.courierName?[['Courier',order.courierName]]:[]),
      ...(order.trackingNumber?[['Tracking number',order.trackingNumber]]:[])],
    action:{label:'Open order details',href:orderUrl(order,storeUrl)},
    closing:order.paymentStatus==='PAID'?'You can view the printable payment receipt from your order page.':'For cash on delivery, an invoice is not proof of payment.'});
}
export function trackingChanged(before,after){
  return ['courierName','trackingNumber','trackingUrl','estimatedDeliveryAt'].some(key=>
    String(before[key]??'')!==String(after[key]??''));
}
export function trackingMessage(order,user,{storeUrl}={}){
  if(!order.courierName&&!order.trackingNumber&&!order.estimatedDeliveryAt&&!order.trackingUrl)return null;
  const eta=order.estimatedDeliveryAt?new Date(order.estimatedDeliveryAt).toLocaleDateString('en-LK',{timeZone:'Asia/Colombo',year:'numeric',month:'short',day:'numeric'}):null;
  return makeMessage({to:user.email,subject:'Delivery details · '+order.number,title:'Delivery details updated.',eyebrow:'DELIVERY TRACKING',
    paragraphs:['Hello '+nameOf(user)+', new delivery details have been added to your order.',
      'Open your order page for the latest delivery status and courier link.'],
    details:[['Order',order.number],...(order.courierName?[['Courier',order.courierName]]:[]),
      ...(order.trackingNumber?[['Tracking number',order.trackingNumber]]:[]),...(eta?[['Estimated delivery',eta]]:[])],
    action:{label:'Track your order',href:orderUrl(order,storeUrl)},
    closing:'Delivery times are estimates and may change depending on the courier.'});
}
export function passwordResetMessage(email,token,{storeUrl}={}){
  const url=new URL(storeLink('/reset-password',storeUrl));
  url.searchParams.set('token',token);
  return makeMessage({to:email,subject:'Reset your SL Options Market password',title:'Reset your password.',eyebrow:'ACCOUNT SECURITY',
    paragraphs:['We received a request to reset your password. The link below expires in 30 minutes and works only once.',
      'If you did not request this change, ignore the email.'],
    action:{label:'Set a new password',href:url.toString()},
    closing:'Never share your password reset link with anyone.'});
}
export function securityMessage(user,event,{storeUrl}={}){
  const messages={
    PASSWORD_CHANGED:['Your password was changed.','The password on your SL Options Market account was updated. If you did not make this change, contact support immediately.'],
    GOOGLE_LINKED:['Google sign-in connected.','A Google account was linked to your SL Options Market account. If this was not you, contact support immediately.']
  };
  if(!messages[event])throw new Error('Unsupported account security message.');
  return makeMessage({to:user.email,subject:'Account security · '+messages[event][0],title:messages[event][0],eyebrow:'ACCOUNT SECURITY',
    paragraphs:['Hello '+nameOf(user)+', '+messages[event][1]],
    action:{label:'Account settings',href:storeLink('/account?tab=settings',storeUrl)},
    closing:'Our team will never ask you for passwords, reset links or verification codes.'});
}
export function smtpTestMessage(user){
  return makeMessage({to:user.email,subject:'SL Options Market · SMTP test',title:'Your store email is connected.',eyebrow:'ADMIN TEST EMAIL',
    paragraphs:['This message was requested from your signed-in administrator account.',
      'The SMTP provider accepted this test. Inbox placement depends on the receiving provider.'],
    closing:'No action is required. If this was not you, review administrator access.'});
}
