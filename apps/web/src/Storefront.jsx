import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Heart, MapPin, Package, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, Trash2, Truck, UserRound, Headphones, Minus, Plus } from 'lucide-react';
import { api, dateText, districts, emptyAddress, lkr } from './api';
import { useStore } from './context';
import { Dropdown, EmptyState, Field, PageHeading, Price, ProductCard, Quantity, Spinner, TextAreaField } from './components';
import { ProductGallery } from './ProductGallery';

const shippingEstimate = (subtotal, settings) => settings ? (subtotal >= settings.freeShippingFromCents ? 0 : settings.shippingFlatCents) : 0;

export function Home() {
  const [products, setProducts] = useState([]);
  const { categories, settings } = useStore();
  useEffect(() => { api('/products?limit=8').then(({items}) => setProducts(items)).catch(() => {}); }, []);
  const curated = products.filter(item => item.featured).slice(0, 4);
  return <>
    <section className="hero-section container">
      <div className="hero-text"><span className="eyebrow eyebrow-line">THE EVERYDAY EDIT · SRI LANKA</span><h1>Better days<br/>begin with <em>little things.</em></h1><p>Thoughtfully picked essentials, delightful finds and everyday favourites. One little corner of the internet, made for Sri Lanka.</p>
        <div className="hero-actions"><Link className="button button-dark" to="/shop">Explore the collection <ArrowUpRight size={18}/></Link><a className="text-link" href="#featured">Discover our picks <ArrowDown size={16}/></a></div>
        <div className="hero-proof"><div className="proof-stars">✳ ✳ ✳</div><span>Thoughtful finds</span><span className="dot"/> <span>Islandwide delivery</span></div>
      </div>
      <div className="hero-art"><div className="hero-art-heading"><span>01 / 04</span><span>EVERYDAY OBJECTS</span></div><div className="hero-main-object"><img src="/demo/tote.svg" alt="Illustrated everyday tote bag"/></div><div className="hero-float hero-float-a"><img src="/demo/lamp.svg" alt="Illustrated desk lamp"/></div><div className="hero-float hero-float-b"><span className="hero-asterisk">✳</span><span>good<br/>things<br/>live here.</span></div><div className="hero-art-footer"><span>COLLECTION NO. 001</span><span>MADE FOR YOUR EVERYDAY <ArrowUpRight size={16}/></span></div></div>
    </section>
    <section className="feature-strip"><div className="container feature-grid"><div><Truck size={22}/><span><b>Delivered islandwide</b><small>Across all 25 districts</small></span></div><div><ShieldCheck size={22}/><span><b>Shop with confidence</b><small>Secure account & orders</small></span></div><div><PackageCheck size={22}/><span><b>Simple checkout</b><small>Cash on delivery</small></span></div><div><Headphones size={22}/><span><b>Here to help</b><small>{settings?.contactEmail || 'Customer support'}</small></span></div></div></section>
    <section className="section container" id="featured"><div className="section-top"><div><span className="eyebrow">OUR HANDPICKED EDIT</span><h2>Good things, <em>right here.</em></h2><p>Everyday favourites with a little extra character.</p></div><Link to="/shop" className="section-link">Shop everything <ArrowUpRight size={18}/></Link></div>
      {curated.length ? <div className="product-grid">{curated.map(item => <ProductCard key={item.id} product={item}/>)}</div> : <div className="skeleton-products">Getting the collection ready...</div>}
    </section>
    <section className="category-section"><div className="container"><div className="section-top"><div><span className="eyebrow">EXPLORE YOUR WAY</span><h2>A little something <em>for everyone.</em></h2></div></div><div className="category-grid">{categories.slice(0, 4).map((cat, i) => <Link className={`category-tile tile-${i}`} to={`/shop?category=${cat.slug}`} key={cat.id}><div><span className="category-index">0{i+1} / COLLECTION</span><h3>{cat.name}</h3><span className="category-view">Explore collection <ArrowUpRight size={17}/></span></div><img src={['/demo/bag.svg','/demo/lamp.svg','/demo/headphones.svg','/demo/bottle.svg'][i]} alt=""/></Link>)}</div></div></section>
    <section className="section container"><div className="section-top"><div><span className="eyebrow">FRESH FROM THE SHELF</span><h2>Just added <em>to the mix.</em></h2></div><Link to="/shop" className="section-link">View all products <ArrowRight size={18}/></Link></div><div className="product-grid">{products.slice(4, 8).map(p => <ProductCard product={p} key={p.id}/>)}</div></section>
    <section className="closing-banner container"><div><span className="eyebrow">THE SL OPTIONS MARKET</span><h2>A happier everyday<br/>is only a click away.</h2><Link to="/shop" className="button button-light">Find your next favourite <ArrowUpRight size={18}/></Link></div><div className="closing-mark">so<span>✳</span></div></section>
  </>;
}

