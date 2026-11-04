import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Mail, MapPin, PackageCheck, RotateCcw, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { api, lkr } from './api';
import { useStore } from './context';
import { Dropdown, Field, PageHeading, TextAreaField } from './components';

const contactTopics = ['Order question','Product enquiry','Delivery or tracking','Return or refund','Other'].map(topic=>({value:topic,label:topic}));

const legalLinks = [
  { to:'/shipping-returns', label:'Shipping & returns', detail:'Delivery, COD, returns and refunds' },
  { to:'/privacy', label:'Privacy policy', detail:'How your information is handled' },
  { to:'/terms', label:'Terms & conditions', detail:'Shopping and account conditions' },
  { to:'/contact', label:'Contact us', detail:'Questions about an order or a product' }
];

function PolicyPage({ eyebrow, title, subtitle, children }) {
  return <div className="container inner-page policy-page">
    <PageHeading eyebrow={eyebrow} title={title} description={subtitle}/>
    <div className="policy-layout">
      <div className="policy-body">{children}</div>
      <aside className="policy-sidebar">
        <h3>Helpful links</h3>
        {legalLinks.map(item=><Link key={item.to} to={item.to} className="policy-side-link"><b>{item.label}</b><small>{item.detail}</small></Link>)}
        <p>These pages describe the store's current processes. Product-specific details and your statutory consumer rights still apply.</p>
      </aside>
    </div>
  </div>;
}

export function PoliciesPage() {
  return <div className="container inner-page">
    <PageHeading eyebrow="HERE TO HELP" title="Store information." description="Shopping with confidence starts with clear answers. Explore our store policies or get in touch."/>
    <div className="store-info-grid">
      {legalLinks.map(item=><Link className="store-info-card" to={item.to} key={item.to}><span className="eyebrow">SL OPTIONS MARKET</span><h2>{item.label}</h2><p>{item.detail}</p><span className="policy-card-cta">Read more <ArrowRight size={17}/></span></Link>)}
    </div>
  </div>;
}

export function ShippingReturnsPage() {
  const {settings}=useStore();
  const email=settings?.contactEmail || 'hello@sloptions.xyz';
  return <PolicyPage eyebrow="DELIVERY & AFTERCARE" title="Shipping & returns." subtitle="What to expect after ordering from SL Options Market in Sri Lanka.">
    <section><h2><Truck size={22}/> Where we deliver</h2><p>We accept orders for delivery to all 25 districts of Sri Lanka, subject to courier coverage and address verification. Please provide a reachable Sri Lankan phone number and complete delivery address at checkout.</p></section>
    <section><h2><PackageCheck size={22}/> Shipping charges</h2><p>The final delivery charge is calculated before you confirm your order. Current store settings show a standard delivery charge of <strong>{lkr(settings?.shippingFlatCents ?? 45000)}</strong> and free delivery when the qualifying cart value reaches <strong>{lkr(settings?.freeShippingFromCents ?? 1500000)}</strong>. The amount confirmed at checkout controls your order.</p></section>
    <section><h2><Clock3 size={22}/> Dispatch and order tracking</h2><p>Preparation and delivery times vary with stock, destination, public holidays and courier service. We do not promise a fixed delivery window until one is explicitly confirmed. Track your progress in <Link to="/account?tab=orders">My purchases</Link>. Courier details and an estimated delivery date appear when provided by our team.</p></section>
    <section><h2><ShoppingBag size={22}/> Cash on delivery</h2><p>Cash on delivery (COD) is currently supported. Your order confirmation shows the payable total, including delivery. Please arrange payment when your order is delivered. An unpaid COD invoice is not proof that payment has been collected.</p></section>
    <section><h2><RotateCcw size={22}/> Returns, damaged or incorrect items</h2><p>If an item arrives damaged, faulty, incomplete or different from your order, contact us promptly at <a href={'mailto:'+email}>{email}</a>. Include your order number, a description and, where possible, clear photographs. Do not return an item without contacting the store so we can provide an appropriate return method.</p><p>Return eligibility, inspection, shipping costs and the form of any refund depend on the item, its condition, the reason for return and applicable consumer law. Any published product-specific conditions must be consistent with your statutory rights. The merchant must confirm its final return window and fulfilment procedure before public launch.</p></section>
    <section><h2>Need help with a delivery?</h2><p>Use the <Link to="/contact">contact form</Link>, or email <a href={'mailto:'+email}>{email}</a> with your order number and preferred contact details.</p></section>
  </PolicyPage>;
}

