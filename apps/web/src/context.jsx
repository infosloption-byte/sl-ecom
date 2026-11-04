import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const StoreContext = createContext(null);
const guestKey = 'slm_guest_cart';
function getGuestCart() { try { const values = JSON.parse(localStorage.getItem(guestKey) || '[]'); return Array.isArray(values) ? values.slice(0, 30) : []; } catch { return []; } }
export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [guestCart, setGuestCart] = useState(getGuestCart);
  const [wishlist, setWishlist] = useState([]);
  const [notification, setNotification] = useState('');
  const notify = useCallback(message => { setNotification(message); setTimeout(() => setNotification(''), 4400); }, []);
  const reloadCart = useCallback(async () => setCart(await api('/cart')), []);
  const reloadWishlist = useCallback(async () => setWishlist(await api('/wishlist')), []);
  const refreshCatalog = useCallback(async () => {
    const [store, cats] = await Promise.all([api('/settings'), api('/categories')]);
    setSettings(store); setCategories(cats);
  }, []);
  useEffect(() => { localStorage.setItem(guestKey, JSON.stringify(guestCart)); }, [guestCart]);
  useEffect(() => {
    refreshCatalog().catch(() => {});
    api('/me').then(async ({ user: next }) => {
      setUser(next);
      await Promise.allSettled([reloadCart(), reloadWishlist()]);
    }).catch(() => {}).finally(() => setReady(true));
  }, [refreshCatalog, reloadCart, reloadWishlist]);
  const onAuth = async next => {
    setUser(next);
    const guest = getGuestCart();
    if (guest.length) {
      try { await api('/cart/sync', { method: 'POST', body: { items: guest.map(({ product, quantity }) => ({ productId: product.id, quantity })) } }); setGuestCart([]); localStorage.removeItem(guestKey); }
      catch (e) { notify(`Account opened, but bag sync failed: ${e.message}`); }
    }
    await Promise.allSettled([reloadCart(), reloadWishlist()]);
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); setCart([]); setWishlist([]); notify('You have signed out.'); };
  const addToCart = async (product, quantity = 1) => {
    if (product.stock < 1) return notify('This item is currently out of stock.');
    if (user) { await api('/cart', { method: 'POST', body: { productId: product.id, quantity } }); await reloadCart(); }
    else setGuestCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const next = Math.min(10, product.stock, (existing?.quantity || 0) + quantity);
      return existing ? prev.map(item => item.product.id === product.id ? { ...item, quantity: next } : item) : [...prev, { product, quantity: next }];
    });
    notify(`${product.title} added to your bag.`);
  };
  const updateCartQuantity = async (productId, quantity) => {
    if (user) { await api(`/cart/${productId}`, { method: 'PUT', body: { quantity } }); await reloadCart(); }
    else setGuestCart(prev => prev.filter(item => item.product.id !== productId || quantity > 0).map(item => item.product.id === productId ? { ...item, quantity } : item));
  };
  const toggleWishlist = async product => {
    if (!user) return false;
    const has = wishlist.some(entry => entry.productId === product.id);
    await api(`/wishlist/${product.id}`, { method: has ? 'DELETE' : 'POST' });
    await reloadWishlist(); notify(has ? 'Removed from your wishlist.' : 'Saved to your wishlist.');
    return true;
  };
  const cartItems = user ? cart : guestCart;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  return <StoreContext.Provider value={{ user, setUser, ready, settings, categories, refreshCatalog, cartItems, itemCount, subtotal, wishlist, addToCart, updateCartQuantity, toggleWishlist, reloadCart, reloadWishlist, onAuth, logout, notify, notification }}>
    {children}
  </StoreContext.Provider>;
}
export const useStore = () => useContext(StoreContext);
