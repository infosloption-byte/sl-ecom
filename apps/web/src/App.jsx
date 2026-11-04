import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Heart, Instagram, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useStore } from './context';
import { Home, Shop, ProductDetail, Cart, Checkout, OrderSuccess, Auth, PasswordRecovery } from './Storefront';
import { Account } from './Account';
import { Admin } from './Admin';
import { Spinner } from './components';
import { HeaderMenus } from './HeaderMenus';
import { OrderDetails } from './OrderDetails';
import { ScrollManager } from './ScrollManager';
import { AppPreloader } from './AppPreloader';
import { ContactPage, PoliciesPage, ShippingReturnsPage, PrivacyPage, TermsPage } from './LegalPages';

function Brand() { return <Link to="/" className="brand" aria-label="SL Options Market home"><span className="brand-symbol">s<span>✳</span></span><span className="brand-copy"><strong>SL OPTIONS</strong><small>MARKET / SRI LANKA</small></span></Link>; }
function SiteShell() {
  const { user, itemCount, settings, notification, notify } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState(''); const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location.pathname, location.search]);
  const close = () => setMenuOpen(false);
  function searchSubmit(e) { e.preventDefault(); navigate(`/shop?q=${encodeURIComponent(search)}`); setSearchOpen(false);close(); }
  return <div className="site-shell"><div className="announcement"><span>✳</span> {settings?.announcement || 'Thoughtful finds · Delivered across Sri Lanka'} <span className="announcement-edge">MADE FOR YOUR EVERYDAY <ArrowUpRight size={13}/></span></div>
    <header className="site-header"><div className="container header-inner"><Brand/><nav className={`desktop-nav ${menuOpen?'mobile-open':''}`}><NavLink to="/" onClick={close} end>Home</NavLink><NavLink to="/shop" onClick={close}>Shop all</NavLink><NavLink to="/shop?category=home-living" onClick={close}>Home & living</NavLink><NavLink to="/shop?category=everyday-carry" onClick={close}>Everyday carry</NavLink><Link className="mobile-only" onClick={close} to="/contact">Contact us</Link><Link className="mobile-only" onClick={close} to="/shipping-returns">Shipping & returns</Link><Link className="mobile-only" onClick={close} to="/privacy">Privacy</Link><Link className="mobile-only" onClick={close} to="/terms">Terms</Link></nav><div className="header-actions"><button className="header-icon" title="Search" aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}><Search size={21}/></button><HeaderMenus/><button className="header-icon mobile-menu-toggle" aria-label={menuOpen?'Close menu':'Open menu'} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={23}/>:<Menu size={23}/>}</button></div></div>{searchOpen&&<form className="header-search container" onSubmit={searchSubmit}><Search size={19}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="What are you looking for?" aria-label="Search products"/><button className="button button-dark" type="submit">Search <ArrowRight size={16}/></button></form>}</header>
    <main id="main-content"><Outlet/></main>
    <footer className="site-footer"><div className="container footer-top"><div className="footer-about"><Brand/><p>Everyday essentials, unexpected favourites and little things that feel like a big deal. Designed for a more delightful shopping experience in Sri Lanka.</p><span className="footer-powered">A STORE BY <a href="https://sloptions.xyz" target="_blank" rel="noreferrer">SL OPTIONS <ArrowUpRight size={13}/></a></span></div><div className="footer-col"><h4>Discover</h4><Link to="/shop">Shop everything</Link><Link to="/shop?category=home-living">Home & living</Link><Link to="/shop?category=everyday-carry">Everyday carry</Link><Link to="/shop?category=tech-essentials">Tech essentials</Link></div><div className="footer-col"><h4>Need help?</h4><Link to="/shipping-returns">Shipping & returns</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms & conditions</Link><Link to="/contact">Contact us</Link><a href={`mailto:${settings?.contactEmail||'hello@sloptions.xyz'}`}>Email support</a></div><div className="footer-col"><h4>My account</h4><Link to={user?'/account?tab=orders':'/login'}>My purchases</Link><Link to={user?'/account?tab=wishlist':'/login'}>Saved favourites</Link><Link to={user?'/account?tab=addresses':'/login'}>Delivery addresses</Link>{user?.role==='ADMIN'&&<Link to="/admin">Admin dashboard</Link>}</div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} SL Options Market. An SL Options product.</span><span>MADE WITH ✳ FOR SRI LANKA · LKR</span></div></footer>
    <div className="mobile-bottom-nav"><Link to="/shop"><Search size={21}/><span>Explore</span></Link><Link to="/account?tab=wishlist"><Heart size={21}/><span>Saved</span></Link><Link to="/cart"><ShoppingBag size={21}/><span>Bag ({itemCount})</span></Link><Link to={user?'/account':'/login'}><UserRound size={21}/><span>Account</span></Link></div>
    {notification&&<div className="toast" role="status"><span>✳</span>{notification}<button aria-label="Dismiss notification" onClick={()=>notify('')}><X size={16}/></button></div>}
  </div>;
}
function Protected({ admin = false, children }) { const {user,ready} = useStore(); if(!ready)return <Spinner/>;if(!user)return <Navigate to={`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`} replace/>;if(admin&&user.role!=='ADMIN')return <Navigate to="/account" replace/>;return children; }
export default function App(){const {notification,notify} = useStore();return <><AppPreloader/><ScrollManager/><Routes>
  <Route element={<SiteShell/>}><Route index element={<Home/>}/><Route path="shop" element={<Shop/>}/><Route path="products/:slug" element={<ProductDetail/>}/><Route path="cart" element={<Cart/>}/><Route path="checkout" element={<Protected><Checkout/></Protected>}/><Route path="order-success/:id" element={<Protected><OrderSuccess/></Protected>}/><Route path="login" element={<Auth mode="login"/>}/><Route path="register" element={<Auth mode="register"/>}/><Route path="forgot-password" element={<PasswordRecovery/>}/><Route path="reset-password" element={<PasswordRecovery reset/>}/><Route path="account" element={<Protected><Account/></Protected>}/><Route path="orders/:id" element={<Protected><OrderDetails/></Protected>}/><Route path="orders/:id/invoice" element={<Protected><OrderDetails invoice/></Protected>}/><Route path="policies" element={<PoliciesPage/>}/><Route path="contact" element={<ContactPage/>}/><Route path="shipping-returns" element={<ShippingReturnsPage/>}/><Route path="privacy" element={<PrivacyPage/>}/><Route path="terms" element={<TermsPage/>}/></Route>
  <Route path="admin" element={<Protected admin><Admin/></Protected>}/>
  <Route path="admin/products/new" element={<Protected admin><Admin/></Protected>}/>
  <Route path="admin/products/:id/edit" element={<Protected admin><Admin/></Protected>}/>
  <Route path="admin/orders/:id" element={<Protected admin><Admin/></Protected>}/>
  <Route path="admin/orders/:id/invoice" element={<Protected admin><Admin/></Protected>}/>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>{notification&&window.location.pathname.startsWith('/admin')&&<div className="toast" role="status"><span>✳</span>{notification}<button onClick={()=>notify('')} aria-label="Dismiss"><X size={17}/></button></div>}</>}