export function Shop() {
  const { categories } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '', category = params.get('category') || '', sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);
  const [query, setQuery] = useState(q);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  useEffect(() => setQuery(q), [q]);
  useEffect(() => {
    let active = true; setLoading(true);
    api(`/products?${new URLSearchParams({ q, category, sort, page: String(page), limit: '12' })}`).then(data => { if (active) setResult(data); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [q, category, sort, page]);
  function change(key, value) { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); if (key !== 'page') next.delete('page'); setParams(next); }
  return <div className="container inner-page"><PageHeading eyebrow="FIND YOUR NEXT FAVOURITE" title="The collection." description="Useful, lovely and a little unexpected. Discover something good."/>
    <div className="shop-toolbar"><form className="shop-search" onSubmit={e => { e.preventDefault(); change('q', query); }}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search good things..." aria-label="Search products"/><button aria-label="Submit search" type="submit"><ArrowRight size={19}/></button></form>
      <div className="shop-filters"><Dropdown label="Category" value={category} options={[{ value: '', label: 'All categories' }, ...categories.map(cat => ({ value: cat.slug, label: cat.name }))]} onChange={value => change('category', value)}/><Dropdown label="Sort by" value={sort} onChange={value => change('sort', value)} options={[{value:'newest',label:'Newest first'},{value:'price-low',label:'Price: low to high'},{value:'price-high',label:'Price: high to low'},{value:'name',label:'Product name'}]}/></div>
    </div><div className="results-row"><span>{result.total} {result.total === 1 ? 'product' : 'products'} found</span>{(q || category) && <button className="link-button" onClick={() => { setParams({}); setQuery(''); }}>Clear filters</button>}</div>
    {loading ? <Spinner/> : result.items.length ? <><div className="product-grid">{result.items.map(p => <ProductCard product={p} key={p.id}/>)}</div><div className="pagination"><button className="button button-outline" disabled={page <= 1} onClick={() => change('page', String(page-1))}>Previous</button><span>Page {page} of {result.pages}</span><button className="button button-outline" disabled={page >= result.pages} onClick={() => change('page', String(page+1))}>Next</button></div></> : <EmptyState icon={Sparkles} title="Nothing on this shelf yet" description="Try a different search or explore the full collection."/>}
  </div>;
}

export function ProductDetail() {
  const {slug}=useParams();
  const [product,setProduct]=useState(null),[related,setRelated]=useState([]),[loading,setLoading]=useState(true);
  const [quantity,setQuantity]=useState(1),[busy,setBusy]=useState(false);
  const {addToCart,toggleWishlist,wishlist,user,notify}=useStore();
  const navigate=useNavigate();
  useEffect(()=>{
    let alive=true;setLoading(true);setRelated([]);
    api('/products/'+slug).then(p=>{if(!alive)return;setProduct(p);return api('/products?'+new URLSearchParams({category:p.category.slug,limit:'5'})).then(data=>{if(alive)setRelated(data.items.filter(item=>item.id!==p.id).slice(0,4));}).catch(()=>{});})
      .catch(()=>{if(alive)setProduct(null);}).finally(()=>{if(alive)setLoading(false);});
    setQuantity(1);return()=>{alive=false;};
  },[slug]);
  if(loading)return <Spinner/>;
  if(!product)return <EmptyState title="We couldn't find that item" description="It may have been moved or taken off the shelf."/>;
  const wished=wishlist.some(item=>item.productId===product.id);
  const specs=Array.isArray(product.specifications)?product.specifications.filter(row=>row?.label&&row?.value):[];
  const fullDescription = product.description?.trim() || 'More product information will be added soon.';
  return <div className="container inner-page"><div className="crumb"><Link to="/shop">Shop</Link><ChevronRight size={15}/><Link to={'/shop?category='+product.category.slug}>{product.category.name}</Link><ChevronRight size={15}/><span>{product.title}</span></div>
    <div className="product-detail"><ProductGallery product={product}/><div className="detail-info"><span className="eyebrow">{product.category.name.toUpperCase()}</span><h1>{product.title}</h1><Price product={product}/>{product.shortDescription&&<p className="detail-summary">{product.shortDescription}</p>}<div className="stock-line"><span className={'stock-dot '+(product.stock?'':'out')}/>{product.stock?product.stock<=5?'Only '+product.stock+' left in stock':'In stock and ready to order':'Currently out of stock'}</div>
      <div className="detail-purchase"><Quantity value={quantity} max={Math.max(1,Math.min(10,product.stock))} onChange={setQuantity}/><button disabled={busy||product.stock===0} className="button button-dark flex-grow" onClick={async()=>{setBusy(true);try{await addToCart(product,quantity);}catch(e){notify(e.message);}finally{setBusy(false);}}}><ShoppingBag size={19}/>{busy?'Adding...':'Add to bag'} <ArrowRight size={18}/></button><button className={'wishlist-square '+(wished?'active':'')} aria-label={wished?'Remove from wishlist':'Add to wishlist'} onClick={async()=>{if(!user)return navigate('/login?next='+encodeURIComponent('/products/'+slug));try{await toggleWishlist(product);}catch(e){notify(e.message);}}}><Heart size={21} fill={wished?'currentColor':'none'}/></button></div>
      <div className="detail-benefits"><div><Truck size={20}/><span>Delivery to all 25 districts</span></div><div><PackageCheck size={20}/><span>Pay with cash on delivery</span></div><div><ShieldCheck size={20}/><span>Secure account checkout</span></div></div></div></div>
    <section className="product-full-description" aria-labelledby="product-full-description-heading">
      <div className="product-full-description-heading"><span className="eyebrow">PRODUCT INFORMATION</span><h2 id="product-full-description-heading">Full product description.</h2></div>
      <div className="product-full-description-body">{fullDescription.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
    </section>
    {(specs.length>0||product.sku)&&<section className="product-specifications"><div><span className="eyebrow">KNOW YOUR ITEM</span><h2>Product specifications.</h2><p>Helpful details about your new favourite.</p></div><dl>{product.sku&&<div><dt>Product code</dt><dd>{product.sku}</dd></div>}{specs.map((row,i)=><div key={row.label+'-'+i}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></section>}
    {related.length>0&&<section className="related-products"><div className="section-top"><div><span className="eyebrow">MORE TO EXPLORE</span><h2>You might also <em>like.</em></h2></div><Link className="section-link" to={'/shop?category='+product.category.slug}>View this category <ArrowRight size={17}/></Link></div><div className="product-grid">{related.map(item=><ProductCard product={item} key={item.id}/>)}</div></section>}
  </div>;
}

export function Cart() {
  const { cartItems, updateCartQuantity, subtotal, settings, itemCount, notify, user } = useStore();
  const navigate = useNavigate(); const shipping = shippingEstimate(subtotal, settings);
  if (!itemCount) return <div className="container inner-page"><PageHeading eyebrow="YOUR PICKS" title="Shopping bag."/><EmptyState title="Your bag is feeling light" description="Discover a few things that deserve a spot in it."/></div>;
  return <div className="container inner-page"><PageHeading eyebrow="YOUR PICKS" title="Shopping bag." description={`${itemCount} lovely thing${itemCount !== 1 ? 's' : ''}, ready when you are.`}/><div className="checkout-layout"><div className="bag-list">{cartItems.map(({product, quantity}) => <div className="bag-item" key={product.id}><Link to={`/products/${product.slug}`} className="bag-picture"><img src={product.imageUrl || '/demo/placeholder.svg'} alt={product.title}/></Link><div className="bag-item-main"><span className="eyebrow">{product.category?.name}</span><Link to={`/products/${product.slug}`}><h3>{product.title}</h3></Link><div className="bag-item-bottom"><Quantity value={quantity} max={Math.min(10, product.stock)} onChange={n => updateCartQuantity(product.id, n).catch(e => notify(e.message))}/><button className="remove-button" onClick={() => updateCartQuantity(product.id, 0).catch(e => notify(e.message))}><Trash2 size={15}/> Remove</button></div></div><div className="bag-price">{lkr(product.priceCents * quantity)}</div></div>)}</div>
    <aside className="summary-card"><h3>Order summary</h3><div className="summary-line"><span>Subtotal</span><span>{lkr(subtotal)}</span></div><div className="summary-line"><span>Delivery</span><span>{shipping === 0 ? 'FREE' : lkr(shipping)}</span></div>{settings && shipping > 0 && <p className="free-shipping-note">Shop {lkr(Math.max(0, settings.freeShippingFromCents - subtotal))} more for free delivery.</p>}<div className="summary-total"><span>Estimated total</span><strong>{lkr(subtotal + shipping)}</strong></div><button className="button button-dark button-full" onClick={() => navigate(user ? '/checkout' : '/login?next=/checkout')}>Checkout <ArrowRight size={18}/></button><div className="summary-foot"><ShieldCheck size={18}/> Secure checkout · Sri Lanka only</div></aside>
  </div></div>;
}

export function AddressFields({ address, onChange }) {
  const update = (key, value) => onChange({ ...address, [key]: value });
  return <div className="form-grid"><Field label="Full name" required value={address.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Your name"/><Field label="Phone number" required value={address.phone} onChange={e => update('phone', e.target.value)} placeholder="07XXXXXXXX"/><div className="form-span"><Field label="Address line 1" required value={address.line1} onChange={e => update('line1', e.target.value)} placeholder="House number, street"/></div><div className="form-span"><Field label="Address line 2" value={address.line2 || ''} onChange={e => update('line2', e.target.value)} placeholder="Apartment / landmark (optional)"/></div><Field label="City / town" required value={address.city} onChange={e => update('city', e.target.value)} placeholder="City"/><div className="field"><Dropdown label="District *" value={address.district} options={districts.map(v => ({value:v,label:v}))} onChange={v => update('district', v)}/></div><Field label="Postal code (optional)" value={address.postal || ''} onChange={e => update('postal', e.target.value)} placeholder="Postal code"/></div>;
}

export function Checkout() {
  const { user, cartItems, itemCount, subtotal, settings, reloadCart, notify } = useStore(); const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]); const [address, setAddress] = useState({ ...emptyAddress, fullName: user?.name || '', phone: user?.phone || '' });
  const [chosenId, setChosenId] = useState('new'); const [saveAddress, setSaveAddress] = useState(false); const [acceptTerms, setAcceptTerms] = useState(false); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  useEffect(() => { api('/me/addresses').then(list => { setAddresses(list); const selected = list.find(a => a.isDefault) || list[0]; if (selected) { setChosenId(selected.id); setAddress(({...selected, fullName: selected.fullName, phone: selected.phone })); } }).catch(() => {}); }, []);
  const total = subtotal + shippingEstimate(subtotal, settings);
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try { const { fullName, phone, line1, line2, city, district, postal } = address; const order = await api('/checkout', { method:'POST', body:{ checkoutKey: key.current, address:{fullName,phone,line1,line2:line2||'',city,district,postal:postal||''}, note, saveAddress: saveAddress && chosenId === 'new', acceptTerms, paymentMethod:'COD' } });
      await reloadCart(); navigate(`/order-success/${order.id}`, { replace: true });
    } catch(e) { notify(e.message); } finally { setBusy(false); }
  };
  if (!itemCount) return <div className="container inner-page"><EmptyState title="Your bag is empty" description="Add something lovely before checkout."/></div>;
  if (!settings) return <Spinner/>;
  return <div className="container inner-page"><PageHeading eyebrow="JUST ONE MORE STEP" title="Checkout." description="Simple, secure and delivered to your doorstep."/><form onSubmit={submit} className="checkout-layout"><div className="checkout-main"><section className="form-card"><div className="form-card-heading"><span className="step-number">01</span><div><h3>Delivery details</h3><p>Where should we bring your order?</p></div></div>
      {addresses.length > 0 && <div className="saved-addresses"><div className="field-label">Saved addresses</div><div className="saved-address-grid">{addresses.map(item => <button className={`saved-address ${chosenId === item.id ? 'selected' : ''}`} type="button" key={item.id} onClick={() => { setChosenId(item.id); setAddress(item); }}><span><MapPin size={16}/> {item.city}, {item.district}</span><small>{item.line1}</small></button>)}<button className={`saved-address ${chosenId === 'new' ? 'selected' : ''}`} type="button" onClick={() => { setChosenId('new'); setAddress({ ...emptyAddress, fullName: user?.name || '', phone: user?.phone || '' }); }}><span><Plus size={16}/> New address</span></button></div></div>}
      <AddressFields address={address} onChange={next => { setAddress(next); setChosenId('new'); }}/>{chosenId === 'new' && <label className="check-line"><input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)}/> Save this address for next time</label>}</section>
      <section className="form-card"><div className="form-card-heading"><span className="step-number">02</span><div><h3>Payment method</h3><p>Simple ways to pay, made for Sri Lanka.</p></div></div><div className="payment-method selected"><div className="payment-radio"/><div><b>Cash on delivery</b><p>Pay when your items arrive.</p></div><Package size={22}/></div><p className="muted-note">Online payments will be available once a supported Sri Lankan payment gateway is connected.</p></section>
      <section className="form-card"><div className="form-card-heading"><span className="step-number">03</span><div><h3>Anything else?</h3><p>Optional delivery notes.</p></div></div><TextAreaField label="Order note" rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Delivery landmarks or special instructions"/></section>
    </div><aside className="summary-card checkout-summary"><h3>Your order</h3><div className="checkout-items">{cartItems.map(({product,quantity}) => <div className="checkout-item" key={product.id}><img src={product.imageUrl || '/demo/placeholder.svg'} alt=""/><div><b>{product.title}</b><small>Qty {quantity}</small></div><strong>{lkr(product.priceCents * quantity)}</strong></div>)}</div><div className="summary-line"><span>Subtotal</span><span>{lkr(subtotal)}</span></div><div className="summary-line"><span>Delivery</span><span>{lkr(shippingEstimate(subtotal, settings))}</span></div><div className="summary-total"><span>Total</span><strong>{lkr(total)}</strong></div><label className="check-line terms"><input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} required/> I confirm my order details and agree to the <Link to="/policies" target="_blank">store policies</Link>.</label><button disabled={busy || !acceptTerms} className="button button-dark button-full" type="submit">{busy ? 'Placing your order...' : `Place order · ${lkr(total)}`} <ArrowRight size={18}/></button><div className="summary-foot"><ShieldCheck size={17}/> Your order is protected</div></aside></form>
  </div>;
}

