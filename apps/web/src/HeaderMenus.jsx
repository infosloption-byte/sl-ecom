import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, LogOut, MapPin, Package, Settings, ShoppingBag, UserRound, X } from 'lucide-react';
import { lkr } from './api';
import { useStore } from './context';

export function HeaderMenus() {
  const { user, cartItems, itemCount, subtotal, wishlist, logout, notify } = useStore();
  const [opened, setOpened] = useState(null);
  const [position, setPosition] = useState(null);
  const root = useRef(null);
  const popup = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setOpened(null); setPosition(null); }, [location.pathname, location.search]);

  useEffect(() => {
    const outside = event => {
      if (!root.current?.contains(event.target) && !popup.current?.contains(event.target)) setOpened(null);
    };
    const escape = event => { if (event.key === 'Escape') setOpened(null); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  useLayoutEffect(() => {
    if (!opened) { setPosition(null); return; }
    const measure = () => {
      const trigger = root.current?.querySelector('[data-preview-trigger="' + opened + '"]');
      if (!trigger) return;
      const screenWidth = window.innerWidth;
      const compact = screenWidth <= 960;
      const header = document.querySelector('.site-header');
      const headerBottom = header?.getBoundingClientRect().bottom || 70;
      const top = compact ? Math.max(12, headerBottom + 8) : trigger.getBoundingClientRect().bottom + 14;
      const maxHeight = Math.max(160, window.innerHeight - top - 12);
      if (compact) {
        setPosition({ position:'fixed', top, left:'50%', transform:'translateX(-50%)',
          width:'min(420px, calc(100vw - 24px))', maxHeight, overflowY:'auto', zIndex:410 });
      } else {
        const rect = trigger.getBoundingClientRect();
        setPosition({ position:'fixed', top, left:Math.max(12, Math.min(rect.right - 340, screenWidth - 352)),
          width:340, maxHeight, overflowY:'auto', transform:'none', zIndex:410 });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [opened]);

  const toggle = key => setOpened(current => current === key ? null : key);
  const close = () => setOpened(null);
  const signOut = async () => {
    try { await logout(); close(); navigate('/'); }
    catch (err) { notify(err.message); }
  };
  const saved = wishlist.filter(item => item.product?.status === 'ACTIVE').slice(0, 3);
  const compact = typeof window !== 'undefined' && window.innerWidth <= 960;

  const panel = () => {
    if (opened === 'wishlist') return <>
      <h3>Saved favourites <small>{wishlist.length}</small></h3>
      {!user ? <p>Sign in to save products you love.</p> : saved.length ? saved.map(({product}) =>
        <Link key={product.id} onClick={close} className="preview-item" to={'/products/'+product.slug}>
          <img src={product.imageUrl||'/demo/placeholder.svg'} alt=""/><span><b>{product.title}</b><small>{lkr(product.priceCents)}</small></span>
        </Link>) : <p>Your wishlist is empty. Tap the heart on a product to save it.</p>}
      <Link className="preview-footer" onClick={close} to={user?'/account?tab=wishlist':'/login?next=/account?tab=wishlist'}>
        {user?'View wishlist':'Sign in'} <ArrowRight size={16}/>
      </Link>
    </>;
    if (opened === 'account') return <>
      <h3>{user ? 'Hi, '+user.name.split(' ')[0] : 'Your account'}</h3>
      {user ? <>
        <Link className="preview-menu-link" onClick={close} to="/account"><UserRound size={17}/> My account</Link>
        <Link className="preview-menu-link" onClick={close} to="/account?tab=orders"><Package size={17}/> Orders & tracking</Link>
        <Link className="preview-menu-link" onClick={close} to="/account?tab=addresses"><MapPin size={17}/> Delivery addresses</Link>
        <Link className="preview-menu-link" onClick={close} to="/account?tab=settings"><Settings size={17}/> Settings</Link>
        {user.role==='ADMIN' && <Link className="preview-menu-link" onClick={close} to="/admin"><Settings size={17}/> Admin dashboard</Link>}
        <button type="button" className="preview-menu-link preview-signout" onClick={signOut}><LogOut size={17}/> Sign out</button>
      </> : <>
        <p>Sign in to view your orders and settings.</p>
        <Link className="preview-footer" onClick={close} to="/login">Sign in <ArrowRight size={16}/></Link>
      </>}
    </>;
    return <>
      <h3>Shopping bag <small>{itemCount} items</small></h3>
      {cartItems.length ? <>
        {cartItems.slice(0,3).map(({product,quantity}) =>
          <Link className="preview-item" key={product.id} to={'/products/'+product.slug} onClick={close}>
            <img src={product.imageUrl||'/demo/placeholder.svg'} alt=""/>
            <span><b>{product.title}</b><small>{quantity} × {lkr(product.priceCents)}</small></span>
          </Link>)}
        {cartItems.length>3 && <p>Plus {cartItems.length-3} more products.</p>}
        <div className="preview-subtotal"><span>Subtotal</span><b>{lkr(subtotal)}</b></div>
      </> : <p>Your bag is empty. Discover your next favourite.</p>}
      <Link className="preview-footer" onClick={close} to="/cart">View cart <ArrowRight size={16}/></Link>
      {cartItems.length>0 && <Link className="preview-checkout" onClick={close} to={user?'/checkout':'/login?next=/checkout'}>Checkout</Link>}
    </>;
  };

  return <>
    <div className="header-preview-menus" ref={root}>
      <div className="header-menu-wrap">
        <button type="button" data-preview-trigger="wishlist" className="header-icon" aria-label="Wishlist preview" aria-expanded={opened==='wishlist'} aria-controls="header-preview-panel" onClick={()=>toggle('wishlist')}><Heart size={21}/></button>
      </div>
      <div className="header-menu-wrap">
        <button type="button" data-preview-trigger="account" className="header-icon" aria-label="Account menu" aria-expanded={opened==='account'} aria-controls="header-preview-panel" onClick={()=>toggle('account')}><UserRound size={21}/></button>
      </div>
      <div className="header-menu-wrap">
        <button type="button" data-preview-trigger="cart" className="bag-icon" aria-label={'Cart preview, '+itemCount+' items'} aria-expanded={opened==='cart'} aria-controls="header-preview-panel" onClick={()=>toggle('cart')}><ShoppingBag size={20}/><span>{itemCount}</span></button>
      </div>
    </div>
    {opened && position && createPortal(<>
      {compact && <button className="header-menu-backdrop" type="button" onClick={close} tabIndex={-1} aria-label="Close menu"/>}
      <div id="header-preview-panel" className="header-preview-panel header-preview-portal" role="region" aria-label={opened === 'cart' ? 'Cart preview' : opened === 'account' ? 'Account menu' : 'Wishlist preview'} ref={popup} style={position}>
        <button className="header-menu-dismiss" type="button" onClick={close} aria-label="Close menu"><X size={17}/></button>
        {panel()}
      </div>
    </>,document.body)}
  </>;
}