export function PrivacyPage() {
  const {settings}=useStore();
  const email=settings?.contactEmail || 'hello@sloptions.xyz';
  return <PolicyPage eyebrow="YOUR INFORMATION" title="Privacy policy." subtitle="How SL Options Market handles information needed to run your shopping account and orders.">
    <section><h2><ShieldCheck size={22}/> Information we collect</h2><p>When you register, place an order or contact us, we may process your name, email address, mobile number, delivery address, order items, order status, messages and account preferences. Google sign-in provides verified identity details needed to connect your account; we do not need your Google password.</p></section>
    <section><h2>Why we use information</h2><p>We use this information to provide shopping accounts, manage carts and wishlists, process orders, arrange delivery, communicate about purchases, answer requests, prevent abuse and maintain operational records. Optional communications should be sent only in line with your choices and applicable requirements.</p></section>
    <section><h2>Who receives information</h2><p>Delivery partners may need the recipient's name, phone number and address to fulfil an order. Hosting, email delivery and sign-in services may process limited information needed to operate the platform. Access to order and customer data is restricted to authorized store personnel and service providers for legitimate purposes.</p></section>
    <section><h2>Cookies and account protection</h2><p>We use an essential session cookie to keep you signed in and protect your account. Session tokens are stored in secure, HttpOnly browser cookies and represented by hashes in the database. Optional analytics or advertising tools, if introduced, require a separate disclosure and any applicable choice mechanisms.</p></section>
    <section><h2>Retention and your requests</h2><p>We keep information for as long as reasonably necessary for account operation, order fulfilment, accounting, security and applicable legal obligations. You can request access to, correction of, or deletion of information where applicable by contacting <a href={'mailto:'+email}>{email}</a>. Some order records may need to be retained for lawful business or recordkeeping purposes.</p></section>
    <section><h2>Security, policy updates and questions</h2><p>We use account authorization, access controls and technical safeguards to reduce unauthorized access. No internet service can guarantee absolute security. We may update this policy when our practices or legal obligations change. Contact us for the current version or any privacy concern.</p></section>
  </PolicyPage>;
}

export function TermsPage() {
  const {settings}=useStore();
  const email=settings?.contactEmail || 'hello@sloptions.xyz';
  return <PolicyPage eyebrow="SHOP WITH CONFIDENCE" title="Terms & conditions." subtitle="The practical conditions that apply when you browse, register or order from SL Options Market.">
    <section><h2>About the store</h2><p>SL Options Market is an online shopping experience presented under the SL Options brand for customers in Sri Lanka. Before taking public orders, the merchant must publish its final registered business name, business address and legally required contact information.</p></section>
    <section><h2>Account responsibilities</h2><p>Please provide accurate registration and delivery information, keep your credentials secure, and promptly inform us if you suspect unauthorized account activity. You must not misuse the site, interfere with its security or attempt to access another customer's orders.</p></section>
    <section><h2>Products, pricing and availability</h2><p>Product descriptions, images, prices and stock information are provided to help you choose products. Confirm key specifications before purchasing. Prices are displayed in Sri Lankan rupees (LKR). We may correct errors or withdraw unavailable products; if an order is affected, we will contact you about the available options.</p></section>
    <section><h2>Orders and payment</h2><p>Submitting checkout places an order request and reserves available stock through the store system. Cash on delivery is the currently supported payment method. Payment is due upon delivery unless a different method is explicitly offered and confirmed. Your order history records its status and payment state.</p></section>
    <section><h2>Shipping, returns and refunds</h2><p>Delivery charges are shown during checkout. Courier timing can vary by destination and other factors. See our <Link to="/shipping-returns">Shipping & Returns</Link> page for the process when an item is damaged, incorrect or needs to be returned. Nothing in these terms excludes rights or remedies that cannot lawfully be excluded under Sri Lankan law.</p></section>
    <section><h2>Store content and changes</h2><p>Store design, brand materials and original content are intended for use with SL Options Market. Please do not copy or misuse them without permission. We may revise site features and these terms as the service evolves; material changes should be communicated appropriately.</p></section>
    <section><h2>Contact</h2><p>Questions about an order or these terms can be sent through <Link to="/contact">Contact us</Link> or to <a href={'mailto:'+email}>{email}</a>.</p></section>
  </PolicyPage>;
}