export function OrderSuccess() {
  const { id } = useParams(); const [order, setOrder] = useState(null);
  useEffect(() => { api(`/orders/${id}`).then(setOrder).catch(() => {}); }, [id]);
  return <div className="container inner-page success-page"><div className="success-symbol"><Check size={42}/></div><span className="eyebrow">THANK YOU FOR SHOPPING WITH US</span><h1>It's officially on its way <em>to being yours.</em></h1><p>Your order has been placed. We'll prepare everything for delivery. Payment is due on delivery.</p>{order && <div className="success-receipt"><div><span>Order number</span><strong>{order.number}</strong></div><div><span>Order total</span><strong>{lkr(order.totalCents)}</strong></div><div><span>Status</span><strong>{order.status}</strong></div></div>}<div className="success-actions"><Link to={"/orders/"+id} className="button button-dark">Track this order <ArrowRight size={18}/></Link><Link to="/shop" className="button button-outline">Keep exploring</Link></div></div>;
}

export function Auth({ mode }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const { onAuth, notify } = useStore(); const navigate = useNavigate(); const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/') && !params.get('next').startsWith('//') ? params.get('next') : '/account';
  const handle = async e => { e.preventDefault(); setBusy(true); try { const { user } = await api(`/auth/${mode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: mode === 'register' ? {name,email,password} : {email,password} }); await onAuth(user); navigate(next, { replace: true }); } catch(err) { notify(err.message); } finally { setBusy(false); } };
  const googleSuccess = async response => { setBusy(true); try { const { user } = await api('/auth/google', { method:'POST', body:{ credential: response.credential } }); await onAuth(user); navigate(next, { replace: true }); } catch(e) { notify(e.message); } finally { setBusy(false); } };
  return <div className="auth-layout"><div className="auth-art"><Link to="/" className="auth-back"><ArrowLeft size={16}/> Back to store</Link><div><span className="eyebrow">SL OPTIONS MARKET</span><h2>For the little<br/>things that make<br/>life <em>lovely.</em></h2><div className="auth-illustration"><img src="/demo/lamp.svg" alt="Decorative lamp illustration"/></div></div><div className="auth-bottom">Good things happen here. <span>✳</span></div></div><div className="auth-right"><div className="auth-box"><span className="eyebrow">YOUR LITTLE CORNER</span><h1>{mode === 'register' ? 'Create your account.' : 'Welcome back.'}</h1><p>{mode === 'register' ? 'Save favourites, track your orders and checkout faster.' : 'Your favourites and lovely finds are waiting for you.'}</p>
    <form onSubmit={handle} className="auth-form">{mode === 'register' && <Field label="Full name" required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"/>}<Field label="Email address" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><Field label="Password" type="password" minLength={mode === 'register' ? 10 : 1} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'}/><button type="submit" disabled={busy} className="button button-dark button-full">{busy ? 'One moment...' : mode === 'register' ? 'Create account' : 'Sign in'}<ArrowRight size={18}/></button></form>
    {mode === 'login' && <div className="forgot-row"><Link to="/forgot-password">Forgot password?</Link></div>}<div className="social-divider"><span>or continue with</span></div><div className="google-container">{import.meta.env.VITE_GOOGLE_CLIENT_ID ? <GoogleLogin onSuccess={googleSuccess} onError={() => notify('Google sign-in was cancelled or failed.')} width="260" theme="outline" size="large" text="continue_with"/> : <div className="google-not-configured">Google sign-in available after setting <code>VITE_GOOGLE_CLIENT_ID</code>.</div>}</div>
    <p className="auth-switch">{mode === 'register' ? 'Already have an account?' : 'New around here?'} <Link to={`${mode === 'register' ? '/login' : '/register'}?next=${encodeURIComponent(next)}`}>{mode === 'register' ? 'Sign in' : 'Create an account'}</Link></p><p className="auth-policy">By using this store, you agree to the <Link to="/policies">store policies</Link>.</p></div></div></div>;
}

export function Policies() { const { settings } = useStore(); return <div className="container inner-page legal-content"><PageHeading eyebrow="GOOD TO KNOW" title="Store information." description="Helpful information before placing your order."/><div className="legal-grid"><section><h2>Delivery</h2><p>We deliver throughout Sri Lanka. The shipping charge is displayed in your bag and confirmed at checkout before you order. Order fulfilment and delivery timelines will be confirmed by the store team.</p></section><section><h2>Payment</h2><p>Cash on delivery is the current supported method. Please keep the payable total ready for the delivery agent.</p></section><section><h2>Returns & refunds</h2><p>Contact {settings?.contactEmail || 'the store'} before returning an order. Product-specific exclusions and applicable consumer rights should be reflected in the final store policy before launch.</p></section><section><h2>Privacy & terms</h2><p>Your account information, shipping address, order history and preferences are used to operate the store. This page is a launch template — publish lawyer-reviewed privacy, terms, return, and contact policies before accepting real orders.</p></section></div></div>; }

export function PasswordRecovery({ reset = false }) {
  const [email,setEmail] = useState(''),[password,setPassword] = useState(''),[busy,setBusy] = useState(false),[done,setDone] = useState(false);
  const [params] = useSearchParams(); const token = params.get('token') || '';
  const {notify} = useStore();
  const submit = async e => {e.preventDefault();setBusy(true);try{await api(reset?'/auth/reset-password':'/auth/forgot-password',{method:'POST',body:reset?{token,newPassword:password}:{email}});setDone(true);}catch(err){notify(err.message);}finally{setBusy(false);}};
  return <div className="container recovery-page"><div className="recovery-card"><span className="eyebrow">SL OPTIONS MARKET / ACCOUNT</span><h1>{done?(reset?'Password updated.':'Check your inbox.'):(reset?'Set a new password.':'Forgot your password?')}</h1><p>{done?(reset?'Your password has been updated. Sign in with your new password.':'If this email has a password account, you will receive a reset link. The link expires after 30 minutes.'):(reset?'Choose a new password with at least 10 characters.':'Enter your account email and we’ll send you a secure reset link.')}</p>{!done&&<form onSubmit={submit} className="auth-form">{reset?<Field label="New password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={10} required/>:<Field label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>}<button type="submit" disabled={busy||reset&&!token} className="button button-dark button-full">{busy?'Sending...':reset?'Update password':'Send reset link'}<ArrowRight size={17}/></button></form>}<Link className="recovery-back" to="/login"><ArrowLeft size={16}/> Back to sign in</Link></div></div>;
}
