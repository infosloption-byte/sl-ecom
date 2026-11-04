import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, LogOut, Package, Settings, ShoppingBag, UserRound } from 'lucide-react';
import { lkr } from './api';
import { useStore } from './context';

export function HeaderMenus() {
  const { user, cartItems, itemCount, subtotal, wishlist, logout, notify } = useStore();
  const [opened, setOpened] = useState(null);
  const root = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setOpened(null), [location.pathname, location.search]);
  useEffect(() => {
    const outside = event => { if (!root.current?.contains(event.target)) setOpened(null); };
    const escape = event => { if (event.key === 'Escape') setOpened(null); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  const toggle = key => setOpened(opened === key ? null : key);
  const close = () => setOpened(null);
  const signOut = async () => { try { await logout(); close(); navigate('/'); } catch (err) { notify(err.message); } };
  const saved = wishlist.filter(item => item.product?.status === 'ACTIVE').slice(0, 3);
  return <div className="header-preview-menus" ref={root}>
    <div className="header-menu-wrap"><button className="header-icon" aria-label="Wishlist preview" aria-expanded={opened==='wishlist'} aria-controls="wishlist-preview" onClick={() => toggle('wishlist')}><Heart size={21}/></button>
      {opened==='wishlist' && <div id="wishlist-preview" className="header-preview-panel" role="region" aria-label="Wishlist preview"><h3>Saved favourites <small>{wishlist.length}</small></h3>
      {!user ? <p>Sign in to save products you love.</p> : saved.length ? saved.map(({product}) => <Link key={product.id} onClick={close} className="preview-item" to={'/products/'+product.slug}><img src={product.imageUrl||'/demo/placeholder.svg'} alt=""/><span><b>{product.title}</b><small>{lkr(product.priceCents)}</small></span></Link>) : <p>Your wishlist is empty. Tap the heart on a product to save it.</p>}
      <Link className="preview-footer" onClick={close} to={user?'/account?tab=wishlist':'/login?next=/account?tab=wishlist'}>{user?'View wishlist':'Sign in'} <ArrowRight size={16}/></Link></div>}</div>
    <div className="header-menu-wrap"><button className="header-icon" aria-label="Account menu" aria-expanded={opened==='account'} aria-controls="account-preview" onClick={() => toggle('account')}><UserRound size={21}/></button>
      {opened==='account' && <div id="account-preview" className="header-preview-panel" role="region" aria-label="Account menu"><h3>{user?'Hi, '+user.name.split(' ')[0]:'Your account'}</h3>
      {user ? <><Link className="preview-menu-link" onClick={close} to="/account"><UserRound size={17}/> My account</Link><Link className="preview-menu-link" onClick={close} to="/account?tab=orders"><Package size={17}/> Orders & tracking</Link><Link className="preview-menu-link" onClick={close} to="/account?tab=addresses"><Package size={17}/> Delivery addresses</Link><Link className="preview-menu-link" onClick={close} to="/account?tab=settings"><Settings size={17}/> Settings</Link>{user.role==='ADMIN' && <Link className="preview-menu-link" onClick={close} to="/admin"><Settings size={17}/> Admin dashboard</Link>}<button className="preview-menu-link preview-signout" onClick={signOut}><LogOut size={17}/> Sign out</button></> : <><p>Sign in to view your orders and settings.</p><Link className="preview-footer" onClick={close} to="/login">Sign in <ArrowRight size={16}/></Link></>}</div>}</div>
    <div className="header-menu-wrap"><button className="bag-icon" aria-label={'Cart preview, '+itemCount+' items'} aria-expanded={opened==='cart'} aria-controls="cart-preview" onClick={() => toggle('cart')}><ShoppingBag size={20}/><span>{itemCount}</span></button>
      {opened==='cart' && <div id="cart-preview" className="header-preview-panel header-cart-panel" role="region" aria-label="Cart preview"><h3>Shopping bag <small>{itemCount} items</small></h3>
      {cartItems.length ? <>{cartItems.slice(0,3).map(({product,quantity}) => <Link className="preview-item" key={product.id} to={'/products/'+product.slug} onClick={close}><img src={product.imageUrl||'/demo/placeholder.svg'} alt=""/><span><b>{product.title}</b><small>{quantity} × {lkr(product.priceCents)}</small></span></Link>)}{cartItems.length>3 && <p>Plus {cartItems.length-3} more products.</p>}<div className="preview-subtotal"><span>Subtotal</span><b>{lkr(subtotal)}</b></div></> : <p>Your bag is empty. Discover your next favourite.</p>}
      <Link className="preview-footer" onClick={close} to="/cart">View cart <ArrowRight size={16}/></Link>{cartItems.length>0 && <Link className="preview-checkout" onClick={close} to={user?'/checkout':'/login?next=/checkout'}>Checkout</Link>}</div>}</div>
  </div>;
}