export function ContactPage() {
  const {settings}=useStore();
  const email=settings?.contactEmail || 'hello@sloptions.xyz';
  const [form,setForm]=useState({name:'',email:'',topic:'Order question',orderNumber:'',message:'',website:''});
  const [busy,setBusy]=useState(false),[success,setSuccess]=useState(false),[error,setError]=useState('');
  const change=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  async function submit(event) {
    event.preventDefault();setBusy(true);setError('');
    try {
      await api('/contact',{method:'POST',body:form});
      setSuccess(true);
      setForm({name:'',email:'',topic:'Order question',orderNumber:'',message:'',website:''});
    } catch (err) {
      setError(err.message || 'We could not send your message. Please email us directly.');
    } finally {setBusy(false);}
  }
  return <div className="container inner-page contact-page">
    <PageHeading eyebrow="WE'RE HERE TO HELP" title="Contact us." description="A question about a product or delivery? Send us a note and our store team can follow up."/>
    <div className="contact-layout">
      <section className="contact-card">
        {success ? <div className="contact-success" role="status"><CheckCircle2 size={36}/><h2>Message received.</h2><p>Thank you for reaching out. Your message has been sent to the store team.</p><button className="button button-outline" onClick={()=>setSuccess(false)}>Send another message <ArrowRight size={16}/></button></div>
        : <form onSubmit={submit} className="contact-form">
          <h2>Send a message</h2><p>We recommend including your order number for delivery or return enquiries.</p>
          <div className="contact-fields"><Field label="Your name" required maxLength={120} autoComplete="name" value={form.name} onChange={e=>change('name',e.target.value)}/><Field label="Email address" type="email" required maxLength={191} autoComplete="email" value={form.email} onChange={e=>change('email',e.target.value)}/></div>
          <Dropdown label="What is this about?" value={form.topic} options={contactTopics} onChange={topic=>change('topic',topic)}/>
          <Field label="Order number (optional)" maxLength={40} value={form.orderNumber} onChange={e=>change('orderNumber',e.target.value)} placeholder="e.g. SLM-..."/>
          <TextAreaField label="How can we help?" required minLength={10} maxLength={3000} rows={6} value={form.message} onChange={e=>change('message',e.target.value)} placeholder="Tell us a little about your enquiry..."/>
          <div className="contact-honeypot" aria-hidden="true"><label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>change('website',e.target.value)}/></label></div>
          {error&&<p className="contact-error" role="alert">{error} You can also email <a href={'mailto:'+email}>{email}</a>.</p>}
          <button className="button button-dark" type="submit" disabled={busy}>{busy?'Sending...':'Send message'} <ArrowRight size={17}/></button>
        </form>}
      </section>
      <aside className="contact-aside">
        <div className="contact-info-card"><Mail size={23}/><h3>Email the store</h3><a href={'mailto:'+email}>{email}</a><p>Please include your order number when contacting us about a purchase.</p></div>
        <div className="contact-info-card"><PackageCheck size={23}/><h3>Track an order</h3><p>See order status, items and courier details in your account.</p><Link to="/account?tab=orders">My purchases <ArrowRight size={16}/></Link></div>
        <div className="contact-info-card"><MapPin size={23}/><h3>Shopping in Sri Lanka</h3><p>Delivery information and charges are available before checkout. Read our shipping and return guidance.</p><Link to="/shipping-returns">Shipping & returns <ArrowRight size={16}/></Link></div>
        <p className="contact-setting-note">The contact form uses the store's configured SMTP provider. If email delivery is not configured, please use the email link above.</p>
      </aside>
    </div>
  </div>;
}
