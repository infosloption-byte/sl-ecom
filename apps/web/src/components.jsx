import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronDown, Check, Heart, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { lkr } from './api';
import { useStore } from './context';
import { trackProduct } from './analyticsTracking';

export function Dropdown({ value, options, onChange, placeholder = 'Select...', label, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(); const pop = useRef(); const itemRefs = useRef([]); const [placement, setPlacement] = useState(null);
  const selected = options.find(option => String(option.value) === String(value));
  useEffect(() => {
    const onOutside = e => { if (!root.current?.contains(e.target) && !pop.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, []);
  useEffect(() => { if (open) { const index = Math.max(0, options.findIndex(x => x.value === value)); setActive(index); } }, [open, value, options]);
  useEffect(() => {
    if (!open) { setPlacement(null); return; }
    const measure = () => {
      const box = root.current?.getBoundingClientRect(); if (!box) return;
      const height = Math.min(270, options.length * 38 + 15);
      setPlacement({ position: 'fixed', left: Math.max(8, box.left), width: box.width, top: window.innerHeight - box.bottom > height + 8 ? box.bottom + 5 : Math.max(8, box.top - height - 5), zIndex: 320 });
    };
    measure(); window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, options.length]);
  useEffect(() => {
    // scrollIntoView also scrolls ancestor pages on some browsers. Keep focus inside the dropdown list.
    if (!open || !pop.current || !itemRefs.current[active]) return;
    const list = pop.current;
    const option = itemRefs.current[active];
    const listRect = list.getBoundingClientRect();
    const itemRect = option.getBoundingClientRect();
    if (itemRect.top < listRect.top) list.scrollTop -= listRect.top - itemRect.top;
    else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom;
  }, [open, active, placement]);
  function keyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) setOpen(true); else setActive(n => (n + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!open) setOpen(true); else { onChange(options[active].value); setOpen(false); } }
  }
  return <div className={`dropdown ${open ? 'dropdown-open' : ''}`} ref={root}>
    {label && <span className="field-label">{label}</span>}
    <button className="dropdown-trigger" type="button" disabled={disabled} aria-expanded={open} aria-haspopup="listbox" onKeyDown={keyDown} onClick={() => setOpen(v => !v)}>
      <span>{selected?.label || placeholder}</span><ChevronDown size={17}/>
    </button>
    {open && placement && createPortal(<div className="dropdown-list dropdown-portal" style={placement} ref={pop} role="listbox" aria-label={label || placeholder}>
      {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} ref={el => { itemRefs.current[index] = el; }} className={`dropdown-option ${index === active ? 'dropdown-active' : ''}`} key={option.value} onMouseEnter={() => setActive(index)} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <Check size={15}/>}</button>)}
    </div>, document.body)}
  </div>;
}
export function Field({ label, required = false, ...props }) { return <label className="field"><span className="field-label">{label}{required ? ' *' : ''}</span><input required={required} {...props}/></label>; }
export function TextAreaField({ label, ...props }) { return <label className="field"><span className="field-label">{label}</span><textarea {...props}/></label>; }
export function Quantity({ value, onChange, max = 10 }) { return <div className="quantity"><button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={15}/></button><span>{value}</span><button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={15}/></button></div>; }
export function Price({ product }) { return <div className="price-row"><strong>{lkr(product.priceCents)}</strong>{product.compareAtCents > product.priceCents && <del>{lkr(product.compareAtCents)}</del>}</div>; }
export function ProductCard({ product }) {
  const { addToCart, toggleWishlist, wishlist, user, notify } = useStore();
  const navigate = useNavigate(); const [busy, setBusy] = useState(false);
  const wished = wishlist.some(item => item.productId === product.id);
  const run = async fn => { setBusy(true); try { await fn(); } catch(e) { notify(e.message); } finally { setBusy(false); } };
  return <article className="product-card">
    <div className="product-visual"><Link to={`/products/${product.slug}`} onClick={()=>trackProduct(product.id,'CLICK')} aria-label={`View ${product.title}`}><img src={product.imageUrl || '/demo/placeholder.svg'} alt={product.title} loading="lazy"/></Link>
      {product.featured && <span className="product-tag">FEATURED</span>}
      <button className={`heart-btn ${wished ? 'active' : ''}`} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} disabled={busy} onClick={() => user ? run(() => toggleWishlist(product)) : navigate('/login?next=/shop')}><Heart size={19} fill={wished ? 'currentColor' : 'none'}/></button>
      <button className="quick-add" disabled={busy || !product.stock} onClick={() => run(() => addToCart(product))}><ShoppingBag size={16}/>{product.stock ? 'Add to bag' : 'Sold out'}</button>
    </div>
    <div className="product-meta"><span>{product.category?.name || 'Everyday essentials'}</span><Link to={`/products/${product.slug}`} onClick={()=>trackProduct(product.id,'CLICK')}><h3>{product.title}</h3></Link><Price product={product}/></div>
  </article>;
}
export function EmptyState({ icon: Icon = ShoppingBag, title, description, link = '/shop', action = 'Explore the shop' }) { return <div className="empty-state"><div className="empty-icon"><Icon size={31}/></div><h2>{title}</h2><p>{description}</p><Link to={link} className="button button-dark">{action}<ArrowRight size={17}/></Link></div>; }
export function PageHeading({ eyebrow, title, description }) { return <div className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>; }
export function Spinner({ label = "Loading your experience..." }) { return <div className="loading market-inline-loading" role="status" aria-live="polite"><span className="market-inline-loading__star" aria-hidden="true">✳</span><span>{label}</span></div>; }
