import nodemailer from 'nodemailer';
import {
  welcomeMessage, placedMessage, staffOrderMessage, orderUpdateMessage, trackingMessage,
  passwordResetMessage, securityMessage, smtpTestMessage
} from './mailTemplates.js';

const configuredKeys=['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','SMTP_FROM'];
export const smtpMissingSettings=()=>configuredKeys.filter(key=>!process.env[key]?.trim());
export const mailEnabled=()=>smtpMissingSettings().length===0;

function transport(){
  if(!mailEnabled())throw new Error('Transactional SMTP is not configured.');
  const port=Number(process.env.SMTP_PORT||587);
  return nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port,secure:port===465,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000
  });
}

async function deliver(message){
  if(!mailEnabled())return {skipped:true};
  const client=transport();
  try{
    const info=await client.sendMail({
      from:process.env.SMTP_FROM,
      to:message.to,subject:message.subject,text:message.text,html:message.html,
      disableFileAccess:true,disableUrlAccess:true
    });
    if(!info.accepted?.length)throw new Error('SMTP did not accept a recipient.');
    return {sent:true};
  }finally{client.close();}
}
function logFailure(label,error){
  // SMTP replies can contain customer addresses and server details: never log message body or reset links.
  console.error('Transactional email failed ('+label+'): '+String(error.code||error.name||'delivery_error'));
}
export async function deliverBestEffort(label,message){
  if(!mailEnabled()||!message)return {skipped:true};
  try{return await deliver(message);}
  catch(error){logFailure(label,error);return {failed:true};}
}
export async function sendWelcomeEmail(user,{google=false}={}){
  return deliverBestEffort('welcome',welcomeMessage(user,{google}));
}
export async function sendOrderEmails(order,user){
  if(!mailEnabled())return {skipped:true};
  const outgoing=[['customer-order',placedMessage(order,user)]];
  if(process.env.ORDER_ALERT_EMAIL) outgoing.push(['staff-order',{
    ...staffOrderMessage(order,user),to:process.env.ORDER_ALERT_EMAIL
  }]);
  return Promise.all(outgoing.map(([label,message])=>deliverBestEffort(label,message)));
}
export async function sendOrderUpdateEmail(order,user,before){
  return deliverBestEffort('order-update',orderUpdateMessage(order,user,before));
}
export async function sendTrackingUpdateEmail(order,user){
  return deliverBestEffort('delivery-tracking',trackingMessage(order,user));
}
export async function sendSecurityEmail(user,event){
  return deliverBestEffort('account-security',securityMessage(user,event));
}
export async function sendResetEmail(email,token){
  if(!mailEnabled())throw new Error('Password recovery SMTP is not configured.');
  // Password reset links are delivered immediately and never added to a persistent queue.
  return deliver(passwordResetMessage(email,token));
}
export async function sendSmtpTest(user){
  if(!mailEnabled())throw new Error('Transactional SMTP is not configured.');
  return deliver(smtpTestMessage(user));
}
export async function verifySmtpConnection(){
  if(!mailEnabled())return {configured:false,missing:smtpMissingSettings()};
  const client=transport();
  try{await client.verify();return {configured:true,connected:true};}
  catch(error){logFailure('SMTP connection test',error);return {configured:true,connected:false};}
  finally{client.close();}
}

/** Forward a customer enquiry only to the configured store inbox. */
export async function sendContactMail({name,email,topic,orderNumber,message},destination){
  if(!mailEnabled())throw new Error('Store email is not configured.');
  if(!destination)throw new Error('Store destination email is missing.');
  const client=transport();
  const text=[
    'New SL Options Market contact request',
    'From: '+name+' ('+email+')',
    'Topic: '+topic,
    'Order number: '+(orderNumber||'Not supplied'),
    '',message
  ].join('\n');
  try{
    const result=await client.sendMail({
      from:process.env.SMTP_FROM,to:destination,
      replyTo:{name,address:email},
      subject:'Store enquiry · '+topic,
      text,disableFileAccess:true,disableUrlAccess:true
    });
    if(!result.accepted?.length)throw new Error('SMTP did not accept a recipient.');
  }finally{client.close();}
}
