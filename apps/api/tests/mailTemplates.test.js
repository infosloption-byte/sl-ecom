import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  htmlEscape,storeLink,makeMessage,welcomeMessage,placedMessage,staffOrderMessage,
  orderChange,orderUpdateMessage,trackingChanged,trackingMessage,passwordResetMessage,
  securityMessage,smtpTestMessage
} from '../src/mailTemplates.js';

const user={id:'user-100',name:'Nimal Perera',email:'nimal@example.com'};
const order={
  id:'order-100',number:'SLM-20261105-ABCD1234',
  status:'PLACED',paymentStatus:'PENDING',subtotalCents:125000,shippingCents:45000,
  totalCents:170000,paymentMethod:'COD',
  address:{fullName:'Nimal Perera',line1:'Main Road',city:'Kandy',district:'Kandy',phone:'0771234567'},
  items:[{title:'Weekend Travel Pouch',quantity:1,lineTotalCents:125000}]
};

test('registration welcome contains no private passwords and uses configured store origin',()=>{
  const mail=welcomeMessage(user,{storeUrl:'http://localhost:5180',google:false});
  assert.equal(mail.to,user.email);
  assert.match(mail.subject,/Welcome/);
  assert.match(mail.text,/Explore the collection/);
  assert.match(mail.html,/SL OPTIONS/);
  assert.match(mail.html,/http:\/\/localhost:5180\/shop/);
  const google=welcomeMessage(user,{storeUrl:'https://shop.example.lk/',google:true});
  assert.match(google.text,/using Google/);
  assert.match(google.text,/https:\/\/shop.example.lk\/shop/);
});
test('customer-supplied data is HTML-escaped in all template fields',()=>{
  const unsafe={name:'A <script>alert(1)</script>',email:'test@example.com'};
  const mail=makeMessage({
    to:unsafe.email,subject:'Test',title:'Safe email',
    paragraphs:[unsafe.name],
    details:[['Note','<img src=x onerror=alert(1)>']],
    closing:'Use our <secure> checkout.'
  });
  assert.doesNotMatch(mail.html,/<script>/);
  assert.doesNotMatch(mail.html,/<img src=x/);
  assert.match(mail.html,/&lt;script&gt;/);
  assert.match(mail.html,/&lt;img/);
  assert.equal(htmlEscape('&"\'<>'),'&amp;&quot;&#39;&lt;&gt;');
});
test('COD order acknowledgement is NOT mislabeled as paid receipt',()=>{
  const mail=placedMessage(order,user,{storeUrl:'https://shop.example.lk'});
  assert.match(mail.text,/Cash on delivery · pending/);
  assert.match(mail.text,/not a receipt/);
  assert.match(mail.text,/1700|1,700/);
  assert.match(mail.html,/View order and tracking/);
  assert.doesNotMatch(mail.text,/payment has been received/i);
  const alert=staffOrderMessage(order,user);
  assert.match(alert.subject,/New store order/);
  assert.match(alert.text,/Kandy/);
  assert.equal(alert.to,undefined);
});
test('order updates produce mail only on actual status or payment changes',()=>{
  assert.deepEqual(orderChange(order,order),{statusChanged:false,paymentChanged:false});
  assert.equal(orderUpdateMessage(order,user,order),null);
  const shipped={...order,status:'SHIPPED',courierName:'Test Courier',trackingNumber:'TRACK123'};
  const shippedMail=orderUpdateMessage(shipped,user,order);
  assert.match(shippedMail.text,/handed over for delivery/);
  assert.match(shippedMail.text,/TRACK123/);
  assert.match(shippedMail.text,/Cash on delivery|pending/i);
  const paid={...shipped,paymentStatus:'PAID'};
  const paymentMail=orderUpdateMessage(paid,user,shipped);
  assert.match(paymentMail.text,/payment as received/i);
  assert.match(paymentMail.text,/printable payment receipt/);
  assert.doesNotMatch(shippedMail.text,/payment as received/i);
});
test('tracking changes notify only on meaningful information differences',()=>{
  assert.equal(trackingChanged(order,{...order}),false);
  const newInfo={...order,courierName:'Courier X',trackingNumber:'S123'};
  assert.equal(trackingChanged(order,newInfo),true);
  assert.match(trackingMessage(newInfo,user).text,/S123/);
  assert.equal(trackingMessage(order,user),null);
});
test('reset email link is single-purpose and escapes URL parameters in HTML',()=>{
  const token='a_safe_opaque_token_value';
  const reset=passwordResetMessage(user.email,token,{storeUrl:'https://shop.example.lk'});
  assert.match(reset.text,/30 minutes/);
  assert.match(reset.text,/token=a_safe_opaque_token_value/);
  assert.match(reset.html,/Set a new password/);
  assert.equal(storeLink('/account?tab=settings','https://shop.example.lk/'), 'https://shop.example.lk/account?tab=settings');
  assert.throws(()=>storeLink('/','javascript:alert(1)'),/HTTP/);
});
test('password and Google linking security notices have no credentials',()=>{
  const passwordMail=securityMessage(user,'PASSWORD_CHANGED');
  const linked=securityMessage(user,'GOOGLE_LINKED');
  assert.match(passwordMail.subject,/Account security/);
  assert.match(passwordMail.text,/did not make this change/);
  assert.match(linked.text,/Google account was linked/);
  assert.throws(()=>securityMessage(user,'UNKNOWN_EVENT'));
  const testMail=smtpTestMessage(user);
  assert.equal(testMail.to,user.email);
  assert.match(testMail.text,/SMTP provider accepted/i);
});
